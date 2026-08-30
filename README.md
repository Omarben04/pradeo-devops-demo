# Pradeo DevOps Demo

## Avant de commencer, un mot sur ce projet

Je m'appelle Omar, je suis étudiant en Licence Télécoms & Réseaux, en préparation de mon Mastère Cybersécurité & Cloud Computing. Je ne suis pas un professionnel du DevOps ni de la cybersécurité — je suis quelqu'un qui apprend en construisant, en cassant, et en recommençant.

Ce projet a démarré comme préparation à un entretien, puis j'ai continué à le faire évoluer parce que ça m'intéressait vraiment de pousser plus loin. Il n'est **pas parfait ni terminé** : certaines parties sont solides et testées en conditions réelles, d'autres sont volontairement simplifiées, et il reste beaucoup à faire pour le rendre plus fiable et plus sécurisé (voir la section dédiée en bas).

**Repos** : [GitHub](https://github.com/Omarben04/pradeo-devops-demo) (public) / [GitLab](https://gitlab.com/omar-devops/pradeo-it-demo) (privé, CI/CD)

---

## Accès à la démonstration

Les services suivants sont accessibles publiquement. **Les identifiants ne sont volontairement pas publiés dans ce README** (bonne pratique : ne jamais laisser de secrets en clair dans un dépôt Git, même privé) — ils sont transmis sur demande, via un lien à usage unique qui expire après la première consultation.

| Service | Lien |
|---|---|
| **Portfolio** | http://141.253.111.20:30081/ |
| **Graylog** (SIEM) | http://89.168.55.236:9000/ |
| **Grafana** (Supervision) | http://141.253.111.20:3000/ |
| **Prometheus** | http://141.253.111.20:9090/ |
| **GLPI** (Parc + Tickets) | http://89.168.55.236/glpi/ |
| **Headwind MDM** | http://89.168.55.236:8082/ |

**Pour obtenir les identifiants ou l'accès SSH/Oracle Cloud** : me contacter directement (omarbenmansour2004@gmail.com), je transmets un lien sécurisé à usage unique.

---

## Architecture réelle (ce qui est déployé aujourd'hui)
                          INTERNET
                             │
                (adresses IP publiques directes)
                             │
          ┌──────────────────┴──────────────────┐
          │                                      │
  ┌───────▼────────┐                    ┌────────▼───────┐
  │   app-server    │                    │ security-server │
  │  Oracle Cloud    │                    │  Oracle Cloud    │
  │  ARM · 1 OCPU/6GB│                    │  ARM · 2 OCPU/12GB│
  ├──────────────────┤                    ├──────────────────┤
  │ Docker           │                    │ Docker           │
  │ k3d / K3s        │                    │ Graylog (SIEM)   │
  │  └ Portfolio x3   │◄──── rsyslog ──────┤  └ MongoDB        │
  │ Prometheus       │       (logs)        │  └ OpenSearch     │
  │ Grafana          │                    │ GLPI (natif)     │
  │ osquery          │                    │ Headwind MDM     │
  │ fail2ban         │                    │  └ PostgreSQL     │
  └──────────────────┘                    │ osquery          │
          ▲                                └──────────────────┘
          │                                          ▲
          │            Terraform (provisioning)      │
          │            Ansible (SSH, configuration)  │
          └──────────────── Codespace ────────────────┘
                        (poste de contrôle)

**Point honnête** : les deux VM communiquent aujourd'hui via leurs adresses IP **publiques**, par simplicité — pas via le réseau privé interne (VCN), ce qui serait plus propre. Pas de bastion, pas de sous-réseaux séparés. Voir "Architecture cible" plus bas pour ce que je ferais avec plus de temps.

---

## Structure réelle des fichiers

pradeo-devops-demo/
│
├── app/ → application Flask (première version, remplacée par portfolio)
├── portfolio/ → application de référence (HTML/CSS/JS + Dockerfile)
├── deployment.yaml → déploiement Kubernetes (ancienne app)
├── deployment-portfolio.yaml → déploiement Kubernetes (portfolio, 3 replicas)
├── .gitlab-ci.yml → pipeline CI/CD
│
├── terraform/
│ └── main.tf → provider Docker (démo locale, Codespace)
│
├── terraform-oracle/
│ ├── main.tf → provider OCI (identifiants Oracle Cloud)
│ ├── variables.tf → variables (compartment, clé SSH)
│ ├── data.tf → data sources (images, availability domains)
│ ├── network_data.tf → référence au subnet existant
│ ├── instance.tf → définition de la VM security-server
│ └── .gitignore → exclut .terraform/ et *.tfstate
│
├── ansible/
│ ├── inventory.ini → cible : Codespace local
│ ├── inventory-container.ini → cible : conteneur Docker (connexion native)
│ ├── inventory-oracle.ini → cible : app-server via SSH réel
│ ├── setup.yml → playbook local (fail2ban, htop)
│ ├── setup-container.yml → playbook conteneur (curl)
│ └── setup-oracle.yml → playbook Oracle (htop)
│
├── security-configs/
│ ├── fail2ban-jail.local → config fail2ban (EDR - réaction)
│ ├── fail2ban-notes.md
│ ├── edr-monitor.sh → script EDR (osquery + cron)
│ └── edr-notes.md
│
├── verify-infra.sh → script de vérification (23 tests)
└── README.md


*(Pas de découpage en modules Terraform ni en rôles Ansible séparés — la structure reste volontairement plate pour un projet de cette taille. Un vrai projet d'équipe justifierait cette organisation plus poussée, mentionnée dans la feuille de route.)*

---

## Pipeline CI/CD réel (GitLab)

git push
│
▼
┌────────┐
│ BUILD │ → reconstruit l'image Docker
└────┬───┘
│
▼
┌────────┐
│ TEST │ → vérifie que le code s'importe sans erreur
└────┬───┘
│
▼
✓ ou ✗ (visible sur GitLab)


**Ce qui manque pour un pipeline complet** (feuille de route) : étape de scan de sécurité automatique (SAST), push vers un registre d'images, déploiement automatique sur Kubernetes (aujourd'hui fait manuellement). Voir "Architecture cible".

---

## Scan de sécurité — Trivy (test manuel, pas encore intégré au pipeline)

Dockerfile
│
▼
docker build
│
▼
trivy image
│
▼
Vulnérabilités trouvées ?
│
┌───┴───┐
CRITIQUE aucune
│ │
corrigées image saine
partiellement


**Test réel effectué** : scan de l'image applicative avec Trivy — 19 vulnérabilités détectées initialement (paquets système non à jour), réduites à 16 après un `apt upgrade` ajouté au Dockerfile. Les vulnérabilités restantes concernent des paquets Debian sans correctif encore publié.

**Limite assumée** : ce scan a été fait manuellement, une fois — il n'est pas encore intégré comme étape automatique du pipeline CI/CD.

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

**Test de résilience** :
```bash
ssh amaury@141.253.111.20 "kubectl delete pod <nom-du-pod-portfolio> && kubectl get pods"
```
→ un nouveau pod apparaît automatiquement.

**Difficulté rencontrée** : au premier déploiement, le port n'était pas joignable depuis l'extérieur du cluster — k3d n'expose pas automatiquement les ports personnalisés, il faut le préciser explicitement à la création (`k3d cluster create -p "30081:30081@server:0"`).

---

## 3. Pipeline CI/CD (GitLab)

**Fichier** : `.gitlab-ci.yml` — voir le diagramme plus haut. Historique : https://gitlab.com/omar-devops/pradeo-it-demo/-/pipelines

---

## 4. Infrastructure as Code (Terraform)

**Fichiers** : `terraform/main.tf` (Codespace), `terraform-oracle/*.tf` (vraie création de VM Oracle)

La VM `security-server` a été **entièrement créée par Terraform**, sans clic manuel dans la console Oracle.

**Vérifier** :
```bash
cd terraform-oracle && terraform show | head -30
```

---

## 5. Automatisation (Ansible)

**Fichiers** : voir structure des fichiers plus haut

**Vérifier** :
```bash
cd ansible && ansible-playbook -i inventory-oracle.ini setup-oracle.yml
```
→ à la deuxième exécution : `changed=0` (idempotence).

**Difficulté rencontrée** : Ansible restait bloqué sur "Gathering Facts" en se connectant depuis Codespace vers Oracle Cloud. En creusant avec `-vvv`, j'ai découvert que le multiplexing SSH d'Ansible (`ControlMaster`) posait problème dans cet environnement. Désactivé, résolu.

---

## 6. SIEM (Graylog) — sur security-server

Centralise les logs système en continu via `rsyslog`.

**Vérifier en direct** : http://89.168.55.236:9000/ → Menu **Search** → `source:app-server`

**Pourquoi Graylog et pas Wazuh** : Wazuh refuse de s'installer sur une architecture non-x86_64 (son script officiel le vérifie explicitement), et l'émulation Docker testée en renfort a aussi échoué. Graylog, multi-architecture nativement, a fonctionné sans souci.

### Alerte SIEM — détection de brute-force SSH

Stream dédié + règle de détection (`count() >= 5` en 5 minutes).

**Test réel** : 36 tentatives détectées en une seule fenêtre de 5 minutes, provenant de scans automatiques réels sur internet.

**Vérifier** : Menu **Alerts** → **Alerts & Events**

---

## 7. Supervision (Prometheus + Grafana) — sur app-server

**Vérifier en direct** : http://141.253.111.20:3000/ → dashboard "Node Exporter Full"

**Pourquoi Prometheus/Grafana et pas Zabbix** : l'image `zabbix-server-mysql` restait bloquée en boucle ("users table is empty"), malgré plusieurs tentatives de réinitialisation. Bascule vers Prometheus + Grafana, fonctionnel du premier coup.

---

## 8. EDR renforcé (osquery + fail2ban) — sur les deux VM

**Détection continue** : `security-configs/edr-monitor.sh`, exécuté chaque minute via cron, remonte dans Graylog.

**Réaction automatique (fail2ban)** :
```bash
ssh amaury@141.253.111.20 "sudo fail2ban-client status sshd"
```

**Test réel** : 2 IP bannies automatiquement (`110.173.190.221`, `193.111.125.167`).

**Difficulté rencontrée** : le filtre fail2ban standard classait les tentatives suspectes comme "non malveillantes" par défaut. Le mode `aggressive` a résolu le problème, identifié via `fail2ban-regex`.

---

## 9. Gestion de parc et ticketing (GLPI) — sur security-server

**Vérifier en direct** : http://89.168.55.236/glpi/ → Menu **Parc** → **Ordinateurs**, et **Assistance** → **Tickets**

**Difficulté rencontrée** : l'image Docker officielle de GLPI ne supporte que x86_64. Installation native (PHP/Apache/MariaDB) réalisée à la place, avec un blocage secondaire (erreur 403) résolu via la configuration correcte de SELinux (`semanage`, `restorecon`), plutôt que de le désactiver.

---

## 10. MDM (Headwind MDM) — sur security-server

Trois tentatives infructueuses avant celle-ci (Fleet, Flyve MDM — abandonné par son éditeur depuis 2021 —, puis l'image officielle Headwind, toutes bloquées par l'absence de support ARM64). **Résolu en reconstruisant l'image moi-même**, directement sur la VM ARM, à partir du Dockerfile officiel.

**Vérifier en direct** : http://89.168.55.236:8082/ → Onglet **Appareils** et **Configurations**

**Limite assumée** : HTTP simple (pas HTTPS), pas de vrai terminal physique connecté.

---

## Script de vérification automatique

**Fichier** : `verify-infra.sh` — 23 tests couvrant toute l'infrastructure.

```bash
./verify-infra.sh
```

---

## Architecture cible (feuille de route — pas encore implémentée)

Ce que je construirais avec plus de temps, pour un vrai usage en production :
                          INTERNET
                             │
                       Public Subnet
                             │
                    ┌────────────────┐
                    │ Bastion / Proxy │  (reverse proxy Nginx + HTTPS)
                    └───────┬────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
          Private Subnet             Private Subnet
               │                         │
        ┌──────────────┐          ┌──────────────┐
        │  app-server   │          │security-server│
        │ (pas d'IP     │          │ (pas d'IP     │
        │  publique     │          │  publique     │
        │  directe)     │          │  directe)     │
        └──────────────┘          └──────────────┘

