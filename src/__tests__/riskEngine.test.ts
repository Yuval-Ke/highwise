import { riskEngine } from "@/lib/riskEngine";
import { calculateLLS } from "@/lib/calculateLLS";
import type { RiskEngineInput, LLSInput, RedFlags, UserProfile } from "@/types";
import { isBelowThreshold } from "@/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

const noRedFlags: RedFlags = {
  unsteadyWalking: false,
  severeFatigue: false,
  confusionOrAlteredMentalStatus: false,
  dyspneaAtRest: false,
  unusualHeadache: false,
  repeatedVomiting: false,
};

const zeroLLS: LLSInput = {
  headache: 0,
  gastrointestinal: 0,
  fatigue: 0,
  dizziness: 0,
};

const noHistory: UserProfile = {
  previousAltitudeIllness: "none",
  backgroundDiseases: [],
};

function makeInput(overrides: Partial<{
  profile: Partial<UserProfile>;
  sleepAltitudeThreeNightsAgo: number;
  sleepAltitudeTwoNightsAgo: number;
  sleepAltitudeLastNight: number;
  currentAltitude: number;
  plannedSleepAltitudeTonight: number;
  respiratoryRecentIllness: boolean;
  lls: Partial<LLSInput>;
  redFlags: Partial<RedFlags>;
  threeDaysMildIllness: boolean;
}>): RiskEngineInput {
  return {
    profile: {
      ...noHistory,
      ...overrides.profile,
      backgroundDiseases: overrides.profile?.backgroundDiseases ?? [],
    },
    daily: {
      altitudeData: {
        sleepAltitudeThreeNightsAgo: overrides.sleepAltitudeThreeNightsAgo ?? 2400,
        sleepAltitudeTwoNightsAgo: overrides.sleepAltitudeTwoNightsAgo ?? 2600,
        sleepAltitudeLastNight: overrides.sleepAltitudeLastNight ?? 2800,
        currentAltitude: overrides.currentAltitude ?? 2800,
        plannedSleepAltitudeTonight: overrides.plannedSleepAltitudeTonight ?? 3000,
      },
      respiratoryRecentIllness: overrides.respiratoryRecentIllness ?? false,
      lls: { ...zeroLLS, ...overrides.lls },
      redFlags: { ...noRedFlags, ...overrides.redFlags },
      threeDaysMildIllness: overrides.threeDaysMildIllness,
    },
  };
}

// ─── calculateLLS ─────────────────────────────────────────────────────────────

describe("calculateLLS", () => {
  test("all zeros → 0", () => {
    expect(calculateLLS(zeroLLS)).toBe(0);
  });

  test("all 3s → 12", () => {
    expect(calculateLLS({ headache: 3, gastrointestinal: 3, fatigue: 3, dizziness: 3 })).toBe(12);
  });

  test("mixed values sum correctly", () => {
    expect(calculateLLS({ headache: 1, gastrointestinal: 2, fatigue: 0, dizziness: 1 })).toBe(4);
  });
});

// ─── Acceptance tests ─────────────────────────────────────────────────────────

describe("Test 1 — Tool not active below 2500", () => {
  test("returns belowThreshold when both altitudes < 2500", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 1800,
      plannedSleepAltitudeTonight: 2200,
    }));
    expect(isBelowThreshold(result)).toBe(true);
  });
});

describe("Test 2 — Green", () => {
  test("returns green with normal ascent and no symptoms", () => {
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2600,
      sleepAltitudeLastNight: 2800,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 3100,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("green");
  });
});

describe("Test 3 — Yellow because Rule A: last night to tonight >500 m", () => {
  test("planned sleep altitude 601 m above last night → yellow", () => {
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2600,
      sleepAltitudeLastNight: 2800,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 3401,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.reasons).toContain("עלייה יומית בגובה שינה של יותר מ-500 מטר");
    }
  });
});

