terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = "ocid1.tenancy.oc1..aaaaaaaald6qarcg64ihz3cujlghusydkcdywszr7p3s6zkat4zyvqoj44aa"
  user_ocid        = "ocid1.user.oc1..aaaaaaaacnzjb7mhe3rb5ucl2x7epbrvy6ya4fgx5sswf62ponnrgtasjkgq"
  fingerprint      = "b8:e0:9f:09:60:c5:81:6c:05:37:42:ee:1e:5e:47:66"
  private_key_path = "~/.oci/oci_api_key.pem"
  region           = "eu-paris-1"
}
