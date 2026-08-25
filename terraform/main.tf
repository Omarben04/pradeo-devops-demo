terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

resource "docker_image" "pradeo_demo" {
  name = "pradeo-demo:1.0"
  keep_locally = true
}

resource "docker_container" "pradeo_demo_terraform" {
  name  = "pradeo-demo-terraform"
  image = docker_image.pradeo_demo.image_id

  ports {
    internal = 5000
    external = 5050
  }
}
