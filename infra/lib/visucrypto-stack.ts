import * as fs from 'fs';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { execSync } from 'child_process';

const repoRoot = path.join(__dirname, '../..');

/** Same sentinel rule as server/sponsors.mjs — example .env values stay off Lambda. */
function liveSecret(value: string | undefined, placeholder: string) {
  const key = (value || '').trim();
  return key && key !== placeholder ? key : '';
}

const SDK_INSTALL =
  'npm install --omit=dev --no-package-lock --prefix . '
  + '@aws-sdk/client-dynamodb@3.1169.0 @aws-sdk/lib-dynamodb@3.1169.0 '
  + '@aws-sdk/client-sqs@3.1169.0 @aws-sdk/client-secrets-manager@3.1169.0 pg@8.23.1';

/**
 * Client files the API imports at runtime (server/*.mjs → src/...), with their own imports.
 * test/lambda-bundle.test.mjs follows the server's imports and fails if one is missing here.
 */
export const API_SRC_FILES = [
  'src/data/catalog.json',
  'src/data/entries.ts',
  'src/characters/cast.ts',
  'src/characters/views.ts',
  'src/lib/crypto.ts',
  'src/dungeon/challenges.ts',
  'src/vis/registry.ts',
  'src/world/locations.ts',
];

const API_SRC_DIRS = [...new Set(API_SRC_FILES.map(file => path.posix.dirname(file)))];

function stageApi(outputDir: string) {
  fs.mkdirSync(path.join(outputDir, 'server'), { recursive: true });
  for (const dir of API_SRC_DIRS) fs.mkdirSync(path.join(outputDir, dir), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, 'package.json'), path.join(outputDir, 'package.json'));
  for (const name of fs.readdirSync(path.join(repoRoot, 'server'))) {
    if (!name.endsWith('.mjs')) continue;
    fs.copyFileSync(path.join(repoRoot, 'server', name), path.join(outputDir, 'server', name));
  }
  for (const file of API_SRC_FILES) fs.copyFileSync(path.join(repoRoot, file), path.join(outputDir, file));
  // Lambda needs DynamoDB + SQS + Secrets Manager clients and pg (TigerData) in the asset.
  execSync(SDK_INSTALL, { cwd: outputDir, stdio: 'inherit' });
}

const apiBundleCommand = [
  'bash', '-c',
  [
    `mkdir -p /asset-output/server ${API_SRC_DIRS.map(dir => `/asset-output/${dir}`).join(' ')}`,
    'cp package.json /asset-output/package.json',
    'cp server/*.mjs /asset-output/server/',
    ...API_SRC_FILES.map(file => `cp ${file} /asset-output/${file}`),
    'cd /asset-output && npm install --omit=dev --no-package-lock '
      + '@aws-sdk/client-dynamodb@3.1169.0 @aws-sdk/lib-dynamodb@3.1169.0 '
      + '@aws-sdk/client-sqs@3.1169.0 @aws-sdk/client-secrets-manager@3.1169.0 pg@8.23.1',
  ].join(' && '),
];

function githubRepo(scope: Construct) {
  const fromContext = scope.node.tryGetContext('githubRepo');
  const repo = (typeof fromContext === 'string' && fromContext) || process.env.GITHUB_REPOSITORY || '';
  return /^[\w.-]+\/[\w.-]+$/.test(repo) ? repo : '';
}

/**
 * Optional custom domain. CloudFront has no fixed IP, so DNS must point at the CloudFront
 * hostname (CNAME, or ALIAS/ANAME/flattening at an apex), never at an A-record IP.
 *   -c siteDomains=example.com,www.example.com
 *   -c siteCertificateArn=arn:aws:acm:us-east-1:ACCOUNT:certificate/ID
 * Env SITE_DOMAINS / SITE_CERTIFICATE_ARN are fallbacks. Empty → the default cloudfront.net host.
 */