describe("Test 4 — Yellow because Rule B: cumulative gain >=1000 m, no acclimatization day", () => {
  test("three transitions of 500/400/200 m, total 1100 m, no acclim day, Rule A silent → yellow", () => {
    // All individual transitions <=500 m so Rule A does NOT fire.
    // Cumulative upward gain: 500+400+200=1100 m >= 1000, no acclim day → Rule B fires.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2900,
      sleepAltitudeLastNight: 3300,
      currentAltitude: 3300,
      plannedSleepAltitudeTonight: 3500,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.reasons).toContain("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
      expect(result.reasons).not.toContain("עלייה יומית בגובה שינה של יותר מ-500 מטר");
    }
  });
});

describe("Test 4b — Acclimatization day blocks Rule B; Rule A fires independently", () => {
  test("acclim day (diff=80) blocks Rule B; gain 920 m from last night triggers Rule A", () => {
    // threeNightsAgo→twoNightsAgo: diff=0 (acclim), twoNightsAgo→lastNight: diff=80 (acclim),
    // lastNight→tonight: diff=920 >500 → Rule A fires.
    // Rule B: all windows contain an acclim step → blocked.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2400,
      sleepAltitudeLastNight: 2480,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 3400,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.reasons).toContain("עלייה יומית בגובה שינה של יותר מ-500 מטר");
      expect(result.reasons).not.toContain("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
    }
  });
});

describe("Test 5 — Yellow because first high sleeping night", () => {
  test("first planned night >2800 after two nights <2500 → yellow", () => {
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 1200,
      sleepAltitudeLastNight: 1800,
      currentAltitude: 2400,
      plannedSleepAltitudeTonight: 2900,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("yellow");
  });
});

