// One bundled crypto implementation for both browser and Android WebView.
import { finalizeEvent, verifyEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure';
import { ed25519 } from '@noble/curves/ed25519.js';
globalThis.BestBookCrypto = { finalizeEvent, verifyEvent, generateSecretKey, getPublicKey, ed25519 };
