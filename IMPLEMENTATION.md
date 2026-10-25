# Implementation report

## Original findings

The original project was branded ZapFare and laid out as a wide desktop comparison dashboard. Android simply loaded a duplicate asset directory. The app had three fixed routes and sample seats/fares, but no booking service or database. Date selection did not retrieve date-specific inventory. Live peer counts, coupon broadcast, background alerts and AI seat/coupon injection were asserted by UI text and timers without implementations. There were no traveller forms, complete navigation, trip management or profile. Provider links opened landing pages rather than matching checkouts.

## Changes

Introduced BestBook's forest-green/lime visual identity, local system typography, mobile touch controls, illustrated home screen, separate city/date search, route validation and route discovery. Added results, sorting, filters, empty states, bus information, interactive two-deck seats, selection limit, stop forms, passenger/contact validation, transparent provider comparison and external handoff. Added saved-plan acknowledgment, upcoming/past plan lists, plan reopening/removal, device-local profile and privacy explanation. Used normal browser history for flow and Android Back. Added accessible labels, native form controls, live announcements, focus treatment, reduced-motion support, safe-area CSS and keyboard/system-bar handling in Android.

Preserved original sample route/seat data and fare algorithm, extracting the algorithm for reuse. Removed the fabricated peer, automation and background service claims. Kept Android package identity and existing Java/WebView stack. Synchronized root files to Android assets and added a sync script. Disabled cleartext/mixed content and file-origin cross-origin access; external links use the system browser with missing-handler recovery.

## Changed files

- `app.js`, `index.html`, `styles.css`: replacement mobile presentation/navigation around the original sample business model.
- `fare-engine.js`: extracted original price algorithm.
- `android/app/src/main/assets/{app.js,index.html,styles.css,fare-engine.js}`: synchronized runtime files; data.js remains identical to original.
- `android/app/src/main/java/com/zapfare/app/MainActivity.java`: host behavior and security.
- `android/app/src/main/AndroidManifest.xml`: BestBook display label, keyboard resize, cleartext disabled.
- `android/settings.gradle`: BestBook project display name.
- `serve.cjs`, `sync-android.cjs`, `test.cjs`, `package.json`, `.gitignore`, `README.md`, `IMPLEMENTATION.md`: development tools, checks and documentation.

## Validation

- JavaScript syntax: passed for app.js, fare-engine.js and data.js.
- Android `assembleDebug --offline`: passed with installed Gradle 8.11.1/JDK 17/SDK 35; generated debug APK. Java reports deprecated platform API usage (legacy Back/status-bar compatibility APIs).
- Automated headless Edge/Playwright: passed the full preview journey, saved-plan persistence/reopening, booked-seat exclusion, provider fare rendering, invalid same-city validation, and 25 page/width overflow checks. No page runtime errors.
- Screenshot inspected at 390px: home layout, route/date inputs, search, route discovery and bottom tabs. Screenshot at `artifacts/home-390.png` (generated, ignored by Git).
- Android lintDebug: passed after resolving the official lint dependency. Remaining warnings: existing SDK target 35 is not the newest; JavaScript is intentionally enabled for the bundled UI. Added a BestBook launcher icon.
- No original test, lint, package install or type-check setup existed. Source is JavaScript, not TypeScript. Playwright is a development-only dependency.

## Limits

No live availability, reservation, payment, booking confirmation or real ticket can be verified without a backend. This delivery is a polished working planner/preview, not a production booking service. Native emulator/physical Android behavior and iOS have not been verified. Restricted seats remain unavailable because the dataset does not define an authoritative eligibility rule. The sample layout and fare estimates must be replaced by provider responses before sale. Pass and card stacking remain disabled, since actual eligibility/stackability is not verified. The historical root APK is unchanged; use the newly built APK.


## Public-website comparison direction

Per user clarification, provider APIs are outside the goal. Normal search now opens the public-website workspace for any typed route. Added `public-comparison.js` with redBus/ixigo route-page links, AbhiBus homepage fallback, journey copying, and user-entered fare notes carrying operator, departure, exact seat, bus type, fare basis and capture time. Notes can be removed and are kept in memory. Sample bus/seat data is accessible only through an explicit demo section. `index.html`, `app.js`, `styles.css`, `sync-android.cjs`, browser tests and Android assets were updated.

Public-page probes: redBus failed with ERR_HTTP2_PROTOCOL_ERROR; AbhiBus returned Oops...too many requests. No challenge bypass was attempted. Automatic extraction is not implemented or claimed. Browser tests passed the new arbitrary-route workspace, quote creation/removal, original demo journey and responsive checks.

## PeerSplit-style fare ledger foundation

Added `fare-ledger.js`, `fare-cache.js`, `test-ledger.cjs`, `MICRO_LEDGER.md` and synchronized Android assets. Updated public comparison, script loading, package scripts and tests. Real Ed25519 signatures (with wrapped `@noble/curves` fallback when WebCrypto Ed25519 is unavailable), SHA-256 IDs, IndexedDB persistence, causal DAG validation/merge, bounded batches, expiry and scoped trusted-author ranking are implemented.

## On-device collector, checkout observation & Nostr P2P completion

- **On-device public collector & checkout assistant (`PublicCollector.java`, `collector/public-sources.js`, `collector/form-assistant.js`, `collector/checkout-assistant.js`, `search-controller.js`):** Added isolated Android WebViews and local browser collector support to read public route listings, assist form/seat/coupon selection, and observe exact-seat checkout totals (`checkout-dom-1`, `source: 'checkout'`, `basis: 'final'`) scoped by `profileKey`.
- **Deal engine & insights (`deal-engine.js`, `insights.js`):** Added paise-level offer optimization, explicit stackability checks, pass cost accounting, 30-day observed fare calendar, local price watches (with Android notification bridge), and passing-through service verification.
- **Nostr NIP-01 P2P relay sync (`peer-network.js`, `tests/peer-network.cjs`):** Implemented `FarePeerNetwork` (`kind: 30078`, topic `bestbook-fares-v1`) to publish/ingest signed public-page route DAG blocks and scoped coupon issue reports (`coupon-report`) over WebSocket relays.
- **Synchronized Android build:** Synchronized all 16 runtime assets into `android/app/src/main/assets/`, passed all 4 automated test suites (`domain.cjs`, `test-ledger.cjs`, `peer-network.cjs`, `test.cjs`), and rebuilt both `app-debug.apk` and root `ZapFare.apk`.
