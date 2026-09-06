# Architecture Decision Records (ADR)

Ce document rassemble les principales décisions techniques prises pendant le projet, avec le contexte, les options considérées, et les conséquences assumées. Format inspiré des ADR utilisés en entreprise pour tracer *pourquoi* une décision a été prise, pas seulement *ce qui a été fait*.

---

## ADR-001 : Choix de Graylog plutôt que Wazuh pour le SIEM

### Statut
Accepté

### Contexte
Le projet nécessite un SIEM pour centraliser et analyser les logs système. L'infrastructure tourne sur des VM Oracle Cloud en architecture ARM64 (Ampere), choisies pour leur gratuité permanente (Always Free).

### Options considérées
1. **Wazuh** — SIEM open source complet, très utilisé en entreprise, avec agent + manager
2. **Graylog** — Centralisation de logs, plus simple, orienté recherche et alerting

### Décision
Wazuh a été tenté en premier (choix initial le plus naturel), mais son script d'installation officiel refuse explicitement les architectures non-x86_64, et l'émulation Docker testée en renfort (`binfmt`) a également échoué (`exec format error`). Bascule vers Graylog, dont l'image Docker est nativement multi-architecture.

### Conséquences
- Positif : Graylog fonctionne parfaitement sur ARM, avec un vrai stream et une vraie alerte configurés et testés en conditions réelles
- Négatif : Graylog offre moins de fonctionnalités de détection avancée que Wazuh (pas d'agent EDR intégré) — compensé partiellement par osquery + fail2ban en complément

---

## ADR-002 : Choix de Prometheus/Grafana plutôt que Zabbix pour la supervision

### Statut
Accepté

### Contexte
Besoin d'une supervision temps réel (CPU, RAM, disque, réseau) des deux serveurs.

### Options considérées
1. **Zabbix** — solution de supervision tout-en-un, largement utilisée en entreprise
2. **Prometheus + Grafana** — collecte de métriques + visualisation, standard de l'écosystème cloud-native

### Décision
Zabbix a été tenté en premier, mais son image `zabbix-server-mysql` restait bloquée en boucle avec l'erreur "users table is empty", malgré plusieurs tentatives de réinitialisation de la base et d'import manuel du schéma SQL. Après un temps raisonnable passé à diagnostiquer sans succès durable, bascule vers Prometheus + Grafana, qui a fonctionné dès le premier lancement.

### Conséquences
- Positif : mise en place rapide, dashboard "Node Exporter Full" immédiatement exploitable
- Négatif : Zabbix propose une gestion d'inventaire réseau plus poussée que Prometheus seul — non couverte ici, compensée par GLPI pour la partie inventaire

---

## ADR-003 : Reconstruction locale de l'image Headwind MDM plutôt qu'une VM x86_64 payante

### Statut
Accepté

### Contexte
Après deux échecs MDM (Fleet, Flyve MDM), l'image officielle Headwind MDM se révèle aussi incompatible ARM64 (`exec format error`). Deux solutions : payer une VM x86_64 (hors Always Free), ou trouver une alternative ARM64.

### Options considérées
1. **VM x86_64 payante** — utiliser le crédit Oracle Cloud pour une machine compatible nativement
2. **Reconstruire l'image Docker localement** — puisque le code source (Java/Tomcat) n'a pas de limitation d'architecture, seule l'image pré-compilée est en cause

### Décision
Reconstruction locale de l'image via `docker build` directement sur la VM ARM, à partir du Dockerfile officiel `h-mdm/hmdm-docker`. Le paquet `aapt` (bloquant habituel) existe en version ARM64 sur Ubuntu 22.04, base de l'image.

### Conséquences
- Positif : aucun coût supplémentaire, solution reproductible, réutilisable si l'éditeur ne publie jamais d'image ARM officielle
- Négatif : responsabilité de maintenir l'image à jour manuellement (pas de mises à jour automatiques depuis un registre officiel)

---

## ADR-004 : Choix de l'architecture ARM (Always Free) plutôt que x86_64 payant

### Statut
Accepté, avec limites assumées

### Contexte
Oracle Cloud propose un tier gratuit permanent limité à 1 OCPU/1GB en x86_64, contre 4 OCPU/24GB en ARM (Ampere).

### Options considérées
1. **x86_64 Always Free** — compatibilité logicielle maximale, mais ressources très limitées
2. **ARM Always Free** — bien plus de ressources, mais compatibilité logicielle incertaine

### Décision
Choix de l'architecture ARM pour disposer de suffisamment de RAM/CPU pour faire tourner Kubernetes, un SIEM, une supervision et un MDM simultanément, gratuitement et en permanence.

### Conséquences
- Positif : infrastructure complète, gratuite en permanence, largement plus puissante que le tier x86_64
- Négatif : trois outils sur quatre tentés (Wazuh, Fleet, Zabbix) ont nécessité une bascule ou une reconstruction à cause de ce choix — un coût réel en temps de diagnostic, mais qui a aussi permis d'apprendre à contourner ce type de blocage plutôt que de l'éviter

---

## ADR-005 : Installation native de GLPI plutôt qu'en conteneur Docker

### Statut
Accepté

### Contexte
L'image Docker officielle GLPI (`diouxx/glpi`) ne supporte que l'architecture x86_64.

### Options considérées
1. **Chercher une image GLPI alternative ARM64**
2. **Installation native** (PHP, Apache, MariaDB directement sur le système)

### Décision
Installation native, cohérente avec l'approche déjà utilisée pour Headwind MDM (comprendre la vraie cause du blocage plutôt que chercher indéfiniment une image toute faite).

### Conséquences
- Positif : fonctionne parfaitement, et a permis de découvrir et résoudre un blocage SELinux indépendant (erreur 403)
- Négatif : maintenance manuelle des mises à jour de sécurité PHP/Apache, contrairement à une image Docker versionnée

---

## ADR-006 : Désactivation du multiplexing SSH d'Ansible

### Statut
Accepté

### Contexte
Ansible restait bloqué indéfiniment sur "Gathering Facts" en se connectant depuis Codespace vers Oracle Cloud, alors qu'une connexion SSH manuelle fonctionnait immédiatement.

### Options considérées
1. **Ignorer et relancer en boucle** en espérant que ça passe
2. **Diagnostiquer avec le mode verbeux** (`-vvv`) pour identifier la cause exacte

### Décision
Diagnostic avec `-vvv`, qui a révélé que le multiplexing SSH (`ControlMaster`) d'Ansible posait problème dans l'environnement Codespace. Désactivation du multiplexing et forçage de `PreferredAuthentications=publickey`.

### Conséquences
- Positif : résolution durable et comprise, pas un simple contournement
- Négatif : légère perte de performance sur les connexions répétées (le multiplexing accélère normalement les connexions SSH successives)
