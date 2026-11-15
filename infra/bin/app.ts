#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VisuCryptoStack } from '../lib/visucrypto-stack';

const app = new cdk.App();
new VisuCryptoStack(app, 'VisuCrypto', {
  description: 'VisuCrypto site, account API, and GitHub delivery role.',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
