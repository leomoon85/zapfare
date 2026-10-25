# BestBook

BestBook compares public booking websites without provider APIs, with user-entered fare notes and a separate sample journey preview, delivered in the existing Java Android WebView shell. It also runs in a browser for development. It is **not connected to live inventory, payments or ticket issuance**. Normal searches accept any city pair and show public route-page handoffs (redBus/ixigo) and AbhiBus’s search homepage. Dates must be selected on those websites. Automatic scraping is not implemented: direct browser probes returned a redBus HTTP/2 error and an AbhiBus too-many-requests page. Fare notes are manually entered and clearly labelled.

## Run

- Android: open `android/` in Android Studio with JDK 17, SDK 35 and Gradle 8.11.1. Let Gradle sync, then Run on a device/emulator (Android 7+). The application ID remains `com.zapfare.app` to preserve installation identity; the displayed name is BestBook.
- The generated debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`. Install with `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`. The old root `ZapFare.apk` is a legacy binary and is not the updated app.
- Browser preview: `node serve.cjs`, then open http://127.0.0.1:4173.
- After editing root UI files: `node sync-android.cjs`, then rebuild Android.
- Command-line Android build: `gradle -p android assembleDebug` (installed Gradle required; this repository has no wrapper).

## Checks

The app itself has no runtime dependencies. Browser tests use Playwright: `npm install`, `npx playwright install chromium`, then `npm test`. Run `npm run check` for JavaScript syntax. For an existing browser installation, set `BROWSER_PATH` to its executable. An existing Playwright installation can be supplied using `PLAYWRIGHT_MODULE`.

`test.cjs` starts its own local server, checks the search → seats → stops → passengers → review → saved-plan journey, unavailable seat behavior, invalid route handling, persistence, provider comparisons, and horizontal overflow at 320, 360, 390, 430 and 768 pixels. Run `gradle -p android lintDebug` for Android lint.

## Architecture

- `index.html`, `styles.css`, `app.js`: mobile interface, hash navigation, validation and in-memory journey state.
- `data.js`: preserved original route/operator/seat/coupon fixtures. These are bundled examples, not API responses. The historical global name `ZAPFARE_DATA` is retained to avoid unnecessary data migration.
- `fare-engine.js`: extracted existing seat/platform pricing calculation. Public sample coupons are compared; personal card discounts, pass stacking and crash simulation are off by default. Tax, fees, coupons and per-seat totals are illustrative, not quotes.
- `android/app/src/main/assets/`: synchronized offline UI bundle.
- `MainActivity.java`: WebView host, system/keyboard insets, Android Back history, external HTTPS provider links and safe browser failure handling.
- No backend, database, authentication service, peer network, AI checkout, WorkManager radar, or payment SDK exists.

## Available journey

Search the original three supported routes; sort/filter sample buses; select up to four available seats; select sample stops; enter validated traveller/contact details; inspect provider fare estimates; open a provider website; save a non-booked plan; review upcoming/past plans; save a device-local profile. Booked and restricted seats cannot be selected. Unknown routes have a clear error. Unsupported filters have an empty state.

No purchase or reservation occurs. Provider links open general websites: dates, route, passenger details and seats are not transferred. The generic direct-operator link in the sample flow is shown only for VRL. Amenities and refund policies are explicitly unverified. Plans do not have PNRs or ticket QR codes.

## Data and production requirements

Profile and non-personal trip plans persist in localStorage. Passenger/contact details remain in memory; profile information persists only when explicitly saved. Clearing the app's storage removes saved information. There is no account synchronization. The intended product compares public websites and redirects for booking, without provider APIs. To automate comparisons, a public-page collection layer must reliably render pages, identify the selected date and route, parse fares and their basis, match services/seats, and handle blocked or changed pages honestly. Automatic collection remains incomplete. Inventory, payments, ticket issuance, cancellations and refunds remain on the booking websites.

The existing Android stack is preserved. There is no iOS shell; mobile browser checks do not establish iOS or physical-device compatibility. Release signing is not configured for distribution; the inherited release configuration uses the debug key and must be replaced before publishing.

See `IMPLEMENTATION.md` for the inspection and validation report.

## Serverless micro-ledger, on-device collector & Nostr P2P foundation

BestBook now includes a complete serverless architecture:
- **Signed Causal DAG Ledger (`fare-ledger.js`, `fare-cache.js`):** Persists Ed25519-signed, SHA-256 hash-linked fare observations in IndexedDB (with wrapped fallback identity when WebCrypto Ed25519 is unavailable). See `MICRO_LEDGER.md` for protocol boundaries.
- **On-Device Public Website Collector & Checkout Assistant (`PublicCollector.java`, `collector/`, `search-controller.js`):** Reads public route listings (redBus, ixigo, AbhiBus) in isolated background WebViews/browsers, confirms route and date headers, and provides a deterministic in-app checkout assistant (`checkout-assistant.js`) that helps locate the bus, seat, boarding stop, and promo code while capturing verified exact-seat checkout totals (`basis: 'final'`) scoped to the user's payment profile hash.
- **Nostr NIP-01 P2P Transport (`peer-network.js`):** Exchanges signed public-page observation blocks and scoped coupon issue reports (`coupon-report`, `kind: 30078`) across peers over WebSocket relays without reusing private expense group keys.
- **Updated Root APK:** Both `android/app/build/outputs/apk/debug/app-debug.apk` and the root `ZapFare.apk` are synchronized and rebuilt with the latest BestBook runtime.
