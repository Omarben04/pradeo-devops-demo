# Pradeo DevOps Demo

Chaîne DevOps complète construite pour ma préparation à l'entretien Pradeo (poste Alternant Technicien IT Interne) : application dockerisée, orchestrée avec Kubernetes, provisionnée avec Terraform, configurée avec Ansible, avec pipeline CI/CD GitLab et une première approche EDR via osquery.

**Repos** : [GitHub](https://github.com/Omarben04/pradeo-devops-demo) (public) / [GitLab](https://gitlab.com/omar-devops/pradeo-it-demo) (privé, CI/CD)

> Les commandes ci-dessous affichent l'état de ressources déjà créées (pas de recréation), pour éviter les conflits de nom si elles existent déjà.

---

## Structure des fichiers du projet

pradeo-devops-demo/
├── app/
│ ├── app.py → code de l'application Flask
│ ├── Dockerfile → recette de construction de l'image Docker
│ └── requirements.txt → dépendances Python (Flask)
├── deployment.yaml → déploiement Kubernetes (2 replicas + service)
├── .gitlab-ci.yml → pipeline CI/CD (build + test automatiques)
├── terraform/
│ └── main.tf → décrit le conteneur à créer via Terraform
├── ansible/
│ ├── setup.yml → playbook n°1 (configure la machine locale)
│ ├── inventory.ini → cible de setup.yml
│ ├── setup-container.yml → playbook n°2 (configure le conteneur Terraform)
│ └── inventory-container.ini → cible de setup-container.yml
└── security/
└── osquery-notes.md → notes et requêtes SQL testées avec osquery


---

## Ports utilisés — à quoi sert chacun

| Port | Sert à | Créé par |
|---|---|---|
| **5000** | Accès au conteneur applicatif lancé manuellement (`pradeo-demo`) | `docker run` |
| **5050** | Accès au conteneur applicatif créé par Terraform (`pradeo-demo-terraform`) | Terraform (`terraform apply`) |
| **30080** | Accès à l'application via le cluster Kubernetes (via `kubectl port-forward`) | Kubernetes (Service dans `deployment.yaml`) |
| **45225** | Port technique utilisé par k3d pour l'API interne de Kubernetes (6443) | k3d, automatiquement à la création du cluster |

**Pourquoi 3 ports différents pour la même appli** : ce sont 3 instances séparées, montrées volontairement — une lancée à la main, une créée par Terraform, une orchestrée par Kubernetes. Ça permet de comparer les 3 approches en entretien.

---

## 1. Application (Docker)

**Fichiers** : `app/app.py`, `app/Dockerfile`, `app/requirements.txt`

**Ce que c'est** : une application Flask avec deux routes (`/` et `/health`), packagée dans une image Docker.

**Comment vérifier/montrer** :
```bash
docker images | grep pradeo-demo
docker ps | grep pradeo-demo
curl http://localhost:5000
```

**Ce que le résultat signifie** :
- `docker images` → confirme que l'image existe (51.3 MB), construite depuis le Dockerfile
- `docker ps` → confirme que le conteneur tourne (statut `Up`)
- `curl` → l'application répond "Pradeo DevOps Demo - Omar Benmansour" : preuve que le serveur web à l'intérieur du conteneur fonctionne réellement

---

## 2. Kubernetes (k3d / K3s)

**Fichiers** : `deployment.yaml`

**Ce que c'est** : cluster Kubernetes local (k3d), application déployée en 2 replicas, avec réparation automatique en cas de panne.

**Comment vérifier/montrer** :
```bash
k3d cluster list
kubectl get nodes
kubectl get pods
kubectl get deployment pradeo-demo
```

**Ce que chaque résultat signifie** :
- `k3d cluster list` → confirme que le cluster `pradeo-cluster` existe
- `kubectl get nodes` → statut `Ready` = le cluster est fonctionnel
- `kubectl get pods` → doit afficher 2 pods `Running` = les 2 copies de mon appli tournent
- `kubectl get deployment pradeo-demo` → colonne `READY 2/2` = l'état désiré correspond à l'état réel

**Test de résilience en live** (celui-là recrée volontairement un pod — sert à démontrer) :
```bash
kubectl get pods
kubectl delete pod <nom-du-pod-affiché-ci-dessus>
kubectl get pods
```
**Ce que ce test prouve** : après suppression, le second `kubectl get pods` doit montrer encore 2 pods, mais avec un nom différent pour celui recréé — preuve que Kubernetes a détecté la perte et corrigé automatiquement.

**Pour accéder à l'appli via Kubernetes (port 30080)** — nécessite un terminal séparé qui reste ouvert :
```bash
kubectl port-forward service/pradeo-demo-service 30080:5000
```
Puis, dans un autre terminal :
```bash
curl http://localhost:30080
```

---

## 3. Pipeline CI/CD (GitLab)

**Fichier** : `.gitlab-ci.yml`

**Ce que c'est** : automatise le build et le test de l'application à chaque `git push` sur GitLab, en 2 étapes (`build`, `test`).

**Comment vérifier/montrer** :
```bash
cat .gitlab-ci.yml
```
Puis ouvrir en direct : `https://gitlab.com/omar-devops/pradeo-it-demo/-/pipelines`

**Ce que la page des pipelines montre** : un historique de plusieurs exécutions, chacune correspondant à un `git push` fait pendant le développement du projet.
- Une exécution **échouée au tout début** (blocage lié à la vérification de compte GitLab, pas au code) — bon exemple de debug réel à raconter
- Les exécutions suivantes, **toutes passées (vert)**, correspondant à chaque nouvel ajout au projet

**Ce que le résultat signifie** : un badge vert "Passed" = le code s'est construit et testé automatiquement sans erreur.

---

## 4. Terraform (Infrastructure as Code)

**Fichier** : `terraform/main.tf`

**Ce que c'est** : provisionne un conteneur Docker (port 5050) à partir de l'image applicative, via le provider Docker de Terraform.

**Comment vérifier/montrer** :
```bash
cd terraform
cat main.tf
terraform show
curl http://localhost:5050
```

**Ce que chaque résultat signifie** :
- `cat main.tf` → montre la description de la ressource voulue (image + conteneur)
- `terraform show` → montre l'état réel actuel de ce que Terraform a créé et suit
- `curl` → confirme que le conteneur créé par Terraform répond bien

---

## 5. Ansible — configuration de l'environnement de travail

**Fichiers** : `ansible/setup.yml`, `ansible/inventory.ini`

**Ce que c'est** : installe et démarre `fail2ban` (protection anti-brute-force) et `htop` (supervision) sur la machine locale.

**Comment vérifier/montrer** :
```bash
cd ansible
cat setup.yml
sudo service fail2ban status
which htop
```

**Idempotence en live** :
```bash
ansible-playbook -i inventory.ini setup.yml
```
**Ce que ce test prouve** : le résultat affiche `changed=0` — Ansible a vérifié que fail2ban et htop étaient déjà présents et n'a rien refait.

---

## 6. Ansible — configuration directe d'un conteneur (chaîne Terraform → Ansible)

**Fichiers** : `ansible/setup-container.yml`, `ansible/inventory-container.ini`

**Ce que c'est** : Ansible se connecte directement au conteneur créé par Terraform (sans SSH, via une connexion Docker native) pour y installer `curl`.

**Comment vérifier/montrer** :
```bash
cat ansible/setup-container.yml
docker exec pradeo-demo-terraform which curl
```

**Ce que le résultat signifie** : `docker exec ... which curl` affiche le chemin de `curl` à l'intérieur du conteneur — preuve qu'Ansible a bien configuré ce conteneur précis, après que Terraform l'ait créé.

---

## 7. osquery (visibilité comportementale, base d'un EDR)

**Fichier** : `security/osquery-notes.md`

**Ce que c'est** : interroge l'état du système via des requêtes SQL — principe utilisé par les EDR professionnels (CrowdStrike, cité dans l'offre Pradeo).

**Comment vérifier/montrer** :
```bash
osqueryi --version
osqueryi
```
Puis dans le shell osquery :
```sql
SELECT pid, name, cmdline FROM processes WHERE name LIKE '%docker%' LIMIT 5;
SELECT pid, local_address, local_port, remote_address, remote_port, state FROM process_open_sockets WHERE local_port != 0 LIMIT 10;
```
Sortir avec `.exit`.

**Limite assumée à dire clairement** : osquery observe et répond aux questions qu'on lui pose — il n'alerte pas et ne bloque pas automatiquement, contrairement à un EDR complet.

---

## Ce qui n'est pas encore fait (feuille de route)

- Un vrai cloud provider (OVHcloud) pour Terraform, plutôt que le provider Docker local
- Wazuh comme SIEM complet (projet séparé en préparation)
- Un vrai serveur distant pour Ansible (actuellement en local / conteneur, pas de SSH utilisé)
