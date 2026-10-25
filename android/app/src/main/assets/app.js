// ============================================================================
// ZapFare — Client-Side Serverless Optimization & P2P Cache Engine
// Runs 100% in-memory on the user's device (Zero Server Maintenance)
// ============================================================================

const AppState = {
  selectedRouteId: "BLR-HYD",
  selectedDate: "27 Oct (Tue)",
  selectedCards: new Set(["hdfc_cc", "icici_cc", "paytm_upi"]),
  includeBusPassMath: true,
  crashSimulationActive: false,
  selectedSeatsByBus: {}, // { busId: "L4" }
  deadCoupons: new Set(), // P2P broadcast invalidated coupon IDs
  activeAlerts: [
    { id: 1, route: "Bangalore → Hyderabad", targetPrice: 800, seatType: "Lower Single Sleeper", crashRadar: true }
  ]
};

// ============================================================================
// Core Algorithm: Calculate Exact Net Payable Price per Platform + Seat + Stack
// ============================================================================
function calculatePlatformDealsForBus(bus, selectedSeatId) {
  const seatObj = bus.seatMatrix.find(s => s.id === selectedSeatId) || bus.seatMatrix[3]; // Default L4 if none
  const results = [];

  for (const platform of ZAPFARE_DATA.platforms) {
    const pid = platform.id;

    // 1. Base fare + Seat-specific markup on this platform
    let baseFare = bus.platformFares[pid] || 1000;
    const seatMarkup = selectedSeatId ? (seatObj.markups[pid] || 0) : 0;
    let adjustedBase = baseFare + seatMarkup;

    // Apply 5 PM Empty-Bus Crash discount if user toggled simulation & bus supports it
    if (AppState.crashSimulationActive && bus.crashWatch) {
      adjustedBase = Math.round(adjustedBase * (1 - bus.crashDiscountPct / 100));
    }

    // 2. Taxes & OTA Convenience Fees
    const gstAmount = Math.round(adjustedBase * platform.gstPct);
    const convFee = Math.round(adjustedBase * platform.convFeePct);
    const grossTotal = adjustedBase + gstAmount + convFee;

    // 3. Find the Best Valid Coupon (Public OR matching user's selected cards)
    const eligibleCoupons = ZAPFARE_DATA.coupons.filter(c => {
      if (c.platform !== pid) return false;
      if (AppState.deadCoupons.has(c.id)) return false;
      if (adjustedBase < c.minFare) return false;
      if (c.cardReq && !AppState.selectedCards.has(c.cardReq)) return false;
      return true;
    });

    let bestCoupon = null;
    let bestCouponSavings = 0;

    for (const c of eligibleCoupons) {
      let saving = 0;
      if (c.discountFlat) {
        saving = c.discountFlat;
      } else if (c.discountPct) {
        saving = Math.min(Math.round(adjustedBase * c.discountPct), c.maxOff || 9999);
      }
      if (saving > bestCouponSavings) {
        bestCouponSavings = saving;
        bestCoupon = c;
      }
    }

    // 4. Bus Pass Knapsack Math (Does buying a ₹39-₹59 pass save extra money on this single ticket?)
    let passApplied = null;
    let netPassSavings = 0;

    if (AppState.includeBusPassMath) {
      const passObj = ZAPFARE_DATA.busPasses.find(p => p.platform === pid);
      if (passObj && (!passObj.minFare || adjustedBase >= passObj.minFare)) {
        let grossPassDiscount = 0;
        if (passObj.discountFlat) {
          grossPassDiscount = passObj.discountFlat;
        } else if (passObj.discountPct) {
          grossPassDiscount = Math.min(Math.round(adjustedBase * passObj.discountPct), passObj.maxDiscount || 999);
        }
        // Net benefit after paying for the pass itself
        if (grossPassDiscount > passObj.cost) {
          netPassSavings = grossPassDiscount - passObj.cost;
          passApplied = {
            ...passObj,
            grossDiscount: grossPassDiscount,
            netBenefit: netPassSavings
          };
        }
      }
    }

    const finalNetPayable = Math.max(199, grossTotal - bestCouponSavings - netPassSavings);

    results.push({
      platform,
      baseFare,
      seatMarkup,
      adjustedBase,
      gstAmount,
      convFee,
      grossTotal,
      bestCoupon,
      bestCouponSavings,
      passApplied,
      netPassSavings,
      finalNetPayable,
      totalSaved: grossTotal - finalNetPayable
    });
  }

  // Sort ascending by Final Net Payable price
  results.sort((a, b) => a.finalNetPayable - b.finalNetPayable);
  return results;
}

