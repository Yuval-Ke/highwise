import type { LLSInput } from "@/types";

export function calculateLLS(lls: LLSInput): number {
  return lls.headache + lls.gastrointestinal + lls.fatigue + lls.dizziness;
}
