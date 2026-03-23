#!/bin/bash
# SplitEasy Demo Starter — runs mock server (no MongoDB needed) + Expo iOS
set -e

# Resolve project root as absolute path once, before any cd
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 SplitEasy Demo Setup"
echo "========================"

# ── 1. Check dependencies ───────────────────────────────────────
echo ""
echo "Checking dependencies..."

if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

if ! command -v npx &>/dev/null; then
  echo "❌ npx not found. Update Node.js from https://nodejs.org"
  exit 1
fi

echo "✅ Node $(node --version) ready"

# ── 2. Start backend mock server ────────────────────────────────
echo ""
echo "Starting backend mock server..."
cd "$ROOT/server"

if [ ! -f .env ]; then
  echo "Creating .env..."
  JWT_SECRET=$(openssl rand -hex 32)
  cat > .env <<EOF
JWT_SECRET=$JWT_SECRET
PORT=3000
NODE_ENV=development
EOF
fi

npm install --silent 2>/dev/null

# Kill any existing process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

node mock-server.js &
SERVER_PID=$!
sleep 2

if curl -sf http://localhost:3000/api/health &>/dev/null; then
  echo "✅ Mock server running at http://localhost:3000"
else
  echo "❌ Server failed to start"
  exit 1
fi

# ── 3. Start Expo for iOS Simulator ─────────────────────────────
echo ""
echo "Starting Expo for iOS Simulator..."
cd "$ROOT/mobile"
npm install --silent 2>/dev/null

echo ""
echo "==========================================="
echo "✅ SplitEasy is ready!"
echo "   • API:  http://localhost:3000/api"
echo "   • Mock server (no MongoDB needed)"
echo "   • Press 'i' to open iOS Simulator"
echo "   • Press Ctrl+C to stop everything"
echo "==========================================="
echo ""

trap "echo ''; echo 'Stopping...'; kill $SERVER_PID 2>/dev/null; exit 0" INT

npx expo start --ios
