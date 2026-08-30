#!/bin/bash

APP_SERVER="141.253.111.20"
SEC_SERVER="89.168.55.236"
KEY="$HOME/.ssh/oracle_key"

PASS=0
FAIL=0

check() {
  local desc="$1"
  local result="$2"
  if [ "$result" -eq 0 ]; then
    echo "  [OK] $desc"
    PASS=$((PASS+1))
  else
    echo "  [ECHEC] $desc"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Verification complete de l'infrastructure ==="
echo ""

echo "1. Connectivite SSH"
ssh -i "$KEY" -o ConnectTimeout=5 -o BatchMode=yes opc@$APP_SERVER "exit" 2>/dev/null
check "SSH app-server (opc)" $?
ssh -i "$KEY" -o ConnectTimeout=5 -o BatchMode=yes opc@$SEC_SERVER "exit" 2>/dev/null
check "SSH security-server (opc)" $?

echo ""
echo "2. Docker actif"
ssh -i "$KEY" -o ConnectTimeout=5 opc@$APP_SERVER "docker ps > /dev/null" 2>/dev/null
check "Docker app-server" $?
ssh -i "$KEY" -o ConnectTimeout=5 opc@$SEC_SERVER "docker ps > /dev/null" 2>/dev/null
check "Docker security-server" $?

echo ""
echo "3. Kubernetes"
ssh -i "$KEY" -o ConnectTimeout=5 opc@$APP_SERVER "kubectl get nodes | grep -q Ready" 2>/dev/null
check "Cluster K3s actif" $?
ssh -i "$KEY" -o ConnectTimeout=5 opc@$APP_SERVER "kubectl get pods | grep portfolio-omar | grep -q Running" 2>/dev/null
check "Pods portfolio en Running" $?

echo ""
echo "4. Services web (acces public)"
curl -s -o /dev/null --max-time 5 http://$APP_SERVER:30081/
check "Portfolio (30081)" $?
curl -s -o /dev/null --max-time 5 http://$SEC_SERVER:9000/
check "Graylog (9000)" $?
curl -s -o /dev/null --max-time 5 http://$APP_SERVER:3000/
check "Grafana (3000)" $?
curl -s -o /dev/null --max-time 5 http://$APP_SERVER:9090/
check "Prometheus (9090)" $?
curl -s -o /dev/null --max-time 5 http://$SEC_SERVER/glpi/
check "GLPI (80/glpi)" $?
curl -s -o /dev/null --max-time 5 http://$SEC_SERVER:8082/
check "Headwind MDM (8082)" $?

echo ""
echo "5. Graylog - reception de logs"
ssh -i "$KEY" -o ConnectTimeout=5 opc@$SEC_SERVER "docker ps | grep graylog-graylog | grep -q healthy" 2>/dev/null
check "Conteneur Graylog healthy" $?

echo ""
echo "6. Acces utilisateur amaury"
ssh -i "$HOME/.ssh/amaury_key" -o ConnectTimeout=5 -o BatchMode=yes amaury@$APP_SERVER "sudo whoami | grep -q root" 2>/dev/null
check "SSH + sudo amaury sur app-server" $?
ssh -i "$HOME/.ssh/amaury_key" -o ConnectTimeout=5 -o BatchMode=yes amaury@$SEC_SERVER "sudo whoami | grep -q root" 2>/dev/null
check "SSH + sudo amaury sur security-server" $?

echo ""
echo "7. osquery"
ssh -i "$KEY" -o ConnectTimeout=5 opc@$APP_SERVER "which osqueryi > /dev/null" 2>/dev/null
check "osquery installe sur app-server" $?
ssh -i "$KEY" -o ConnectTimeout=5 opc@$SEC_SERVER "which osqueryi > /dev/null" 2>/dev/null
check "osquery installe sur security-server" $?

echo ""
echo "8. fail2ban (EDR - reaction automatique)"
ssh -i "$KEY" -o ConnectTimeout=5 opc@$APP_SERVER "sudo systemctl is-active fail2ban | grep -q active" 2>/dev/null
check "fail2ban actif sur app-server" $?

echo ""
echo "9. GLPI"
ssh -i "$KEY" -o ConnectTimeout=5 opc@$SEC_SERVER "sudo systemctl is-active httpd | grep -q active" 2>/dev/null
check "Apache (GLPI) actif" $?
ssh -i "$KEY" -o ConnectTimeout=5 opc@$SEC_SERVER "sudo systemctl is-active mariadb | grep -q active" 2>/dev/null
check "MariaDB (GLPI) actif" $?

echo ""
echo "10. Headwind MDM"
ssh -i "$KEY" -o ConnectTimeout=5 opc@$SEC_SERVER "docker ps | grep hmdm-docker-hmdm | grep -q Up" 2>/dev/null
check "Conteneur Headwind MDM actif" $?
ssh -i "$KEY" -o ConnectTimeout=5 opc@$SEC_SERVER "docker ps | grep hmdm-docker-postgresql | grep -q Up" 2>/dev/null
check "PostgreSQL (MDM) actif" $?

echo ""
echo "11. Terraform (verification locale)"
if [ -f "/workspaces/pradeo-devops-demo/terraform-oracle/main.tf" ]; then
  check "Fichiers Terraform Oracle presents" 0
else
  check "Fichiers Terraform Oracle presents" 1
fi

echo ""
echo "================================================"
echo "RESULTAT : $PASS tests reussis, $FAIL tests echoues"
echo "================================================"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "ATTENTION : des problemes ont ete detectes, a corriger avant de laisser Amaury se connecter."
  exit 1
else
  echo ""
  echo "Tout est fonctionnel."
  exit 0
fi
