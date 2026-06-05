# Enterprise Governance Policy (Open Policy Agent / Rego)
# ========================================================
# This policy enforces corporate compliance requirements:
# 1. All resources must be encrypted
# 2. All resources must have mandatory tags
# 3. No hardcoded credentials
# 4. No public S3 buckets
# 5. RDS must be multi-AZ
# 6. EC2 instances must be in private subnets

package cloudops

# Rule 1: Encryption requirement
deny[msg] {
  input.resource.type == "aws_db_instance"
  input.resource.storage_encrypted != "true"
  msg := "RDS database must have storage_encrypted = true (encryption required by SOC2)"
}

# Rule 2: Mandatory tags
deny[msg] {
  input.resource.type == "aws_instance"
  not input.resource.tags
  msg := "EC2 instances must have tags (Environment, Owner, CostCenter required)"
}

deny[msg] {
  input.resource.type == "aws_db_instance"
  not input.resource.tags
  msg := "RDS instances must have tags (Environment, Owner, CostCenter required)"
}

deny[msg] {
  input.resource.type == "aws_security_group"
  not input.resource.tags
  msg := "Security groups must have tags (Environment, Owner required)"
}

# Rule 3: No hardcoded credentials
deny[msg] {
  input.resource.type == "aws_db_instance"
  input.resource.password
  msg := "Database passwords must not be hardcoded; use AWS Secrets Manager or random_password resource"
}

# Rule 4: No public S3 buckets
deny[msg] {
  input.resource.type == "aws_s3_bucket"
  input.resource.acl == "public-read"
  msg := "S3 buckets must not be public (acl must be private)"
}

deny[msg] {
  input.resource.type == "aws_s3_bucket"
  input.resource.acl == "public-read-write"
  msg := "S3 buckets must not be public (acl must be private)"
}

# Rule 5: RDS multi-AZ requirement
deny[msg] {
  input.resource.type == "aws_db_instance"
  input.resource.multi_az != "true"
  msg := "RDS instances must have multi_az = true for high availability (production requirement)"
}

# Rule 6: EC2 instances in private subnets
deny[msg] {
  input.resource.type == "aws_instance"
  input.resource.associate_public_ip_address == "true"
  msg := "EC2 instances must not have public IP addresses; use NAT Gateway for egress"
}

# Rule 7: No skip_final_snapshot for production databases
deny[msg] {
  input.resource.type == "aws_db_instance"
  input.resource.skip_final_snapshot == "true"
  msg := "Production databases must not skip final snapshots (skip_final_snapshot must be false)"
}

# Rule 8: Backup retention requirement
deny[msg] {
  input.resource.type == "aws_db_instance"
  input.resource.backup_retention_period
  to_number(input.resource.backup_retention_period) < 7
  msg := "RDS backup_retention_period must be >= 7 days (compliance requirement)"
}
