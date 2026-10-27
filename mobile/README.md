# HAMMER Mobile App — Realtime Cricket Player Auction

Cross-platform mobile application (iOS & Android) for the **HAMMER IPL Player Auction System**. Communicates in real time with the Node.js & Socket.IO backend as well as the Supabase Cloud database with zero latency.

---

## 📱 Features

- **Real-Time Auction Arena**:
  - Millisecond-synchronized circular countdown clock
  - 3D-styled player dossier card with official photo and career statistics (Runs, Wickets, Strike Rate, Economy)
  - Current leading bid and franchise badge
  - Live gavel stages (1st Call, 2nd Call, Fair Warning, Hammer Sold)
  - Instant SOLD / UNSOLD resolution banner celebration
- **Franchise Owner Bidding Paddle**:
  - Zero-delay Socket.IO bidding paddle with Rule 6 tiered increments (+10L, +20L, +50L)
  - Live purse balance and remaining roster slots (min 7, max 15)
  - **Rule 7 Safeguard**: Disables self-outbidding when your franchise already holds the high bid
  - **Anti-Sniping Engine**: Automatic bid cutoff when timer hits 0s
- **Auctioneer Master Desk**:
  - Put any player from the 73-player pool under the hammer
  - Gavel progression & authoritative HAMMER SOLD / UNSOLD
  - Instant clock adjustments (+5s, +10s, +15s, Reset Clock, Pause/Resume)
  - Official IPL 2026 Captain Retention Engine
- **Player Pool Catalogue**:
  - Searchable 73-player roster with filter chips (Batters, Bowlers, All-rounders, Wicketkeepers, Overseas)
  - Modal dossiers with scouting notes
- **Squad & Purse Ledger**:
  - Real-time audit of all 10 IPL franchises with purse spend progress and acquired squads
- **Sequential Activity Audit Stream**:
  - Authoritative sequential log of all auction events in realtime

---

## 📦 How to Build & Download Standalone Android APK

You can build a standalone `.apk` file that anyone can download and install on any Android phone (no Expo Go or development environment required for end-users):

### Step 1: Install EAS CLI & Log In
```bash
npm install -g eas-cli
eas login
```
*(If you do not have an Expo account yet, create one for free at [expo.dev/signup](https://expo.dev/signup) — no credit card needed).*

### Step 2: Trigger the Cloud APK Build
From the `mobile` directory or workspace root:
```bash
# From mobile/
cd mobile
npx eas-cli build -p android --profile preview

# Or from workspace root:
npm run build:apk
```

### Step 3: Download & Install APK on Any Phone
1. Expo's cloud build servers will compile the standalone `.apk` (takes ~3–5 minutes).
2. When completed, EAS provides a **direct download URL** and a **QR code** in the terminal:
   `https://expo.dev/artifacts/eas/.../hammer-auction.apk`
3. Open this URL or scan the QR code on any Android device to download `hammer-auction.apk`.
4. Tap the downloaded file to install it directly on your phone!

---

## 🌐 Connecting to a Live Worldwide Server (No Local Run)

To run the live auction on any phone on 4G/5G/cellular anywhere in the world without being restricted to your local Wi-Fi, host your backend online:

### Option A: 1-Click Free Deploy on Render.com (Recommended)
1. Push this repository to your GitHub account.
2. Go to **[https://render.com](https://render.com)** and click **New + ➔ Web Service**.
3. Select your GitHub repository (`Yash-Sahu_25BCE10051_IPL_Auction`).
4. Render will automatically detect [`render.yaml`](../render.yaml) or select:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Create Web Service**. Render gives you a permanent, free public HTTPS URL:
   `https://hammer-auction.onrender.com`
6. In the mobile app:
   - Open the app, tap the **LIVE/OFFLINE** pill or **CONNECT**.
   - Enter your public URL (e.g. `https://hammer-auction.onrender.com`) and tap **CONNECT**.
   - The app saves this URL permanently — now **any phone on any network** anywhere connects directly to the live auction!

### Option B: Instant Public Tunnel via LocalTunnel (Zero Setup)
If you want to run your local server but make it accessible worldwide right now:
```bash
# Terminal 1: Run server
npm start

# Terminal 2: Expose to the world
npx localtunnel --port 3000
```
This prints a public internet URL (e.g. `https://hammer-live.loca.lt`). Enter this URL into the mobile app's server input and tap **CONNECT**!

---

## 📲 Alternative: Instant Zero-Install Mobile PWA

You can also run the mobile app without downloading an APK:
1. Open `http://<your-server-url>/mobile` in Safari (iOS) or Chrome (Android).
2. **iPhone (Safari)**: Tap Share ➔ **"Add to Home Screen"**.
3. **Android (Chrome)**: Tap 3 dots ➔ **"Install App"** / **"Add to Home screen"**.
4. Opens as a fullscreen standalone app directly on your phone.

---

## 🔑 Demo Credentials

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Auctioneer** | `auctioneer` | `hammer2026` | Full gavel authority & lot launch |
| **CSK Owner** | `csk` | `csk2026` | Chennai Super Kings bidding paddle |
| **MI Owner** | `mi` | `mi2026` | Mumbai Indians bidding paddle |
| **RCB Owner** | `rcb` | `rcb2026` | Royal Challengers Bengaluru bidding paddle |
| **Other Franchises** | `gt`, `rr`, `srh`, `dc`, `lsg`, `kkr`, `pbks` | `[teamcode]2026` | All 10 franchises |
| **Viewer** | `viewer` | `view2026` | Live spectator |
