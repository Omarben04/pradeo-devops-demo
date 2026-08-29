# fail2ban — protection SSH anti brute-force (EDR-like : detection + reaction)

Installe et configure sur app-server pour detecter et bloquer automatiquement les IP effectuant des tentatives de connexion SSH suspectes.

## Configuration

Voir `fail2ban-jail.local` pour la config complete.

- maxretry = 3 tentatives
- findtime = 300 secondes (5 minutes)
- bantime = 3600 secondes (1 heure)
- backend = polling (lecture directe du fichier de log)
- filter = sshd en mode aggressive

## Difficulte rencontree

Le filtre sshd standard classe les messages "Connection closed by authenticating user ... [preauth]" comme non-malveillants (NOFAIL) par defaut, car ce pattern peut aussi correspondre a des deconnexions normales. Le mode `aggressive` du filtre inclut ce pattern comme tentative suspecte a comptabiliser, adapte au contexte de scan automatique observe sur ce serveur.

## Test en conditions reelles

Suite a l'activation, fail2ban a detecte et banni automatiquement 2 IP effectuant des tentatives de connexion repetees en tant que root :
- 110.173.190.221
- 193.111.125.167

Verification :
```bash
sudo fail2ban-client status sshd
```
