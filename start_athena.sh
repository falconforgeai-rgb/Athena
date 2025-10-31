#!/bin/bash
# start_athena.sh — auto-launch FalconForge listener + ngrok + CAP ping
# Author: FalconForge AI Labs / Athena Advisor

set -e

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "${YELLOW}🔧 Starting Athena CAP Validation environment...${RESET}"

# Load environment
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo -e "${RED}❌ .env not found! Aborting.${RESET}"
  exit 1
fi

# Kill stale processes
pkill -f falconforge_listener.js >/dev/null 2>&1 || true
pkill ngrok >/dev/null 2>&1 || true

# Start listener
echo -e "${GREEN}🛰️ Launching FalconForge Listener on port ${PORT:-8080}...${RESET}"
nohup node falconforge_listener.js > listener.log 2>&1 &

sleep 2

# Start ngrok and capture URL
echo -e "${GREEN}🌐 Launching ngrok tunnel...${RESET}"
NGROK_URL=$(npx ngrok http ${PORT:-8080} --log=stdout | grep -m 1 -o "https://[a-zA-Z0-9.-]*\.ngrok-free\.dev")

if [ -z "$NGROK_URL" ]; then
  echo -e "${RED}❌ Failed to capture ngrok URL.${RESET}"
  exit 1
fi

# Update .env with new URL
sed -i "s|^NGROK_URL=.*|NGROK_URL=${NGROK_URL}/v3/cap/log|" .env
export NGROK_URL="${NGROK_URL}/v3/cap/log"

echo -e "${YELLOW}🔑 Updated .env with new tunnel:${RESET} ${NGROK_URL}"

# Wait for listener and ngrok to stabilize
sleep 3

# Run CAP signing test
if [ -f sign_and_send_cap.js ]; then
  echo -e "${GREEN}🧩 Sending CAP handshake test...${RESET}"
  node sign_and_send_cap.js || echo -e "${RED}⚠️ CAP test failed, check listener.log${RESET}"
else
  echo -e "${YELLOW}⚠️ sign_and_send_cap.js not found, skipping CAP test.${RESET}"
fi

echo -e "${GREEN}✅ Athena environment fully online.${RESET}"

# Run CAP signing test and log result
if [ -f sign_and_send_cap.js ]; then
  echo -e "${GREEN}🧩 Sending CAP handshake test...${RESET}"
  CAP_OUTPUT=$(node sign_and_send_cap.js 2>&1)
  STATUS=$(echo "$CAP_OUTPUT" | grep -o '"status":"ok"' || true)

  # Create timestamped log path
  YEAR=$(date +%Y)
  MONTH=$(date +%m)
  mkdir -p CAP_LOGS/$YEAR/$MONTH

  LOG_FILE="CAP_LOGS/$YEAR/$MONTH/startup_$(date +%Y%m%d_%H%M%S).json"
  echo "$CAP_OUTPUT" > "$LOG_FILE"

  if [ -n "$STATUS" ]; then
    echo -e "${GREEN}✅ CAP test succeeded — logged to $LOG_FILE${RESET}"
  else
    echo -e "${RED}⚠️ CAP test failed — logged to $LOG_FILE${RESET}"
  fi
else
  echo -e "${YELLOW}⚠️ sign_and_send_cap.js not found, skipping CAP test.${RESET}"
fi

echo -e "${GREEN}✅ Athena environment fully online.${RESET}"
