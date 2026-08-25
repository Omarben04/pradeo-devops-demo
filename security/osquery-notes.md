# osquery — Visibilité comportementale (EDR-like)

osquery installé et testé sur cet environnement pour démontrer la visibilité comportementale qu'apporte un EDR.

## Requêtes testées

### Processus liés à Docker
```sql
SELECT pid, name, cmdline FROM processes WHERE name LIKE '%docker%' LIMIT 5;
```

### Connexions réseau ouvertes
```sql
SELECT pid, local_address, local_port, remote_address, remote_port, state 
FROM process_open_sockets WHERE local_port != 0 LIMIT 10;
```

## Concept démontré

osquery transforme l'état du système (processus, sockets réseau, fichiers) en tables interrogeables via SQL — c'est le principe de base de la visibilité comportementale utilisée par les EDR (ex. CrowdStrike) pour détecter des activités suspectes.
