# 💸 SplitEasy

A Splitwise-like expense splitting app built with **Expo (React Native)** and **Node.js + MongoDB**.

## Architecture

```
spliteasy/
├── mobile/          # Expo React Native app (iOS)
│   ├── src/
│   │   ├── screens/       # App screens
│   │   ├── components/    # Reusable UI components
│   │   ├── navigation/    # React Navigation setup
│   │   ├── services/      # API client
│   │   ├── context/       # Auth & app state
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Helpers (debt simplification, etc.)
│   └── app.json           # Expo config
├── server/          # Node.js + Express API
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── models/        # Mongoose schemas
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/     # Auth middleware
│   │   └── utils/         # Helpers
│   └── package.json
└── docs/            # Deployment guides
```

## Features (V1)

- **User auth** — Sign up / log in with phone number + OTP
- **Add friends** — By phone number or QR code
- **Add expenses** — Split equally among selected friends
- **Balance tracking** — Real-time who-owes-whom
- **Smart settlements** — Minimizes number of transactions
- **Settle up** — Record payments between friends

## Prerequisites

- **Node.js** ≥ 18
- **npm** or **yarn**
- **Expo CLI** — `npm install -g expo-cli`
- **MongoDB Atlas** account (free tier) — [mongodb.com/atlas](https://www.mongodb.com/atlas)
- **Xcode** (for iOS simulator) — Mac only
- **Apple Developer Account** ($99/yr) — for App Store deployment

## Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/spliteasy.git
cd spliteasy
```

### 2. Set up the backend
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 3. Set up the mobile app
```bash
cd mobile
npm install
# Update the API_URL in src/services/api.js to your server URL
npx expo start
```

Press `i` to open in the iOS Simulator.

## Deployment

### Backend → Railway (free tier)
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repo, set root directory to `/server`
4. Add environment variables from `.env.example`
5. Railway auto-deploys on every push

### iOS App → App Store
1. Get an [Apple Developer Account](https://developer.apple.com) ($99/yr)
2. Run `eas build --platform ios` (see [Expo EAS Build docs](https://docs.expo.dev/build/introduction/))
3. Submit via `eas submit --platform ios`

See `docs/DEPLOYMENT.md` for the full step-by-step guide.

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Mobile     | Expo (React Native), React Navigation |
| Backend    | Node.js, Express.js                 |
| Database   | MongoDB Atlas (Mongoose)            |
| Auth       | JWT + phone/OTP                     |
| Build      | Expo EAS Build                      |
| Hosting    | Railway (backend)                   |

## License

MIT