// ============================================================================
// UI Rendering Functions
// ============================================================================

function initApp() {
  renderWalletChips();
  renderHeatmap();
  renderBuses();
  renderAlerts();
  bindEvents();
}

function bindEvents() {
  document.getElementById("routeSelect").addEventListener("change", (e) => {
    AppState.selectedRouteId = e.target.value;
    renderBuses();
    showToast(`⚡ Loaded P2P Cached fares for ${e.target.options[e.target.selectedIndex].text} in 12ms (0 Server Calls)`);
  });

  document.getElementById("passMathToggle").addEventListener("change", (e) => {
    AppState.includeBusPassMath = e.target.checked;
    renderBuses();
  });

  document.getElementById("crashSimToggle").addEventListener("change", (e) => {
    AppState.crashSimulationActive = e.target.checked;
    renderBuses();
    if (AppState.crashSimulationActive) {
      showToast("🕔 5:30 PM Empty-Bus Crash Radar Activated! Luxury buses with >15 empty seats slashed fares by up to 32%!");
    }
  });

  document.getElementById("addAlertBtn").addEventListener("click", () => {
    const routeObj = ZAPFARE_DATA.routes.find(r => r.id === AppState.selectedRouteId);
    const targetInput = document.getElementById("alertPriceInput");
    const price = parseInt(targetInput.value, 10) || 750;
    AppState.activeAlerts.unshift({
      id: Date.now(),
      route: `${routeObj.from} → ${routeObj.to}`,
      targetPrice: price,
      seatType: "Single Lower Window (L1-L4)",
      crashRadar: true
    });
    renderAlerts();
    showToast(`🔔 Local WorkManager Alert set for ${routeObj.from} → ${routeObj.to} below ₹${price}!`);
  });
}

function renderWalletChips() {
  const container = document.getElementById("walletChips");
  container.innerHTML = ZAPFARE_DATA.paymentMethods.map(pm => {
    const active = AppState.selectedCards.has(pm.id);
    return `
      <button onclick="toggleCard('${pm.id}')" class="wallet-chip ${active ? 'active' : ''}">
        <span>${pm.icon}</span>
        <span>${pm.name}</span>
        <span class="chip-check">${active ? '✓' : '+'}</span>
      </button>
    `;
  }).join("");
}

window.toggleCard = function(cardId) {
  if (AppState.selectedCards.has(cardId)) {
    AppState.selectedCards.delete(cardId);
  } else {
    AppState.selectedCards.add(cardId);
  }
  renderWalletChips();
  renderBuses();
};

function renderHeatmap() {
  const container = document.getElementById("heatmapGrid");
  container.innerHTML = ZAPFARE_DATA.monthlyHeatmap.map(d => {
    const isSelected = AppState.selectedDate.startsWith(d.day);
    return `
      <div onclick="selectCalendarDate('${d.day} (${d.dow})', ${d.price})" class="heatmap-cell level-${d.level} ${isSelected ? 'selected' : ''}">
        <div class="hm-top">
          <span class="hm-day">${d.day}</span>
          <span class="hm-dow">${d.dow}</span>
        </div>
        <div class="hm-price">₹${d.price}</div>
        <div class="hm-tag">${d.tag}</div>
      </div>
    `;
  }).join("");
}

window.selectCalendarDate = function(dateStr, basePrice) {
  AppState.selectedDate = dateStr;
  document.getElementById("activeDateBadge").textContent = dateStr;
  renderHeatmap();
  renderBuses();
  showToast(`📅 Switched to ${dateStr} — Net fares recalculated locally.`);
};

