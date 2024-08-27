provider "aws" {
  region = "us-west-2"
}

# VPC
resource "aws_vpc" "main_vpc" {
  cidr_block = "10.10.0.0/16"
}

resource "aws_vpc" "edge_vpc" {
  cidr_block = "10.11.0.0/16"
}

# Public Subnets for Cloud Resources
resource "aws_subnet" "cloud_public_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = cidrsubnet(aws_vpc.main_vpc.cidr_block, 8, count.index)
  availability_zone       = element(data.aws_availability_zones.available.names, count.index)
  map_public_ip_on_launch = true
}

# Private Subnets for Cloud Resources
resource "aws_subnet" "cloud_private_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.main_vpc.id
  cidr_block              = cidrsubnet(aws_vpc.main_vpc.cidr_block, 8, count.index + 3)
  availability_zone       = element(data.aws_availability_zones.available.names, count.index)
}

# Public Subnets for Edge Resources
resource "aws_subnet" "edge_public_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.edge_vpc.id
  cidr_block              = cidrsubnet(aws_vpc.edge_vpc.cidr_block, 8, count.index)
  availability_zone       = element(data.aws_availability_zones.available.names, count.index)
  map_public_ip_on_launch = true
}

# Private Subnets for Edge Resources
resource "aws_subnet" "edge_private_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.edge_vpc.id
  cidr_block              = cidrsubnet(aws_vpc.edge_vpc.cidr_block, 8, count.index + 3)
  availability_zone       = element(data.aws_availability_zones.available.names, count.index)
}

# Internet Gateway for VPCs
resource "aws_internet_gateway" "cloud_igw" {
  vpc_id = aws_vpc.main_vpc.id
}

resource "aws_internet_gateway" "edge_igw" {
  vpc_id = aws_vpc.edge_vpc.id
}

# Route Tables
resource "aws_route_table" "cloud_public_route_table" {
  vpc_id = aws_vpc.main_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.cloud_igw.id
  }
}

resource "aws_route_table" "edge_public_route_table" {
  vpc_id = aws_vpc.edge_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.edge_igw.id
  }
}

# Associate Public Subnets with Route Tables
resource "aws_route_table_association" "cloud_public_route_table_assoc" {
  count          = 3
  subnet_id      = aws_subnet.cloud_public_subnets[count.index].id
  route_table_id = aws_route_table.cloud_public_route_table.id
}

resource "aws_route_table_association" "edge_public_route_table_assoc" {
  count          = 3
  subnet_id      = aws_subnet.edge_public_subnets[count.index].id
  route_table_id = aws_route_table.edge_public_route_table.id
}

# EKS Cluster
module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "kubeedge-eks-cluster"
  cluster_version = "1.30"
  subnets         = concat(
    aws_subnet.cloud_private_subnets[*].id,
    aws_subnet.edge_private_subnets[*].id
  )
  vpc_id                  = aws_vpc.main_vpc.id
  node_groups = {
    eks_nodes = {
      desired_capacity = 1
      max_capacity     = 3
      min_capacity     = 1
      instance_type    = "t3.medium"
    }
  }
}

# DynamoDB Table for Terraform State Locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

# S3 Bucket for Terraform State Storage
resource "aws_s3_bucket" "terraform_state" {
  bucket = "your-unique-terraform-state-bucket"
  acl    = "private"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "archive"
    enabled = true

    transition {
      days          = 30
      storage_class = "GLACIER"
    }
  }
}

# KubeEdge Setup (Example: install CloudCore on EKS and EdgeCore on Raspberry Pi)
resource "null_resource" "kubeedge_cloudcore" {
  provisioner "local-exec" {
    command = <<EOT
      kubectl apply -f https://raw.githubusercontent.com/kubeedge/kubeedge/release-1.10/build/cloud/installer/kubeedge-installer.yaml
    EOT
  }

  depends_on = [module.eks]
}

resource "null_resource" "kubeedge_edgecore" {
  provisioner "local-exec" {
    command = <<EOT
      ssh pi@your-raspberry-pi-ip 'curl -LO https://raw.githubusercontent.com/kubeedge/kubeedge/release-1.10/build/edge/installer/kubeedge-installer.yaml && kubectl apply -f kubeedge-installer.yaml'
    EOT
  }
}
