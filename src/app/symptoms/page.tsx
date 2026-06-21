"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { LLSScore, LLSInput } from "@/types";
import { saveLLSData } from "@/lib/storage";
import { track } from "@/lib/analytics";
import styles from "./symptoms.module.css";

const SYMPTOM_GROUPS: {
  key: keyof LLSInput;
  title: string;
  options: { label: string; value: LLSScore }[];
}[] = [
  {
    key: "headache",
    title: "כאב ראש",
    options: [
      { label: "אין כאב ראש", value: 0 },
      { label: "כאב ראש קל", value: 1 },
      { label: "כאב ראש בינוני", value: 2 },
      { label: "כאב ראש חמור / משתק", value: 3 },
    ],
  },
  {
    key: "gastrointestinal",
    title: "תסמינים במערכת העיכול",
    options: [
      { label: "תיאבון טוב, אין בחילות או תסמינים אחרים", value: 0 },
      { label: "חוסר תיאבון או בחילה קלה", value: 1 },
      { label: "בחילה בינונית או הקאה בודדת", value: 2 },
      { label: "בחילות והקאות חמורות, משתקות", value: 3 },
    ],
  },
  {
    key: "fatigue",
    title: "תשישות ו/או חולשה",
    options: [
      { label: "אין תשישות או חולשה חריגה", value: 0 },
      { label: "תשישות / חולשה קלה", value: 1 },
      { label: "תשישות / חולשה בינונית", value: 2 },
      { label: "תשישות / חולשה חמורה, משתקת", value: 3 },
    ],
  },
  {
    key: "dizziness",
    title: "סחרחורת",
    options: [
      { label: "אין סחרחורת", value: 0 },
      { label: "סחרחורת קלה", value: 1 },
      { label: "סחרחורת בינונית", value: 2 },
      { label: "סחרחורת חמורה, משתקת", value: 3 },
    ],
  },
];

type SymptomValues = Partial<Record<keyof LLSInput, LLSScore>>;

export default function SymptomsScreen() {
  const router = useRouter();
  const [values, setValues] = useState<SymptomValues>({});
  const [errors, setErrors] = useState<Set<keyof LLSInput>>(new Set());

  useEffect(() => {
    track("screen_viewed_symptoms");
  }, []);

  function handleSelect(key: keyof LLSInput, value: LLSScore) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors.has(key)) {
      setErrors((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const missing = new Set<keyof LLSInput>();
    for (const group of SYMPTOM_GROUPS) {
      if (values[group.key] === undefined) missing.add(group.key);
    }
    if (missing.size > 0) {
      setErrors(missing);
      const firstKey = SYMPTOM_GROUPS.find((g) => missing.has(g.key))?.key;
      if (firstKey) {
        document
          .getElementById(`group-${firstKey}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    saveLLSData({
      headache: values.headache!,
      gastrointestinal: values.gastrointestinal!,
      fatigue: values.fatigue!,
      dizziness: values.dizziness!,
    });
    track("symptoms_completed");
    router.push("/respiratory");
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
        <h1 className={styles.screenTitle}>תסמינים</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.progress}>
          <span className={styles.progressLabel}>שלב 2 מתוך 4</span>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={2}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label="שלב 2 מתוך 4"
          >
            <div className={styles.progressFill} style={{ width: "50%" }} />
          </div>
        </div>

        <p className={styles.intro}>{"דרג/י את חומרת התסמינים שחש/ת ביממה האחרונה"}</p>

        <div className={styles.groups}>
          {SYMPTOM_GROUPS.map((group) => {
            const hasError = errors.has(group.key);
            return (
              <div
                key={group.key}
                id={`group-${group.key}`}
                className={`${styles.card} ${hasError ? styles.cardError : ""}`}
              >
                <h2 className={styles.cardTitle}>{group.title}</h2>
                <div
                  role="radiogroup"
                  aria-labelledby={`label-${group.key}`}
                  className={styles.radioGroup}
                >
                  {group.options.map((opt) => (
                    <label key={opt.value} className={styles.radioLabel}>
                      <input
                        type="radio"
                        name={group.key}
                        value={opt.value}
                        checked={values[group.key] === opt.value}
                        onChange={() => handleSelect(group.key, opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                {hasError && (
                  <p className={styles.errorMsg} role="alert">
                    {"יש להשלים את כל השדות לפני המשך"}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button type="submit" className={styles.btnSubmit}>
          {"המשך"}
        </button>
      </form>
    </div>
  );
}
