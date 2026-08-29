#!/bin/bash
SUSPICIOUS=$(osqueryi --json "SELECT DISTINCT remote_address FROM process_open_sockets WHERE remote_address != '' AND remote_address NOT LIKE '10.%' AND remote_address NOT LIKE '172.%';")
COUNT=$(echo "$SUSPICIOUS" | grep -o 'remote_address' | wc -l)
if [ "$COUNT" -gt 0 ]; then
  echo "$(date): $COUNT connexion(s) externe(s) active(s) detectee(s)" | logger -t edr-monitor
  echo "$SUSPICIOUS" | logger -t edr-monitor
fi
