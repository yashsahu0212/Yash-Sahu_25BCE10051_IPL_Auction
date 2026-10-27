# HAMMER Mobile App — Realtime Cricket Player Auction

Cross-platform mobile application (iOS & Android) for the **HAMMER IPL Player Auction System**. Communicates in real time with the same Node.js & Socket.IO backend as the web broadcast and franchise consoles with zero latency.

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

## 🚀 How to Run & Download

You can use the mobile app in **two ways**:

### Option 1: Instant Zero-Install Mobile PWA (Fastest & Recommended)
You do **not** need to install Expo or any build tools to run on your phone:
1. Start the server on your computer:
   ```bash
   npm start
   ```
2. Note your computer's Wi-Fi LAN IP printed in the console banner, e.g. `http://192.168.1.7:3000`.
3. Open Safari (iOS) or Chrome (Android) on your phone and go to:
   ```
   http://192.168.1.7:3000/mobile
   ```
4. **Install as App**:
   - **iPhone (Safari)**: Tap the Share button (square with arrow up) ➔ Tap **"Add to Home Screen"**.
   - **Android (Chrome)**: Tap the 3 dots menu ➔ Tap **"Install App"** or **"Add to Home screen"**.
   - It will open as a fullscreen, native-feeling app directly from your phone's home screen!

---

### Option 2: Native React Native / Expo Mobile App

#### Prerequisites
- Node.js (v18+)
- Phone connected to the same Wi-Fi as your computer
- Install the free **Expo Go** app on your phone:
  - [Expo Go for Android (Google Play)](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [Expo Go for iOS (App Store)](https://apps.apple.com/app/expo-go/id982107779)

#### Step 1: Start Backend Server
From the project root:
```bash
npm start
```
Your computer's Wi-Fi address will be displayed (e.g. `http://192.168.1.7:3000`).

#### Step 2: Install Mobile Dependencies & Start
Open a second terminal window:
```bash
cd mobile
npm install
npx expo start
```

#### Step 3: Open on Your Phone
1. Open the **Expo Go** app on your phone.
2. **Android**: Scan the QR code in your terminal directly inside Expo Go.
   **iPhone**: Open the default Camera app, point at the QR code, and tap the prompt to open in Expo Go.
3. In the mobile app:
   - Tap **CONNECT** or the **LIVE/OFFLINE** pill at the top.
   - Tap the **"WI-FI (192.168.1.7)"** button (or tap **🔍 AUTO-DETECT** to automatically detect your server).
   - Tap any franchise button (e.g., `CSK`, `MI`, `RCB`) or `AUCTIONEER` to log in instantly with 1 tap!

#### Run in Web Browser
```bash
cd mobile
npx expo start --web
```

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
