import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import rds = require('@aws-cdk/aws-rds');
import secrets = require('@aws-cdk/aws-secretsmanager');
import lambda = require('@aws-cdk/aws-lambda');
import cr = require('@aws-cdk/custom-resources');
import ssm = require('@aws-cdk/aws-ssm');
import iam = require('@aws-cdk/aws-iam');
import {taskPolicyActions } from '../utils/iam';



interface RdsInfraStackProps extends cdk.StackProps {
  prefix: string,
  ssmRoot: string,
  dbadmin: string,
  dbname: string,
  region: string
}

export class RdsInfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: RdsInfraStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'vpc', {
      vpcId: 'vpc-037b1138ae24c3cf9',
      availabilityZones: ['ca-central-1a', 'ca-central-1b'],
      privateSubnetIds: [
          'subnet-0d23d5a56a722ffd2',
          'subnet-0eff0de647a8335bd'
      ]
    });

    // Provision RDS Instance
    const instance = new rds.DatabaseInstance(this, 'Instance', {
      databaseName: `${props.dbname}`,
      instanceIdentifier: `${props.prefix}-${props.dbname}`,
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MEDIUM),
      allocatedStorage: 20,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      masterUsername: `${props.dbadmin}`,
      deletionProtection: false,
      iamAuthentication: true,
      autoMinorVersionUpgrade: true,
      vpc
    })

    const dbSecret = instance.node.tryFindChild('Secret') as rds.DatabaseSecret;
    const cfnSecret = dbSecret.node.defaultChild as secrets.CfnSecret;
    cfnSecret.addPropertyOverride('GenerateSecretString.ExcludeCharacters', '"@/\\;');
    cfnSecret.name = `${props.ssmRoot}/rds/${props.dbname}`
    
    // Rotate the master user password every 30 days
    instance.addRotationSingleUser()

    instance.connections.allowInternally(ec2.Port.allTcp(), 'All traffic within security group')

    // Provision Lambda Layer
    const pythonLayer = new lambda.LayerVersion(this, 'python3Layer', {
      code: lambda.Code.fromAsset('./lambda/layers/python3_layers.zip'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_7],
      description: 'A Python layer for PostgreSQL',
      layerVersionName: `${props.prefix}-rds-sample-python3-layer`
    });

    // Provision Lambda
    const rdsHelper = new lambda.Function(this, 'rdsHelper', {
      code: lambda.Code.asset('./lambda/rds-helper'),
      functionName: `${props.prefix}-rds-sample-helper`,
      handler: 'lambda.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_7,
      layers: [ pythonLayer ],
      timeout: cdk.Duration.minutes(10),
      vpc: vpc,
      securityGroups: instance.connections.securityGroups
    });

    const secretSSMPolicy = new iam.PolicyStatement()
    secretSSMPolicy.addAllResources()
    secretSSMPolicy.addActions(...taskPolicyActions)
    rdsHelper.addToRolePolicy(secretSSMPolicy)

        const provider = new cr.Provider(this, 'provider', {
      onEventHandler: rdsHelper,
    });

    const customResource = new cdk.CustomResource(this, 'customResource', { 
      serviceToken: provider.serviceToken,
      properties: {
        "secret_name": `${props.ssmRoot}/rds/${props.dbname}`,
        "region": `${props.region}`
      }
     });

     // To make sure the custom resource is triggered after instance provisioned
     customResource.node.addDependency(instance);
  }
}
