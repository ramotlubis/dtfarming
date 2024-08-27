# Infrastructure for DT Farming

Terraform script to set up an AWS environment for Kubernetes, KubeEdge, and Raspberry Pi edge nodes.

This script will create:

- a VPC with two CIDR blocks:
  - 10.10.0.0/16 for cloud resources and
  - 10.11.0.0/16 for edge resources),
- AWS EKS cluster with Auto Scaling Group (ASG) nodes,
- DynamoDB,
- S3 bucket,
- KubeEdge, and support for Raspberry Pi edge nodes
