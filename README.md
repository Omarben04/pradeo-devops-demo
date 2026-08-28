# Pradeo DevOps Demo — Projet complet

Chaîne DevOps et sécurité complète, construite en préparation de l'entretien Pradeo (poste Alternant Technicien IT Interne), puis étendue sur une vraie infrastructure cloud (Oracle Cloud, Always Free) pour aller au-delà d'un simple environnement de développement.

**Repos** : [GitHub](https://github.com/Omarben04/pradeo-devops-demo) (public) / [GitLab](https://gitlab.com/omar-devops/pradeo-it-demo) (privé, CI/CD)

---

## Accès rapide — démonstration en direct

Ces liens sont **publics**, accessibles immédiatement depuis n'importe quel navigateur, sans configuration :

| Service | Lien | Identifiants |
|---|---|---|
| **Portfolio** (Kubernetes, 3 replicas) | http://141.253.111.20:30081/ | — |
| **Application demo** (pradeo-demo) | http://141.253.111.20:30080/ | — |
| **Graylog** (SIEM) | http://89.168.55.236:9000/ | `admin` / `admin` |
| **Grafana** (Supervision) | http://141.253.111.20:3000/ | `admin` / `pradeoGrafana2026` |
| **Prometheus** (métriques brutes) | http://141.253.111.20:9090/ | — |

## Accès de démonstration technique

Pour explorer l'infrastructure elle-même (pas juste les interfaces web) :

**Accès SSH sur les deux VM** (droits complets — Docker, Kubernetes, Graylog, configuration), même clé pour les deux :
```bash
ssh amaury@141.253.111.20   # app-server (Docker, K8s, portfolio, supervision)
ssh amaury@89.168.55.236    # security-server (Graylog SIEM)
```
(clé privée dédiée transmise séparément, par email)

**Accès Oracle Cloud Console (lecture seule)** — pour consulter directement l'architecture, les VM, les règles de pare-feu :
- Compte : `amaury.jaspar@pradeo.com`
- Mot de passe : transmis séparément
- Portée : lecture seule sur l'ensemble du compartiment (aucune modification possible)

---

## Architecture générale

┌─────────────────────────────┐ ┌─────────────────────────────┐
│ app-server (ARM) │ │ security-server (ARM) │
│ Oracle Cloud - 1 OCPU/6GB │ │ Oracle Cloud - 2 OCPU/12GB │
│ │ │ │
│ • Docker │ │ • Docker │
│ • k3d / K3s (Kubernetes) │ │ • Graylog (SIEM) │
│ - Portfolio (3 replicas) │◄────┤ - MongoDB, OpenSearch │
│ - pradeo-demo (2 replicas)│ │ • osquery │
│ • Prometheus + Grafana │ │ │
│ • node-exporter │ │ │
│ • osquery │ │ │
│ • rsyslog → Graylog │────►│ │
└─────────────────────────────┘ └─────────────────────────────┘
▲ ▲
│ Terraform (provisioning) │ Terraform (provisioning)
│ Ansible (SSH, configuration) │
└──────────── Codespace (poste de contrôle) ─┘


Les deux VM sont provisionnées sur le tier **Always Free** d'Oracle Cloud (architecture ARM Ampere), choisi pour disposer de plus de RAM gratuite qu'une instance x86_64 classique.

---

## 1. Application (Docker)

**Fichiers** : `app/app.py`, `app/Dockerfile`

Application Flask avec routes `/` et `/health`, packagée en image Docker.

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "docker images | grep pradeo-demo && curl -s http://localhost:30080"
```

---

## 2. Kubernetes (k3d / K3s) — sur app-server

**Fichiers** : `deployment.yaml`, `deployment-portfolio.yaml`

Deux déploiements orchestrés : `pradeo-demo` (2 replicas, avec liveness/readiness probes sur `/health`) et `portfolio-omar` (3 replicas).

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "kubectl get pods && kubectl get deployment"
```

**Test de résilience** (recrée volontairement un pod) :
```bash
ssh amaury@141.253.111.20 "kubectl delete pod <nom-du-pod> && kubectl get pods"
```
→ un nouveau pod apparaît automatiquement, preuve du maintien de l'état désiré par Kubernetes.

**Probes** — Kubernetes vérifie que l'application répond réellement, pas juste que le conteneur tourne :
```bash
ssh amaury@141.253.111.20 "kubectl describe pod <nom-du-pod> | grep -A2 Liveness"
```

---

## 3. Pipeline CI/CD (GitLab)

**Fichier** : `.gitlab-ci.yml`

Automatise build et test à chaque `git push`. Historique consultable sur : https://gitlab.com/omar-devops/pradeo-it-demo/-/pipelines

---

## 4. Infrastructure as Code (Terraform)

**Fichiers** : `terraform/main.tf` (provider Docker, environnement Codespace initial), `terraform-oracle/*.tf` (provider OCI, création réelle d'une VM Oracle Cloud)

La VM `security-server` a été **entièrement provisionnée par Terraform** — aucune création manuelle dans la console Oracle, uniquement `terraform apply`.

**Vérifier** :
```bash
cd terraform-oracle && terraform show | head -30
```

---

## 5. Automatisation (Ansible)

**Fichiers** : `ansible/setup.yml` (configuration locale), `ansible/setup-container.yml` (configuration d'un conteneur via connexion Docker native), `ansible/inventory-oracle.ini` (inventaire ciblant `app-server` en SSH réel)

Playbook exécuté à distance sur `app-server` via une vraie connexion SSH (clé privée, pas de mot de passe), pour installer `htop` et vérifier l'idempotence.

**Vérifier** :
```bash
cd ansible && ansible-playbook -i inventory-oracle.ini setup-oracle.yml
```
→ deuxième exécution : `changed=0`, preuve qu'Ansible ne refait rien d'inutile.

---

## 6. SIEM (Graylog) — sur security-server

Centralise et indexe les logs système en continu. `app-server` envoie tous ses logs (via `rsyslog`) vers Graylog sur le port 1514/UDP.

**Vérifier en direct** :
1. Ouvrir http://89.168.55.236:9000/
2. Se connecter (`admin` / `admin`)
3. Menu **Search** → filtrer par `source: app-server`
→ des centaines de vrais logs système (sessions, services) apparaissent, alimentés en continu.

**Pourquoi Graylog et pas Wazuh** : Wazuh (initialement prévu) ne supporte pas nativement l'architecture ARM64 (ni son script d'installation, ni ses images Docker) — l'émulation x86_64 testée sur cette VM a également échoué (`exec format error`). Graylog, conçu multi-architecture dès le départ, a été retenu comme alternative fonctionnelle et cohérente.

---

## 7. Supervision (Prometheus + Grafana) — sur app-server

Collecte et visualise en temps réel CPU, RAM, disque, réseau de la VM, via `node-exporter`.

**Vérifier en direct** :
1. Ouvrir http://141.253.111.20:3000/ (`admin` / `pradeoGrafana2026`)
2. Dashboard **"Node Exporter Full"** (importé depuis grafana.com, ID 1860)
→ métriques réelles en direct, historique consultable.

**Pourquoi Prometheus/Grafana et pas Zabbix** : Zabbix a été tenté en premier, mais son image `zabbix-server-mysql` n'initialise pas correctement le schéma de sa base MySQL sur cette configuration (conflit entre l'entrypoint du conteneur et le script d'import SQL, cause exacte non résolue dans le temps imparti). Bascule vers Prometheus + Grafana, qui a démarré sans aucun problème dès le premier lancement.

---

## 8. Visibilité comportementale (osquery — base d'un EDR)

Installé sur **les deux VM** (`app-server` et `security-server`), interroge l'état du système via SQL.

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "osqueryi --json \"SELECT pid, name, cmdline FROM processes LIMIT 5;\""
```

**Limite assumée** : osquery observe et répond aux requêtes — il n'alerte ni ne bloque automatiquement, contrairement à un EDR complet (CrowdStrike, HarfangLab).

---

## Difficultés rencontrées et résolues

Cette section documente les vrais problèmes techniques traités pendant le projet, avec leur diagnostic et leur résolution — la partie la plus révélatrice du travail réellement effectué.

| Problème | Diagnostic | Résolution |
|---|---|---|
| Ansible bloqué sur "Gathering Facts" vers Oracle Cloud | Multiplexing SSH (`ControlMaster`) d'Ansible incompatible avec l'environnement Codespace | Désactivation du multiplexing, forçage de `PreferredAuthentications=publickey` |
| k3d — port 30081 injoignable depuis l'extérieur | Le load balancer k3d n'exposait pas les ports personnalisés par défaut | Cluster recréé avec `-p "30081:30081@server:0"` explicite |
| Graylog ne recevait aucun log malgré un test réussi en local | Règle de pare-feu système (`firewalld`) manquante sur le port 1514/UDP, distincte du pare-feu Oracle Cloud déjà ouvert | Ajout de la règle avec `firewall-cmd --add-port=1514/udp`, diagnostic confirmé avec `tcpdump` |
| Wazuh — `exec format error` au démarrage | Wazuh ne supporte pas nativement ARM64 ; l'émulation Docker (`binfmt`) testée a également échoué | Bascule vers Graylog, multi-architecture nativement |
| Zabbix — `users table is empty` en boucle | L'image `zabbix-server-mysql` n'importe pas automatiquement son schéma SQL initial dans cet environnement | Bascule vers Prometheus + Grafana |
| Fleet (MDM) — `exec format error` | Même limitation ARM64 que Wazuh, aucune variante ARM disponible | Non résolu dans le temps imparti — documenté comme limite connue |

---

## Ce qui n'est pas fait — feuille de route

- **MDM** : deux tentatives (Fleet, alternatives) bloquées par l'incompatibilité ARM64 — nécessiterait une VM x86_64 (payante sur Oracle, hors Always Free)
- **HTTPS** : les services actuels sont exposés en HTTP simple, un reverse proxy Nginx avec certificats serait l'étape suivante logique
- **Autoscaling Kubernetes** (HorizontalPodAutoscaler) : le projet démontre le maintien d'un nombre fixe de replicas, pas l'ajustement automatique à la charge

---

## Stack technique complète

| Domaine | Outils |
|---|---|
| Conteneurisation | Docker |
| Orchestration | Kubernetes (k3d/K3s) |
| CI/CD | GitLab CI/CD |
| Infrastructure as Code | Terraform (providers Docker et OCI) |
| Configuration | Ansible (SSH réel et connexion Docker native) |
| SIEM | Graylog |
| Supervision | Prometheus, Grafana, node-exporter |
| Visibilité comportementale | osquery |
| Versioning | Git (GitHub + GitLab) |
| Cloud | Oracle Cloud Infrastructure (Always Free, ARM) |
| Sécurité réseau | firewalld, Oracle Security Lists, accès SSH par clé, IAM en lecture seule |
