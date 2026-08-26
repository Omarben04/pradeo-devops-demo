#!/bin/bash
echo "=== Relance du projet Pradeo DevOps Demo ==="

echo ""
echo "1. Verification/creation du cluster Kubernetes..."
if ! k3d cluster list | grep -q pradeo-cluster; then
  echo "Cluster absent, creation..."
  k3d cluster create pradeo-cluster
else
  echo "Cluster deja present."
  k3d cluster start pradeo-cluster 2>/dev/null
fi

echo ""
echo "2. Verification/reconstruction de l'image Docker..."
if ! docker images | grep -q pradeo-demo; then
  echo "Image absente, reconstruction..."
  cd app && docker build -t pradeo-demo:1.0 . && cd ..
else
  echo "Image deja presente."
fi

echo ""
echo "3. Relance des conteneurs..."
docker start pradeo-demo 2>/dev/null || docker run -d -p 5000:5000 --name pradeo-demo pradeo-demo:1.0
docker start pradeo-demo-terraform 2>/dev/null || echo "pradeo-demo-terraform absent, relancer terraform apply manuellement si besoin"

echo ""
echo "4. Import de l'image dans le cluster et deploiement..."
k3d image import pradeo-demo:1.0 -c pradeo-cluster
kubectl apply -f deployment.yaml

echo ""
echo "5. Verification finale..."
sleep 5
docker ps
echo ""
kubectl get pods
echo ""
kubectl get nodes

echo ""
echo "=== Tout est relance. Pense a lancer 'kubectl port-forward service/pradeo-demo-service 30080:5000' dans un second terminal pour tester le port 30080. ==="