**Autoscaling Kubernetes (HorizontalPodAutoscaler)** — non implémenté aujourd'hui, je démontre uniquement le maintien d'un nombre fixe de replicas :

CPU augmente
│
▼
HPA détecte
│
▼
3 Pods → 5 Pods
│
▼
Charge répartie
│
▼
Retour progressif à 3 pods


**Pipeline CI/CD cible** — avec scan de sécurité intégré et déploiement automatique :

git push → TEST → SAST/Trivy → BUILD → PUSH REGISTRY → DEPLOY K8s → VERIFY


---

## Ce qui n'est pas encore fait — et ce que je referais différemment

- **HTTPS** : tous les services tournent en HTTP simple.
- **Mots de passe par défaut** non changés sur GLPI — acceptable pour une démo limitée dans le temps, pas pour un usage réel.
- **Communication inter-serveurs par IP publique**, pas par réseau privé (VCN) — voir architecture cible.
- **Autoscaling Kubernetes** non implémenté.
- **MDM sans vrai terminal connecté**.
- **Aucune stratégie de sauvegarde** automatisée pour les bases de données (Graylog, GLPI, Headwind).
- **Pipeline CI/CD** limité à build + test, sans scan de sécurité intégré ni déploiement automatique.

Je considère ce projet comme une base solide, pas un point d'arrivée.

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
| Scan de vulnérabilités | Trivy (manuel) |
| Gestion de parc / Ticketing | GLPI (installation native, SELinux configuré) |
| MDM | Headwind MDM (image reconstruite pour ARM64) |
| Versioning | Git (GitHub + GitLab) |
| Cloud | Oracle Cloud Infrastructure (Always Free, ARM) |
| Sécurité réseau | firewalld, Oracle Security Lists, accès SSH par clé, IAM en lecture seule |
