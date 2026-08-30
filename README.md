# Pradeo DevOps Demo

## Avant de commencer, un mot sur ce projet

Je m'appelle Omar, je suis étudiant en Licence Télécoms & Réseaux, en préparation de mon Mastère Cybersécurité & Cloud Computing. Je ne suis pas un professionnel du DevOps ni de la cybersécurité — je suis quelqu'un qui apprend en construisant, en cassant, et en recommençant.

Ce projet a démarré comme préparation à un entretien, puis j'ai continué à le faire évoluer parce que ça m'intéressait vraiment de pousser plus loin. Il n'est **pas parfait ni terminé** : certaines parties sont solides et testées en conditions réelles, d'autres sont volontairement simplifiées, et il reste beaucoup à faire pour le rendre plus fiable et plus sécurisé (voir la section dédiée en bas).

Ce que je peux dire honnêtement : chaque brique de ce README a été **construite pas à pas, testée, et pour beaucoup, cassée puis réparée** — pas copiée-collée sans comprendre. Les difficultés rencontrées et leur résolution sont documentées volontairement en détail, parce que c'est souvent ça qui montre le mieux ce qu'on sait vraiment faire.

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
| **Headwind MDM** | http://89.168.55.236:8082/ | `admin` / `Pradeomdm2026!` |

## Accès de démonstration technique

**Accès SSH sur les deux VM**, même clé pour les deux :
```bash
ssh amaury@141.253.111.20   # app-server
ssh amaury@89.168.55.236    # security-server
```
(clé privée dédiée transmise séparément)

**Accès Oracle Cloud Console (lecture seule)** :
- Compte : `amaury.jaspar@pradeo.com`
- Portée : lecture seule sur l'ensemble du compartiment (aucune modification possible)

---

## Architecture générale

┌──────────────────────────────┐ ┌──────────────────────────────┐
│ app-server (ARM) │ │ security-server (ARM) │
│ Oracle Cloud - 1 OCPU/6GB │ │ Oracle Cloud - 2 OCPU/12GB │
│ │ │ │
│ • Docker │ │ • Docker │
│ • k3d / K3s (Kubernetes) │ │ • Graylog (SIEM) │
│ - Portfolio (3 replicas) │◄────┤ - MongoDB, OpenSearch │
│ • Prometheus + Grafana │ │ • GLPI (natif PHP/Apache/ │
│ • node-exporter │ │ MariaDB) │
│ • osquery + fail2ban (EDR) │ │ • Headwind MDM (natif build │
│ • rsyslog → Graylog │────►│ Docker ARM64, PostgreSQL) │
└──────────────────────────────┘ └──────────────────────────────┘
▲ ▲
│ Terraform (provisioning) │ Terraform (provisioning)
│ Ansible (SSH, configuration) │
└───────────── Codespace (poste de contrôle) ─┘


Les deux VM sont sur le tier **Always Free** d'Oracle Cloud (architecture ARM Ampere) — un choix qui m'a coûté du temps (voir les difficultés ARM64 plus bas), mais qui reste 100% gratuit en permanence.

---

## 1. Application (Docker) — Portfolio

**Fichiers** : `portfolio/index.html`, `portfolio/style.css`, `portfolio/script.js`, `portfolio/Dockerfile`

Mon portfolio personnel, avec une interface façon système d'exploitation (fenêtres, terminal interactif), packagé en image Docker via Nginx.

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "docker images | grep portfolio-omar && curl -s http://localhost:30081"
```

---

## 2. Kubernetes (k3d / K3s) — sur app-server

**Fichier** : `deployment-portfolio.yaml`

Le portfolio est déployé en **3 replicas**, avec un Service NodePort.

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "kubectl get pods && kubectl get deployment portfolio-omar"
```

**Test de résilience** (recrée volontairement un pod) :
```bash
ssh amaury@141.253.111.20 "kubectl delete pod <nom-du-pod-portfolio> && kubectl get pods"
```
→ un nouveau pod apparaît automatiquement.

**Difficulté rencontrée** : au premier déploiement, le port n'était pas joignable depuis l'extérieur du cluster. J'ai découvert que k3d n'expose pas automatiquement des ports personnalisés — il faut le préciser explicitement à la création du cluster (`k3d cluster create -p "30081:30081@server:0"`). Ça m'a appris que "ça marche en local dans le conteneur" ne veut pas dire "c'est accessible de l'extérieur".

