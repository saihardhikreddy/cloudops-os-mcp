# Example Terraform input for the CloudOps OS `analyze_terraform` MCP tool.
# Pass this file's contents as `terraform_code`.

provider "aws" {
  region = "us-west-1"
}

resource "aws_security_group" "web_sg" {
  name   = "web-server-sg"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web_app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "m5.large"

  ebs_block_device {
    device_name = "/dev/sda1"
    volume_size = 100
    volume_type = "gp2"
  }
}

resource "aws_nat_gateway" "nat" {
  allocation_id = "eipalloc-12345"
  subnet_id     = "subnet-6789a"
}

resource "aws_db_instance" "primary" {
  engine              = "postgres"
  instance_class      = "db.t3.medium"
  publicly_accessible = "true"
}
