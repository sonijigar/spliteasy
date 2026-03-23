#!/bin/bash
# SplitEasy Demo Starter - run this on your Mac
set -e

echo "🚀 SplitEasy Demo Setup"
echo "========================"

# ── 1. Check dependencies ───────────────────────────────────────
echo ""
echo "Checking dependencies..."

if ! command -v brew &>/dev/null; then
  echo "❌ Homebrew not found. Install it first:"
  echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "Installing Node.js..."
  brew install node
fi

if ! command -v mongod &>/dev/null; then
  echo "Installing MongoDB..."
  brew tap mongodb/brew
  brew install mongodb-community@7.0
fi

if ! command -v expo &>/dev/null; then
  echo "Installing Expo CLI..."
  npm install -g expo-cli
fi

echo "✅ All dependencies ready"

# ── 2. Start MongoDB ────────────────────────────────────────────
echo ""
echo "Starting MongoDB..."
if brew services list | grep mongodb-community | grep started &>/dev/null; then
  echo "✅ MongoDB already running"
else
  brew services start mongodb/brew/mongodb-community@7.0
  sleep 2
  echo "✅ MongoDB started"
fi

# ── 3. Start backend server ─────────────────────────────────────
echo ""
echo "Starting backend server..."
cd "$(dirname "$0")/server"

if [ ! -f .env ]; then
  echo "Creating .env..."
  JWT_SECRET=$(openssl rand -hex 32)
  cat > .env <<EOF
MONGODB_URI=mongodb://localhost:27017/spliteasy
JWT_SECRET=$JWT_SECRET
PORT=3000
NODE_ENV=development
EOF
fi

npm install --silent 2>/dev/null

# Kill any existing server on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo "Starting Express server on port 3000..."
npm start &
SERVER_PID=$!
sleep 3

# Verify server is up
if curl -sf http://localhost:3000/api/health &>/dev/null; then
  echo "✅ Server running at http://localhost:3000"
else
  echo "⚠️  Server may still be starting..."
fi

# ── 4. Start Expo ───────────────────────────────────────────────
echo ""
echo "Starting Expo for iOS Simulator..."
cd "$(dirname "$0")/mobile"
npm install --silent 2>/dev/null

echo ""
echo "==========================================="
echo "✅ SplitEasy is ready!"
echo "   • API:  http://localhost:3000/api"
echo "   • The iOS Simulator will open shortly"
echo "   • Press 'i' in the Expo menu to open simulator"
echo "   • Press Ctrl+C to stop everything"
echo "==========================================="
echo ""

# Trap Ctrl+C to clean up
trap "echo ''; echo 'Stopping...'; kill $SERVER_PID 2>/dev/null; brew services stop mongodb/brew/mongodb-community@7.0; exit 0" INT

npx expo start --ios
