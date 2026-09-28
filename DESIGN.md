---
name: Vintage Editorial Auction Broadsheet
colors:
  surface: '#fff8f4'
  surface-dim: '#e3d8d0'
  surface-bright: '#fff8f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fdf2e9'
  surface-container: '#f7ece3'
  surface-container-high: '#f1e6de'
  surface-container-highest: '#ebe1d8'
  on-surface: '#201b16'
  on-surface-variant: '#4e4639'
  inverse-surface: '#352f2a'
  inverse-on-surface: '#faefe6'
  outline: '#7f7667'
  outline-variant: '#d1c5b4'
  surface-tint: '#775a1f'
  primary: '#74571d'
  on-primary: '#ffffff'
  primary-container: '#8f7033'
  on-primary-container: '#fffbff'
  inverse-primary: '#e8c17c'
  secondary: '#a13d3b'
  on-secondary: '#ffffff'
  secondary-container: '#fe857f'
  on-secondary-container: '#751d1e'
  tertiary: '#705743'
  on-tertiary: '#ffffff'
  tertiary-container: '#8a6f5a'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdea7'
  primary-fixed-dim: '#e8c17c'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5d4207'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ae'
  on-secondary-fixed: '#410005'
  on-secondary-fixed-variant: '#822626'
  tertiary-fixed: '#fedcc3'
  tertiary-fixed-dim: '#e1c0a8'
  on-tertiary-fixed: '#291808'
  on-tertiary-fixed-variant: '#594230'
  background: '#fff8f4'
  on-background: '#201b16'
  surface-variant: '#ebe1d8'
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 26px
    fontWeight: '400'
    lineHeight: 30px
    letterSpacing: 0em
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 28px
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Courier Prime
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Courier Prime
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Courier Prime
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Courier Prime
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-md:
    fontFamily: Courier Prime
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.1em
  label-sm:
    fontFamily: Courier Prime
    fontSize: 9px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.12em
spacing:
  gutter: 1rem
  gutter-mobile: 0.5rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system models the deliberate permanence, typographic rigor, and structured discipline of an archival broadsheet gazette. Built specifically for high-stakes athletic player auctions, the aesthetic eschews generic SaaS tropes, software gloss, floating drop shadows, and synthetic neon accents. Instead, it prioritizes a tactile, printed paper environment where every player record reads like a historical ledger entry and every financial figure carries the weight of a letterpress document.

The visual identity relies on sharp rectilinear divisions, razor-fine editorial hairline rules, strict typographic hierarchy, and typewriter-annotated tabular data. The emotional target is authoritative, serious, and historic: conveying the gravity of an old-world auction house paired with the forensic precision of a vintage cricket statistical archive.

## Colors

The palette reproduces physical pigments, newsprint paper stock, and aged printer inks. Digital pure white (`#FFFFFF`) and pure black (`#000000`) are strictly forbidden. 

- **Primary (`#A88647` - Muted Ledger Gold):** Reserved for auction state highlights, hammer price indicators, leading bidder values, and select rule accents.
- **Secondary (`#8F302F` - Muted Auction Crimson):** Applied sparingly to critical states—reserve not met, live lot status, countdown alerts, and stamped administrative statuses.
- **Tertiary (`#765D49` - Weathered Umber):** Utilized for secondary historical annotations, career averages, and auxiliary lot provenance notes.
- **Neutral (`#211C17` - Dark Letterpress Ink):** High-density ink tone used for primary titles, monetary figures, and structural boundaries.

### Background and Surface Tokens
- **Canvas / Ground (`#F3EBDD`):** The foundational raw newsprint stock of the application.
- **Surface Container (`#F7F1E6`):** A slightly lifted, pressed paper layer for auction card bodies, input fields, and ledger rows.
- **Surface Container High (`#EBE1D0`):** An elevated paper ticket shade utilized for callouts, bid paddles, and lot summary badges.
- **Border Rule (`#C9BBA8`):** The strict 1px architectural divider separating columns, tabular data, and editorial sidebars.

## Typography

The typographic system creates an interplay between authoritative, literary serif headlines (`Newsreader`) and mechanical, monospaced typewriter output (`Courier Prime`). 

- **Newsreader** handles editorial narrative, lot titling, player biographical names, and principal valuation amounts. It should be styled with optical sizing enabled and set with natural ink-spread kerning.
- **Courier Prime** handles structured telemetry: lot numbers, career statistics (runs, wickets, bowling economy), countdown timers, purse allocations, and tabular receipts. All numeric data must be rendered in fixed-width tabular alignments.
- **Casing Rules:** Structural section labels, column headers, and status stamps must be rendered in full uppercase with expanded letter-spacing to emulate archival typesetting and rubber stamp markings.

## Layout & Spacing

