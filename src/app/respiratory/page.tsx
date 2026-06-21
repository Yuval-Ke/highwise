"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { RedFlags, AltitudeData, LLSInput, DailyInput } from "@/types";
import { isBelowThreshold } from "@/types";
import { saveRespiratoryData, getUserProfile, STORAGE_KEYS } from "@/lib/storage";
import { riskEngine } from "@/lib/riskEngine";
import styles from "./respiratory.module.css";

const WARNING_SIGNS: { key: keyof RedFlags; label: string }[] = [
  { key: "unsteadyWalking",               label: "חוסר יציבות בהליכה / קושי ללכת בקו ישר" },
  { key: "severeFatigue",                 label: "תשישות חמורה" },
  { key: "confusionOrAlteredMentalStatus", label: "בלבול / ישנוניות חריגה / שינוי במצב הכרה" },
  { key: "dyspneaAtRest",                 label: "קוצר נשימה במנוחה" },
  { key: "unusualHeadache",               label: "כאב ראש חריג" },
  { key: "repeatedVomiting",              label: "הקאות חוזרות" },
];

export default function RespiratoryScreen() {
  const router = useRouter();
  const [respiratoryIllness, setRespiratoryIllness] = useState<boolean | null>(null);
  const [selectedFlags, setSelectedFlags] = useState<Set<keyof RedFlags>>(new Set());
  const [showError, setShowError] = useState(false);

  function toggleFlag(key: keyof RedFlags) {
    setSelectedFlags((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (respiratoryIllness === null) {
      setShowError(true);
      document.getElementById("respiratory-question")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const redFlags: RedFlags = {
      unsteadyWalking:                selectedFlags.has("unsteadyWalking"),
      severeFatigue:                  selectedFlags.has("severeFatigue"),
      confusionOrAlteredMentalStatus: selectedFlags.has("confusionOrAlteredMentalStatus"),
      dyspneaAtRest:                  selectedFlags.has("dyspneaAtRest"),
      unusualHeadache:                selectedFlags.has("unusualHeadache"),
      repeatedVomiting:               selectedFlags.has("repeatedVomiting"),
    };

    saveRespiratoryData(respiratoryIllness, redFlags);

    // Decide whether the three-day follow-up is needed
    const profile = getUserProfile();
    const rawAssessment = localStorage.getItem(STORAGE_KEYS.currentAssessment);
    const assessment = rawAssessment
      ? (JSON.parse(rawAssessment) as Record<string, unknown>)
      : null;

    if (profile && assessment?.altitudeData && assessment?.lls) {
      const daily: DailyInput = {
        altitudeData:            assessment.altitudeData as AltitudeData,
        lls:                     assessment.lls as LLSInput,
        respiratoryRecentIllness: respiratoryIllness,
        redFlags,
        threeDaysMildIllness:    undefined,
      };
      const result = riskEngine({ profile, daily });
      if (!isBelowThreshold(result) && result.requiresThreeDayQuestion) {
        router.push("/three-day");
        return;
      }
    }

    router.push("/result");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.back()}
          aria-label="חזרה למסך הקודם"
        >
          <svg
            width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <h1 className={styles.screenTitle}>{"סימני אזהרה והיסטוריה של מחלה נשימתית"}</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.progress}>
          <span className={styles.progressLabel}>שלב 3 מתוך 4</span>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={3}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label="שלב 3 מתוך 4"
          >
            <div className={styles.progressFill} style={{ width: "75%" }} />
          </div>
        </div>

        <p className={styles.intro}>
          {"יש לענות על השאלות הבאות כדי לזהות מצבים שמעלים את רמת הסיכון או דורשים התייחסות דחופה."}
        </p>

        <div
          id="respiratory-question"
          className={`${styles.questionBlock} ${showError ? styles.questionBlockError : ""}`}
        >
          <p className={styles.questionLabel}>{"האם סבלת מ‐"}</p>
          <ul className={styles.bulletList}>
            <li>{"צינון עם נזלת וחום ביומיים האחרונים?"}</li>
          </ul>
          <p className={styles.orConnector}>{"או"}</p>
          <ul className={styles.bulletList}>
            <li>{"דלקת ריאות בשבועיים האחרונים?"}</li>
          </ul>
          <div role="radiogroup" aria-label="מחלה נשימתית אחרונה" className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio" name="respiratory" value="false"
                checked={respiratoryIllness === false}
                onChange={() => { setRespiratoryIllness(false); setShowError(false); }}
              />
              <span>{"לא"}</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio" name="respiratory" value="true"
                checked={respiratoryIllness === true}
                onChange={() => { setRespiratoryIllness(true); setShowError(false); }}
              />
              <span>{"כן"}</span>
            </label>
          </div>
          {showError && (
            <p className={styles.errorMsg} role="alert">
              {"יש להשלים את כל השדות לפני המשך"}
            </p>
          )}
        </div>

        <hr className={styles.divider} />

        <div className={styles.section}>
          <p className={styles.sectionHeading}>
            {"האם מופיע אצלך כעת אחד או יותר מסימני האזהרה הבאים?"}
          </p>
          <div className={styles.warningCard}>
            {WARNING_SIGNS.map((sign) => (
              <label key={sign.key} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  value={sign.key}
                  checked={selectedFlags.has(sign.key)}
                  onChange={() => toggleFlag(sign.key)}
                />
                <span>{sign.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className={styles.btnSubmit}>
          {"המשך"}
        </button>
      </form>
    </div>
  );
}
