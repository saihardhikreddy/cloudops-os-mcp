package cloudops.governance

# CloudOps OS — sample enterprise governance policy (Open Policy Agent / Rego)
#
# This file is a genuine .rego input to the `analyze_terraform` MCP tool's
# `rego_policy` parameter. It is evaluated with the real `opa` CLI when
# available on PATH, and with the bundled rego-lite fallback interpreter
# otherwise (see src/modules/terraform/policy.engine.ts). Edit this file —
# or write your own — to add organization-specific rules WITHOUT touching
# the TypeScript pipeline code.
#
# Supported condition shapes in the rego-lite fallback:
#   input.resource.<field> == "value"
#   input.resource.<field> != "value"
#   contains(input.resource.<field>, "substring")

deny[msg] {
	input.resource.type == "aws_s3_bucket"
	msg := "S3 buckets must not be declared without an explicit encryption configuration"
}

deny[msg] {
	input.resource.type == "aws_db_instance"
	input.resource.publicly_accessible == "true"
	msg := "RDS instances must not set publicly_accessible = true"
}

deny[msg] {
	input.resource.type == "aws_instance"
	contains(input.resource.instance_type, "large")
	msg := "Large+ instance families require FinOps sign-off before merge; flagging for manual review"
}
