export type RiskLevel = "green" | "yellow" | "orange" | "red";

export type PreviousAltitudeIllness =
  | "none"
  | "mild_no_trip_interruption"
  | "moderate_or_severe_trip_interruption_or_evacuation";

export type LLSScore = 0 | 1 | 2 | 3;

export type LLSInput = {
  headache: LLSScore;
  gastrointestinal: LLSScore;
  fatigue: LLSScore;
  dizziness: LLSScore;
};

export type RedFlags = {
  unsteadyWalking: boolean;
  severeFatigue: boolean;
  confusionOrAlteredMentalStatus: boolean;
  dyspneaAtRest: boolean;
  unusualHeadache: boolean;
  repeatedVomiting: boolean;
};

export type UserProfile = {
  previousAltitudeIllness: PreviousAltitudeIllness;
  backgroundDiseases: string[];
};

export type AltitudeData = {
  sleepAltitudeThreeNightsAgo: number;
  sleepAltitudeTwoNightsAgo: number;
  sleepAltitudeLastNight: number;
  currentAltitude: number;
  plannedSleepAltitudeTonight: number;
};

export type DailyInput = {
  altitudeData: AltitudeData;
  respiratoryRecentIllness: boolean;
  lls: LLSInput;
  redFlags: RedFlags;
  threeDaysMildIllness?: boolean;
};

export type RiskEngineInput = {
  profile: UserProfile;
  daily: DailyInput;
};

export type RiskEngineResult = {
  level: RiskLevel;
  reasons: string[];
  requiresThreeDayQuestion: boolean;
  specificActions: string[];
};

export type BelowThresholdResult = {
  belowThreshold: true;
};

export type EngineResult = RiskEngineResult | BelowThresholdResult;

export function isBelowThreshold(r: EngineResult): r is BelowThresholdResult {
  return (r as BelowThresholdResult).belowThreshold === true;
}
