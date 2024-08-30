import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { CfnGreengrassGroup, CfnGreengrassCoreDefinition } from 'aws-cdk-lib/aws-greengrass';
import { CfnGateway } from 'aws-cdk-lib/aws-iotsitewise';

export class CdkEdgeStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create an IAM role for Greengrass
    const greengrassRole = new Role(this, 'GreengrassRole', {
      assumedBy: new ServicePrincipal('greengrass.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSIoTGreengrassResourceAccessRolePolicy'),
      ],
    });

    // Define the Greengrass core for the Raspberry Pi
    const coreDefinition = new CfnGreengrassCoreDefinition(this, 'GreengrassCoreDefinition', {
      name: 'RaspberryPiGreengrassCore',
      initialVersion: {
        cores: [{
          id: 'GreengrassCore',
          certificateArn: 'arn:aws:iot:us-west-2:123456789012:cert/your-certificate-id',
          thingArn: 'arn:aws:iot:us-west-2:123456789012:thing/your-thing-name',
          syncShadow: true,
        }],
      },
    });

    // Define an IoT Greengrass Group for SiteWise Edge
    const greengrassGroup = new CfnGreengrassGroup(this, 'GreengrassGroup', {
      name: 'SiteWiseEdgeGroup',
      roleArn: greengrassRole.roleArn,
      initialVersion: {
        coreDefinitionVersionArn: coreDefinition.attrLatestVersionArn,
      },
    });

    // Create an AWS IoT SiteWise Edge gateway
    const gateway = new CfnGateway(this, 'SiteWiseEdgeGateway', {
      gatewayName: 'RaspberryPiSiteWiseEdgeGateway',
      gatewayPlatform: {
        greengrass: {
          groupArn: greengrassGroup.attrArn,
        },
      },
      gatewayCapabilitySummaries: [
        {
          capabilityNamespace: 'aws.iot.sitewise.collector',
          capabilityConfiguration: JSON.stringify({
            sources: {
              Modbus: [],
              OPCUA: [],
            },
          }),
        },
        {
          capabilityNamespace: 'aws.iot.sitewise.processor',
          capabilityConfiguration: JSON.stringify({
            computations: [
              {
                assetModelId: 'your-asset-model-id',
                computationId: 'your-computation-id',
              },
            ],
          }),
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'GreengrassGroupArn', { value: greengrassGroup.attrArn });
  }
}
