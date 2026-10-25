# HAMMER Mobile App — Realtime Cricket Player Auction

Cross-platform mobile application (iOS & Android) for the **HAMMER IPL Player Auction System**. Communicates in real time with the same Node.js & Socket.IO backend as the web broadcast and franchise consoles.

---

## 📱 Features

- **Real-Time Auction Arena**:
  - Millisecond-synchronized circular countdown clock
  - 3D-styled player dossier card with official photo and career statistics (Runs, Wickets, Strike Rate, Economy)
  - Current leading bid and franchise badge
  - Live gavel stages (1st Call, 2nd Call, Fair Warning, Hammer Sold)
- **Franchise Owner Bidding Paddle**:
  - One-tap quick bid paddle (+10L, +20L, +50L)
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
  - Live feed of all auction events without needing page reload or refresh

---

## 🚀 How to Run on Mobile Device

### Prerequisites
- Node.js (v18+)
- Smartphone (iPhone or Android) connected to the same Wi-Fi network as your computer
- Install **Expo Go** from the Apple App Store or Google Play Store on your phone

### Step 1: Start Backend Server
From the root directory (`auctionsite`):
```bash
npm start
```
Note the local network IP printed in the console banner, e.g. `http://172.25.241.119:3000`.

### Step 2: Start Mobile App
Open a new terminal in the `mobile` directory:
```bash
cd mobile
npx expo start
```

### Step 3: Open on Your Phone
1. Open the **Expo Go** app on your phone.
2. Scan the QR code displayed in your terminal.
3. In the mobile app's CONNECT / LOGIN screen, verify the server URL is set to your computer's Wi-Fi IP (e.g. `http://172.25.241.119:3000`).
4. Tap any of the 1-tap quick login buttons (e.g., `CSK`, `MI`, `RCB`, or `AUCTIONEER`).

### Run in Web Browser
You can also run the mobile app directly in your browser:
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
