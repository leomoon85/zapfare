// ============================================================================
// ZapFare — Static Remote Dataset (Hosted Free on GitHub Pages / Cloudflare R2)
// Zero-Server Architecture: Clients download this 20KB JSON & compute locally
// ============================================================================

const ZAPFARE_DATA = {
  lastUpdated: "2026-10-25T12:15:00+05:30",
  p2pActivePeers: 1428,

  platforms: [
    { id: "redbus", name: "redBus", color: "#D84E55", badge: "OTA", convFeePct: 0.04, gstPct: 0.05, url: "https://www.redbus.in" },
    { id: "abhibus", name: "AbhiBus", color: "#E11D48", badge: "OTA", convFeePct: 0.025, gstPct: 0.05, url: "https://www.abhibus.com" },
    { id: "mmt", name: "MakeMyTrip", color: "#0284C7", badge: "OTA", convFeePct: 0.045, gstPct: 0.05, url: "https://www.makemytrip.com/bus-tickets" },
    { id: "paytm", name: "Paytm Bus", color: "#00BAF2", badge: "UPI/OTA", convFeePct: 0.03, gstPct: 0.05, url: "https://tickets.paytm.com/bus" },
    { id: "goibibo", name: "Goibibo", color: "#F97316", badge: "OTA", convFeePct: 0.035, gstPct: 0.05, url: "https://www.goibibo.com/bus" },
    { id: "direct", name: "Operator Direct", color: "#10B981", badge: "Zero Fee", convFeePct: 0.0, gstPct: 0.05, url: "https://www.vrlbus.in" }
  ],

  paymentMethods: [
    { id: "hdfc_cc", name: "HDFC Credit Card", short: "HDFC CC", type: "card", icon: "💳" },
    { id: "icici_cc", name: "ICICI Credit/Debit", short: "ICICI", type: "card", icon: "💳" },
    { id: "sbi_cc", name: "SBI Credit Card", short: "SBI CC", type: "card", icon: "🏦" },
    { id: "axis_cc", name: "Axis Neo / Flipkart", short: "Axis CC", type: "card", icon: "💳" },
    { id: "amazon_pay", name: "Amazon Pay Balance", short: "AmazonPay", type: "wallet", icon: "🛒" },
    { id: "paytm_upi", name: "Paytm / PhonePe UPI", short: "UPI", type: "upi", icon: "⚡" }
  ],

  busPasses: [
    {
      id: "redbus_primo",
      platform: "redbus",
      name: "redBus Assurance / Pass",
      cost: 49,
      discountPct: 0.08,
      maxDiscount: 150,
      description: "Buy ₹49 pass → Get 8% off (up to ₹150) right on this trip"
    },
    {
      id: "abhi_super",
      platform: "abhibus",
      name: "AbhiBus SuperPass",
      cost: 39,
      discountFlat: 120,
      minFare: 800,
      description: "Buy ₹39 pass → Instant ₹120 off on fares above ₹800"
    },
    {
      id: "mmt_black",
      platform: "mmt",
      name: "MMT DoubleBlack Pass",
      cost: 59,
      discountFlat: 140,
      minFare: 900,
      description: "Buy ₹59 pass → Flat ₹140 off + Free Cancellation"
    }
  ],

  coupons: [
    // redBus Coupons
    { id: "rb_first", code: "FIRST", platform: "redbus", discountPct: 0.10, maxOff: 150, minFare: 500, cardReq: null, newUsersOnly: false, verifiedCount: 412, status: "ALIVE", desc: "10% off up to ₹150 for all users" },
    { id: "rb_hdfc", code: "RBHDFC200", platform: "redbus", discountPct: 0.12, maxOff: 200, minFare: 900, cardReq: "hdfc_cc", newUsersOnly: false, verifiedCount: 189, status: "ALIVE", desc: "12% off up to ₹200 with HDFC Credit Cards" },
    { id: "rb_amz", code: "RBAMZ125", platform: "redbus", discountFlat: 125, minFare: 850, cardReq: "amazon_pay", newUsersOnly: false, verifiedCount: 94, status: "ALIVE", desc: "Flat ₹125 Amazon Pay cashback" },

    // AbhiBus Coupons
    { id: "ab_fest", code: "ABHIZAP150", platform: "abhibus", discountPct: 0.12, maxOff: 160, minFare: 600, cardReq: null, newUsersOnly: false, verifiedCount: 530, status: "ALIVE", desc: "12% instant discount up to ₹160" },
    { id: "ab_icici", code: "ABHIICICI", platform: "abhibus", discountFlat: 220, minFare: 1000, cardReq: "icici_cc", newUsersOnly: false, verifiedCount: 245, status: "ALIVE", desc: "Flat ₹220 off on ICICI Bank Cards" },
    { id: "ab_upi", code: "ABHIUPI75", platform: "abhibus", discountFlat: 75, minFare: 500, cardReq: "paytm_upi", newUsersOnly: false, verifiedCount: 318, status: "ALIVE", desc: "Flat ₹75 off via UPI checkout" },

    // MakeMyTrip Coupons
    { id: "mmt_deal", code: "MMTBUSDEAL", platform: "mmt", discountPct: 0.10, maxOff: 150, minFare: 700, cardReq: null, newUsersOnly: false, verifiedCount: 276, status: "ALIVE", desc: "10% instant discount on bus bookings" },
    { id: "mmt_sbi", code: "MMTSBI250", platform: "mmt", discountFlat: 250, minFare: 1100, cardReq: "sbi_cc", newUsersOnly: false, verifiedCount: 164, status: "ALIVE", desc: "Flat ₹250 off with SBI Credit Card" },
    { id: "mmt_axis", code: "MMTAXIS180", platform: "mmt", discountFlat: 180, minFare: 850, cardReq: "axis_cc", newUsersOnly: false, verifiedCount: 112, status: "ALIVE", desc: "Flat ₹180 off with Axis Cards" },

    // Paytm Coupons
    { id: "ptm_bus", code: "BUSZAP100", platform: "paytm", discountFlat: 100, minFare: 650, cardReq: "paytm_upi", newUsersOnly: false, verifiedCount: 390, status: "ALIVE", desc: "Flat ₹100 cashback via Paytm UPI" },
    { id: "ptm_hdfc", code: "PTMHDFC175", platform: "paytm", discountFlat: 175, minFare: 950, cardReq: "hdfc_cc", newUsersOnly: false, verifiedCount: 140, status: "ALIVE", desc: "Flat ₹175 off with HDFC Credit Card" },

    // Goibibo Coupons
    { id: "go_steal", code: "GOWEEKEND", platform: "goibibo", discountPct: 0.14, maxOff: 190, minFare: 800, cardReq: null, newUsersOnly: false, verifiedCount: 482, status: "ALIVE", desc: "14% off up to ₹190 Flash Steal" },
    { id: "go_icici", code: "GOICICI200", platform: "goibibo", discountFlat: 200, minFare: 950, cardReq: "icici_cc", newUsersOnly: false, verifiedCount: 203, status: "ALIVE", desc: "Flat ₹200 off with ICICI Card" },

    // Operator Direct Coupons
    { id: "dir_web", code: "DIRECT5", platform: "direct", discountPct: 0.05, maxOff: 100, minFare: 400, cardReq: null, newUsersOnly: false, verifiedCount: 620, status: "ALIVE", desc: "5% Official Operator Web Discount + ₹0 OTA Fee" }
  ],

  routes: [
    {
      id: "BLR-HYD",
      from: "Bangalore",
      to: "Hyderabad",
      distanceKm: 575,
      avgDuration: "8h 45m",
      passingThroughHack: {
        available: true,
        originCity: "Mysore",
        destCity: "Hyderabad (via Bangalore Hebbal)",
        savings: 210,
        busName: "KSRTC Airavat Club Class (Mysore → Hyderabad)",
        tip: "Hack Found: Booking Mysore→Hyderabad & boarding at Hebbal (Bangalore) is ₹210 cheaper than direct Bangalore→Hyderabad buses due to quota pricing!"
      },
      buses: [
        {
          id: "bus_orange_1",
          operator: "Orange Tours & Travels",
          type: "Bharat Benz A/C Sleeper (2+1)",
          depTime: "21:45",
          arrTime: "06:30",
          duration: "08h 45m",
          rating: 4.6,
          reviews: 1840,
          boardingPoint: "Anand Rao Circle / Hebbal",
          droppingPoint: "Gachibowli / Ameerpet",
          seatsLeft: 14,
          crashWatch: false,
          crashDiscountPct: 0,
          p2pCachedAgo: "2 mins ago by Peer #982 (Airtel 5G)",
          // Base price per platform before coupons/fees
          platformFares: {
            redbus: 1180,
            abhibus: 1150,
            mmt: 1190,
            paytm: 1160,
            goibibo: 1170,
            direct: 1060
          },
          // Seat-specific dynamic markup across platforms (some OTAs mark up single lower berths heavily)
          seatMatrix: [
            { id: "L1", deck: "Lower", type: "Single Window Sleeper", status: "available", markups: { redbus: 180, abhibus: 90, mmt: 160, paytm: 120, goibibo: 100, direct: 50 } },
            { id: "L2", deck: "Lower", type: "Single Window Sleeper", status: "booked", markups: { redbus: 180, abhibus: 90, mmt: 160, paytm: 120, goibibo: 100, direct: 50 } },
            { id: "L3", deck: "Lower", type: "Single Window Sleeper", status: "available", markups: { redbus: 150, abhibus: 60, mmt: 140, paytm: 110, goibibo: 80, direct: 40 } },
            { id: "L4", deck: "Lower", type: "Single Window Sleeper (Prime)", status: "available", markups: { redbus: 220, abhibus: 50, mmt: 190, paytm: 140, goibibo: 90, direct: 40 } },
            { id: "L5", deck: "Lower", type: "Double Aisle Sleeper", status: "available", markups: { redbus: 40, abhibus: 20, mmt: 50, paytm: 30, goibibo: 0, direct: 0 } },
            { id: "L6", deck: "Lower", type: "Double Window Sleeper", status: "female", markups: { redbus: 80, abhibus: 40, mmt: 70, paytm: 60, goibibo: 40, direct: 20 } },
            { id: "L7", deck: "Lower", type: "Double Aisle Sleeper", status: "available", markups: { redbus: 0, abhibus: 0, mmt: 20, paytm: 0, goibibo: 0, direct: 0 } },
            { id: "L8", deck: "Lower", type: "Double Window Sleeper", status: "available", markups: { redbus: 60, abhibus: 30, mmt: 50, paytm: 40, goibibo: 20, direct: 0 } },
            { id: "U1", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 40, abhibus: 0, mmt: 30, paytm: 20, goibibo: 0, direct: 0 } },
            { id: "U2", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 40, abhibus: 0, mmt: 30, paytm: 20, goibibo: 0, direct: 0 } },
            { id: "U3", deck: "Upper", type: "Single Window Sleeper", status: "booked", markups: { redbus: 0, abhibus: 0, mmt: 0, paytm: 0, goibibo: 0, direct: 0 } },
            { id: "U4", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 0, abhibus: -30, mmt: 0, paytm: -20, goibibo: -40, direct: -20 } },
            { id: "U5", deck: "Upper", type: "Double Aisle Sleeper", status: "available", markups: { redbus: -60, abhibus: -80, mmt: -50, paytm: -70, goibibo: -90, direct: -50 } },
            { id: "U6", deck: "Upper", type: "Double Window Sleeper", status: "available", markups: { redbus: -40, abhibus: -60, mmt: -30, paytm: -50, goibibo: -70, direct: -40 } },
            { id: "U7", deck: "Upper", type: "Double Aisle Sleeper (Rear)", status: "available", markups: { redbus: -100, abhibus: -120, mmt: -80, paytm: -100, goibibo: -130, direct: -80 } },
            { id: "U8", deck: "Upper", type: "Double Window Sleeper (Rear)", status: "available", markups: { redbus: -80, abhibus: -100, mmt: -60, paytm: -80, goibibo: -110, direct: -60 } }
          ]
        },
        {
          id: "bus_vrl_2",
          operator: "VRL Travels",
          type: "Volvo Multi-Axle I-Shift A/C Sleeper",
          depTime: "22:15",
          arrTime: "06:45",
          duration: "08h 30m",
          rating: 4.8,
          reviews: 3120,
          boardingPoint: "Majestic / Yeshwantpur / Hebbal",
          droppingPoint: "Shamshabad / Lakdikapul / Miyapur",
          seatsLeft: 23,
          crashWatch: true,
          crashDiscountPct: 28,
          p2pCachedAgo: "Just now by Peer #419 (Jio True5G)",
          platformFares: {
            redbus: 1320,
            abhibus: 1290,
            mmt: 1350,
            paytm: 1280,
            goibibo: 1310,
            direct: 1120
          },
          seatMatrix: [
            { id: "L1", deck: "Lower", type: "Single Window Sleeper", status: "available", markups: { redbus: 150, abhibus: 120, mmt: 160, paytm: 110, goibibo: 130, direct: 0 } },
            { id: "L2", deck: "Lower", type: "Single Window Sleeper", status: "available", markups: { redbus: 150, abhibus: 120, mmt: 160, paytm: 110, goibibo: 130, direct: 0 } },
            { id: "L3", deck: "Lower", type: "Single Window Sleeper", status: "booked", markups: { redbus: 150, abhibus: 120, mmt: 160, paytm: 110, goibibo: 130, direct: 0 } },
            { id: "L4", deck: "Lower", type: "Single Window Sleeper (Prime)", status: "available", markups: { redbus: 190, abhibus: 140, mmt: 200, paytm: 130, goibibo: 150, direct: 0 } },
            { id: "L5", deck: "Lower", type: "Double Aisle Sleeper", status: "available", markups: { redbus: 50, abhibus: 30, mmt: 60, paytm: 40, goibibo: 30, direct: 0 } },
            { id: "L6", deck: "Lower", type: "Double Window Sleeper", status: "available", markups: { redbus: 70, abhibus: 50, mmt: 80, paytm: 60, goibibo: 50, direct: 0 } },
            { id: "L7", deck: "Lower", type: "Double Aisle Sleeper", status: "available", markups: { redbus: 20, abhibus: 0, mmt: 30, paytm: 10, goibibo: 0, direct: 0 } },
            { id: "L8", deck: "Lower", type: "Double Window Sleeper", status: "available", markups: { redbus: 40, abhibus: 20, mmt: 50, paytm: 30, goibibo: 20, direct: 0 } },
            { id: "U1", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 30, abhibus: 10, mmt: 40, paytm: 10, goibibo: 20, direct: -30 } },
            { id: "U2", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 30, abhibus: 10, mmt: 40, paytm: 10, goibibo: 20, direct: -30 } },
            { id: "U3", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 0, abhibus: -20, mmt: 10, paytm: -20, goibibo: 0, direct: -40 } },
            { id: "U4", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 0, abhibus: -20, mmt: 10, paytm: -20, goibibo: 0, direct: -40 } },
            { id: "U5", deck: "Upper", type: "Double Aisle Sleeper", status: "available", markups: { redbus: -50, abhibus: -70, mmt: -40, paytm: -60, goibibo: -50, direct: -80 } },
            { id: "U6", deck: "Upper", type: "Double Window Sleeper", status: "available", markups: { redbus: -30, abhibus: -50, mmt: -20, paytm: -40, goibibo: -30, direct: -60 } },
            { id: "U7", deck: "Upper", type: "Double Aisle Sleeper (Rear)", status: "available", markups: { redbus: -90, abhibus: -110, mmt: -80, paytm: -100, goibibo: -90, direct: -100 } },
            { id: "U8", deck: "Upper", type: "Double Window Sleeper (Rear)", status: "available", markups: { redbus: -70, abhibus: -90, mmt: -60, paytm: -80, goibibo: -70, direct: -90 } }
          ]
        },
        {
          id: "bus_intrcity_3",
          operator: "IntrCity SmartBus",
          type: "Scania A/C Sleeper + Washroom & Lounge",
          depTime: "21:00",
          arrTime: "05:50",
          duration: "08h 50m",
          rating: 4.7,
          reviews: 2490,
          boardingPoint: "Madiwala IntrCity Lounge / Hebbal",
          droppingPoint: "Gachibowli / Paradise Circle",
          seatsLeft: 7,
          crashWatch: false,
          crashDiscountPct: 0,
          p2pCachedAgo: "5 mins ago by Peer #104 (ACT Fibernet)",
          platformFares: {
            redbus: 1240,
            abhibus: 1210,
            mmt: 1220,
            paytm: 1190,
            goibibo: 1150,
            direct: 1140
          },
          seatMatrix: [
            { id: "L1", deck: "Lower", type: "Single Smart Pod", status: "booked", markups: { redbus: 160, abhibus: 140, mmt: 150, paytm: 130, goibibo: 90, direct: 90 } },
            { id: "L2", deck: "Lower", type: "Single Smart Pod", status: "available", markups: { redbus: 160, abhibus: 140, mmt: 150, paytm: 130, goibibo: 80, direct: 90 } },
            { id: "L3", deck: "Lower", type: "Single Smart Pod", status: "available", markups: { redbus: 160, abhibus: 140, mmt: 150, paytm: 130, goibibo: 80, direct: 90 } },
            { id: "L4", deck: "Lower", type: "Single Smart Pod (Prime)", status: "available", markups: { redbus: 210, abhibus: 170, mmt: 180, paytm: 160, goibibo: 70, direct: 100 } },
            { id: "L5", deck: "Lower", type: "Double Sleeper", status: "booked", markups: { redbus: 40, abhibus: 30, mmt: 30, paytm: 20, goibibo: 0, direct: 20 } },
            { id: "L6", deck: "Lower", type: "Double Sleeper", status: "booked", markups: { redbus: 40, abhibus: 30, mmt: 30, paytm: 20, goibibo: 0, direct: 20 } },
            { id: "L7", deck: "Lower", type: "Double Sleeper", status: "available", markups: { redbus: 20, abhibus: 10, mmt: 10, paytm: 0, goibibo: -20, direct: 0 } },
            { id: "L8", deck: "Lower", type: "Double Sleeper", status: "available", markups: { redbus: 20, abhibus: 10, mmt: 10, paytm: 0, goibibo: -20, direct: 0 } },
            { id: "U1", deck: "Upper", type: "Single Smart Pod", status: "available", markups: { redbus: 20, abhibus: 10, mmt: 10, paytm: 0, goibibo: -30, direct: 0 } },
            { id: "U2", deck: "Upper", type: "Single Smart Pod", status: "booked", markups: { redbus: 20, abhibus: 10, mmt: 10, paytm: 0, goibibo: -30, direct: 0 } },
            { id: "U3", deck: "Upper", type: "Single Smart Pod", status: "available", markups: { redbus: 0, abhibus: 0, mmt: 0, paytm: -10, goibibo: -40, direct: -10 } },
            { id: "U4", deck: "Upper", type: "Single Smart Pod", status: "available", markups: { redbus: 0, abhibus: 0, mmt: 0, paytm: -10, goibibo: -40, direct: -10 } },
            { id: "U5", deck: "Upper", type: "Double Sleeper", status: "booked", markups: { redbus: -40, abhibus: -50, mmt: -50, paytm: -60, goibibo: -90, direct: -50 } },
            { id: "U6", deck: "Upper", type: "Double Sleeper", status: "booked", markups: { redbus: -40, abhibus: -50, mmt: -50, paytm: -60, goibibo: -90, direct: -50 } },
            { id: "U7", deck: "Upper", type: "Double Sleeper (Rear)", status: "available", markups: { redbus: -80, abhibus: -90, mmt: -90, paytm: -100, goibibo: -120, direct: -80 } },
            { id: "U8", deck: "Upper", type: "Double Sleeper (Rear)", status: "available", markups: { redbus: -80, abhibus: -90, mmt: -90, paytm: -100, goibibo: -120, direct: -80 } }
          ]
        }
      ]
    },
    {
      id: "BLR-CHE",
      from: "Bangalore",
      to: "Chennai",
      distanceKm: 350,
      avgDuration: "6h 15m",
      passingThroughHack: {
        available: true,
        originCity: "Tumkur",
        destCity: "Chennai (via Silk Board)",
        savings: 145,
        busName: "KPN Travels AC Sleeper",
        tip: "Hack Found: Buses starting from Tumkur and picking up at Electronic City / Silk Board are ₹145 cheaper than buses starting at Madiwala!"
      },
      buses: [
        {
          id: "bus_kpn_1",
          operator: "KPN Travels",
          type: "Volvo B11R Multi-Axle Sleeper (2+1)",
          depTime: "23:00",
          arrTime: "05:15",
          duration: "06h 15m",
          rating: 4.5,
          reviews: 1520,
          boardingPoint: "Madiwala / Silk Board / Electronic City",
          droppingPoint: "Koyambedu / Guindy / Tambaram",
          seatsLeft: 19,
          crashWatch: true,
          crashDiscountPct: 24,
          p2pCachedAgo: "1 min ago by Peer #712 (Jio 5G)",
          platformFares: {
            redbus: 920,
            abhibus: 890,
            mmt: 940,
            paytm: 910,
            goibibo: 895,
            direct: 810
          },
          seatMatrix: [
            { id: "L1", deck: "Lower", type: "Single Window Sleeper", status: "available", markups: { redbus: 120, abhibus: 70, mmt: 130, paytm: 90, goibibo: 80, direct: 20 } },
            { id: "L2", deck: "Lower", type: "Single Window Sleeper", status: "available", markups: { redbus: 120, abhibus: 70, mmt: 130, paytm: 90, goibibo: 80, direct: 20 } },
            { id: "L3", deck: "Lower", type: "Single Window Sleeper", status: "available", markups: { redbus: 110, abhibus: 60, mmt: 120, paytm: 80, goibibo: 70, direct: 20 } },
            { id: "L4", deck: "Lower", type: "Single Window Sleeper (Prime)", status: "available", markups: { redbus: 150, abhibus: 40, mmt: 140, paytm: 100, goibibo: 60, direct: 20 } },
            { id: "L5", deck: "Lower", type: "Double Aisle Sleeper", status: "available", markups: { redbus: 20, abhibus: 0, mmt: 30, paytm: 10, goibibo: 0, direct: 0 } },
            { id: "L6", deck: "Lower", type: "Double Window Sleeper", status: "available", markups: { redbus: 40, abhibus: 20, mmt: 50, paytm: 30, goibibo: 20, direct: 0 } },
            { id: "L7", deck: "Lower", type: "Double Aisle Sleeper", status: "available", markups: { redbus: 0, abhibus: 0, mmt: 10, paytm: 0, goibibo: 0, direct: 0 } },
            { id: "L8", deck: "Lower", type: "Double Window Sleeper", status: "available", markups: { redbus: 20, abhibus: 10, mmt: 30, paytm: 20, goibibo: 10, direct: 0 } },
            { id: "U1", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 0, abhibus: -20, mmt: 10, paytm: 0, goibibo: -10, direct: -20 } },
            { id: "U2", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 0, abhibus: -20, mmt: 10, paytm: 0, goibibo: -10, direct: -20 } },
            { id: "U3", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: -20, abhibus: -40, mmt: -10, paytm: -20, goibibo: -30, direct: -30 } },
            { id: "U4", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: -20, abhibus: -40, mmt: -10, paytm: -20, goibibo: -30, direct: -30 } },
            { id: "U5", deck: "Upper", type: "Double Aisle Sleeper", status: "available", markups: { redbus: -60, abhibus: -70, mmt: -50, paytm: -60, goibibo: -70, direct: -50 } },
            { id: "U6", deck: "Upper", type: "Double Window Sleeper", status: "available", markups: { redbus: -40, abhibus: -50, mmt: -30, paytm: -40, goibibo: -50, direct: -40 } },
            { id: "U7", deck: "Upper", type: "Double Aisle Sleeper (Rear)", status: "available", markups: { redbus: -80, abhibus: -90, mmt: -70, paytm: -80, goibibo: -90, direct: -60 } },
            { id: "U8", deck: "Upper", type: "Double Window Sleeper (Rear)", status: "available", markups: { redbus: -70, abhibus: -80, mmt: -60, paytm: -70, goibibo: -80, direct: -50 } }
          ]
        },
        {
          id: "bus_parveen_2",
          operator: "Parveen Travels",
          type: "Mercedes Benz A/C Sleeper (2+1)",
          depTime: "22:30",
          arrTime: "04:45",
          duration: "06h 15m",
          rating: 4.7,
          reviews: 2180,
          boardingPoint: "Kalasipalyam / Madiwala / Hosur",
          droppingPoint: "Poonamallee / Koyambedu",
          seatsLeft: 11,
          crashWatch: false,
          crashDiscountPct: 0,
          p2pCachedAgo: "3 mins ago by Peer #209 (Vi 4G)",
          platformFares: {
            redbus: 980,
            abhibus: 950,
            mmt: 960,
            paytm: 940,
            goibibo: 920,
            direct: 880
          },
          seatMatrix: [
            { id: "L1", deck: "Lower", type: "Single Window Sleeper", status: "available", markups: { redbus: 130, abhibus: 100, mmt: 90, paytm: 110, goibibo: 80, direct: 40 } },
            { id: "L2", deck: "Lower", type: "Single Window Sleeper", status: "booked", markups: { redbus: 130, abhibus: 100, mmt: 90, paytm: 110, goibibo: 80, direct: 40 } },
            { id: "L3", deck: "Lower", type: "Single Window Sleeper", status: "available", markups: { redbus: 120, abhibus: 90, mmt: 80, paytm: 100, goibibo: 70, direct: 40 } },
            { id: "L4", deck: "Lower", type: "Single Window Sleeper (Prime)", status: "available", markups: { redbus: 160, abhibus: 110, mmt: 70, paytm: 120, goibibo: 60, direct: 40 } },
            { id: "L5", deck: "Lower", type: "Double Aisle Sleeper", status: "available", markups: { redbus: 30, abhibus: 20, mmt: 10, paytm: 20, goibibo: 0, direct: 0 } },
            { id: "L6", deck: "Lower", type: "Double Window Sleeper", status: "available", markups: { redbus: 50, abhibus: 40, mmt: 30, paytm: 40, goibibo: 20, direct: 10 } },
            { id: "L7", deck: "Lower", type: "Double Aisle Sleeper", status: "available", markups: { redbus: 0, abhibus: 0, mmt: 0, paytm: 0, goibibo: 0, direct: 0 } },
            { id: "L8", deck: "Lower", type: "Double Window Sleeper", status: "available", markups: { redbus: 20, abhibus: 10, mmt: 10, paytm: 10, goibibo: 0, direct: 0 } },
            { id: "U1", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 10, abhibus: 0, mmt: -10, paytm: 0, goibibo: -20, direct: -10 } },
            { id: "U2", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: 10, abhibus: 0, mmt: -10, paytm: 0, goibibo: -20, direct: -10 } },
            { id: "U3", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: -10, abhibus: -20, mmt: -30, paytm: -20, goibibo: -40, direct: -20 } },
            { id: "U4", deck: "Upper", type: "Single Window Sleeper", status: "available", markups: { redbus: -10, abhibus: -20, mmt: -30, paytm: -20, goibibo: -40, direct: -20 } },
            { id: "U5", deck: "Upper", type: "Double Aisle Sleeper", status: "available", markups: { redbus: -50, abhibus: -60, mmt: -70, paytm: -60, goibibo: -80, direct: -50 } },
            { id: "U6", deck: "Upper", type: "Double Window Sleeper", status: "available", markups: { redbus: -30, abhibus: -40, mmt: -50, paytm: -40, goibibo: -60, direct: -40 } },
            { id: "U7", deck: "Upper", type: "Double Aisle Sleeper (Rear)", status: "available", markups: { redbus: -70, abhibus: -80, mmt: -90, paytm: -80, goibibo: -100, direct: -70 } },
            { id: "U8", deck: "Upper", type: "Double Window Sleeper (Rear)", status: "available", markups: { redbus: -60, abhibus: -70, mmt: -80, paytm: -70, goibibo: -90, direct: -60 } }
          ]
        }
      ]
    },
    {
      id: "PUN-MUM",
      from: "Pune",
      to: "Mumbai",
      distanceKm: 150,
      avgDuration: "3h 30m",
      passingThroughHack: {
        available: true,
        originCity: "Satara / Kolhapur",
        destCity: "Mumbai (via Wakad, Pune)",
        savings: 160,
        busName: "Neeta Tours Volvo Multi-Axle",
        tip: "Hack Found: Long-distance Kolhapur→Mumbai buses picking up at Wakad sell empty seats 30% cheaper than dedicated Pune→Mumbai shuttles!"
      },
      buses: [
        {
          id: "bus_purple_1",
          operator: "Purple Metrolink",
          type: "Volvo 9600 A/C Seater / Sleeper",
          depTime: "18:30",
          arrTime: "22:00",
          duration: "03h 30m",
          rating: 4.6,
          reviews: 2910,
          boardingPoint: "Swargate / Shivajinagar / Wakad",
          droppingPoint: "Vashi / Sion / Dadar / Borivali",
          seatsLeft: 16,
          crashWatch: true,
          crashDiscountPct: 32,
          p2pCachedAgo: "40 secs ago by Peer #551 (Jio 5G)",
          platformFares: {
            redbus: 620,
            abhibus: 590,
            mmt: 640,
            paytm: 580,
            goibibo: 600,
            direct: 520
          },
          seatMatrix: [
            { id: "L1", deck: "Lower", type: "Front Window Seater", status: "available", markups: { redbus: 80, abhibus: 40, mmt: 90, paytm: 30, goibibo: 50, direct: 0 } },
            { id: "L2", deck: "Lower", type: "Front Window Seater", status: "available", markups: { redbus: 80, abhibus: 40, mmt: 90, paytm: 30, goibibo: 50, direct: 0 } },
            { id: "L3", deck: "Lower", type: "Prime Window Seater", status: "available", markups: { redbus: 60, abhibus: 30, mmt: 70, paytm: 20, goibibo: 40, direct: 0 } },
            { id: "L4", deck: "Lower", type: "Prime Window Seater", status: "available", markups: { redbus: 90, abhibus: 30, mmt: 100, paytm: 10, goibibo: 40, direct: 0 } },
            { id: "L5", deck: "Lower", type: "Aisle Seater", status: "available", markups: { redbus: 0, abhibus: 0, mmt: 10, paytm: 0, goibibo: 0, direct: 0 } },
            { id: "L6", deck: "Lower", type: "Window Seater", status: "available", markups: { redbus: 20, abhibus: 10, mmt: 30, paytm: 0, goibibo: 10, direct: 0 } },
            { id: "L7", deck: "Lower", type: "Aisle Seater", status: "available", markups: { redbus: 0, abhibus: 0, mmt: 0, paytm: -10, goibibo: 0, direct: 0 } },
            { id: "L8", deck: "Lower", type: "Window Seater", status: "available", markups: { redbus: 10, abhibus: 0, mmt: 20, paytm: 0, goibibo: 0, direct: 0 } },
            { id: "U1", deck: "Upper", type: "Single Sleeper", status: "available", markups: { redbus: 150, abhibus: 110, mmt: 160, paytm: 90, goibibo: 120, direct: 80 } },
            { id: "U2", deck: "Upper", type: "Single Sleeper", status: "available", markups: { redbus: 150, abhibus: 110, mmt: 160, paytm: 90, goibibo: 120, direct: 80 } },
            { id: "U3", deck: "Upper", type: "Single Sleeper", status: "available", markups: { redbus: 140, abhibus: 100, mmt: 150, paytm: 80, goibibo: 110, direct: 80 } },
            { id: "U4", deck: "Upper", type: "Single Sleeper", status: "available", markups: { redbus: 140, abhibus: 100, mmt: 150, paytm: 80, goibibo: 110, direct: 80 } },
            { id: "U5", deck: "Upper", type: "Double Sleeper", status: "available", markups: { redbus: 90, abhibus: 60, mmt: 100, paytm: 50, goibibo: 70, direct: 50 } },
            { id: "U6", deck: "Upper", type: "Double Sleeper", status: "available", markups: { redbus: 100, abhibus: 70, mmt: 110, paytm: 60, goibibo: 80, direct: 50 } },
            { id: "U7", deck: "Upper", type: "Double Sleeper (Rear)", status: "available", markups: { redbus: 60, abhibus: 40, mmt: 70, paytm: 30, goibibo: 50, direct: 30 } },
            { id: "U8", deck: "Upper", type: "Double Sleeper (Rear)", status: "available", markups: { redbus: 60, abhibus: 40, mmt: 70, paytm: 30, goibibo: 50, direct: 30 } }
          ]
        }
      ]
    }
  ],

  // 30-day November/October Calendar Heatmap Data (Crowdsourced from P2P Cache)
  monthlyHeatmap: [
    { day: "25 Oct", dow: "Sun", price: 1180, tag: "Weekend Rush", level: "high" },
    { day: "26 Oct", dow: "Mon", price: 820, tag: "Best Deal", level: "low" },
    { day: "27 Oct", dow: "Tue", price: 740, tag: "Cheapest!", level: "lowest" },
    { day: "28 Oct", dow: "Wed", price: 760, tag: "Low Fare", level: "low" },
    { day: "29 Oct", dow: "Thu", price: 890, tag: "Moderate", level: "mid" },
    { day: "30 Oct", dow: "Fri", price: 1490, tag: "Diwali Surge 🚨", level: "surge" },
    { day: "31 Oct", dow: "Sat", price: 1620, tag: "Festival Peak", level: "surge" },
    { day: "01 Nov", dow: "Sun", price: 1350, tag: "Return Rush", level: "high" },
    { day: "02 Nov", dow: "Mon", price: 840, tag: "Drop Expected", level: "low" },
    { day: "03 Nov", dow: "Tue", price: 720, tag: "Steal Deal", level: "lowest" },
    { day: "04 Nov", dow: "Wed", price: 750, tag: "Low Fare", level: "low" },
    { day: "05 Nov", dow: "Thu", price: 880, tag: "Moderate", level: "mid" },
    { day: "06 Nov", dow: "Fri", price: 1210, tag: "Weekend", level: "high" },
    { day: "07 Nov", dow: "Sat", price: 1090, tag: "Moderate", level: "mid" }
  ]
};
