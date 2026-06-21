import type { RiskEngineInput, RiskEngineResult, EngineResult } from "@/types";
import { calculateLLS } from "./calculateLLS";

const ALTITUDE_THRESHOLD = 2500;

const ACCLIM_ACTION =
  "מומלץ לשקול יום התאקלמות בגובה הנוכחי או בגובה השינה האחרון לפני המשך עלייה.";

function isAboveThreshold(input: RiskEngineInput): boolean {
  const { currentAltitude, plannedSleepAltitudeTonight } =
    input.daily.altitudeData;
  return (
    currentAltitude >= ALTITUDE_THRESHOLD ||
    plannedSleepAltitudeTonight >= ALTITUDE_THRESHOLD
  );
}

function hasBackgroundDisease(input: RiskEngineInput): boolean {
  return input.profile.backgroundDiseases.length > 0;
}

function hasPreviousSevereIllness(input: RiskEngineInput): boolean {
  return (
    input.profile.previousAltitudeIllness ===
    "moderate_or_severe_trip_interruption_or_evacuation"
  );
}

function checkRedFlags(input: RiskEngineInput): string[] {
  const { redFlags, lls } = input.daily;
  const reasons: string[] = [];

  if (redFlags.unsteadyWalking)
    reasons.push("חוסר יציבות בהליכה / קושי ללכת בקו ישר");
  if (redFlags.severeFatigue) reasons.push("תשישות חמורה");
  if (redFlags.confusionOrAlteredMentalStatus)
    reasons.push("בלבול / ישנוניות חריגה / שינוי במצב הכרה");
  if (redFlags.dyspneaAtRest) reasons.push("קוצר נשימה במנוחה");
  if (redFlags.unusualHeadache) reasons.push("כאב ראש חריג");
  if (redFlags.repeatedVomiting) reasons.push("הקאות חוזרות");

  // LLS score 3 in specific fields → red (section 9.3)
  if (lls.headache === 3) reasons.push("כאב ראש בדרגה חמורה");
  if (lls.gastrointestinal === 3) reasons.push("תסמיני עיכול בדרגה חמורה");
  if (lls.fatigue === 3) reasons.push("תשישות בדרגה חמורה");

  // dizziness=3 + ataxia (unsteadyWalking) is already caught above.
  // dizziness=3 without ataxia → orange (not red). No extra reason here.

  return reasons;
}

function computeInitialOrange(input: RiskEngineInput): string[] {
  const { lls, respiratoryRecentIllness } = input.daily;
  const reasons: string[] = [];
  const total = calculateLLS(lls);

  if (respiratoryRecentIllness) {
    reasons.push("מחלה נשימתית רצנטית");
  }

  // 10.2 headache present + LLS 1–5
  if (lls.headache >= 1 && total >= 1 && total <= 5) {
    reasons.push("כאב ראש בגובה עם ניקוד LLS");
  }

  // 10.3 no headache + LLS ≥ 3
  if (lls.headache === 0 && total >= 3) {
    reasons.push("תסמינים ללא כאב ראש בניקוד LLS גבוה");
  }

  // 10.4 dizziness=3 without ataxia
  if (lls.dizziness === 3 && !input.daily.redFlags.unsteadyWalking) {
    reasons.push("סחרחורת חמורה ללא קושי ללכת בקו ישר");
  }

  return reasons;
}

function isOrangeDueToLLSSymptoms(input: RiskEngineInput): boolean {
  const { lls } = input.daily;
  const total = calculateLLS(lls);

  if (lls.headache >= 1 && total >= 1 && total <= 5) return true;
  if (lls.headache === 0 && total >= 3) return true;
  if (lls.dizziness === 3 && !input.daily.redFlags.unsteadyWalking) return true;

  return false;
}

// Rule B: any later sleeping altitude >= 1000 m above any earlier one in the sequence,
// with no acclimatization day (consecutive diff <=100 m) anywhere between those two points.
function checkRuleB(seq: readonly number[]): boolean {
  for (let i = 0; i < seq.length - 1; i++) {
    for (let j = i + 1; j < seq.length; j++) {
      if (seq[j] - seq[i] >= 1000) {
        let hasAcclimDay = false;
        for (let k = i; k < j; k++) {
          if (Math.abs(seq[k + 1] - seq[k]) <= 100) {
            hasAcclimDay = true;
            break;
          }
        }
        if (!hasAcclimDay) return true;
      }
    }
  }
  return false;
}

