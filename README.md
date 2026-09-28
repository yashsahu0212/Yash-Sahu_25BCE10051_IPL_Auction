# HAMMER — Realtime Cricket Player Auction Platform

A server-authoritative, real-time cricket player auction system built for high-concurrency franchise bidding. Supports both production Supabase architecture (PostgreSQL, Row-Level Security, Auth, Realtime, Edge Functions) and offline/local development via Node.js and Socket.IO.

---

## Features

- **Multi-Device Realtime Bidding:** Each participating franchise independently connects and submits bids from their dedicated device console.
- **Server-Authoritative Auction Engine:** Atomic bid validation enforcing IPL purse limits, maximum squad capacity (25), mandatory minimum reserve retention (7 players), and Rule 7 self-outbid prevention.
- **Tiered Bid Increments:** Automatic increment progression (+₹10L for bids < ₹100L; +₹20L for bids < ₹500L; +₹50L for bids ≥ ₹500L).
- **Official Player Pool & 3D Dossiers:** 73 official IPL cricketers with career metrics, role designations, and interactive 3D flip card dossiers.
- **Auctioneer Master Control Desk:** Dedicated privileged console for lot initiation, gavel calls (1st, 2nd, Final Call), timer management, and marking lots SOLD or UNSOLD.
- **Role-Based Access Control (RBAC):** Strict separation between Franchise Team Owners (`team_owner`), Official Auctioneers (`auctioneer`), and Viewers (`viewer`) enforced via server-side route guards and database Row-Level Security (RLS).
- **Dual-Backend Support:** Production-ready on Supabase with zero server dependencies, or standalone offline via Node.js / Express / Socket.IO.

---

## Tech Stack

- **Frontend:** Semantic HTML5, Vanilla JavaScript (ES2022), CSS3 Custom Properties, Tailwind CSS utilities.
- **Backend / Realtime (Local):** Node.js, Express, Socket.IO, Cookie-Parser.
- **Backend / Realtime (Production):** Supabase (PostgreSQL 15, Row-Level Security, Stored Procedures, GoTrue Auth, Realtime Channels, Deno Edge Functions).
- **Audio Synthesis:** Native Web Audio API procedural sound engine (no external audio assets required).

---

## Project Structure

```
├── auction-desk.html          # Privileged Auctioneer master control desk
├── team-console.html          # Franchise bidder device console
├── player-pool.html           # 73-player official catalogue with 3D flip cards
├── index.html                 # Public live auction broadcast board
├── lot-replay.html            # Archival ledger & completed lot replay
├── login.html                 # Unified role-based authentication portal
├── unauthorized.html          # 403 Forbidden access-restricted display
├── server.js                  # Local Node.js / Socket.IO auction engine & API
├── package.json               # Dependencies and runner scripts
├── .env.example               # Environment variable reference
├── .gitignore                 # Exclusion configuration for sensitive files
├── backend/
│   ├── migrations/            # PostgreSQL DDL, RLS policies, and stored procedures
│   ├── seed.sql               # Franchises, marquee players, and seed profiles
│   └── functions/             # Supabase Edge Functions (submit-bid, auction-action)
├── css/
│   └── hammer-editorial.css   # Editorial typography, layout tokens, and 3D card styles
├── data/
│   ├── players.json           # 73 IPL cricketers dataset with stats and reserve prices
│   └── teams.json             # 10 official IPL franchises with ₹125 Cr purse
├── js/
│   ├── hammer.js              # Unified client auction library (Supabase + Local fallback)
│   ├── hammer-ux.js           # Web Audio procedural sound engine and interactions
│   ├── player-images.js       # Official IPL player image URL resolver
│   └── supabase-config.js     # Supabase client initialization & telemetry
└── test_final_audit.js        # Automated route security & data verification suite
```

---

## Setup & Installation

### Prerequisites

- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to create your local `.env`:

```bash
cp .env.example .env
```

Set your Supabase credentials in `.env` if connecting to a Supabase project:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

*Note: For local offline development, no external credentials are required; the server runs automatically in standalone mode.*

### 3. Run the Application

```bash
# Start production server
npm start

# Or start in watch mode for development
npm run dev
```

The application will be accessible at:
- **Live Broadcast Board:** `http://localhost:3000/`
- **Player Pool Catalogue:** `http://localhost:3000/player-pool.html`
- **Auctioneer Desk:** `http://localhost:3000/auction-desk.html` *(requires auctioneer credentials)*
- **Team Console:** `http://localhost:3000/team-console.html` *(requires team credentials)*
- **Lot Replay:** `http://localhost:3000/lot-replay.html`
- **Login Portal:** `http://localhost:3000/login.html`

---

## Authentication & Credentials

| Role | Username | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Auctioneer** | `auctioneer` | `hammer2026` | Master control desk, lot initiation, gavel, sold/unsold overrides |
| **Franchise (CSK)** | `csk` | `csk2026` | Chennai Super Kings bidding console & squad ledger |
| **Franchise (MI)** | `mi` | `mi2026` | Mumbai Indians bidding console & squad ledger |
| **Franchise (RCB)** | `rcb` | `rcb2026` | Royal Challengers Bengaluru console & squad ledger |
| **Viewer** | `viewer` | `view2026` | Read-only broadcast access |

*(Additional team logins exist for `dc`, `gt`, `kkr`, `lsg`, `pbks`, `rr`, `srh` with matching `[code]2026` passwords).*

---

## Verification & Automated Tests

Run the full automated test suite:

```bash
npm test
```

This runs:
1. `test_final_audit.js` — 12-point authentication, server-side route guard, and data integrity test suite.
2. `test_ipl_rules_demo.js` — 13-point multi-device bidding, Rule 7 self-outbid prevention, tiered increments, and purse deduction tests.
3. `test_supabase_architecture.js` — 8-point PostgreSQL schema, RLS policies, atomic `FOR UPDATE` lock validation, and Edge Function test suite.