---

## 3. Pipeline CI/CD (GitLab)

**Fichier** : `.gitlab-ci.yml`

Build et test automatiques à chaque `git push`. Historique : https://gitlab.com/omar-devops/pradeo-it-demo/-/pipelines

---

## 4. Infrastructure as Code (Terraform)

**Fichiers** : `terraform/main.tf` (provider Docker, sur Codespace), `terraform-oracle/*.tf` (provider OCI, vraie création de VM)

La VM `security-server` a été **entièrement créée par Terraform**, sans aucun clic manuel dans la console Oracle.

**Vérifier** :
```bash
cd terraform-oracle && terraform show | head -30
```

---

## 5. Automatisation (Ansible)

**Fichiers** : `ansible/setup.yml`, `ansible/setup-container.yml`, `ansible/inventory-oracle.ini`

Playbook exécuté à distance via une vraie connexion SSH.

**Vérifier** :
```bash
cd ansible && ansible-playbook -i inventory-oracle.ini setup-oracle.yml
```
→ à la deuxième exécution : `changed=0` (idempotence).

**Difficulté rencontrée** : Ansible restait bloqué indéfiniment sur "Gathering Facts" en se connectant depuis mon Codespace vers Oracle Cloud, alors qu'une connexion SSH manuelle fonctionnait en moins d'une seconde. En creusant avec le mode verbeux (`-vvv`), j'ai découvert que le multiplexing SSH d'Ansible (`ControlMaster`) posait problème dans cet environnement précis. Je l'ai désactivé et forcé l'authentification directe par clé — ça a tout débloqué.

---

## 6. SIEM (Graylog) — sur security-server

Centralise les logs système en continu. `app-server` envoie tous ses logs via `rsyslog` vers Graylog (port 1514/UDP).

**Vérifier en direct** :
1. http://89.168.55.236:9000/ (`admin` / `admin`)
2. Menu **Search** → `source:app-server`
→ des centaines de vrais logs système, alimentés en continu.

**Pourquoi Graylog et pas Wazuh** : Wazuh était mon premier choix, mais je me suis heurté à un mur : son script d'installation refuse explicitement les architectures non-x86_64, et l'émulation Docker que j'ai testée en renfort a aussi échoué (`exec format error`). J'ai compris que c'était lié au choix de l'architecture ARM de mes VM (gratuite, mais moins supportée). Graylog, conçu multi-architecture dès le départ, a fonctionné sans aucun souci.

### Alerte SIEM — détection de brute-force SSH

J'ai poussé un peu plus loin en configurant une vraie alerte : un stream Graylog dédié détecte les tentatives de connexion SSH échouées, avec une règle qui se déclenche si plus de 5 tentatives sont détectées en 5 minutes.

**Test réel effectué** : l'alerte s'est déclenchée avec **36 tentatives détectées** en une seule fenêtre de 5 minutes — mon serveur, comme tout serveur exposé publiquement, se fait scanner en continu par des robots. C'était à la fois inquiétant et une bonne occasion de tester une vraie alerte en conditions réelles, pas juste simulées.

**Vérifier** : Menu **Alerts** → **Alerts & Events** dans Graylog.

---

## 7. Supervision (Prometheus + Grafana) — sur app-server

Collecte CPU, RAM, disque, réseau en temps réel via `node-exporter`.

**Vérifier en direct** : http://141.253.111.20:3000/ (`admin` / `pradeoGrafana2026`), dashboard "Node Exporter Full".

**Pourquoi Prometheus/Grafana et pas Zabbix** : j'ai d'abord tenté Zabbix, mais son image `zabbix-server-mysql` refusait obstinément de démarrer, coincée dans une boucle avec l'erreur "users table is empty" — comme si sa base de données n'était jamais complètement initialisée. J'ai essayé plusieurs approches (réinitialiser la base, forcer l'ordre de démarrage des conteneurs, importer le schéma SQL manuellement), sans succès durable. Après un moment, j'ai choisi de ne pas m'acharner et de basculer vers Prometheus + Grafana, qui a fonctionné du premier coup. Je considère ça comme une vraie leçon : savoir quand persister et quand changer de stratégie fait aussi partie du travail.

