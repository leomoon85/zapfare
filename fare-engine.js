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

