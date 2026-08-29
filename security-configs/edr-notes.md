# EDR renforce — osquery (detection continue) + fail2ban (reaction automatique)

## osquery en surveillance continue (edr-monitor.sh)

Script execute automatiquement chaque minute via cron, qui interroge osquery pour lister les connexions reseau externes actives, et journalise le resultat.

**Boucle complete** : cron declenche -> osquery interroge -> journalctl enregistre -> rsyslog transmet -> Graylog centralise et rend consultable.

**Verifier dans Graylog** :

source:app-server AND edr-monitor


## fail2ban en reaction automatique

Voir `fail2ban-notes.md` — bloque automatiquement les IP effectuant des tentatives de connexion SSH suspectes repetees.

## Ce que ca demontre

Contrairement a osquery seul (observation a la demande), cette combinaison associe :
- une **detection continue et automatisee** (pas besoin de lancer une requete manuellement)
- une **reaction automatique reelle** (blocage IP, pas juste une alerte)

Ce sont les deux fonctions centrales d'un EDR professionnel (type CrowdStrike), demontrees ici en version simplifiee et open source.
