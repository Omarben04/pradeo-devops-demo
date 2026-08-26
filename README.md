# Pradeo DevOps Demo

Chaîne DevOps complète construite pour ma préparation à l'entretien Pradeo (poste Alternant Technicien IT Interne) : application dockerisée, orchestrée avec Kubernetes, provisionnée avec Terraform, configurée avec Ansible, avec pipeline CI/CD GitLab et une première approche EDR via osquery.

**Repos** : [GitHub](https://github.com/Omarben04/pradeo-devops-demo) (public) / [GitLab](https://gitlab.com/omar-devops/pradeo-it-demo) (privé, CI/CD)

**Note** : les commandes ci-dessous affichent l'état de ressources déjà créées (pas de recréation, pour éviter les conflits de nom si elles existent déjà).

---

## 1. Application (Docker)

**Ce que c'est** : une application Flask (`app/app.py`, `app/Dockerfile`) packagée en image Docker.

**Comment vérifier/montrer** :
```bash
docker images | grep pradeo-demo
docker ps | grep pradeo-demo
curl http://localhost:5000
```

**Ce que ça prouve** : l'image existe, le conteneur tourne, l'application répond.

---

## 2. Kubernetes (k3d / K3s)

**Ce que c'est** : cluster Kubernetes local, application déployée en 2 replicas (`deployment.yaml`), résilience automatique.

**Comment vérifier/montrer** :
```bash
k3d cluster list
kubectl get nodes
kubectl get pods
kubectl get deployment pradeo-demo
```

**Test de résilience en live** (celui-là recrée volontairement, c'est le but) :
```bash
kubectl get pods
kubectl delete pod <nom-du-pod-affiché-ci-dessus>
kubectl get pods
```

**Ce que ça prouve** : le cluster existe, les pods tournent, et un pod supprimé est automatiquement recréé.

---

## 3. Pipeline CI/CD (GitLab)

**Ce que c'est** : `.gitlab-ci.yml`, build + test automatiques à chaque push.

**Comment vérifier/montrer** :
```bash
cat .gitlab-ci.yml
```
Puis ouvrir en direct : `https://gitlab.com/omar-devops/pradeo-it-demo/-/pipelines`

**Ce que ça prouve** : le pipeline existe, est versionné, et son historique montre des exécutions réussies.

---

## 4. Terraform (Infrastructure as Code)

**Ce que c'est** : `terraform/main.tf`, provisionne un conteneur Docker via le provider Terraform.

**Comment vérifier/montrer** :
```bash
cd terraform
cat main.tf
terraform show
curl http://localhost:5050
```

**Ce que ça prouve** : la ressource décrite dans le fichier existe réellement et répond.

---

## 5. Ansible — configuration de l'environnement de travail

**Ce que c'est** : `ansible/setup.yml`, installe fail2ban + htop.

**Comment vérifier/montrer** :
```bash
cd ansible
cat setup.yml
sudo service fail2ban status
which htop
```

**Idempotence en live** (celle-là relance volontairement, c'est le but) :
```bash
ansible-playbook -i inventory.ini setup.yml
```
→ observer `changed=0` (rien à refaire, tout est déjà en place).

**Ce que ça prouve** : la configuration est appliquée, et Ansible ne refait rien d'inutile si tout est déjà bon.

---

## 6. Ansible — configuration directe d'un conteneur (chaîne Terraform → Ansible)

**Ce que c'est** : `ansible/setup-container.yml`, se connecte directement au conteneur créé par Terraform (sans SSH).

**Comment vérifier/montrer** :
```bash
cat ansible/setup-container.yml
docker exec pradeo-demo-terraform which curl
```

**Ce que ça prouve** : Terraform a créé le conteneur, Ansible l'a configuré ensuite, directement.

---

## 7. osquery (visibilité comportementale, base d'un EDR)

**Ce que c'est** : interroge l'état du système via SQL — principe utilisé par les EDR (CrowdStrike, cité dans l'offre Pradeo).

**Comment vérifier/montrer** :
```bash
osqueryi --version
osqueryi
```
Puis dans le shell :
```sql
SELECT pid, name, cmdline FROM processes WHERE name LIKE '%docker%' LIMIT 5;
SELECT pid, local_address, local_port, remote_address, remote_port, state FROM process_open_sockets WHERE local_port != 0 LIMIT 10;
```
Sortir avec `.exit`.

**Ce que ça prouve** : la visibilité en temps réel sur les processus et connexions réseau.

**Limite assumée** : osquery n'alerte pas et ne bloque pas automatiquement — c'est un outil d'observation, pas de réaction, contrairement à un EDR complet.

---

## Ce qui n'est pas encore fait (feuille de route)

- Un vrai cloud provider (OVHcloud) pour Terraform, plutôt que le provider Docker local
- Wazuh comme SIEM complet (projet séparé en cours)
- Un vrai serveur distant pour Ansible (actuellement en local / conteneur)
