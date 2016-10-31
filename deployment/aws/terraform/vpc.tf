############
## VPC
############

resource "aws_vpc" "kubernetes" {
  cidr_block = "${var.vpc_cidr}"
  enable_dns_hostnames = true

  tags {
    Name = "${var.vpc_name}"
    Owner = "${var.owner}"
    Application = "${var.application}"
    Confidentiality = "${var.confidentality}"
    Costcenter = "${var.costcenter}"
  }
}

# DHCP Options are not actually required, being identical to the Default Option Set
resource "aws_vpc_dhcp_options" "dns_resolver" {
  domain_name = "${region}.compute.internal"
  domain_name_servers = ["AmazonProvidedDNS"]

  tags {
    Name = "${var.vpc_name}"
    Owner = "${var.owner}"
    Application = "${var.application}"
    Confidentiality = "${var.confidentality}"
    Costcenter = "${var.costcenter}"
  }
}

resource "aws_vpc_dhcp_options_association" "dns_resolver" {
  vpc_id ="${aws_vpc.kubernetes.id}"
  dhcp_options_id = "${aws_vpc_dhcp_options.dns_resolver.id}"
}

##########
# Keypair
##########

#resource "aws_key_pair" "default_keypair" {
#  key_name = "${var.default_keypair_name}"
#  public_key = "${var.default_keypair_public_key}"
#}


############
## Subnets
############

# Subnet (public)
resource "aws_subnet" "kubernetes" {
  vpc_id = "${aws_vpc.kubernetes.id}"
  cidr_block = "${var.vpc_cidr}"
  availability_zone = "${var.zone}"

  tags {
    Name = "kubernetes"
    Owner = "${var.owner}"
    Application = "${var.application}"
    Confidentiality = "${var.confidentality}"
    Costcenter = "${var.costcenter}"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = "${aws_vpc.kubernetes.id}"
  tags {
    Name = "kubernetes"
    Owner = "${var.owner}"
    Application = "${var.application}"
    Confidentiality = "${var.confidentality}"
    Costcenter = "${var.costcenter}"
  }
}

############
## Routing
############

resource "aws_route_table" "kubernetes" {
    vpc_id = "${aws_vpc.kubernetes.id}"

    # Default route through Internet Gateway
    route {
      cidr_block = "0.0.0.0/0"
      gateway_id = "${aws_internet_gateway.gw.id}"
    }

    tags {
      Name = "kubernetes"
      Owner = "${var.owner}"
      Application = "${var.application}"
      Confidentiality = "${var.confidentality}"
      Costcenter = "${var.costcenter}"
    }
}

resource "aws_route_table_association" "kubernetes" {
  subnet_id = "${aws_subnet.kubernetes.id}"
  route_table_id = "${aws_route_table.kubernetes.id}"
}


############
## Security
############

resource "aws_security_group" "kubernetes" {
  vpc_id = "${aws_vpc.kubernetes.id}"
  name = "kubernetes"

  tags {
    Name = "kubernetes"
    Owner = "${var.owner}"
    Application = "${var.application}"
    Confidentiality = "${var.confidentality}"
    Costcenter = "${var.costcenter}"
  }
}

resource "aws_security_group_rule" "allow_all_outbound" {
    type = "egress"
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    security_group_id = "${aws_security_group.kubernetes.id}"
}

resource "aws_security_group_rule" "allow_all_from_control_host" {
    count = "${length(var.control_cidr)}"
    type = "ingress"
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["${var.control_cidr[count.index]}"]
    security_group_id = "${aws_security_group.kubernetes.id}"
}

resource "aws_security_group_rule" "allow_all_from_vpc" {
    type = "ingress"
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["${var.vpc_cidr}"]
    security_group_id = "${aws_security_group.kubernetes.id}"
}

resource "aws_security_group_rule" "allow_all_from_elb" {
    type = "ingress"
    from_port = 0
    to_port = 0
    protocol = "-1"
    source_security_group_id = "${aws_security_group.kubernetes_api.id}"
    security_group_id = "${aws_security_group.kubernetes.id}"
}