export function riskEngine(input: RiskEngineInput): EngineResult {
  if (!isAboveThreshold(input)) {
    return { belowThreshold: true };
  }

  const { lls } = input.daily;
  const total = calculateLLS(lls);

  // --- RED ---

  // 9.1 any red flag (includes LLS field=3 via checkRedFlags)
  const redFlagReasons = checkRedFlags(input);
  if (redFlagReasons.length > 0) {
    return {
      level: "red",
      reasons: redFlagReasons,
      requiresThreeDayQuestion: false,
      specificActions: [],
    };
  }

  // 9.2 headache present + LLS 6–12
  if (lls.headache >= 1 && total >= 6) {
    return {
      level: "red",
      reasons: ["כאב ראש עם ניקוד LLS גבוה (6 ומעלה)"],
      requiresThreeDayQuestion: false,
      specificActions: [],
    };
  }

  // --- Compute initial orange reasons ---
  const orangeReasons = computeInitialOrange(input);
  const isOrangeLLS = isOrangeDueToLLSSymptoms(input);

  // 9.4 three-day mild illness (only if orange due to LLS/symptoms)
  if (isOrangeLLS && input.daily.threeDaysMildIllness === true) {
    return {
      level: "red",
      reasons: [
        ...orangeReasons,
        "מחלת גבהים קלה נמשכת 3 ימים ברצף ללא שיפור",
      ],
      requiresThreeDayQuestion: false,
      specificActions: [],
    };
  }

  // 9.5 orange due to LLS + background disease → red
  // (background disease does NOT escalate respiratory-only orange)
  if (isOrangeLLS && hasBackgroundDisease(input)) {
    return {
      level: "red",
      reasons: [...orangeReasons, "מחלת רקע בנוכחות מחלת גבהים קלה"],
      requiresThreeDayQuestion: false,
      specificActions: [],
    };
  }

  // --- ORANGE ---
  if (orangeReasons.length > 0) {
    // Need three-day question only when orange is due to LLS/symptoms
    // and we don't yet have threeDaysMildIllness answer
    const requiresThreeDayQuestion =
      isOrangeLLS && input.daily.threeDaysMildIllness === undefined;
    return {
      level: "orange",
      reasons: orangeReasons,
      requiresThreeDayQuestion,
      specificActions: [],
    };
  }

  // --- YELLOW ---
  const yellowReasons: string[] = [];

  // 12.1 previous moderate/severe illness
  if (hasPreviousSevereIllness(input)) {
    yellowReasons.push("היסטוריה של מחלת גבהים בינונית או חמורה");
  }

  // 12.2 background disease without active illness
  if (hasBackgroundDisease(input)) {
    yellowReasons.push("מחלת רקע");
  }

  const {
    sleepAltitudeThreeNightsAgo,
    sleepAltitudeTwoNightsAgo,
    sleepAltitudeLastNight,
    plannedSleepAltitudeTonight,
  } = input.daily.altitudeData;

  // 12.3 first high sleeping night
  if (
    sleepAltitudeTwoNightsAgo < ALTITUDE_THRESHOLD &&
    sleepAltitudeLastNight < ALTITUDE_THRESHOLD &&
    plannedSleepAltitudeTonight > 2800
  ) {
    yellowReasons.push("לילה ראשון בגובה מעל 2800 מטר לאחר שני לילות מתחת 2500");
  }

  // Rule A — any consecutive sleeping-altitude transition >500 m
  const transitions = [
    sleepAltitudeTwoNightsAgo - sleepAltitudeThreeNightsAgo,
    sleepAltitudeLastNight - sleepAltitudeTwoNightsAgo,
    plannedSleepAltitudeTonight - sleepAltitudeLastNight,
  ];
  if (transitions.some((t) => t > 500)) {
    yellowReasons.push("עלייה יומית בגובה שינה של יותר מ-500 מטר");
  }

  // Rule B — any later sleeping altitude >=1000 m above any earlier one, no acclim day between
  const sequence = [
    sleepAltitudeThreeNightsAgo,
    sleepAltitudeTwoNightsAgo,
    sleepAltitudeLastNight,
    plannedSleepAltitudeTonight,
  ] as const;
  const ruleBFired = checkRuleB(sequence);
  if (ruleBFired) {
    yellowReasons.push("עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות");
  }

  // 12.6 LLS 1–2 without headache + risk factor
  const hasRiskFactor =
    hasPreviousSevereIllness(input) ||
    hasBackgroundDisease(input) ||
    yellowReasons.length > 0;
  if (lls.headache === 0 && total >= 1 && total <= 2 && hasRiskFactor) {
    yellowReasons.push("ניקוד LLS נמוך עם גורם סיכון");
  }

  if (yellowReasons.length > 0) {
    return {
      level: "yellow",
      reasons: [...new Set(yellowReasons)],
      requiresThreeDayQuestion: false,
      specificActions: ruleBFired ? [ACCLIM_ACTION] : [],
    };
  }

  // --- GREEN ---
  return {
    level: "green",
    reasons: [],
    requiresThreeDayQuestion: false,
    specificActions: [],
  };
}
