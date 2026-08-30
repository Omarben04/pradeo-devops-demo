# Pradeo DevOps Demo — Projet complet

Chaîne DevOps et sécurité complète, construite en préparation de l'entretien Pradeo (poste Alternant Technicien IT Interne), puis étendue sur une vraie infrastructure cloud (Oracle Cloud, Always Free) pour aller au-delà d'un simple environnement de développement.

**Repos** : [GitHub](https://github.com/Omarben04/pradeo-devops-demo) (public) / [GitLab](https://gitlab.com/omar-devops/pradeo-it-demo) (privé, CI/CD)

---

## Accès rapide — démonstration en direct

| Service | Lien | Identifiants |
|---|---|---|
| **Portfolio** (application de référence, Kubernetes, 3 replicas) | http://141.253.111.20:30081/ | — |
| **Graylog** (SIEM) | http://89.168.55.236:9000/ | `admin` / `admin` |
| **Grafana** (Supervision) | http://141.253.111.20:3000/ | `admin` / `pradeoGrafana2026` |
| **Prometheus** (métriques brutes) | http://141.253.111.20:9090/ | — |
| **GLPI** (Gestion de parc + Tickets) | http://89.168.55.236/glpi/ | `glpi` / `glpi` |

## Accès de démonstration technique

**Accès SSH sur les deux VM**, même clé pour les deux :
```bash
ssh amaury@141.253.111.20   # app-server (Docker, K8s, portfolio, supervision)
ssh amaury@89.168.55.236    # security-server (Graylog SIEM)
```
(clé privée dédiée transmise séparément)

**Accès Oracle Cloud Console (lecture seule)** :
- Compte : `amaury.jaspar@pradeo.com`
- Mot de passe : transmis séparément
- Portée : lecture seule sur l'ensemble du compartiment

---

## Architecture générale

┌─────────────────────────────┐ ┌─────────────────────────────┐
│ app-server (ARM) │ │ security-server (ARM) │
│ Oracle Cloud - 1 OCPU/6GB │ │ Oracle Cloud - 2 OCPU/12GB │
│ │ │ │
│ • Docker │ │ • Docker │
│ • k3d / K3s (Kubernetes) │ │ • Graylog (SIEM) │
│ - Portfolio (3 replicas) │◄────┤ - MongoDB, OpenSearch │
│ • Prometheus + Grafana │ │ • osquery │
│ • node-exporter │ │ │
│ • osquery │ │ │
│ • rsyslog → Graylog │────►│ │
└─────────────────────────────┘ └─────────────────────────────┘
▲ ▲
│ Terraform (provisioning) │ Terraform (provisioning)
│ Ansible (SSH, configuration) │
└──────────── Codespace (poste de contrôle) ─┘


Les deux VM sont provisionnées sur le tier **Always Free** d'Oracle Cloud (architecture ARM Ampere).

---

## 1. Application (Docker) — Portfolio

**Fichiers** : `portfolio/index.html`, `portfolio/style.css`, `portfolio/script.js`, `portfolio/Dockerfile`

Portfolio personnel interactif (interface façon système d'exploitation), packagé en image Docker via Nginx.

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "docker images | grep portfolio-omar && curl -s http://localhost:30081"
```

---

## 2. Kubernetes (k3d / K3s) — sur app-server

**Fichier** : `deployment-portfolio.yaml`

Le portfolio est déployé en **3 replicas**, avec un Service NodePort sur le port 30081.

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "kubectl get pods && kubectl get deployment portfolio-omar"
```

**Test de résilience** (recrée volontairement un pod) :
```bash
ssh amaury@141.253.111.20 "kubectl delete pod <nom-du-pod-portfolio> && kubectl get pods"
```
→ un nouveau pod apparaît automatiquement, preuve du maintien de l'état désiré par Kubernetes.

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

**Fichiers** : `ansible/setup.yml`, `ansible/setup-container.yml`, `ansible/inventory-oracle.ini`

Playbook exécuté à distance sur `app-server` via une vraie connexion SSH, pour installer `htop` et vérifier l'idempotence.

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
→ des centaines de vrais logs système apparaissent, alimentés en continu.

**Pourquoi Graylog et pas Wazuh** : Wazuh ne supporte pas nativement l'architecture ARM64 (ni son script d'installation, ni ses images Docker) — l'émulation x86_64 testée sur cette VM a également échoué (`exec format error`). Graylog, conçu multi-architecture dès le départ, a été retenu comme alternative fonctionnelle.

---
### 6bis. Alerte SIEM — détection de brute-force SSH

Une alerte Graylog a été configurée pour détecter les tentatives de connexion SSH suspectes en temps réel.

**Configuration** :
- Stream dédié `SSH-Failed-Attempts`, filtrant les logs contenant `Connection closed by authenticating user`
- Event Definition : déclenchement si plus de 5 tentatives détectées en 5 minutes (`count() >= 5`)
- Notification HTTP envoyée à chaque déclenchement

**Test réel effectué** : l'alerte s'est déclenchée en conditions réelles avec **36 tentatives détectées** en 5 minutes, provenant de plusieurs IP différentes scannant en continu le serveur (activité malveillante réelle et courante sur tout serveur exposé publiquement sur internet).

**Vérifier** :
1. Ouvrir http://89.168.55.236:9000/
2. Menu **Alerts** → **Alerts & Events**
3. L'historique des déclenchements est visible, avec le nombre exact de tentatives détectées à chaque fois.

--- 

## 7. Supervision (Prometheus + Grafana) — sur app-server

Collecte et visualise en temps réel CPU, RAM, disque, réseau de la VM, via `node-exporter`.

**Vérifier en direct** :
1. Ouvrir http://141.253.111.20:3000/ (`admin` / `pradeoGrafana2026`)
2. Dashboard **"Node Exporter Full"** (ID 1860)
→ métriques réelles en direct.

**Pourquoi Prometheus/Grafana et pas Zabbix** : Zabbix a été tenté en premier, mais son image `zabbix-server-mysql` n'initialise pas correctement le schéma de sa base MySQL sur cette configuration. Bascule vers Prometheus + Grafana, qui a démarré sans problème dès le premier lancement.

---

## 8. EDR renforcé (osquery + fail2ban) — sur les deux VM

**Fichiers** : `security-configs/edr-monitor.sh`, `security-configs/fail2ban-jail.local`, `security-configs/*-notes.md`

Contrairement à osquery utilisé seul (simple observation à la demande), cette brique combine deux fonctions centrales d'un EDR professionnel :

**Détection continue (osquery + cron)** : un script s'exécute automatiquement chaque minute sur `app-server`, interroge les connexions réseau actives via osquery, et journalise le résultat — qui remonte ensuite automatiquement dans Graylog.

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "sudo journalctl -t edr-monitor --no-pager | tail -10"
```
Ou dans Graylog : `source:app-server AND edr-monitor`

**Réaction automatique (fail2ban)** : détecte et bloque automatiquement les IP effectuant des tentatives de connexion SSH suspectes (mode `aggressive`, 3 tentatives en 5 minutes → bannissement 1h).

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "sudo fail2ban-client status sshd"
```

**Test réel effectué** : fail2ban a détecté et banni automatiquement 2 IP en conditions réelles (`110.173.190.221`, `193.111.125.167`), qui scannaient le serveur en continu.

**Limite assumée** : cette combinaison reste plus simple qu'un EDR commercial complet (pas de détection comportementale avancée, pas de télémétrie centralisée multi-machines native) — mais démontre concrètement les deux piliers fondamentaux : observation continue et réaction automatique.
---


## 9. Gestion de parc et ticketing (GLPI) — sur security-server

Installation native (PHP/Apache/MariaDB, sans conteneur Docker — l'image Docker officielle GLPI ne supporte pas ARM64) pour la gestion de parc informatique et le support utilisateurs, en réponse directe aux missions "support des utilisateurs internes" et "gestion du parc informatique" de l'offre.

**Fichiers** : installation native, non versionnée (base de données et fichiers applicatifs sur le serveur)

**Fonctionnalités testées** :
- Inventaire de parc : les deux VM (`app-server`, `security-server`) enregistrées comme équipements
- Module Assistance (tickets) : circuit de ticketing fonctionnel

**Vérifier en direct** :
1. Ouvrir http://89.168.55.236/glpi/
2. Se connecter (`glpi` / `glpi`)
3. Menu **Parc** → **Ordinateurs** : les deux serveurs y sont enregistrés
4. Menu **Assistance** → **Tickets** : ticket de démonstration consultable

**Difficulté rencontrée** : l'image Docker officielle GLPI (`diouxx/glpi`) ne supporte que `linux/amd64`. Installation native réalisée à la place (PHP 8.0, Apache, MariaDB), avec un blocage secondaire lié à SELinux (erreur 403) résolu via `semanage fcontext` et `restorecon`.

**Limite assumée** : mot de passe par défaut (`glpi`/`glpi`) conservé pour la durée de la démonstration — à changer avant tout usage prolongé.

---

## Difficultés rencontrées et résolues

| Problème | Diagnostic | Résolution |
|---|---|---|
| Ansible bloqué sur "Gathering Facts" vers Oracle Cloud | Multiplexing SSH (`ControlMaster`) incompatible avec Codespace | Désactivation du multiplexing, `PreferredAuthentications=publickey` |
| k3d — port injoignable depuis l'extérieur | Load balancer k3d n'exposait pas les ports personnalisés par défaut | Cluster recréé avec `-p "30081:30081@server:0"` explicite |
| Graylog ne recevait aucun log | Règle de pare-feu système (`firewalld`) manquante sur le port 1514/UDP | Ajout de la règle, diagnostic confirmé avec `tcpdump` |
| Wazuh — `exec format error` | Pas de support ARM64 natif ; émulation Docker également en échec | Bascule vers Graylog, multi-architecture nativement |
| Zabbix — `users table is empty` en boucle | Import du schéma SQL non fonctionnel dans cet environnement | Bascule vers Prometheus + Grafana |
| Fleet (MDM) — `exec format error` | Même limitation ARM64 que Wazuh | Non résolu — documenté comme limite connue |

---


## Script de vérification automatique de l'infrastructure

**Fichier** : `verify-infra.sh`

Script qui teste 15 points critiques de l'infrastructure avant chaque démonstration : connectivité SSH, Docker, Kubernetes, accessibilité des 4 services web, santé de Graylog, accès de démonstration, et présence d'osquery sur les deux serveurs.

**Utiliser** :
```bash
./verify-infra.sh
```

**Résultat attendu** : `15 tests reussis, 0 tests echoues`

---

## Ce qui n'est pas fait — feuille de route

- **MDM** : bloqué par l'incompatibilité ARM64, nécessiterait une VM x86_64 payante
- **HTTPS** : reverse proxy Nginx avec certificats, étape suivante logique
- **Autoscaling Kubernetes** : maintien d'un nombre fixe de replicas démontré, pas l'ajustement automatique à la charge

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
