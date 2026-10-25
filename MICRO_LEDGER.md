# BestBook fare micro-ledger

This module follows the signed-operation DAG pattern inspected in `L:/projectz/splitwise/docs/V2_PROTOCOL_SPEC.md`. It is a new BestBook protocol, not a wire-compatible PeerSplit V2 implementation. Do not send its blocks directly to PeerSplit relays/groups.

## Implemented

- `fare-ledger.js`: IndexedDB-backed append-only fare observations; persistent non-extractable Ed25519 device signing key; SHA-256 content IDs; domain separation; deterministic sorted-key JSON canonicalization; sorted distinct parent references; causal logical clocks; concurrent branches and deterministic merge.
- Strict envelope/observation schemas. Integer INR paise only. Full history validation on startup/import, signature/hash verification before storage, parent/clock validation and atomic import transactions. Replays are idempotent. Import capacity is 5,000 blocks and 32 parents per block.
- Exact journey date and normalized city lookup. Each observation carries operator, departure, bus type, seat, provider, amount, fare basis, provenance and timestamp. Lifetime is at most 15 minutes. Expired records remain in history but cannot enter best-deal ranking.
- Rank only final public-page observations from explicitly trusted authors, with matching service/departure/type/seat. Latest observation per provider supersedes older ones. Require at least two provider observations for a comparison. Default trusted author is only this device. No manual observations are eligible for automatic ranking.
- `fare-cache.js`: integration and status, local cache lookup, inspector, durable manual test observations, and validated same-origin BroadcastChannel exchange between tabs. IndexedDB is the local database, not a server.
- `test-ledger.cjs`: actual browser/WebCrypto/IndexedDB tests for signatures, tampering, persistence, identity, duplicate imports, concurrent branches, clocks, trust, freshness, matching, provenance, amount/TTL bounds and rejection without mutation.

## Not implemented / not claimed

- No automatic public website collector. Probes previously encountered HTTP/2 failure and a too-many-requests response. Empty cache means no verified observations are available, not no bus inventory.
- No cross-device relay transport, peer discovery, bootstrap, encryption of shared envelopes or automatic remote trust. BroadcastChannel synchronizes tabs on one browser origin; it is not an internet peer network.
- Not compatible with PeerSplit's canonical binary envelopes or expense payloads. The cryptographic primitives align, but fare observations have their own domain and schema.
- No automatic assertion of the globally best or guaranteed bookable fare. Signatures prove integrity/authorship, not truth, completeness or checkout eligibility. A peer may lie; trusted-author selection and collector evidence remain necessary.
- No centralized backend/database, provider APIs, mining, cryptocurrency, transaction fees or consensus about actual seat ownership.
- No cross-device acceptance, Android WebView cryptographic capability test or production security audit. Ed25519/WebCrypto and IndexedDB must be supported; failure is visible and never replaced with unsigned records. Private keys are non-extractable through WebCrypto, not claimed hardware-backed.
- No ledger compaction or encrypted backup UI. At the configured bound, imports/appends fail rather than silently discard parent history.

## Next integration boundaries

1. On-device public-page collector emits structured, date-confirmed observations only when service, seat, final price and applicable conditions are actually known. Starting fares remain excluded from final-fare ranking.
2. Peer transport carries signed observation DAG batches, obtains missing ancestors and passes all received blocks through `ingest`. A BestBook-specific Nostr topic/envelope must not reuse private PeerSplit expense group keys.
3. User-approved trust and privacy policy govern contributing public observations. No passenger names, phone, email, payment credentials or private booking details belong in shared fare blocks.
4. Device acceptance must verify persistence, two-device delivery, corrupted import rejection, offline restart, relay outage and cache expiry before any network-ready claim.

Run `npm run test:ledger` after installing Playwright, or set `PLAYWRIGHT_MODULE` and `BROWSER_PATH` to existing installations.