---

## 8. EDR renforcé (osquery + fail2ban) — sur les deux VM

Plutôt que de me contenter d'osquery seul (qui ne fait qu'observer), j'ai voulu comprendre ce qui différencie ça d'un vrai EDR : la **réaction automatique**.

**Détection continue** : un script (`security-configs/edr-monitor.sh`) tourne chaque minute via cron, interroge osquery sur les connexions réseau actives, et remonte automatiquement dans Graylog.

**Réaction automatique (fail2ban)** : détecte et bloque les IP qui scannent le serveur en SSH.

**Test réel effectué** : fail2ban a détecté et banni automatiquement 2 IP (`110.173.190.221`, `193.111.125.167`) qui scannaient en continu mon serveur.

**Difficulté rencontrée, et ce qu'elle m'a appris** : la première tentative d'installation de fail2ban avait déjà échoué plus tôt dans le projet (le paquet n'était pas trouvé via Ansible). Cette fois, en l'installant directement et en activant le dépôt EPEL correctement, ça a fonctionné — mais fail2ban ne bannissait toujours rien, alors que les logs montraient clairement des dizaines de tentatives suspectes. En testant le filtre avec `fail2ban-regex`, j'ai découvert que le filtre standard classait ces tentatives précises ("Connection closed by authenticating user... [preauth]") comme "non malveillantes" par défaut — trop permissif pour mon cas. Le mode `aggressive` du filtre a résolu le problème. Ça m'a appris à ne jamais supposer qu'un outil "ne fonctionne pas" sans vérifier d'abord s'il fait exactement ce qu'on croit lui demander.

**Vérifier** :
```bash
ssh amaury@141.253.111.20 "sudo fail2ban-client status sshd"
```

**Limite assumée** : cette combinaison reste plus simple qu'un EDR commercial complet (pas de détection comportementale avancée, pas de télémétrie centralisée multi-machines native), mais elle démontre concrètement les deux piliers d'un EDR : observer, puis agir.

---

## 9. Gestion de parc et ticketing (GLPI) — sur security-server

Installé pour répondre directement aux missions "support des utilisateurs internes" et "gestion du parc informatique" — la partie la plus proche du quotidien réel d'un technicien IT, et celle que mon projet, très orienté infrastructure/sécurité, ne couvrait pas encore.

**Fonctionnalités testées** : les deux VM enregistrées comme équipements dans l'inventaire, un ticket de démonstration créé et consultable dans le module Assistance.

**Vérifier en direct** : http://89.168.55.236/glpi/ (`glpi` / `glpi`)

**Difficulté rencontrée** : l'image Docker officielle de GLPI ne supporte que l'architecture x86_64. J'ai donc installé GLPI **nativement** (PHP, Apache, MariaDB), sans passer par Docker — ce qui a aussi soulevé un blocage inattendu : une erreur 403 malgré des permissions de fichiers apparemment correctes. La cause était SELinux (un système de sécurité renforcée présent sur Oracle Linux, plus strict que sur Ubuntu/Debian), qui bloquait l'accès par défaut. Je l'ai configuré correctement avec `semanage` et `restorecon`, plutôt que de simplement le désactiver — je voulais comprendre le vrai problème, pas juste le contourner.

**Limite assumée** : mot de passe par défaut (`glpi`/`glpi`) conservé pour la durée de cette démonstration.

---

## 10. MDM (Headwind MDM) — sur security-server

C'est la brique qui m'a demandé le plus de persévérance. J'ai tenté **trois solutions MDM différentes avant celle-ci** :

1. **Fleet** — aucune image Docker ARM64 disponible, échec immédiat (`exec format error`)
2. **Flyve MDM** — impossible de trouver les bonnes URLs de téléchargement ; en creusant, j'ai découvert que le projet est en réalité abandonné par son éditeur depuis 2021 (dépôts archivés)
3. **Headwind MDM (image officielle)** — même erreur `exec format error` que Fleet : l'image Docker publiée par l'éditeur n'existe qu'en x86_64

