import * as cdk from 'aws-cdk-lib';
import { Vpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Cluster, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

export class DtFarmingkDigitalTwinStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // VPC for Cloud Resources
    const cloudVpc = new Vpc(this, 'CloudVpc', {
      cidr: '10.10.0.0/16',
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-subnet',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // VPC for Edge Resources
    const edgeVpc = new Vpc(this, 'EdgeVpc', {
      cidr: '10.11.0.0/16',
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-subnet',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // EKS Cluster
    const eksCluster = new Cluster(this, 'DigitalTwinEksCluster', {
      vpc: cloudVpc,
      defaultCapacity: 1,
      version: KubernetesVersion.V1_30,
    });

    // DynamoDB Table
    const dynamoDbTable = new Table(this, 'DigitalTwinTable', {
      partitionKey: { name: 'DeviceID', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // S3 Bucket for Centralized Storage
    const s3Bucket = new Bucket(this, 'DigitalTwinBucket', {
      versioned: true,
      encryption: BucketEncryption.S3_MANAGED,
    });

    // API Gateway
    const apiGateway = new HttpApi(this, 'DigitalTwinApi', {
      description: 'API Gateway for Digital Twin Backend',
    });

    // Route 53 Hosted Zone
    const hostedZone = new HostedZone(this, 'DigitalTwinHostedZone', {
      zoneName: 'digital-twin.example.com',
    });

    // CloudFront Distribution for Frontend
    const originAccessIdentity = new OriginAccessIdentity(this, 'OAI');
    const cloudFrontDistribution = new Distribution(this, 'DigitalTwinFrontendDistribution', {
      defaultBehavior: {
        origin: {
          domainName: `${apiGateway.apiId}.execute-api.${this.region}.amazonaws.com`,
          originPath: '/prod',
          s3OriginSource: {
            s3BucketSource: s3Bucket,
            originAccessIdentity,
          },
        },
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    // IAM Role for Kubernetes Services
    const kubernetesServiceRole = new Role(this, 'KubernetesServiceRole', {
      assumedBy: new ServicePrincipal('eks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'),
      ],
    });

    // Monitoring Stack (Prometheus and Grafana)
    const monitoringAsset = new Asset(this, 'MonitoringAsset', {
      path: path.join(__dirname, '../assets/monitoring'),
    });
    monitoringAsset.grantRead(eksCluster.adminRole);

    // Logging Stack (Logstash and Grafana)
    const loggingAsset = new Asset(this, 'LoggingAsset', {
      path: path.join(__dirname, '../assets/logging'),
    });
    loggingAsset.grantRead(eksCluster.adminRole);

    // CI/CD Stack (Jenkins on Kubernetes)
    const cicdAsset = new Asset(this, 'CICDAsset', {
      path: path.join(__dirname, '../assets/cicd'),
    });
    cicdAsset.grantRead(eksCluster.adminRole);

    // Deploy KubeEdge CloudCore on EKS
    const kubeEdgeCloudCoreAsset = new Asset(this, 'KubeEdgeCloudCoreAsset', {
      path: path.join(__dirname, '../assets/kubeedge-cloudcore'),
    });
    kubeEdgeCloudCoreAsset.grantRead(eksCluster.adminRole);

    // Raspberry Pi Edge Node Configuration (using KubeEdge EdgeCore)
    const kubeEdgeEdgeCoreAsset = new Asset(this, 'KubeEdgeEdgeCoreAsset', {
      path: path.join(__dirname, '../assets/kubeedge-edgecore'),
    });

    // Outputs
    new cdk.CfnOutput(this, 'ClusterName', { value: eksCluster.clusterName });
    new cdk.CfnOutput(this, 'DynamoDBTableName', { value: dynamoDbTable.tableName });
    new cdk.CfnOutput(this, 'S3BucketName', { value: s3Bucket.bucketName });
    new cdk.CfnOutput(this, 'ApiGatewayUrl', { value: apiGateway.url! });
    new cdk.CfnOutput(this, 'CloudFrontDomainName', { value: cloudFrontDistribution.domainName });
  }
}
