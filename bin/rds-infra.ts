#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RdsInfraStack } from '../lib/rds-infra-stack';
import {default as config } from '../config/config'

// Setup prefix
let prefix = `${config.naming.company}-${config.naming.dept}-${config.naming.project}`
const ssmRoot = `/${config.naming.company}/${config.naming.dept}/${config.naming.project}`

const app = new cdk.App();
new RdsInfraStack(app, 'RdsInfraStack', {
  prefix: prefix, 
  ssmRoot: ssmRoot,  
});
