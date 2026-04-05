/**
 * Lightweight translation strings for ApnaMap.
 * No external library — just plain objects + a React context.
 *
 * Adding a string:
 *   1. Add to the `en` object.
 *   2. Add the matching key to `hi`.
 *   3. Use `t("key")` in any component via `useI18n()`.
 */

export type Lang = "en" | "hi";

export const translations = {
  en: {
    // Walk / Explore
    liveActivity:   "Live activity",
    openNow:        "Open now",
    closed:         "Closed",
    closingSoon:    "Closing soon",
    newShop:        "New",
    trending:       "Trending",
    recommended:    "Recommended",
    hiddenGem:      "Hidden gem",
    endsSoon:       "Ends soon",
    trendingDeal:   "Trending",
    sellingFast:    "Selling fast",

    // Offer types
    bigDeal:    "Big Deal",
    flashDeal:  "Flash Deal",
    mysteryDeal:"Mystery Deal",
    combo:      "Combo",
    offer:      "Offer",

    // GPS
    detecting:    "Detecting…",
    locationLabel:"Your location",
    gpsError:     "Could not get location.",

    // Auth
    enterOtp:     "Enter the code",
    verifying:    "Verifying…",
    verified:     "Verified!",
    signingIn:    "Signing you in…",
    resendOtp:    "Resend OTP",
    wrongNumber:  "Wrong number?",

    // Onboarding
    addShop:      "Add Your Shop",
    nextStep:     "Next",
    submitShop:   "Submit My Shop",
    skipOffer:    "Skip offer for now",
    offerHint:    "Shops with offers get 3× more visits.",

    // Voice
    speakOffer:   "🎤 Speak your offer",
    recording:    "Recording…",
    tapToStop:    "Tap ⏹ to stop",
    recordDone:   "Got it!",
    recordAgain:  "Record again",
    micDenied:    "Mic access denied. Allow microphone in browser settings.",

    // Streak
    dayStreak:    "day streak",
    rewardUnlocked: "Reward unlocked!",
    daysToReward: "more days to unlock a reward",

    // Mode tabs
    walk:         "Walk",
    mapTab:       "Map",
    offersTab:    "Offers",
    nearMe:       "Near Me",

    // Crowd
    exploring:    "exploring",
    mostVisited:  "Most visited today",
    busyNow:      "Busy right now",
    quietNow:     "Quiet now",

    // Locality transition
    leaving:      "Leaving",
    entering:     "Entering",

    // Leaderboard
    topDeals:     "Top deals in",
  },

  hi: {
    // Walk / Explore
    liveActivity:   "लाइव गतिविधि",
    openNow:        "अभी खुला है",
    closed:         "बंद है",
    closingSoon:    "जल्द बंद होगा",
    newShop:        "नया",
    trending:       "ट्रेंडिंग",
    recommended:    "सुझाया गया",
    hiddenGem:      "छुपा हीरा",
    endsSoon:       "जल्द खत्म",
    trendingDeal:   "ट्रेंडिंग",
    sellingFast:    "तेज़ी से बिक रहा",

    // Offer types
    bigDeal:    "बड़ा ऑफर",
    flashDeal:  "फ्लैश डील",
    mysteryDeal:"रहस्य ऑफर",
    combo:      "कॉम्बो",
    offer:      "ऑफर",

    // GPS
    detecting:    "पता लगा रहे हैं…",
    locationLabel:"आपकी जगह",
    gpsError:     "जगह नहीं मिल सकी।",

    // Auth
    enterOtp:     "कोड डालें",
    verifying:    "जाँच हो रही है…",
    verified:     "सत्यापित!",
    signingIn:    "लॉगिन हो रहा है…",
    resendOtp:    "OTP दोबारा भेजें",
    wrongNumber:  "गलत नंबर?",

    // Onboarding
    addShop:      "अपनी दुकान जोड़ें",
    nextStep:     "आगे",
    submitShop:   "दुकान सबमिट करें",
    skipOffer:    "अभी ऑफर छोड़ें",
    offerHint:    "ऑफर वाली दुकानों पर 3× ज़्यादा लोग आते हैं।",

    // Voice
    speakOffer:   "🎤 अपना ऑफर बोलें",
    recording:    "रिकॉर्डिंग…",
    tapToStop:    "रोकने के लिए ⏹ दबाएँ",
    recordDone:   "हो गया!",
    recordAgain:  "दोबारा रिकॉर्ड करें",
    micDenied:    "माइक की अनुमति नहीं। ब्राउज़र सेटिंग में माइक चालू करें।",

    // Streak
    dayStreak:    "दिन की स्ट्रीक",
    rewardUnlocked: "इनाम मिल गया!",
    daysToReward: "दिन बाद इनाम मिलेगा",

    // Mode tabs
    walk:         "वॉक",
    mapTab:       "नक्शा",
    offersTab:    "ऑफर",
    nearMe:       "पास में",

    // Crowd
    exploring:    "देख रहे हैं",
    mostVisited:  "आज सबसे ज़्यादा आए",
    busyNow:      "अभी भीड़ है",
    quietNow:     "अभी शांत है",

    // Locality transition
    leaving:      "छोड़ रहे हैं",
    entering:     "आ रहे हैं",

    // Leaderboard
    topDeals:     "टॉप ऑफर",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