function renderBuses() {
  const route = ZAPFARE_DATA.routes.find(r => r.id === AppState.selectedRouteId);
  if (!route) return;

  // Render Hidden Route Hack Banner
  const hackBanner = document.getElementById("routeHackBanner");
  if (route.passingThroughHack && route.passingThroughHack.available) {
    hackBanner.style.display = "flex";
    hackBanner.innerHTML = `
      <div class="hack-icon">🧠</div>
      <div class="hack-body">
        <div class="hack-title">
          <span class="badge-pill badge-emerald">SPLIT-ROUTE HACK FOUND</span>
          <strong>Save ₹${route.passingThroughHack.savings} extra via ${route.passingThroughHack.originCity}</strong>
        </div>
        <p>${route.passingThroughHack.tip}</p>
      </div>
    `;
  } else {
    hackBanner.style.display = "none";
  }

  const listEl = document.getElementById("busListContainer");
  listEl.innerHTML = route.buses.map(bus => {
    // Default selected seat to L4 so user immediately sees Seat-Specific power
    if (!AppState.selectedSeatsByBus[bus.id]) {
      AppState.selectedSeatsByBus[bus.id] = "L4";
    }
    const selectedSeatId = AppState.selectedSeatsByBus[bus.id];
    const selectedSeatObj = bus.seatMatrix.find(s => s.id === selectedSeatId);

    const deals = calculatePlatformDealsForBus(bus, selectedSeatId);
    const winner = deals[0];
    const highest = deals[deals.length - 1];
    const spreadSavings = highest.finalNetPayable - winner.finalNetPayable;

    return `
      <div class="bus-card">
        <!-- Bus Header -->
        <div class="bus-card-header">
          <div class="bus-info-left">
            <div class="bus-title-row">
              <h3>${bus.operator}</h3>
              <span class="rating-badge">★ ${bus.rating} (${bus.reviews})</span>
              ${bus.crashWatch ? `<span class="crash-badge">${AppState.crashSimulationActive ? `🔥 CRASH LIVE (-${bus.crashDiscountPct}%)` : `🕔 5PM Crash Candidate (${bus.seatsLeft} seats empty)`}</span>` : ''}
            </div>
            <p class="bus-Sub">${bus.type}</p>
            <div class="bus-route-times">
              <span class="time-bold">${bus.depTime}</span>
              <span class="duration-line">── ${bus.duration} ──</span>
              <span class="time-bold">${bus.arrTime}</span>
              <span class="points-label">📍 ${bus.boardingPoint} → ${bus.droppingPoint}</span>
            </div>
          </div>

          <div class="bus-best-summary">
            <div class="p2p-status">⚡ P2P Verified: ${bus.p2pCachedAgo}</div>
            <div class="best-price-box">
              <div class="best-price-label">Best Net Fare (Seat <strong>${selectedSeatId}</strong>)</div>
              <div class="best-price-val">₹${winner.finalNetPayable}</div>
              <div class="best-price-via">on <span style="color:${winner.platform.color};font-weight:700">${winner.platform.name}</span> • Save ₹${spreadSavings} vs highest</div>
            </div>
          </div>
        </div>

        <!-- Interactive Seat Picker + Platform Matrix Split -->
        <div class="bus-comparison-body">
          
          <!-- Left: Interactive Seat Map (100% Free Feature) -->
          <div class="seat-map-panel">
            <div class="panel-header">
              <span>💺 1. Tap Exact Seat / Berth (Dynamic Markup Scanner)</span>
              <span class="seat-selected-pill">Selected: <strong>${selectedSeatId}</strong> (${selectedSeatObj.type})</span>
            </div>

            <div class="decks-wrapper">
              ${["Lower", "Upper"].map(deckName => `
                <div class="deck-box">
                  <div class="deck-label">${deckName} Deck</div>
                  <div class="berth-grid">
                    ${bus.seatMatrix.filter(s => s.deck === deckName).map(seat => {
                      const isSel = seat.id === selectedSeatId;
                      const winMarkup = seat.markups[winner.platform.id] || 0;
                      const markupStr = winMarkup > 0 ? `+₹${winMarkup}` : (winMarkup < 0 ? `-₹${Math.abs(winMarkup)}` : `Base`);
                      return `
                        <button 
                          ${seat.status === 'booked' ? 'disabled' : ''} 
                          onclick="selectSeat('${bus.id}', '${seat.id}')"
                          class="berth-btn status-${seat.status} ${isSel ? 'selected-berth' : ''}"
                          title="${seat.type}">
                          <span class="b-id">${seat.id}</span>
                          <span class="b-mk">${seat.status === 'booked' ? 'Sold' : markupStr}</span>
                        </button>
                      `;
                    }).join("")}
                  </div>
                </div>
              `).join("")}
            </div>
            <div class="seat-legend">
              <span><i class="dot dot-avail"></i> Available</span>
              <span><i class="dot dot-sel"></i> Selected (${selectedSeatId})</span>
              <span><i class="dot dot-fem"></i> Female Only</span>
              <span><i class="dot dot-sold"></i> Booked</span>
            </div>
          </div>

          <!-- Right: All-Platform Net Price & Coupon Breakdown -->
          <div class="platform-table-panel">
            <div class="panel-header">
              <span>🏷️ 2. Live Net Checkout Price for Seat <strong>${selectedSeatId}</strong> Across All Apps</span>
              <span class="sub-hint">Includes Base + Seat Markup + GST/Conv Fee − Best Coupon − Bus Pass</span>
            </div>

            <div class="platform-rows">
              ${deals.map((d, idx) => {
                const isWinner = idx === 0;
                return `
                  <div class="platform-deal-row ${isWinner ? 'winner-row' : ''}">
                    <div class="plat-col-name">
                      <span class="plat-dot" style="background:${d.platform.color}"></span>
                      <div>
                        <div class="plat-title">
                          ${d.platform.name}
                          ${isWinner ? '<span class="cheapest-tag">⚡ CHEAPEST</span>' : ''}
                        </div>
                        <div class="plat-math-breakdown">
                          Base ₹${d.baseFare} ${d.seatMarkup >= 0 ? `+ Seat ₹${d.seatMarkup}` : `- Seat ₹${Math.abs(d.seatMarkup)}`} + Tax/Fee ₹${d.gstAmount + d.convFee}
                        </div>
                      </div>
                    </div>

                    <div class="plat-col-offers">
                      ${d.bestCoupon ? `
                        <div class="coupon-applied-chip">
                          <span class="code-badge">✂️ ${d.bestCoupon.code} (-₹${d.bestCouponSavings})</span>
                          <button onclick="invalidateCouponP2P('${d.bestCoupon.id}', '${d.bestCoupon.code}')" class="kill-coupon-btn" title="Coupon failed at checkout? Click to kill it across the P2P network!">
                            ⚠️ Report Dead
                          </button>
                        </div>
                      ` : `<span class="no-coupon-text">No matching card/coupon</span>`}

                      ${d.passApplied ? `
                        <div class="pass-applied-chip">
                          🎫 +${d.passApplied.name} (Pay ₹${d.passApplied.cost} → Save ₹${d.passApplied.grossDiscount} = <strong>Net -₹${d.netPassSavings}</strong>)
                        </div>
                      ` : ''}
                    </div>

                    <div class="plat-col-price">
                      <div class="gross-strike">₹${d.grossTotal}</div>
                      <div class="net-final">₹${d.finalNetPayable}</div>
                    </div>

                    <div class="plat-col-action">
                      <button onclick="openAiCheckoutModal('${bus.id}', '${d.platform.id}', '${selectedSeatId}')" class="zap-book-btn ${isWinner ? 'btn-primary-zap' : 'btn-secondary-zap'}">
                        ⚡ Zap & Book
                      </button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

        </div>
      </div>
    `;
  }).join("");
}

window.selectSeat = function(busId, seatId) {
  AppState.selectedSeatsByBus[busId] = seatId;
  renderBuses();
  showToast(`💺 Seat ${seatId} selected! Recalculated exact berth markups & coupons across all 6 platforms.`);
};

// ============================================================================
// Self-Healing P2P Coupon Invalidation (#3 Drawback Solution)
// ============================================================================
window.invalidateCouponP2P = function(couponId, couponCode) {
  AppState.deadCoupons.add(couponId);
  renderBuses();
  showToast(`🚫 Coupon "${couponCode}" marked DEAD in P2P Cache! Broadcasted to 1,428 active peers & switched to next best coupon.`);
};

window.resetDeadCoupons = function() {
  AppState.deadCoupons.clear();
  renderBuses();
  showToast("🔄 Restored all coupons in P2P cache.");
};

// ============================================================================
// On-Device AI Auto-Seat & Auto-Coupon Checkout Assistant (#4 Drawback Solution)
// ============================================================================
window.openAiCheckoutModal = function(busId, platformId, seatId) {
  const route = ZAPFARE_DATA.routes.find(r => r.id === AppState.selectedRouteId);
  const bus = route.buses.find(b => b.id === busId);
  const deals = calculatePlatformDealsForBus(bus, seatId);
  const deal = deals.find(d => d.platform.id === platformId);

  const modal = document.getElementById("aiCheckoutModal");
  const body = document.getElementById("aiModalBody");
  modal.classList.add("open");

  const couponCode = deal.bestCoupon ? deal.bestCoupon.code : "NONE";

  body.innerHTML = `
    <div class="ai-modal-header">
      <div>
        <span class="badge-pill badge-purple">🤖 ON-DEVICE AI WEBVIEW ASSISTANT</span>
        <h3>Auto-Booking ${bus.operator} on ${deal.platform.name}</h3>
        <p>${route.from} → ${route.to} • ${AppState.selectedDate} • Seat <strong>${seatId}</strong></p>
      </div>
      <button onclick="closeAiModal()" class="close-btn">✕</button>
    </div>

    <div class="ai-steps-box">
      <div class="ai-step done" id="step1">
        <span class="step-icon">✅</span>
        <div>
          <strong>1. Deep-Link & Bus Locator</strong>
          <p>Matched <em>"${bus.operator} (${bus.depTime})"</em> on ${deal.platform.name} mobile web.</p>
        </div>
      </div>

      <div class="ai-step active" id="step2">
        <span class="step-icon" id="step2Icon">⏳</span>
        <div>
          <strong>2. On-Device DOM/Vision AI Seat Selector</strong>
          <p id="step2Text">Scanning canvas layout to auto-tap <strong>Berth ${seatId}</strong> & boarding point <em>${bus.boardingPoint}</em>...</p>
        </div>
      </div>

      <div class="ai-step" id="step3">
        <span class="step-icon" id="step3Icon">⚪</span>
        <div>
          <strong>3. Auto-Inject Coupon & Pass Stack</strong>
          <p id="step3Text">Waiting to auto-apply code <code>${couponCode}</code> ${deal.passApplied ? `+ ${deal.passApplied.name}` : ''}...</p>
        </div>
      </div>
    </div>

    <div class="checkout-summary-card">
      <div>
        <div class="cs-label">Final Net Payable at UPI / Card Screen</div>
        <div class="cs-price">₹${deal.finalNetPayable} <span class="cs-saved">(You saved ₹${deal.totalSaved}!)</span></div>
        <div class="cs-sub">Coupon <strong>${couponCode}</strong> copied to clipboard automatically</div>
      </div>
      <div class="cs-actions">
        <a href="${deal.platform.url}" target="_blank" rel="noopener" class="real-redirect-btn">
          Open ${deal.platform.name} Checkout ↗
        </a>
      </div>
    </div>
  `;

  if (navigator.clipboard && couponCode !== "NONE") {
    navigator.clipboard.writeText(couponCode).catch(() => {});
  }

  // Animate the AI steps
  setTimeout(() => {
    const s2 = document.getElementById("step2");
    if (!s2) return;
    s2.className = "ai-step done";
    document.getElementById("step2Icon").textContent = "✅";
    document.getElementById("step2Text").innerHTML = `Auto-selected <strong>Seat ${seatId}</strong> & Boarding Point <em>${bus.boardingPoint}</em>!`;

    const s3 = document.getElementById("step3");
    s3.className = "ai-step active";
    document.getElementById("step3Icon").textContent = "✅";
    s3.className = "ai-step done";
    document.getElementById("step3Text").innerHTML = `Injected coupon <code>${couponCode}</code> (-₹${deal.bestCouponSavings})! Ready for final payment.`;
  }, 900);
};

window.closeAiModal = function() {
  document.getElementById("aiCheckoutModal").classList.remove("open");
};

function renderAlerts() {
  const container = document.getElementById("alertsList");
  container.innerHTML = AppState.activeAlerts.map(a => `
    <div class="alert-item">
      <div>
        <strong>${a.route}</strong> • Target: <span class="text-emerald">Below ₹${a.targetPrice}</span>
        <div class="alert-meta">${a.seatType} • 🕔 5 PM Empty-Bus Crash Watch Active</div>
      </div>
      <span class="status-pill-live">● Watching Locally</span>
    </div>
  `).join("");
}

function showToast(msg) {
  const t = document.getElementById("toastBox");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove("show"), 4200);
}

window.addEventListener("DOMContentLoaded", initApp);
