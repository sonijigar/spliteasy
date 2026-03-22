# Deployment Guide — SplitEasy

This guide walks you through deploying SplitEasy from zero to the iOS App Store.

---

## Step 1: Set Up MongoDB Atlas (Free)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a free cluster (M0 Sandbox — free forever)
3. Click **"Connect"** → **"Connect your application"**
4. Copy the connection string — it looks like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/spliteasy
   ```
5. Under **Network Access**, add `0.0.0.0/0` to allow access from anywhere (needed for Railway)

---

## Step 2: Deploy Backend to Railway (Free Tier)

1. Push your code to GitHub first:
   ```bash
   cd spliteasy
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/spliteasy.git
   git push -u origin main
   ```

2. Go to [railway.app](https://railway.app) and sign in with GitHub

3. Click **"New Project"** → **"Deploy from GitHub Repo"** → select `spliteasy`

4. In project settings:
   - Set **Root Directory** to `/server`
   - Set **Start Command** to `npm start`

5. Add environment variables (click **Variables**):
   ```
   MONGODB_URI=mongodb+srv://...your atlas connection string...
   JWT_SECRET=run-this-to-generate: openssl rand -hex 32
   PORT=3000
   NODE_ENV=production
   ```

6. Railway auto-deploys. You'll get a URL like `https://spliteasy-production.up.railway.app`

7. Test it:
   ```bash
   curl https://spliteasy-production.up.railway.app/api/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

---

## Step 3: Update Mobile App API URL

Open `mobile/src/services/api.js` and update:
```javascript
const API_URL = 'https://spliteasy-production.up.railway.app/api';
```

---

## Step 4: Set Up Expo & EAS Build

1. Install Expo CLI and EAS CLI:
   ```bash
   npm install -g expo-cli eas-cli
   ```

2. Create an Expo account at [expo.dev](https://expo.dev)

3. Log in:
   ```bash
   eas login
   ```

4. Initialize EAS for your project:
   ```bash
   cd mobile
   eas init
   ```
   This updates `app.json` with your project ID.

---

## Step 5: Apple Developer Account Setup

1. **Enroll** at [developer.apple.com](https://developer.apple.com) — costs $99/year
   - Enrollment takes 24-48 hours to process

2. Once approved, go to **App Store Connect** → [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

3. Click **"My Apps"** → **"+"** → **"New App"**:
   - Platform: iOS
   - Name: SplitEasy
   - Bundle ID: `com.yourname.spliteasy` (must match `app.json`)
   - SKU: `spliteasy-v1`

4. Note down your **Apple Team ID** (found in Membership section of developer portal)

---

## Step 6: Update eas.json

Edit `mobile/eas.json` and fill in your Apple details:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your@email.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABCDE12345"
    }
  }
}
```

- `appleId`: Your Apple ID email
- `ascAppId`: Found in App Store Connect → your app → General → App Information
- `appleTeamId`: Found in developer.apple.com → Membership

---

## Step 7: Build for iOS

### Test build (runs on your iPhone via TestFlight):
```bash
cd mobile
eas build --platform ios --profile preview
```

### Production build (for App Store submission):
```bash
eas build --platform ios --profile production
```

EAS builds in the cloud — no Mac needed for the build itself. Takes ~15-20 minutes.

---

## Step 8: Submit to App Store

```bash
eas submit --platform ios --latest
```

This uploads your build to App Store Connect.

---

## Step 9: App Store Review

1. Go to **App Store Connect** → your app
2. Fill in the required metadata:
   - **Description**: "Split expenses effortlessly with friends. Track who owes whom and settle up with ease."
   - **Keywords**: splitwise, expenses, split, friends, money, payments
   - **Category**: Finance
   - **Screenshots**: Take screenshots from the iOS Simulator (⌘+S)
   - **Privacy Policy URL**: You'll need one — use a free generator or host a simple page

3. Click **"Submit for Review"**
4. Apple reviews typically take 24-48 hours
5. Once approved, your app goes live!

---

## Quick Reference: Common Commands

```bash
# Start backend locally
cd server && npm run dev

# Start mobile app locally
cd mobile && npx expo start

# Build for iOS TestFlight
cd mobile && eas build --platform ios --profile preview

# Build for App Store
cd mobile && eas build --platform ios --profile production

# Submit to App Store
cd mobile && eas submit --platform ios --latest
```

---

## Cost Summary

| Item                      | Cost            |
| ------------------------- | --------------- |
| MongoDB Atlas (M0)        | Free            |
| Railway (Hobby)           | Free / $5/mo    |
| Apple Developer Account   | $99/year        |
| Expo / EAS Build          | Free (30 builds/mo) |
| **Total to launch**       | **~$99**        |

---

## What's Next (V2 Ideas)

- QR code scanning with camera (expo-camera already included)
- Push notifications for new expenses
- Unequal splits and percentage-based splits
- Group expenses (trips, households)
- Receipt photo scanning with OCR
- Export to CSV/PDF