function customDomain(scope: Construct) {
  const read = (key: string, env: string) => {
    const value = scope.node.tryGetContext(key);
    return ((typeof value === 'string' ? value : '') || process.env[env] || '').trim();
  };
  const domains = read('siteDomains', 'SITE_DOMAINS')
    .split(',').map(d => d.trim().toLowerCase().replace(/\.$/, '')).filter(Boolean);
  const certificateArn = read('siteCertificateArn', 'SITE_CERTIFICATE_ARN');
  if (!domains.length && !certificateArn) return undefined;
  if (!domains.length || !certificateArn) {
    throw new Error('siteDomains and siteCertificateArn must be set together (or both left empty).');
  }
  for (const d of domains) {
    if (!/^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(d)) {
      throw new Error(`siteDomains: "${d}" is not a valid hostname.`);
    }
  }
  if (!/^arn:aws[\w-]*:acm:us-east-1:\d{12}:certificate\/[\w-]+$/.test(certificateArn)) {
    throw new Error('siteCertificateArn must be an ACM certificate ARN in us-east-1 (CloudFront only reads certificates there).');
  }
  return { domains, certificateArn };
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

    // Prefer Secrets Manager (SPONSOR_SECRET_ARN). Individual env keys are a fallback for
    // existing Gemini settings / first-time bring-up. Placeholders never reach Lambda.
    const sponsorSecretArn = (process.env.SPONSOR_SECRET_ARN || '').trim();
    const tinyfishKey = sponsorSecretArn ? '' : liveSecret(
      process.env.TINYFISH_API_KEY,
      'sk-tinyfish-REPLACE_ME',
    );
    const maritimeKey = sponsorSecretArn ? '' : liveSecret(
      process.env.MARITIME_API_KEY,
      'mk_REPLACE_ME',
    );
    // TigerData (Tiger Cloud Postgres). Prefer TIGER_DATABASE_URL inside the sponsor secret;
    // a plain env URL is a fallback. When neither is set the Lambdas use DynamoDB.
    const tigerUrlEnv = (process.env.TIGER_DATABASE_URL || '').trim();
    const tigerUrl = !sponsorSecretArn && /^postgres(ql)?:\/\/[^<>\s]+$/i.test(tigerUrlEnv) ? tigerUrlEnv : '';
    // Preserve existing Gemini Lambda env when set; optional secret may also supply them.
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const geminiModel = (process.env.GEMINI_MODEL || '').trim();

    const labQueue = new sqs.Queue(this, 'LabRuns', {
      visibilityTimeout: cdk.Duration.seconds(120),
      retentionPeriod: cdk.Duration.days(1),
    });

    const apiCode = lambda.Code.fromAsset(repoRoot, {
      bundling: {
        image: lambda.Runtime.NODEJS_24_X.bundlingImage,
        command: apiBundleCommand,
        local: {
          tryBundle(outputDir: string) {
            stageApi(outputDir);
            return true;
          },
        },
      },
    });

    const sharedEnv: Record<string, string> = {
      TABLE_NAME: accounts.tableName,
      COOKIE_SECURE: '1',
      ...(geminiKey ? { GEMINI_API_KEY: geminiKey } : {}),
      ...(geminiModel ? { GEMINI_MODEL: geminiModel } : {}),
      ...(sponsorSecretArn ? { SPONSOR_SECRET_ARN: sponsorSecretArn } : {}),
      ...(tinyfishKey ? { TINYFISH_API_KEY: tinyfishKey } : {}),
      ...(maritimeKey ? { MARITIME_API_KEY: maritimeKey } : {}),
      ...(tigerUrl ? { TIGER_DATABASE_URL: tigerUrl } : {}),
    };

    const api = new lambda.Function(this, 'AccountsApi', {
      description: 'CryptoWorld registration, sessions, learning progress, research, and lab enqueue.',
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'server/lambda.handler',
      timeout: cdk.Duration.seconds(20),
      memorySize: 256,
      logGroup: apiLogs,
      environment: {
        ...sharedEnv,
        LAB_QUEUE_URL: labQueue.queueUrl,
      },
      code: apiCode,
    });
    accounts.grantReadWriteData(api);
    labQueue.grantSendMessages(api);

    const labWorkerLogs = new logs.LogGroup(this, 'LabWorkerLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const labWorker = new lambda.Function(this, 'LabWorker', {
      description: 'CryptoWorld Maritime lab runner (SQS).',
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'server/lab-worker-lambda.handler',
      timeout: cdk.Duration.seconds(90),
      memorySize: 512,
      logGroup: labWorkerLogs,
      environment: sharedEnv,
      code: apiCode,
    });
    accounts.grantReadWriteData(labWorker);
    labWorker.addEventSource(new SqsEventSource(labQueue, { batchSize: 1 }));

    if (sponsorSecretArn) {
      const secretRead = new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [sponsorSecretArn],
      });
      api.addToRolePolicy(secretRead);
      labWorker.addToRolePolicy(secretRead);
    }

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', { apiName: 'visucrypto-accounts' });
    httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new HttpLambdaIntegration('Accounts', api),
    });
    // Whole-API throttle. The handler's own per-user limits are per Lambda instance, so this caps
    // what a burst of new accounts or a script can spend on Gemini, TinyFish and Maritime.
    const defaultStage = httpApi.defaultStage?.node.defaultChild as apigwv2.CfnStage | undefined;
    if (defaultStage) {
      defaultStage.defaultRouteSettings = { throttlingRateLimit: 25, throttlingBurstLimit: 50 };
    }

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

    // Same CloudFront hostname for / and /api/* — Secure same-origin session cookies.
    const apiDomain = `${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`;
    const domain = customDomain(this);
    const distribution = new cloudfront.Distribution(this, 'SiteCdn', {
      comment: 'CryptoWorld',
      ...(domain ? {
        domainNames: domain.domains,
        certificate: acm.Certificate.fromCertificateArn(this, 'SiteCertificate', domain.certificateArn),
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      } : {}),
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
        description: 'Assumed by GitHub Actions on main to deliver CryptoWorld.',
        maxSessionDuration: cdk.Duration.hours(1),
        // GitHub may issue either repo:OWNER/NAME:ref:... or repo:OWNER@id/NAME@id:ref:...
        assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': [
              `repo:${repo}:ref:refs/heads/main`,
              `repo:${repo.split('/')[0]}@*/${repo.split('/')[1]}@*:ref:refs/heads/main`,
            ],
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
    new cdk.CfnOutput(this, 'DnsTarget', {
      value: distribution.distributionDomainName,
      description: 'Point CNAME (subdomains) or ALIAS/ANAME/flattened CNAME (apex) records here. Not an IP.',
    });
    if (domain) {
      new cdk.CfnOutput(this, 'CustomDomains', { value: domain.domains.map(d => `https://${d}`).join(' ') });
    }
    new cdk.CfnOutput(this, 'DistributionId',{ value: distribution.distributionId });
    new cdk.CfnOutput(this, 'BucketName', { value: site.bucketName });
    new cdk.CfnOutput(this, 'LabQueueUrl', { value: labQueue.queueUrl });
    new cdk.CfnOutput(this, 'SponsorConfig', {
      value: sponsorSecretArn ? 'secrets-manager' : (tinyfishKey || maritimeKey || geminiKey ? 'env' : 'none'),
      description: 'How sponsor keys are supplied (never prints key material).',
    });
  }
}
