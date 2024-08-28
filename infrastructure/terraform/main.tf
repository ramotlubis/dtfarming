provider "aws" {
  region = "us-west-2"
}

# VPC Setup
resource "aws_vpc" "cloud_vpc" {
  cidr_block = "10.10.0.0/16"
}

resource "aws_vpc" "edge_vpc" {
  cidr_block = "10.11.0.0/16"
}

# Public and Private Subnets for Cloud Resources
resource "aws_subnet" "cloud_public_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.cloud_vpc.id
  cidr_block              = cidrsubnet(aws_vpc.cloud_vpc.cidr_block, 8, count.index)
  availability_zone       = element(data.aws_availability_zones.available.names, count.index)
  map_public_ip_on_launch = true
}

resource "aws_subnet" "cloud_private_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.cloud_vpc.id
  cidr_block              = cidrsubnet(aws_vpc.cloud_vpc.cidr_block, 8, count.index + 3)
  availability_zone       = element(data.aws_availability_zones.available.names, count.index)
}

# Public and Private Subnets for Edge Resources
resource "aws_subnet" "edge_public_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.edge_vpc.id
  cidr_block              = cidrsubnet(aws_vpc.edge_vpc.cidr_block, 8, count.index)
  availability_zone       = element(data.aws_availability_zones.available.names, count.index)
  map_public_ip_on_launch = true
}

resource "aws_subnet" "edge_private_subnets" {
  count                   = 3
  vpc_id                  = aws_vpc.edge_vpc.id
  cidr_block              = cidrsubnet(aws_vpc.edge_vpc.cidr_block, 8, count.index + 3)
  availability_zone       = element(data.aws_availability_zones.available.names, count.index)
}

# Internet Gateways
resource "aws_internet_gateway" "cloud_igw" {
  vpc_id = aws_vpc.cloud_vpc.id
}

resource "aws_internet_gateway" "edge_igw" {
  vpc_id = aws_vpc.edge_vpc.id
}

# Route Tables for Public Subnets
resource "aws_route_table" "cloud_public_route_table" {
  vpc_id = aws_vpc.cloud_vpc.id

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

# EKS Cluster Setup
module "eks" {
  source          = "terraform-aws-modules/eks/aws"
  cluster_name    = "digital-twin-eks-cluster"
  cluster_version = "1.30"
  subnets         = aws_subnet.cloud_private_subnets[*].id
  vpc_id          = aws_vpc.cloud_vpc.id
  node_groups = {
    eks_nodes = {
      desired_capacity = 1
      max_capacity     = 3
      min_capacity     = 1
      instance_type    = "t3.medium"
    }
  }
}

# DynamoDB for Centralized NoSQL DB
resource "aws_dynamodb_table" "digital_twin_db" {
  name         = "digital-twin-db"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "DeviceID"

  attribute {
    name = "DeviceID"
    type = "S"
  }
}

# S3 Bucket for Centralized Storage
resource "aws_s3_bucket" "digital_twin_bucket" {
  bucket = "digital-twin-storage-bucket"
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

# API Gateway for Backend Services
resource "aws_apigatewayv2_api" "digital_twin_api" {
  name          = "digital-twin-api"
  protocol_type = "HTTP"
}

# Route 53 Hosted Zone
resource "aws_route53_zone" "digital_twin_zone" {
  name = "digital-twin.example.com"
}

# Monitoring and Alerting Stack with Prometheus and Grafana
module "monitoring" {
  source = "cloudposse/helm-release/aws"
  namespace = "monitoring"
  name      = "prometheus-grafana"
  chart     = "kube-prometheus-stack"
  version   = "19.0.3"
  values    = <<EOF
prometheus:
  prometheusSpec:
    retention: 10d
grafana:
  adminPassword: "your-grafana-password"
EOF
  kubeconfig = module.eks.kubeconfig
}

# Logging Stack with Logstash and Grafana
module "logging" {
  source = "cloudposse/helm-release/aws"
  namespace = "logging"
  name      = "logstash-grafana"
  chart     = "grafana/loki-stack"
  version   = "2.4.1"
  values    = <<EOF
loki:
  enabled: true
EOF
  kubeconfig = module.eks.kubeconfig
}

# CI/CD Stack with Jenkins on Kubernetes
module "jenkins" {
  source = "cloudposse/helm-release/aws"
  namespace = "cicd"
  name      = "jenkins"
  chart     = "jenkins/jenkins"
  version   = "3.1.1"
  values    = <<EOF
master:
  adminPassword: "your-jenkins-password"
EOF
  kubeconfig = module.eks.kubeconfig
}

# Digital Twin Service Stack
resource "kubernetes_deployment" "frontend" {
  metadata {
    name      = "frontend"
    namespace = "digital-twin"
  }
  spec {
    replicas = 2
    selector {
      match_labels = {
        app = "frontend"
      }
    }
    template {
      metadata {
        labels = {
          app = "frontend"
        }
      }
      spec {
        container {
          name  = "frontend"
          image = "your-frontend-image:latest"
        }
      }
    }
  }
}

resource "kubernetes_deployment" "backend" {
  metadata {
    name      = "backend"
    namespace = "digital-twin"
  }
  spec {
    replicas = 2
    selector {
      match_labels = {
        app = "backend"
      }
    }
    template {
      metadata {
        labels = {
          app = "backend"
        }
      }
      spec {
        container {
          name  = "backend"
          image = "your-backend-image:latest"
        }
      }
    }
  }
}

# Unit Testing and Code Quality with SonarQube
module "sonarqube" {
  source = "cloudposse/helm-release/aws"
  namespace = "cicd"
  name      = "sonarqube"
  chart     = "sonarqube/sonarqube"
  version   = "9.0.0"
  values    = <<EOF
postgresql:
  enabled: false
EOF
  kubeconfig = module.eks.kubeconfig
}

# KubeEdge Setup
resource "null_resource" "kubeedge_cloudcore" {
  provisioner "local-exec" {
    command = <<EOT
      KUBECONFIG=${module.eks.kubeconfig} kubectl apply -f https://raw.githubusercontent.com/kubeedge/kubeedge/release-1.10/build/cloud/installer/kubeedge-installer.yaml
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

# API Gateway for Backend Services and CloudFront for Frontend
resource "aws_cloudfront_distribution" "digital_twin_frontend" {
  origin {
    domain_name = "${module.eks.cluster_endpoint}"
    origin_id   = "digital-twin-frontend-origin"
  }
  enabled = true
  default_cache_behavior {
    target_origin_id       = "digital-twin-frontend-origin"
    viewer_protocol_policy = "redirect-to-https"
  }
}

resource "aws_apigatewayv2_stage" "digital_twin_stage" {
  api_id      = aws_apigatewayv2_api.digital_twin_api.id
  name        = "prod"
  description = "Production stage for Digital Twin API"
}
