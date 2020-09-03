#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RdsInfraStack } from '../lib/rds-infra-stack';
import {default as config } from '../config/config'

// Setup prefix
let prefix = `${config.naming.company}-${config.naming.dept}-${config.naming.project}`
let ssmRoot = `/${config.naming.company}/${config.naming.dept}/${config.naming.project}`

const app = new cdk.App();
new RdsInfraStack(app, 'sample-rds-infra-stack', {
  prefix: prefix, 
  ssmRoot: ssmRoot,
  dbadmin: config.database.admin,
  dbname: config.database.dbname,
  region: config.deployment.region
});
