# Flawed Cost Configuration
# ==========================
# This configuration has COST OPTIMIZATION issues:
# - Over-provisioned compute (m5.2xlarge for static site)
# - Legacy gp2 storage volumes (should be gp3)
# - Inefficient NAT Gateway usage for internal AWS API calls
# - No spot instance configuration
#
# Expected findings:
# - CST-001: Over-provisioned compute (m5.2xlarge -> t3.medium)
# - CST-002: Legacy gp2 storage (gp2 -> gp3)
# - RTE-001: NAT Gateway tax (replace with VPC Endpoints)
# Cost impact: ~$250/month -> ~$80/month (68% savings)

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
  region = "us-east-1"
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
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "us-east-1a"
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
  depends_on = [aws_internet_gateway.main]
}

# INEFFICIENT: NAT Gateway for internal AWS API calls
resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id
  depends_on    = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block      = "0.0.0.0/0"
    gateway_id      = aws_internet_gateway.main.id
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}

# ============================================================================
# Security Groups
# ============================================================================

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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
}

# ============================================================================
# OVER-PROVISIONED COMPUTE
# ============================================================================

resource "aws_instance" "web_app" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "m5.2xlarge"  # FLAGGED: Over-provisioned (8 vCPU, 32GB RAM for static site)
  subnet_id              = aws_subnet.private.id
  vpc_security_group_ids = [aws_security_group.web.id]

  # FLAGGED: Legacy gp2 storage
  ebs_block_device {
    device_name = "/dev/sda1"
    volume_size = 100
    volume_type = "gp2"  # FLAGGED: Should be gp3 (20% cheaper)
  }

  tags = {
    Name = "web-app-server"
  }
}

# ============================================================================
# LEGACY STORAGE
# ============================================================================

resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 500
  type              = "gp2"  # FLAGGED: Legacy storage type

  tags = {
    Name = "data-volume"
  }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.web_app.id
}

# ============================================================================
# Outputs
# ============================================================================

output "instance_id" {
  value = aws_instance.web_app.id
}

output "instance_type" {
  value = aws_instance.web_app.instance_type
}
