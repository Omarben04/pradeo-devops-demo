data "oci_core_subnets" "existing_subnet" {
  compartment_id = var.compartment_id
  display_name   = "subnet-20260828-1301"
}
