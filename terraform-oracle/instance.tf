resource "oci_core_instance" "security_server" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "security-server"
  shape                = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 2
    memory_in_gbs = 12
  }

  create_vnic_details {
    subnet_id        = data.oci_core_subnets.existing_subnet.subnets[0].id
    assign_public_ip = true
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ol9_images.images[0].id
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }
}

output "security_server_public_ip" {
  value = oci_core_instance.security_server.public_ip
}
