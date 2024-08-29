import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnAssetModel, CfnAsset } from 'aws-cdk-lib/aws-iotsitewise';
import { CfnWorkspace, CfnEntity } from 'aws-cdk-lib/aws-twinmaker';
import { Role, ServicePrincipal, ManagedPolicy, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';

export class CdkIotSitewiseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create an S3 bucket for TwinMaker with the prefix "dtfarming-"
    const twinmakerBucket = new Bucket(this, 'TwinMakerBucket', {
      bucketName: `dtfarming-twinmaker-bucket-${this.account}`,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
    });

    // Create an IAM role for TwinMaker
    const twinmakerRole = new Role(this, 'TwinMakerRole', {
      assumedBy: new ServicePrincipal('iottwinmaker.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
      inlinePolicies: {
        TwinMakerPolicy: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: [
                'iotsitewise:BatchPutAssetPropertyValue',
                'iotsitewise:DescribeAsset',
                'iotsitewise:DescribeAssetModel',
                'iotsitewise:GetAssetPropertyValue',
                'iotsitewise:GetAssetPropertyValueHistory',
                'iottwinmaker:*',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Function to create SiteWise Asset Models
    const createAssetModel = (name: string, propertyName: string, unit: string) => {
      return new CfnAssetModel(this, `${name}Model`, {
        assetModelName: `${name}SensorModel`,
        assetModelProperties: [{
          name: propertyName,
          dataType: 'DOUBLE',
          unit: unit,
          logicalId: propertyName.toLowerCase(),
          type: {
            typeName: 'Measurement'
          }
        }]
      });
    };

    // Create Asset Models
    const temperatureModel = createAssetModel('Temperature', 'Temperature', 'Celsius');
    const lightModel = createAssetModel('Light', 'Light', 'Lux');
    const co2Model = createAssetModel('CO2', 'CO2', 'PPM');
    const humidityModel = createAssetModel('Humidity', 'Humidity', 'Percent');

    // Function to create SiteWise Assets
    const createAsset = (name: string, model: CfnAssetModel) => {
      return new CfnAsset(this, `${name}Asset`, {
        assetName: `${name}Sensor`,
        assetModelId: model.ref
      });
    };

    // Create Assets
    const temperatureAsset = createAsset('Temperature', temperatureModel);
    const lightAsset = createAsset('Light', lightModel);
    const co2Asset = createAsset('CO2', co2Model);
    const humidityAsset = createAsset('Humidity', humidityModel);

    // Define IoT TwinMaker Workspace
    const twinmakerWorkspace = new CfnWorkspace(this, 'TwinMakerWorkspace', {
      workspaceId: 'MyWorkspace',
      role: twinmakerRole.roleArn,
      s3Location: twinmakerBucket.bucketArn
    });

    // Define IoT TwinMaker Entities
    const createTwinMakerEntity = (name: string) => {
      return new CfnEntity(this, `${name}Entity`, {
        entityId: `${name}SensorEntity`,
        entityName: `${name}Sensor`,
        workspaceId: twinmakerWorkspace.ref
      });
    };

    // Create Entities
    createTwinMakerEntity('Temperature');
    createTwinMakerEntity('Light');
    createTwinMakerEntity('CO2');
    createTwinMakerEntity('Humidity');

    // Outputs for connecting Python agent to SiteWise
    new cdk.CfnOutput(this, 'TemperatureAssetId', { value: temperatureAsset.attrAssetId });
    new cdk.CfnOutput(this, 'TemperaturePropertyId', { value: temperatureModel.attrAssetModelProperties.find(p => p.name === 'Temperature').id });

    new cdk.CfnOutput(this, 'LightAssetId', { value: lightAsset.attrAssetId });
    new cdk.CfnOutput(this, 'LightPropertyId', { value: lightModel.attrAssetModelProperties.find(p => p.name === 'Light').id });

    new cdk.CfnOutput(this, 'CO2AssetId', { value: co2Asset.attrAssetId });
    new cdk.CfnOutput(this, 'CO2PropertyId', { value: co2Model.attrAssetModelProperties.find(p => p.name === 'CO2').id });

    new cdk.CfnOutput(this, 'HumidityAssetId', { value: humidityAsset.attrAssetId });
    new cdk.CfnOutput(this, 'HumidityPropertyId', { value: humidityModel.attrAssetModelProperties.find(p => p.name === 'Humidity').id });

    // Output the TwinMaker Role ARN and S3 Bucket Name
    new cdk.CfnOutput(this, 'TwinMakerRoleArn', { value: twinmakerRole.roleArn });
    new cdk.CfnOutput(this, 'TwinMakerBucketName', { value: twinmakerBucket.bucketName });
  }
}