The layout is anchored by a structured broadsheet grid reminiscent of early 20th-century newspaper broadsides. 

- **Desktop (1024px+):** A 12-column rigid grid with `gutter` of 1rem and outer page margins of 2rem. Sections are separated by explicit 1px rules rather than empty white space. Multi-column editorial spreads (Lot Details, Live Bid Stream, Team Purses) must sit flush against dividing hairline rules.
- **Tablet (768px - 1023px):** An 8-column layout. Supplementary ledger sidebars collapse into vertically stacked docket panels.
- **Mobile (below 768px):** A 4-column compact ledger. Margins reduce to 1rem; horizontal padding inside data cells tightens to `space-sm` to maintain tabular density without scroll overflow.
- **Density:** Spacing is compact and dense. Padding inside cards, tickets, and tables must feel tightly registered, prioritizing information density over loose negative space.

## Elevation & Depth

This design system prohibits digital soft shadows, blur filters, and multi-layered light simulation. Visual hierarchy is established exclusively through paper value shifts, nested borders, and structural framing.

- **Level 0 (Broadsheet Base):** Rendered in `#F3EBDD`. This serves as the background canvas for all full-bleed layouts and multi-column divisions.
- **Level 1 (Paper Docket / Panel):** Rendered in `#F7F1E6` with a solid 1px architectural border (`#C9BBA8`). Used for individual player lot listings, bid history ledgers, and team purse summaries.
- **Level 2 (Raised Ticket / Auction Paddle):** Rendered in `#EBE1D0` with a double-rule border (a 1px solid outer line, 2px interior gap, and 1px inner solid line using `#211C17`). Used for the active bid module and the current player under the hammer.
- **Depth Metaphor:** Elements do not "hover"; they are printed, pasted, or stamped onto the parent broadsheet.

## Shapes

All shapes across the entire design system are strictly unrounded with sharp 90-degree corners (`0px` radius). 

- **Corners:** Buttons, tags, table cells, modal sheets, and lot cards have absolute rectangular geometry.
- **Ornamental Notches:** Corner treatments may optionally feature 45-degree angled clipped corners (dog-eared ticket corners) achieved via CSS clip-path (max 6px), reinforcing the feel of physical clipped paper cards, but never continuous border radii.
- **Structural Lines:** Dividers are unbroken horizontal and vertical 1px rules (`#C9BBA8`). Double rules (two parallel 1px lines separated by 2px of background color) denote master auction headers and footer summaries.

## Components

### Buttons & Auction Paddles
- **Primary Action (Place Bid):** Sharp-cornered `#211C17` fill with `#F7F1E6` monospaced text. 1px border matching the dark ink. On hover, the background reverses to `#A88647` with `#211C17` ink.
- **Secondary Action (Pass / Increment):** Transparent ground with `#211C17` 1px border and monospaced uppercase typography. On hover, the fill shifts to `#EBE1D0`.
- **Destructive / Alert Action (Withdraw):** `#8F302F` background with `#F7F1E6` text.

### Chips & Status Stamps
- **Auction Status Badges:** Styled to look like physical inked desk stamps. Rectangular, bordered by a 1.5px solid rule in `#8F302F` (for `LIVE LOT`, `UNSOLD`) or `#A88647` (for `SOLD`, `RESERVE MET`). Font is `Courier Prime`, uppercase, bold, with `0.15em` letter spacing. No fill color; the text matches the stamp border.

### Input Fields & Bid Counters
- **Numeric Bid Inputs:** `#F7F1E6` background, 1px `#211C17` border. Large monospaced characters. Incremental buttons (+/-) are built directly into the border frame as joined rectangular segments.
- **Search & Filters:** Styled as single-line catalog indices with underline-only rules (`border-bottom: 1px solid #211C17`) and `Courier Prime` italic placeholders.

### Tables & Statistical Ledgers
- **Ledger Tables:** Zero outer card padding; tables stretch edge-to-edge within their grid containers. Alternate row striping is achieved via subtle paper contrast (`#F3EBDD` vs `#F7F1E6`). Table headers are set in `Newsreader` italic or `Courier Prime` uppercase with a heavy 2px rule underneath. Numerical figures (wickets, strike rates, economy) align to the right edge.

### Checkboxes & Radios
- **Selection Controls:** Square 14px boxes with sharp 0px corners. Unchecked: `#F7F1E6` interior with a 1px `#211C17` border. Checked: Marked with a solid interior fill or a clean diagonal monospaced cross mark (`X`) in dark ink.

### Player Lot Dossier Cards
- **Card Anatomy:** Rigid rectangular container with 1px border `#C9BBA8`. Features a distinct split header: Top left contains Lot No. in monospace, top right contains the Opening Base Price. Center stage holds the player name in large `Newsreader` serif, followed by a tight 3-column stats ledger in monospaced format.