# Google Maps Wheel — Design

## Intent
Decide where to eat. Load places from Google Maps saved lists, spin a wheel, get a pick fast. Success: phone, under 10 seconds from opening the app to a decision.

## Goals
- Import Google Takeout "Saved" CSVs (one CSV per Maps list).
- Animated spinner wheel picks a random place.
- Edit which places are on the wheel before spinning.
- Works on phone; installable to home screen.

## Non-goals
- Google sign-in or live sync (no API exposes saved Maps lists).
- Server, accounts, sharing.
- Filters by cuisine/price/hours (Takeout CSV lacks this data).

## Anti-goals
- Data leaving the device.
- Slow or fiddly flow on a phone.

## Approaches
1. **Static web app, no server (chosen).** CSV parsed in browser, stored in localStorage. Works on any device, installable as PWA, free hosting. Fastest to build.
2. Native Android (Kotlin). Android-only, heavier build/distribution, no capability gain.
3. Web app + backend + accounts. Enables sync/sharing; not needed, costs more.

Input source: user chose Takeout CSV upload over public-share-link scraping (fragile) and manual paste.

## Design
- **Upload:** pick one or more CSVs. List name = filename without `.csv`. Stored in localStorage; re-upload replaces list of same name.
- **List picker:** toggle chips choose which lists feed the wheel.
- **Edit wheel:** screen with checkbox per place (from active lists), search box, All/None. Unticked places persist as excluded across sessions until re-ticked.
- **Spin:** canvas wheel, one colored slice per place, big Spin button (swipe optional). Eases out onto a uniformly random winner.
- **Result card:** name, note, **Open in Maps** (CSV URL), **Nope, spin again** (excludes for current session only, re-spins). **Reset** restores session-skipped places.
- **Empty states:** no lists → upload prompt with Takeout instructions; zero places on wheel → message, Spin disabled.

## Constraints
- Plain HTML/CSS/JS, no framework, no build step.
- Hosted on GitHub Pages; PWA manifest + service worker for home-screen install/offline.

## Builder's calls (marked as Claude's)
- CSV parsing: header-based (columns `Title`, `Note`, `URL`; tolerate extra columns, quoted fields, blank rows). Rows without a title skipped.
- Place identity for exclusions: list name + URL (fallback title).
- Slice labels truncated to fit; wheel readable up to ~40 places, beyond that labels hidden and only the result shows the name.
- Colors, typography, exact animation curve.
