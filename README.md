# Sample-RDS-Infra
**Note: This is not Production grade and simply meant as a demo**

## Description

This project provisions a RDS PostgreSQL DB and executes a SQL script to deploy the DB schema. The DB credentials are stored in AWS Secrets Manager and are rotated every 30 days.

## Instructions

### Install CDK

npm install -g aws-cdk

### Configure

Update config/config.ts
Update lib/rds-infra-stack.ts
Update schema.sql in lambda/rds-helper

### Install Dependencies

npm install
npm run build

### Deploy

cdk deploy --require-approval never
