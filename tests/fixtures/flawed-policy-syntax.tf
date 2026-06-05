# Flawed Policy & Syntax Configuration
# ======================================
# This configuration has POLICY COMPLIANCE and SYNTAX issues:
# - Unauthorized region (eu-west-2 vs approved eu-central-1)
# - Exposed SSH port to 0.0.0.0/0 (security violation)
# - Missing mandatory compliance tags
# - Malformed HCL (missing closing brace)
# - Unencrypted RDS database
#
# Expected findings:
# - GOV-001: Unauthorized region (eu-west-2 -> eu-central-1)
# - GOV-002: Exposed SSH port (0.0.0.0/0 -> 10.0.0.0/8)
# - GOV-003: Missing compliance tags
# - SYNTAX: Bracket mismatch (Release agent should catch)
# - REGO: Custom policy violations (if .rego supplied)

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-west-2"  # FLAGGED: Unauthorized region (SCP violation)
}

# ============================================================================
# VPC & Networking
# ============================================================================

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "eu-west-2a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "eu-west-2a"
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ============================================================================
# SECURITY VIOLATIONS
# ============================================================================

resource "aws_security_group" "admin" {
  name   = "admin-sg"
  vpc_id = aws_vpc.main.id

  # FLAGGED: Exposed SSH port to entire internet
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # CRITICAL: Should be restricted to corporate VPN
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # FLAGGED: Missing compliance tags
}

# ============================================================================
# COMPUTE INSTANCE (Missing Tags)
# ============================================================================

resource "aws_instance" "admin_server" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.admin.id]

  ebs_block_device {
    device_name = "/dev/sda1"
    volume_size = 50
    volume_type = "gp3"
  }

  # FLAGGED: Missing mandatory compliance tags
}

# ============================================================================
# UNENCRYPTED DATABASE (Policy Violation)
# ============================================================================

resource "aws_db_subnet_group" "main" {
  name       = "admin-db-subnet-group"
  subnet_ids = [aws_subnet.private.id]
}

resource "aws_db_instance" "admin_db" {
  identifier     = "admin-postgres"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.micro"

  allocated_storage = 20
  storage_type     = "gp3"
  storage_encrypted = false  # FLAGGED: Unencrypted database (policy violation)

  db_name  = "admindb"
  username = "postgres"
  password = "hardcoded-password-123"  # FLAGGED: Hardcoded credentials

  db_subnet_group_name = aws_db_subnet_group.main.name
  skip_final_snapshot  = true

  # FLAGGED: Missing compliance tags
}

# ============================================================================
# MALFORMED HCL (Syntax Error)
# ============================================================================

resource "aws_s3_bucket" "logs" {
  bucket = "admin-logs-bucket"

  # FLAGGED: Missing closing brace for tags block
  tags = {
    Name = "admin-logs"
    Environment = "Production"
    # Missing closing brace here causes syntax error
