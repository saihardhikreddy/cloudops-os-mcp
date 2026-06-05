# Simplified Policy for Testing (rego-lite compatible)
# =====================================================
# This policy uses only rego-lite compatible syntax:
# - deny[msg] { input.resource.type == "x"; ... }
# - Supports: ==, !=, contains()
# - Does NOT support: complex logic, loops, functions

package cloudops

# Rule 1: No unencrypted databases
deny[msg] {
  input.resource.type == "aws_db_instance"
  input.resource.storage_encrypted != "true"
  msg := "RDS database must have storage_encrypted = true"
}

# Rule 2: No hardcoded passwords
deny[msg] {
  input.resource.type == "aws_db_instance"
  input.resource.password
  msg := "Database passwords must not be hardcoded"
}

# Rule 3: No public S3 buckets
deny[msg] {
  input.resource.type == "aws_s3_bucket"
  input.resource.acl == "public-read"
  msg := "S3 buckets must not be public"
}

# Rule 4: Security groups must have tags
deny[msg] {
  input.resource.type == "aws_security_group"
  not input.resource.tags
  msg := "Security groups must have tags"
}
