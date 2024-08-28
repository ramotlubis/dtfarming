output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.digital_twin_db.name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.digital_twin_bucket.bucket
}

output "api_gateway_url" {
  value = aws_apigatewayv2_api.digital_twin_api.api_endpoint
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.digital_twin_frontend.domain_name
}

output "grafana_url" {
  value = "http://your-grafana-url"
}

output "jenkins_url" {
  value = "http://your-jenkins-url"
}