describe("Test 6 — Yellow because previous moderate/severe altitude illness", () => {
  test("moderate/severe history + no symptoms → yellow", () => {
    const result = riskEngine(makeInput({
      profile: { previousAltitudeIllness: "moderate_or_severe_trip_interruption_or_evacuation" },
      sleepAltitudeThreeNightsAgo: 2300,
      currentAltitude: 2600,
      plannedSleepAltitudeTonight: 2800,
      sleepAltitudeLastNight: 2500,
      sleepAltitudeTwoNightsAgo: 2400,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("yellow");
  });
});

describe("Test 7 — Yellow because background disease", () => {
  test("background disease + no symptoms → yellow", () => {
    const result = riskEngine(makeInput({
      profile: { backgroundDiseases: ["יתר לחץ דם ריאתי"] },
      sleepAltitudeThreeNightsAgo: 2300,
      currentAltitude: 2600,
      plannedSleepAltitudeTonight: 2800,
      sleepAltitudeLastNight: 2500,
      sleepAltitudeTwoNightsAgo: 2400,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("yellow");
  });
});

describe("Test 8 — Orange because mild headache", () => {
  test("headache=1 LLS=1 → orange", () => {
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      currentAltitude: 2700,
      plannedSleepAltitudeTonight: 2700,
      sleepAltitudeLastNight: 2700,
      sleepAltitudeTwoNightsAgo: 2600,
      lls: { headache: 1, gastrointestinal: 0, fatigue: 0, dizziness: 0 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("orange");
  });
});

describe("Test 9 — Orange because headache + LLS 3–5", () => {
  test("headache=1 gi=1 fatigue=1 LLS=3 → orange", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3200,
      plannedSleepAltitudeTonight: 3200,
      lls: { headache: 1, gastrointestinal: 1, fatigue: 1, dizziness: 0 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("orange");
  });
});

describe("Test 10 — Red because headache + LLS 6–12", () => {
  test("headache=2 gi=2 fatigue=2 LLS=6 → red", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3600,
      plannedSleepAltitudeTonight: 3600,
      lls: { headache: 2, gastrointestinal: 2, fatigue: 2, dizziness: 0 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

describe("Test 11 — Orange because LLS ≥3 without headache", () => {
  test("no headache gi=1 fatigue=1 dizziness=1 LLS=3 → orange", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3200,
      plannedSleepAltitudeTonight: 3200,
      lls: { headache: 0, gastrointestinal: 1, fatigue: 1, dizziness: 1 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("orange");
  });
});

describe("Test 12 — LLS 1–2 without headache and no risk factors = Green", () => {
  test("gi=1 LLS=1 no risk factors → green", () => {
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2600,
      sleepAltitudeLastNight: 2800,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 3000,
      lls: { headache: 0, gastrointestinal: 1, fatigue: 0, dizziness: 0 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("green");
  });
});

describe("Test 13 — LLS 1–2 without headache plus risk factor = Yellow", () => {
  test("gi=1 LLS=1 with ascent >500 → yellow", () => {
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2600,
      sleepAltitudeLastNight: 2800,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 3401,
      lls: { headache: 0, gastrointestinal: 1, fatigue: 0, dizziness: 0 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("yellow");
  });
});

describe("Test 14 — Orange because recent respiratory illness", () => {
  test("respiratoryRecentIllness=true no symptoms → orange", () => {
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 2800,
      sleepAltitudeLastNight: 2700,
      sleepAltitudeTwoNightsAgo: 2600,
      respiratoryRecentIllness: true,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("orange");
  });
});

describe("Test 15 — Recent respiratory illness + background disease remains Orange", () => {
  test("respiratory illness + background disease → orange (not red)", () => {
    const result = riskEngine(makeInput({
      profile: { backgroundDiseases: ["אנמיה חרמשית"] },
      sleepAltitudeThreeNightsAgo: 2400,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 2800,
      sleepAltitudeLastNight: 2700,
      sleepAltitudeTwoNightsAgo: 2600,
      respiratoryRecentIllness: true,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("orange");
      expect(result.level).not.toBe("red");
    }
  });
});

describe("Test 16 — Red because red flag: shortness of breath at rest", () => {
  test("dyspneaAtRest=true → red", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 2800,
      redFlags: { dyspneaAtRest: true },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

describe("Test 17 — Red because red flag: confusion", () => {
  test("confusionOrAlteredMentalStatus=true → red", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 2800,
      redFlags: { confusionOrAlteredMentalStatus: true },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

describe("Test 18 — Red because headache score 3", () => {
  test("headache=3 → red", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3000,
      plannedSleepAltitudeTonight: 3000,
      lls: { headache: 3, gastrointestinal: 0, fatigue: 0, dizziness: 0 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

describe("Test 19 — Red because gastrointestinal score 3", () => {
  test("gastrointestinal=3 → red", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3000,
      plannedSleepAltitudeTonight: 3000,
      lls: { headache: 0, gastrointestinal: 3, fatigue: 0, dizziness: 0 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

describe("Test 20 — Red because fatigue score 3", () => {
  test("fatigue=3 → red", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3000,
      plannedSleepAltitudeTonight: 3000,
      lls: { headache: 0, gastrointestinal: 0, fatigue: 3, dizziness: 0 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

describe("Test 21 — Dizziness score 3 + no ataxia = Orange", () => {
  test("dizziness=3 unsteadyWalking=false → orange", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3000,
      plannedSleepAltitudeTonight: 3000,
      lls: { headache: 0, gastrointestinal: 0, fatigue: 0, dizziness: 3 },
      redFlags: { unsteadyWalking: false },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("orange");
  });
});

describe("Test 22 — Dizziness score 3 + ataxia = Red", () => {
  test("dizziness=3 unsteadyWalking=true → red", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3000,
      plannedSleepAltitudeTonight: 3000,
      lls: { headache: 0, gastrointestinal: 0, fatigue: 0, dizziness: 3 },
      redFlags: { unsteadyWalking: true },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

describe("Test 23 — Orange due to LLS + background disease = Red", () => {
  test("headache=1 gi=1 fatigue=1 LLS=3 + background disease → red", () => {
    const result = riskEngine(makeInput({
      profile: { backgroundDiseases: ["אפילפסיה"] },
      currentAltitude: 3200,
      plannedSleepAltitudeTonight: 3200,
      lls: { headache: 1, gastrointestinal: 1, fatigue: 1, dizziness: 0 },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

describe("Test 24 — Orange due to LLS for 3 days = Red", () => {
  test("headache=1 gi=1 fatigue=1 threeDaysMildIllness=true → red", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3200,
      plannedSleepAltitudeTonight: 3200,
      lls: { headache: 1, gastrointestinal: 1, fatigue: 1, dizziness: 0 },
      threeDaysMildIllness: true,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

describe("Test 25 — Orange due to respiratory illness does not trigger 3-day question", () => {
  test("respiratoryRecentIllness only → orange, requiresThreeDayQuestion=false", () => {
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 2800,
      sleepAltitudeLastNight: 2700,
      sleepAltitudeTwoNightsAgo: 2600,
      respiratoryRecentIllness: true,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("orange");
      expect(result.requiresThreeDayQuestion).toBe(false);
    }
  });
});

describe("Test 26 — Red overrides all other results", () => {
  test("respiratory illness + headache=1 + dyspneaAtRest → red", () => {
    const result = riskEngine(makeInput({
      currentAltitude: 3200,
      plannedSleepAltitudeTonight: 3200,
      respiratoryRecentIllness: true,
      lls: { headache: 1, gastrointestinal: 0, fatigue: 0, dizziness: 0 },
      redFlags: { dyspneaAtRest: true },
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) expect(result.level).toBe("red");
  });
});

// ─── New tests for expanded altitude model and updated ascent rules ────────────

describe("Test 27 — Rule A: daily gain >500 m from last night to tonight", () => {
  test("tonight 601 m above last night → yellow via Rule A", () => {
    // Same as Test 3 but explicit Rule A assertion with new reason string.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2600,
      sleepAltitudeLastNight: 2800,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 3401,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.reasons).toContain("עלייה יומית בגובה שינה של יותר מ-500 מטר");
    }
  });
});

describe("Test 28 — Rule A: daily gain >500 m from three nights ago to two nights ago", () => {
  test("twoNightsAgo 600 m above threeNightsAgo, no other gains, no symptoms → yellow via Rule A", () => {
    // Transition threeNightsAgo→twoNightsAgo: 3200-2600=600 >500 → Rule A fires.
    // All subsequent transitions: 0, 0 (same altitude held) → no Rule A from those.
    // Cumulative upward: 600 < 1000 → Rule B silent.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2600,
      sleepAltitudeTwoNightsAgo: 3200,
      sleepAltitudeLastNight: 3200,
      currentAltitude: 3200,
      plannedSleepAltitudeTonight: 3200,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.reasons).toContain("עלייה יומית בגובה שינה של יותר מ-500 מטר");
    }
  });
});

describe("Test 29 — Rule B: cumulative gain >=1000 m without acclimatization day, Rule A silent", () => {
  test("three steps of 500/400/200 m, total 1100 m, no acclim day → yellow via Rule B only", () => {
    // No individual transition >500 m → Rule A silent.
    // Cumulative upward starting at threeNightsAgo: 500+400+200=1100 >=1000, no acclim days → Rule B fires.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2900,
      sleepAltitudeLastNight: 3300,
      currentAltitude: 3300,
      plannedSleepAltitudeTonight: 3500,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.reasons).toContain("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
      expect(result.reasons).not.toContain("עלייה יומית בגובה שינה של יותר מ-500 מטר");
    }
  });
});

describe("Test 30 — Acclimatization day blocks Rule B, Rule A also silent → green", () => {
  test("cumulative gain 1000 m but acclim day in window, all steps <=500 → green from ascent profile", () => {
    // threeNightsAgo→twoNightsAgo: 450 m (not >500, not acclim)
    // twoNightsAgo→lastNight: 50 m (acclim day: |50|<=100)
    // lastNight→tonight: 500 m (not >500 strictly)
    // Rule A: max transition=500, none strictly >500 → does not fire.
    // Rule B: window [2400,2850,2900,3400] — acclim day found → blocked.
    //         window [2850,2900,3400]: gain=50+500=550 <1000.
    //         window [2900,3400]: gain=500 <1000.
    // No other risk factors → green.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2850,
      sleepAltitudeLastNight: 2900,
      currentAltitude: 3000,
      plannedSleepAltitudeTonight: 3400,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("green");
      expect(result.reasons).not.toContain("עלייה יומית בגובה שינה של יותר מ-500 מטר");
      expect(result.reasons).not.toContain("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
    }
  });
});

describe("Test 31 — Ambiguous example: descent then re-ascent, Rule A and B both silent", () => {
  test("3500→3000→3500→3700: no transition >500, cumulative upward 700 m < 1000 → green", () => {
    // Transitions: 3000-3500=-500 (descent, not >500), 3500-3000=500 (exactly 500, NOT >500),
    //              3700-3500=200 (not >500). Rule A does not fire (strict inequality).
    // Rule B upward gain: 0+500+200=700 <1000. No window reaches 1000 m. Rule B does not fire.
    // Confirmed result: green (no symptoms or other risk factors supplied).
    // Note: transition 3000→3500=500 is NOT >500 (strict), so no Rule A trigger.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 3500,
      sleepAltitudeTwoNightsAgo: 3000,
      sleepAltitudeLastNight: 3500,
      currentAltitude: 3500,
      plannedSleepAltitudeTonight: 3700,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("green");
      expect(result.reasons).not.toContain("עלייה יומית בגובה שינה של יותר מ-500 מטר");
      expect(result.reasons).not.toContain("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
    }
  });
});

// ─── specificActions tests ────────────────────────────────────────────────────

describe("Test 32 — Rule B yellow carries acclimatization-day specificAction", () => {
  test("Rule B fires → specificActions contains acclim recommendation", () => {
    // Pair (2400, 3500): net gain=1100 >= 1000, no acclim days → Rule B fires.
    // Rule A: all transitions <=500 → silent.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2900,
      sleepAltitudeLastNight: 3300,
      currentAltitude: 3300,
      plannedSleepAltitudeTonight: 3500,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.specificActions).toContain(
        "מומלץ לשקול יום התאקלמות בגובה הנוכחי או בגובה השינה האחרון לפני המשך עלייה."
      );
    }
  });
});

describe("Test 33 — Rule A only yellow has no acclimatization-day specificAction", () => {
  test("Rule A fires (601 m gain last night→tonight), Rule B silent → specificActions empty", () => {
    // Only transition tonight-lastNight = 3401-2800 = 601 > 500 → Rule A fires.
    // Pair (2400, 3401): net gain=1001 >= 1000 → check acclim days:
    //   |200|>100, |200|>100, |601|>100 → no acclim → Rule B also fires here!
    // Use a scenario where Rule B is blocked: lastNight already high enough that
    // the only pair exceeding 1000 contains an acclim day, OR net gain < 1000.
    // Scenario: threeNightsAgo=2800, twoNightsAgo=2850 (acclim), lastNight=2900, tonight=3401
    //   Pair (2800,3401)=601 <1000; pair (2850,3401)=551 <1000; pair (2900,3401)=501 <1000.
    //   Rule B: no pair >= 1000 → silent.
    //   Rule A: tonight-lastNight = 501 > 500 → fires.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 2800,
      sleepAltitudeTwoNightsAgo: 2850,
      sleepAltitudeLastNight: 2900,
      currentAltitude: 2900,
      plannedSleepAltitudeTonight: 3401,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.reasons).toContain("עלייה יומית בגובה שינה של יותר מ-500 מטר");
      expect(result.reasons).not.toContain("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
      expect(result.specificActions).toEqual([]);
    }
  });
});

describe("Test 34 — Non-ascent yellow has no acclimatization-day specificAction", () => {
  test("yellow from background disease only → specificActions empty", () => {
    // Normal ascent (all transitions 200 m), yellow only due to background disease.
    const result = riskEngine(makeInput({
      profile: { backgroundDiseases: ["יתר לחץ דם ריאתי"] },
      sleepAltitudeThreeNightsAgo: 2400,
      sleepAltitudeTwoNightsAgo: 2600,
      sleepAltitudeLastNight: 2800,
      currentAltitude: 2800,
      plannedSleepAltitudeTonight: 3000,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.specificActions).toEqual([]);
    }
  });
});

// ─── Rule B net-gain correctness tests ───────────────────────────────────────
// These tests confirm that Rule B uses net altitude difference between any
// earlier and later point in the sequence — NOT the sum of separate positive
// climbs across descents.

describe("Test 35 — Separated gains across descent do NOT trigger Rule B", () => {
  test("4000→4500→4200→4700: sum of positive steps=1000 but max net gain=700 → green", () => {
    // Steps: +500, −300 (descent), +500. Sum of positive steps = 1000.
    // Net pairs: (4000,4700)=700, (4000,4500)=500, (4000,4200)=200,
    //            (4500,4200)=−300, (4500,4700)=200, (4200,4700)=500.
    // No pair reaches net >=1000 → Rule B does NOT fire.
    // Rule A: no transition strictly >500. No other risk factors → green.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 4000,
      sleepAltitudeTwoNightsAgo: 4500,
      sleepAltitudeLastNight: 4200,
      currentAltitude: 4700,
      plannedSleepAltitudeTonight: 4700,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("green");
      expect(result.reasons).not.toContain("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
      expect(result.specificActions).toEqual([]);
    }
  });
});

describe("Test 36 — True net 1000m gain without acclimatization day SHOULD trigger Rule B", () => {
  test("4000→4500→5000→5300: net gain 4000→5000=1000, no acclim day → yellow with specificAction", () => {
    // Steps: +500, +500, +300. No individual step >500 → Rule A silent.
    // Net pair (4000,5000)=1000 >=1000; acclim scan: |500|>100, |500|>100 → no acclim day.
    // Rule B fires → yellow, specificActions includes acclim recommendation.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 4000,
      sleepAltitudeTwoNightsAgo: 4500,
      sleepAltitudeLastNight: 5000,
      currentAltitude: 5300,
      plannedSleepAltitudeTonight: 5300,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("yellow");
      expect(result.reasons).toContain("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
      expect(result.specificActions).toContain(
        "מומלץ לשקול יום התאקלמות בגובה הנוכחי או בגובה השינה האחרון לפני המשך עלייה."
      );
    }
  });
});

describe("Test 37 — Net 1000m gain WITH acclimatization day does NOT trigger Rule B", () => {
  test("4000→4500→4550→5000: net gain 4000→5000=1000, acclim day at 4500→4550 → green", () => {
    // Steps: +500, +50 (acclim: |50|<=100), +450. No individual step >500 → Rule A silent.
    // Net pair (4000,5000)=1000 >=1000; acclim scan finds |50|<=100 between idx 1 and 2 → blocked.
    // All other pairs <1000. Rule B does NOT fire → green.
    const result = riskEngine(makeInput({
      sleepAltitudeThreeNightsAgo: 4000,
      sleepAltitudeTwoNightsAgo: 4500,
      sleepAltitudeLastNight: 4550,
      currentAltitude: 5000,
      plannedSleepAltitudeTonight: 5000,
    }));
    expect(isBelowThreshold(result)).toBe(false);
    if (!isBelowThreshold(result)) {
      expect(result.level).toBe("green");
      expect(result.reasons).not.toContain("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
      expect(result.specificActions).toEqual([]);
    }
  });
});
