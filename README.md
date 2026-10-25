# ⚡ ZapFare — 100% Free India Bus & Seat Net-Fare Meta-Aggregator

**Every App. Every Coupon. Exact Seat. One Zap.**

ZapFare is a **Zero-Server (Client-Side + P2P Cached)** travel fare meta-aggregator built for India. Instead of showing fake base fares, ZapFare computes the **true final checkout price** down to the **specific sleeper/seater berth (`L4`, `U2`)** across **redBus, AbhiBus, MakeMyTrip, Paytm, Goibibo, and Direct Bus Operators**—stacking verified promo codes, bank credit/debit cards, UPI offers, and Bus Pass math automatically.

---

## ✨ Key Innovations

1. **💺 Exact Seat-Level Price Scanner (100% Free):**
   Indian bus operators and OTAs apply dynamic markups to prime single lower berths (`L1–L4`) vs. rear upper berths (`U5–U8`). Tap any berth on the interactive deck layout to see which platform sells *that exact seat* the cheapest.
2. **🧮 Net-Fare Coupon + Card + Bus Pass Knapsack Engine:**
   Computes `Base Fare + Seat Markup + 5% GST + OTA Convenience Fee − Best Coupon − Bank Card Offer − Net Bus Pass Savings (Primo/SuperPass)` in <15ms locally on the user's device.
3. **🌐 Zero-Server P2P Cache & Instant Dead-Coupon Kill Switch:**
   - **₹0 Server Cost & Zero IP Blocking:** Searches run client-side on residential mobile IPs and share anonymized route/seat price hashes via a P2P cache.
   - **Self-Healing Coupons:** If a coupon fails at checkout (`Quota Exhausted`), clicking **`⚠️ Report Dead`** immediately invalidates it across the peer network and switches to the next best coupon.
4. **🤖 On-Device AI Checkout Assistant:**
   Opens the winning platform, auto-locates the bus, auto-taps the selected seat (`L4`), and auto-copies/injects the winning promo code.
5. **📅 30-Day Fare Heatmap & 🕔 5:30 PM "Empty-Bus Crash" Radar:**
   - Highlights green (cheapest) vs. red (Diwali/weekend surge) travel dates.
   - Tracks luxury Volvo/BharatBenz buses with >15 empty seats that slash prices by 25%–32% in the final 3–4 hours before departure.
6. **🧠 Split-Route / Passing-Through Hacks:**
   Detects when booking a bus originating from a prior city (e.g., *Mysore → Hyderabad via Bangalore*) is cheaper than a direct origin bus.

---

## 🚀 Quick Start (Zero Dependencies)

No `npm install` or backend server required!

1. Clone this repository:
   ```bash
   git clone https://github.com/leomoon85/zapfare.git
   ```
2. Open `index.html` directly in any browser (or host free on **GitHub Pages** / **Cloudflare Pages**).
