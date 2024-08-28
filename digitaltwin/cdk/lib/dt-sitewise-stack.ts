import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnAssetModel, CfnAsset } from 'aws-cdk-lib/aws-iotsitewise';
import { CfnWorkspace, CfnEntity } from 'aws-cdk-lib/aws-twinmaker';

export class CdkIotSitewiseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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
      role: 'your-twinmaker-role-arn',
      s3Location: 's3://your-twinmaker-bucket'
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
  }
}
