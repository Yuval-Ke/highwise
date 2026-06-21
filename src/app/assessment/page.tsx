"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AltitudeData } from "@/types";
import { saveAltitudeData } from "@/lib/storage";
import styles from "./assessment.module.css";

type FieldKey = keyof AltitudeData;

interface FormValues {
  currentAltitude: string;
  plannedSleepAltitudeTonight: string;
  sleepAltitudeThreeNightsAgo: string;
  sleepAltitudeTwoNightsAgo: string;
  sleepAltitudeLastNight: string;
}

type FormErrors = Partial<Record<FieldKey, string>>;

const EMPTY_VALUES: FormValues = {
  currentAltitude: "",
  plannedSleepAltitudeTonight: "",
  sleepAltitudeThreeNightsAgo: "",
  sleepAltitudeTwoNightsAgo: "",
  sleepAltitudeLastNight: "",
};

const SECTION_1: { key: FieldKey; label: string }[] = [
  { key: "currentAltitude", label: "מה הגובה הנוכחי?" },
  { key: "plannedSleepAltitudeTonight", label: "מה גובה השינה המתוכנן בלילה הבא?" },
];

const SECTION_2: { key: FieldKey; label: string }[] = [
  { key: "sleepAltitudeThreeNightsAgo", label: "מה היה גובה השינה לפני שלושה לילות?" },
  { key: "sleepAltitudeTwoNightsAgo", label: "מה היה גובה השינה לפני שני לילות?" },
  { key: "sleepAltitudeLastNight", label: "מה היה גובה השינה בלילה האחרון?" },
];

function validateAltitude(value: string): string | null {
  if (value.trim() === "") {
    return "אם אינך יודע/ת במדויק, יש להזין הערכה קרובה ככל האפשר.";
  }
  const num = Number(value.trim());
  if (isNaN(num) || !Number.isInteger(num) || num < 0 || num > 7000) {
    return "יש להזין גובה תקין במטרים";
  }
  return null;
}

function validateAll(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  for (const key of Object.keys(values) as FieldKey[]) {
    const err = validateAltitude(values[key]);
    if (err) errors[key] = err;
  }
  return errors;
}

export default function AltitudeDataScreen() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [phase, setPhase] = useState<"form" | "below_threshold">("form");

  function handleChange(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newErrors = validateAll(values);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      document.getElementById(firstErrorKey)?.focus();
      return;
    }

    const altitudeData: AltitudeData = {
      currentAltitude: Number(values.currentAltitude),
      plannedSleepAltitudeTonight: Number(values.plannedSleepAltitudeTonight),
      sleepAltitudeThreeNightsAgo: Number(values.sleepAltitudeThreeNightsAgo),
      sleepAltitudeTwoNightsAgo: Number(values.sleepAltitudeTwoNightsAgo),
      sleepAltitudeLastNight: Number(values.sleepAltitudeLastNight),
    };

    const belowThreshold =
      altitudeData.currentAltitude < 2500 &&
      altitudeData.plannedSleepAltitudeTonight < 2500;

    if (belowThreshold) {
      setPhase("below_threshold");
      return;
    }

    saveAltitudeData(altitudeData);
    router.push("/symptoms");
  }

  function resetForm() {
    setValues(EMPTY_VALUES);
    setErrors({});
    setPhase("form");
  }

  function renderField(key: FieldKey, label: string) {
    const hasError = Boolean(errors[key]);
    return (
      <div key={key} className={styles.field}>
        <label htmlFor={key} className={styles.fieldLabel}>
          {label}
        </label>
        <div className={styles.inputRow}>
          <input
            id={key}
            type="text"
            inputMode="numeric"
            className={`${styles.input} ${hasError ? styles.inputInvalid : ""}`}
            placeholder="לדוגמה: 3500"
            value={values[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            aria-describedby={hasError ? `${key}-error` : undefined}
            aria-invalid={hasError ? "true" : undefined}
          />
          <span className={styles.unit} aria-hidden="true">
            מטרים
          </span>
        </div>
        {hasError && (
          <p id={`${key}-error`} className={styles.fieldError} role="alert">
            {errors[key]}
          </p>
        )}
      </div>
    );
  }

  /* ── Below-threshold screen ─────────────────────────────────── */
  if (phase === "below_threshold") {
    return (
      <div className={styles.btPage}>
        <div className={styles.btIcon} aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className={styles.btTitle}>
          {"הכלי מתוכנן לשימוש מעל גובה 2500 מ׳"}
        </h1>
        <p className={styles.btBody}>
          {"בגובה נמוך יותר הסבירות למחלת גבהים נמוכה, אך אם יש תסמינים משמעותיים או החמרה במצבך — מומלץ לפנות לבדיקה רפואית."}
        </p>
        <div className={styles.btActions}>
          <button className={styles.btnPrimary} onClick={resetForm}>
            {"בדיקה חדשה"}
          </button>
          <button className={styles.btnSecondary} onClick={() => router.push("/")}>
            {"חזור למסך הבית"}
          </button>
        </div>
      </div>
    );
  }

  /* ── Altitude Data form ──────────────────────────────────────── */
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.back()}
          aria-label="חזרה למסך הקודם"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <h1 className={styles.screenTitle}>נתוני גובה</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.progress}>
          <span className={styles.progressLabel}>שלב 1 מתוך 4</span>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={1}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label="שלב 1 מתוך 4"
          >
            <div className={styles.progressFill} style={{ width: "25%" }} />
          </div>
        </div>

        <p className={styles.intro}>
          {"יש להכניס את גבהי השינה והגובה הנוכחי במטרים. הנתונים משמשים להערכת קצב העלייה והסיכון למחלת גבהים."}
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>
            {"הגובה הנוכחי ותכנון הלילה הבא:"}
          </h2>
          {SECTION_1.map(({ key, label }) => renderField(key, label))}
        </section>

        <hr className={styles.divider} />

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>
            {"גבהי שינה בימים האחרונים:"}
          </h2>
          {SECTION_2.map(({ key, label }) => renderField(key, label))}
        </section>

        <button type="submit" className={styles.btnSubmit}>
          {"המשך"}
        </button>
      </form>
    </div>
  );
}
