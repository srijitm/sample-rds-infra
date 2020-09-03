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
  ssmRoot: string
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
      ],
      vpcCidrBlock: '172.30.0.0/16'
    });

    // Provision secret
    // const instanceSecret = new secrets.Secret(this, 'InstanceSecret', {
    //   secretName: `${props.ssmRoot}/rds/sample/sample-db`,
    //   description: "RDS credentials"
    // })

    // Provision RDS Instance
    const instance = new rds.DatabaseInstance(this, 'Instance', {
      databaseName: 'sampledb',
      instanceIdentifier: `${props.prefix}-sampledb`,
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MEDIUM),
      allocatedStorage: 20,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      masterUsername: 'sampleadmin',
      deletionProtection: false,
      iamAuthentication: true,
      autoMinorVersionUpgrade: true,
    //  masterUserPassword: instanceSecret.secretValue,
      vpc
    })

    const dbSecret = instance.node.tryFindChild('Secret') as rds.DatabaseSecret;
    const cfnSecret = dbSecret.node.defaultChild as secrets.CfnSecret;
    cfnSecret.addPropertyOverride('GenerateSecretString.ExcludeCharacters', '"@/\\;');
    cfnSecret.name = `${props.ssmRoot}/rds/sample/sample-db`
    

    new ssm.StringParameter(this, 'RDSdBHostName', {
      description: `Sample DB Host Name`,
      parameterName: `${props.ssmRoot}/rds/sample/dbhostname`,
      stringValue: instance.dbInstanceEndpointAddress.toString()
    })

    new ssm.StringParameter(this, 'RDSdBName', {
      description: `Sample DB Name`,
      parameterName: `${props.ssmRoot}/rds/sample/dbname`,
      stringValue: 'sampledb'
    })

    new ssm.StringParameter(this, 'RDSdBUser', {
      description: `Sample DB Host User`,
      parameterName: `${props.ssmRoot}/rds/sample/dbuser`,
      stringValue: 'sampleadmin'
    })
    
    new ssm.StringParameter(this, 'RDSDBPort', {
      description: `Sample DB Host Port`,
      parameterName: `${props.ssmRoot}/rds/sample/dbport`,
      stringValue: instance.dbInstanceEndpointPort.toString()
    })

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

    // TODO: Test to make sure this is triggered after instance provisioned
    const provider = new cr.Provider(this, 'provider', {
      onEventHandler: rdsHelper
    });

    new cdk.CustomResource(this, 'customResource', { 
      serviceToken: provider.serviceToken,
      properties: {
        "db_host": instance.instanceEndpoint,
        "db_name": 'sampledb',
        "db_user": 'sampleadmin',
        "db_port:": instance.dbInstanceEndpointPort.toString()
      }
     });
  }
}