Face à ce troisième échec, plutôt que d'abandonner, j'ai cherché à comprendre **pourquoi** exactement ça bloquait — et j'ai découvert que le code source de Headwind MDM (en Java/Tomcat) n'a en réalité aucune limitation d'architecture ; seule leur image Docker pré-compilée était en cause. J'ai donc **reconstruit l'image moi-même, directement sur ma VM ARM**, à partir de leur Dockerfile officiel — et ça a fonctionné du premier coup.

**Fonctionnalités testées** :
- Deux appareils enregistrés dans l'inventaire
- Configuration "Common - Minimal" fonctionnelle : suivi de localisation, gestion des permissions, contrôle Bluetooth/Wi-Fi/données mobiles, exigences de mot de passe, mode kiosque
- Communication MQTT via Apache ActiveMQ

**Vérifier en direct** : http://89.168.55.236:8082/ (`admin` / `Pradeomdm2026!`)

**Stack** : PostgreSQL (base dédiée, séparée de la MariaDB de GLPI), Apache ActiveMQ, Tomcat/Java.

**Limite assumée** : accessible en HTTP simple (le HTTPS nécessite un vrai nom de domaine, que je n'ai pas configuré pour cette démo). Aucun vrai terminal physique n'est connecté — c'est une démonstration de la configuration serveur, pas d'un enrôlement d'appareil réel.

---

## Script de vérification automatique de l'infrastructure

**Fichier** : `verify-infra.sh`

Après avoir enchaîné plusieurs pannes et redémarrages en cours de route, j'ai voulu un moyen rapide de vérifier que tout fonctionnait encore avant de montrer le projet à quelqu'un. Ce script teste 15 points critiques : connectivité SSH, Docker, Kubernetes, accessibilité des services web, santé de Graylog, accès de démonstration, présence d'osquery.

**Utiliser** :
```bash
./verify-infra.sh
```

---

## Ce qui n'est pas encore fait — et ce que je referais différemment

Je préfère être honnête sur ce qui manque plutôt que de laisser croire que ce projet est "fini" :

- **HTTPS** : tous les services tournent en HTTP simple. Un vrai reverse proxy Nginx avec certificats (Let's Encrypt ou auto-signés) serait la première chose à ajouter pour un usage sérieux.
- **Mots de passe par défaut** : GLPI (`glpi`/`glpi`) et Grafana n'ont pas été changés — acceptable pour une démonstration limitée dans le temps, pas pour un usage réel.
- **Communication inter-serveurs par IP publique** : mes deux VM communiquent aujourd'hui via leurs adresses publiques (par simplicité), alors qu'une vraie architecture devrait privilégier le réseau privé interne (VCN), plus sûr et plus rapide.
- **Autoscaling Kubernetes** : je démontre le maintien d'un nombre fixe de replicas, pas l'ajustement automatique à la charge (HorizontalPodAutoscaler) — une vraie prochaine étape.
- **MDM sans vrai terminal connecté** : Headwind MDM est configuré et fonctionnel côté serveur, mais je n'ai pas testé l'enrôlement d'un vrai smartphone.
- **Sauvegardes** : aucune stratégie de sauvegarde automatisée n'est en place pour les bases de données (Graylog, GLPI, Headwind) — un vrai risque si une VM tombait.

Je considère ce projet comme une base solide, pas un point d'arrivée. Chaque limite listée ici est une prochaine chose que je veux apprendre à faire correctement.

---

## Stack technique complète

| Domaine | Outils |
|---|---|
| Conteneurisation | Docker |
| Orchestration | Kubernetes (k3d/K3s) |
| CI/CD | GitLab CI/CD |
| Infrastructure as Code | Terraform (providers Docker et OCI) |
| Configuration | Ansible (SSH réel et connexion Docker native) |
| SIEM | Graylog, avec alerte de détection brute-force |
| Supervision | Prometheus, Grafana, node-exporter |
| EDR | osquery (détection continue) + fail2ban (réaction automatique) |
| Gestion de parc / Ticketing | GLPI (installation native, SELinux configuré) |
| MDM | Headwind MDM (image reconstruite pour ARM64) |
| Versioning | Git (GitHub + GitLab) |
| Cloud | Oracle Cloud Infrastructure (Always Free, ARM) |
| Sécurité réseau | firewalld, Oracle Security Lists, accès SSH par clé, IAM en lecture seule |
