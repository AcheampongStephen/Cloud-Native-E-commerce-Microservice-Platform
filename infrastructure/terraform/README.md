# Terraform Infrastructure Setup (Step 3)

This document explains how I built the AWS network foundation for the e‑commerce platform using Terraform.  
It covers the full VPC setup, subnets, routing, NAT gateways, and remote S3 backend for state management.

---

## Overview

This step creates the base infrastructure that every microservice will run on.  
You will provision:

- A dedicated VPC
- Three public subnets (spread across Availability Zones)
- Three private subnets
- An Internet Gateway
- Three NAT Gateways
- Public and private route tables
- Remote Terraform state stored in S3

This layout follows production‑grade AWS architecture standards.

---

## Folder Structure

```
infrastructure/
  terraform/
    main.tf
    variables.tf
    outputs.tf
```

---

## 1. main.tf

This file defines your VPC and networking resources as well as the Terraform backend.

```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "ecommerce-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "ecommerce-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "ecommerce-igw"
  }
}

# Public Subnets (3 AZs)
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "ecommerce-public-subnet-${count.index + 1}"
    Type = "public"
  }
}

# Private Subnets (3 AZs)
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "ecommerce-private-subnet-${count.index + 1}"
    Type = "private"
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name = "ecommerce-nat-eip-${count.index + 1}"
  }
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "ecommerce-nat-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "ecommerce-public-rt"
  }
}

# Route Tables for Private Subnets
resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "ecommerce-private-rt-${count.index + 1}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

data "aws_availability_zones" "available" {
  state = "available"
}
```

---

## 2. variables.tf

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ecommerce"
}
```

---

## 3. outputs.tf

These outputs will be used by later stages (ECS, RDS, etc.).

```hcl
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

---

## Deploying the VPC

Run the following commands from inside the Terraform folder:

```bash
cd infrastructure/terraform
```

### One-time: Create S3 backend for Terraform state

```bash
aws s3 mb s3://ecommerce-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket ecommerce-terraform-state --versioning-configuration Status=Enabled
```

### Initialize and apply the Terraform configuration

```bash
terraform init
terraform plan
terraform apply
```

Approve the plan when prompted.

---

## After Deployment

Terraform will output:

- VPC ID
- Public subnet IDs
- Private subnet IDs

These values are required for future steps such as:

- ECS cluster creation
- ALB deployment
- RDS subnet groups
- Security groups
- Internal routing setup

---

## Cleanup

To destroy the infrastructure:

```bash
terraform destroy
```

Use this only for testing or development environments.

---

## Next Steps

Now that the VPC exists, the next stage typically includes:

- Deploying ECS or Lambda into the private subnets
- Creating an Application Load Balancer in the public subnets
- Connecting databases such as RDS or MongoDB Atlas
- Adding WAF, CloudWatch logging, and IAM roles

This VPC is the foundation of the entire microservices architecture.
