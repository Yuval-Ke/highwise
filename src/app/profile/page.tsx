"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PreviousAltitudeIllness } from "@/types";
import { saveUserProfile } from "@/lib/storage";
import { track } from "@/lib/analytics";
import styles from "./profile.module.css";

const PAST_AMS_OPTIONS: readonly { value: PreviousAltitudeIllness; label: string }[] = [
  { value: "none", label: "לא" },
  {
    value: "mild_no_trip_interruption",
    label: "כן — מחלת גבהים קלה שלא הצריכה הפסקת הטרק",
  },
  {
    value: "moderate_or_severe_trip_interruption_or_evacuation",
    label: "כן — מחלת גבהים בינונית או חמורה שהצריכה הפסקת הטרק או פינוי",
  },
];

const BACKGROUND_DISEASES = [
  "יתר לחץ דם ריאתי",
  "מומי לב מולדים או דלפים בלב, למשל PFO / ASD",
  "אנומליות מבניות של כלי הדם הריאתיים",
  "דום נשימה חסימתי בשינה (OSA)",
  "השמנת יתר משמעותית",
  "אנמיה חרמשית",
  "מחלת לב איסכמית כרונית / מחלת לב כלילית (CAD)",
  "אי־ספיקת לב",
  "מחלת ריאה כרונית חמורה, למשל COPD או פיברוזיס ריאתי (אסתמה מאוזנת אינה נכללת)",
  "ציסטיק פיברוזיס",
  "אפילפסיה",
] as const;

export default function MedicalBackground() {
  const router = useRouter();
  const [pastAMS, setPastAMS] = useState<PreviousAltitudeIllness | null>(null);
  const [diseases, setDiseases] = useState<string[]>([]);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    track("screen_viewed_profile");
  }, []);

  function toggleDisease(name: string) {
    setDiseases((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pastAMS === null) {
      setShowError(true);
      return;
    }
    saveUserProfile({
      previousAltitudeIllness: pastAMS,
      backgroundDiseases: diseases,
    });
    track("profile_completed");
    router.push("/assessment");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.push("/")}
          aria-label="חזרה למסך הקודם"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <h1 className={styles.screenTitle}>רקע רפואי</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.intro}>
          {"המידע הבא משמש להערכת גורמי סיכון אישיים למחלת גבהים."}
        </p>

        {/* Q1 — Past altitude illness (required) */}
        <div className={styles.questionBlock}>
          <p id="q1-label" className={styles.questionLabel}>
            {"האם הייתה לך בעבר מחלת גבהים במהלך טיול או שהייה בגובה?"}
          </p>
          <div
            role="radiogroup"
            aria-labelledby="q1-label"
            className={styles.radioGroup}
          >
            {PAST_AMS_OPTIONS.map((opt) => (
              <label key={opt.value} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="pastAMS"
                  value={opt.value}
                  checked={pastAMS === opt.value}
                  onChange={() => {
                    setPastAMS(opt.value);
                    setShowError(false);
                  }}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          {showError && (
            <p className={styles.errorMsg} role="alert">
              {"יש להשלים את כל השדות לפני המשך"}
            </p>
          )}
        </div>

        <hr className={styles.divider} />

        {/* Q2 — Background diseases (optional) */}
        <div className={styles.questionBlock}>
          <p id="q2-label" className={styles.questionLabel}>
            {"האם קיימת אצלך אחת ממחלות הרקע הבאות?"}
          </p>
          <div aria-labelledby="q2-label" className={styles.checkGroup}>
            {BACKGROUND_DISEASES.map((disease) => (
              <label key={disease} className={styles.checkLabel}>
                <input
                  type="checkbox"
                  value={disease}
                  checked={diseases.includes(disease)}
                  onChange={() => toggleDisease(disease)}
                />
                <span>{disease}</span>
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className={styles.btnSubmit}>
          {"שמור והתחל בדיקה"}
        </button>
      </form>
    </div>
  );
}
