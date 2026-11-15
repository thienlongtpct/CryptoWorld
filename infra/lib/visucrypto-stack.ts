import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

const repoRoot = path.join(__dirname, '../..');

function stageApi(outputDir: string) {
  fs.mkdirSync(path.join(outputDir, 'server'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'src/data'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'src/characters'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'src/lib'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'src/dungeon'), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(outputDir, 'package.json'));
  for (const name of fs.readdirSync(path.join(repoRoot, 'server'))) {
    if (!name.endsWith('.mjs')) continue;
    fs.copyFileSync(path.join(repoRoot, 'server', name), path.join(outputDir, 'server', name));
  }
  fs.copyFileSync(path.join(repoRoot, 'src/data/catalog.json'), path.join(outputDir, 'src/data/catalog.json'));
  fs.copyFileSync(path.join(repoRoot, 'src/data/entries.ts'), path.join(outputDir, 'src/data/entries.ts'));
  fs.copyFileSync(path.join(repoRoot, 'src/characters/cast.ts'), path.join(outputDir, 'src/characters/cast.ts'));
  fs.copyFileSync(path.join(repoRoot, 'src/characters/views.ts'), path.join(outputDir, 'src/characters/views.ts'));
  fs.copyFileSync(path.join(repoRoot, 'src/lib/crypto.ts'), path.join(outputDir, 'src/lib/crypto.ts'));
  fs.copyFileSync(path.join(repoRoot, 'src/dungeon/challenges.ts'), path.join(outputDir, 'src/dungeon/challenges.ts'));
}

function githubRepo(scope: Construct) {
  const fromContext = scope.node.tryGetContext('githubRepo');
  const repo = (typeof fromContext === 'string' && fromContext) || process.env.GITHUB_REPOSITORY || '';
  return /^[\w.-]+\/[\w.-]+$/.test(repo) ? repo : '';
}

export class VisuCryptoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const accounts = new dynamodb.Table(this, 'Accounts', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const apiLogs = new logs.LogGroup(this, 'ApiLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const api = new lambda.Function(this, 'AccountsApi', {
      description: 'VisuCrypto registration, sessions, and learning progress.',
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'server/lambda.handler',
      timeout: cdk.Duration.seconds(20),
      memorySize: 256,
      logGroup: apiLogs,
      environment: {
        TABLE_NAME: accounts.tableName,
        COOKIE_SECURE: '1',
        ...(process.env.GEMINI_API_KEY ? { GEMINI_API_KEY: process.env.GEMINI_API_KEY } : {}),
        ...(process.env.GEMINI_MODEL ? { GEMINI_MODEL: process.env.GEMINI_MODEL } : {}),
      },
      code: lambda.Code.fromAsset(repoRoot, {
        bundling: {
          image: lambda.Runtime.NODEJS_24_X.bundlingImage,
          command: [
            'bash', '-c',
            'mkdir -p /asset-output/server /asset-output/src/data /asset-output/src/characters /asset-output/src/lib /asset-output/src/dungeon && cp package.json /asset-output/package.json && cp server/*.mjs /asset-output/server/ && cp src/data/catalog.json src/data/entries.ts /asset-output/src/data/ && cp src/characters/cast.ts src/characters/views.ts /asset-output/src/characters/ && cp src/lib/crypto.ts /asset-output/src/lib/ && cp src/dungeon/challenges.ts /asset-output/src/dungeon/',
          ],
          local: {
            tryBundle(outputDir: string) {
              stageApi(outputDir);
              return true;
            },
          },
        },
      }),
    });
    accounts.grantReadWriteData(api);

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', { apiName: 'visucrypto-accounts' });
    httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new HttpLambdaIntegration('Accounts', api),
    });

    const site = new s3.Bucket(this, 'Site', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          override: true,
        },
      },
    });

    const apiDomain = `${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`;
    const distribution = new cloudfront.Distribution(this, 'SiteCdn', {
      comment: 'VisuCrypto',
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(site),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: securityHeaders,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(apiDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          responseHeadersPolicy: securityHeaders,
        },
      },
    });

    new s3deploy.BucketDeployment(this, 'PublishSite', {
      sources: [s3deploy.Source.asset(path.join(repoRoot, 'dist'), { exclude: ['artifact.html'] })],
      destinationBucket: site,
      distribution,
      distributionPaths: ['/*'],
      cacheControl: [s3deploy.CacheControl.fromString('no-cache, no-store, must-revalidate')],
      prune: true,
    });

    const repo = githubRepo(this);
    if (repo) {
      const configuredArn = this.node.tryGetContext('githubOidcProviderArn');
      const provider = typeof configuredArn === 'string' && configuredArn.startsWith('arn:')
        ? iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'GitHubOidc', configuredArn)
        : new iam.OpenIdConnectProvider(this, 'GitHubOidc', {
          url: 'https://token.actions.githubusercontent.com',
          clientIds: ['sts.amazonaws.com'],
        });
      const qualifier = this.node.tryGetContext('@aws-cdk/core:bootstrapQualifier') || 'hnb659fds';
      const role = new iam.Role(this, 'GitHubDeploy', {
        roleName: 'visucrypto-github-deploy',
        description: 'Assumed by GitHub Actions on main to deliver VisuCrypto.',
        maxSessionDuration: cdk.Duration.hours(1),
        assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub': `repo:${repo}:ref:refs/heads/main`,
          },
        }),
      });
      role.addToPolicy(new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: ['deploy', 'file-publishing', 'lookup', 'image-publishing'].map(kind =>
          `arn:${cdk.Aws.PARTITION}:iam::${this.account}:role/cdk-${qualifier}-${kind}-role-${this.account}-${this.region}`),
      }));
      new cdk.CfnOutput(this, 'DeployRoleArn', { value: role.roleArn });
    }

    new cdk.CfnOutput(this, 'SiteUrl', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'BucketName', { value: site.bucketName });
  }
}
