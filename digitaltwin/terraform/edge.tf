provider "aws" {
  region = "us-west-2"
}

resource "aws_iam_role" "greengrass_role" {
  name = "greengrass-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect    = "Allow",
        Principal = {
          Service = "greengrass.amazonaws.com"
        },
        Action    = "sts:AssumeRole"
      },
    ],
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSIoTGreengrassResourceAccessRolePolicy",
  ]
}

resource "aws_greengrass_core_definition" "core_definition" {
  name = "RaspberryPiGreengrassCore"

  initial_version {
    core {
      id               = "GreengrassCore"
      certificate_arn  = "arn:aws:iot:us-west-2:123456789012:cert/your-certificate-id"
      thing_arn        = "arn:aws:iot:us-west-2:123456789012:thing/your-thing-name"
      sync_shadow      = true
    }
  }
}

resource "aws_greengrass_group" "greengrass_group" {
  name      = "SiteWiseEdgeGroup"
  role_arn  = aws_iam_role.greengrass_role.arn

  initial_version {
    core_definition_version_arn = aws_greengrass_core_definition.core_definition.latest_version_arn
  }
}

resource "aws_iot_sitewise_gateway" "sitewise_gateway" {
  gateway_name = "RaspberryPiSiteWiseEdgeGateway"

  gateway_platform {
    greengrass {
      group_arn = aws_greengrass_group.greengrass_group.arn
    }
  }

  gateway_capability_summaries = [
    {
      capability_namespace = "aws.iot.sitewise.collector"
      capability_configuration = jsonencode({
        sources = {
          Modbus = []
          OPCUA  = []
        }
      })
    },
    {
      capability_namespace = "aws.iot.sitewise.processor"
      capability_configuration = jsonencode({
        computations = [
          {
            assetModelId   = "your-asset-model-id"
            computationId  = "your-computation-id"
          }
        ]
      })
    }
  ]
}

output "greengrass_group_arn" {
  value = aws_greengrass_group.greengrass_group.arn
}
