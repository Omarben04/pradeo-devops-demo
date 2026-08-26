# Pradeo DevOps Demo

Chaîne DevOps complète construite pour ma préparation à l'entretien Pradeo (poste Alternant Technicien IT Interne) : application dockerisée, orchestrée avec Kubernetes, provisionnée avec Terraform, configurée avec Ansible, avec pipeline CI/CD GitLab et une première approche EDR via osquery.

**Repos** : [GitHub](https://github.com/Omarben04/pradeo-devops-demo) (public) / [GitLab](https://gitlab.com/omar-devops/pradeo-it-demo) (privé, CI/CD)

---

## 1. Application (Docker)

**Ce que c'est** : une application Flask (`app/app.py`) avec deux routes (`/` et `/health`), packagée dans une image Docker via `app/Dockerfile`.

**Comment tester** :
```bash
cd app
docker build -t pradeo-demo:1.0 .
docker run -d -p 5000:5000 --name pradeo-demo pradeo-demo:1.0
curl http://localhost:5000
```

**Ce que le test prouve** : l'application se construit et se lance dans un conteneur isolé, portable, indépendant de la machine hôte.

---

## 2. Kubernetes (k3d / K3s)

**Ce que c'est** : un cluster Kubernetes local (`k3d`), qui déploie l'application en 2 replicas (`deployment.yaml`), avec réparation automatique en cas de panne.

**Comment tester** :
```bash
k3d cluster create pradeo-cluster
k3d image import pradeo-demo:1.0 -c pradeo-cluster
kubectl apply -f deployment.yaml
kubectl get pods

# Test de résilience : supprimer un pod et observer la recréation automatique
kubectl delete pod <nom-du-pod-affiché-ci-dessus>
kubectl get pods
```

**Ce que le test prouve** : Kubernetes maintient en permanence l'état désiré (2 replicas) — si un pod tombe, il est recréé automatiquement sans intervention humaine.

---

## 3. Pipeline CI/CD (GitLab)

**Ce que c'est** : un fichier `.gitlab-ci.yml` qui automatise le build et le test de l'application à chaque `git push` sur GitLab.

**Comment tester** : pousser un commit sur GitLab, puis consulter :
`https://gitlab.com/omar-devops/pradeo-it-demo/-/pipelines`

**Ce que le test prouve** : le code est automatiquement construit et testé sans intervention manuelle à chaque modification.

---

## 4. Terraform (Infrastructure as Code)

**Ce que c'est** : un fichier `terraform/main.tf` qui provisionne un conteneur Docker (`pradeo-demo-terraform`) à partir de l'image applicative, en utilisant le provider Docker de Terraform.

**Comment tester** :
```bash
cd terraform
terraform init
terraform plan
terraform apply
curl http://localhost:5050
```

**Ce que le test prouve** : l'infrastructure (ici un conteneur) est créée de façon reproductible et automatisée, à partir d'un fichier texte versionné, plutôt qu'à la main.

---

## 5. Ansible — configuration de l'environnement de travail

**Ce que c'est** : un playbook (`ansible/setup.yml`) qui installe et démarre `fail2ban` (protection anti-brute-force) et `htop` (supervision) sur la machine.

**Comment tester** :
```bash
cd ansible
ansible-playbook -i inventory.ini setup.yml
sudo service fail2ban status

# Relancer une seconde fois pour prouver l'idempotence (0 changement attendu)
ansible-playbook -i inventory.ini setup.yml
```

**Ce que le test prouve** : Ansible vérifie l'état avant d'agir — relancé plusieurs fois, il ne modifie que ce qui n'est pas déjà en place (idempotence).

---

## 6. Ansible — configuration directe d'un conteneur (chaîne Terraform → Ansible)

**Ce que c'est** : un second playbook (`ansible/setup-container.yml`) qui se connecte **directement au conteneur créé par Terraform** (sans SSH, via une connexion Docker native) pour y installer `curl`.

**Comment tester** :
```bash
cd ansible
ansible-playbook -i inventory-container.ini setup-container.yml
docker exec pradeo-demo-terraform which curl
```

**Ce que le test prouve** : un vrai enchaînement provisioning (Terraform crée) → configuration (Ansible configure), comme dans un déploiement réel d'entreprise.

---

## 7. osquery (visibilité comportementale, base d'un EDR)

**Ce que c'est** : osquery interroge l'état du système (processus, connexions réseau) via des requêtes SQL — le principe d'observation utilisé par les EDR (comme CrowdStrike, cité dans l'offre Pradeo).

**Comment tester** :
```bash
osqueryi
```
Puis dans le shell :
```sql
SELECT pid, name, cmdline FROM processes WHERE name LIKE '%docker%' LIMIT 5;
SELECT pid, local_address, local_port, remote_address, remote_port, state FROM process_open_sockets WHERE local_port != 0 LIMIT 10;
```
Sortir avec `.exit`.

**Ce que le test prouve** : la visibilité sur l'état réel du système — brique de base d'un EDR. **Limite assumée** : osquery n'alerte pas et ne bloque pas automatiquement, contrairement à un EDR complet — c'est un outil d'observation, pas de réaction automatique.

---

## Ce qui n'est pas encore fait (feuille de route)

- Un vrai cloud provider (OVHcloud) pour Terraform, plutôt que le provider Docker local
- Wazuh comme SIEM complet, pour la corrélation de logs et l'alerting (projet séparé en cours)
- Un vrai serveur distant pour Ansible (actuellement en local / conteneur)
