provider "aws" {
  region = "us-west-2"
}

resource "aws_s3_bucket" "twinmaker_bucket" {
  bucket = "dtfarming-twinmaker-bucket-${var.account_id}"
  acl    = "private"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_iot_sitewise_asset_model" "temperature_model" {
  asset_model_name = "TemperatureSensorModel"

  property {
    name         = "Temperature"
    data_type    = "DOUBLE"
    unit         = "Celsius"
    logical_id   = "temperature"
    type {
      type_name = "Measurement"
    }
  }
}

resource "aws_iot_sitewise_asset_model" "light_model" {
  asset_model_name = "LightSensorModel"

  property {
    name         = "Light"
    data_type    = "DOUBLE"
    unit         = "Lux"
    logical_id   = "light"
    type {
      type_name = "Measurement"
    }
  }
}

resource "aws_iot_sitewise_asset_model" "co2_model" {
  asset_model_name = "CO2SensorModel"

  property {
    name         = "CO2"
    data_type    = "DOUBLE"
    unit         = "PPM"
    logical_id   = "co2"
    type {
      type_name = "Measurement"
    }
  }
}

resource "aws_iot_sitewise_asset_model" "humidity_model" {
  asset_model_name = "HumiditySensorModel"

  property {
    name         = "Humidity"
    data_type    = "DOUBLE"
    unit         = "Percent"
    logical_id   = "humidity"
    type {
      type_name = "Measurement"
    }
  }
}

output "twinmaker_bucket_name" {
  value = aws_s3_bucket.twinmaker_bucket.bucket
}
