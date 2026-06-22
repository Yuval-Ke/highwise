"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AltitudeData, TripContext, AltitudeLocationSelections, LocationSelection } from "@/types";
import {
  saveAltitudeData,
  getUserProfile,
  getAltitudeLocationSelections,
  saveAltitudeLocationSelections,
} from "@/lib/storage";
import { track, getAltitudeBand } from "@/lib/analytics";
import { getActiveTrekById } from "@/lib/datasetStore";
import type { NTrek, NLocation } from "@/lib/nepalData";
import { VillageLookupModal } from "@/components/VillageLookupModal";
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

  // Trek/village context
  const [tripContext, setTripContext] = useState<TripContext | null>(null);
  const [trek, setTrek] = useState<NTrek | null>(null);
  const [locationSelections, setLocationSelections] = useState<AltitudeLocationSelections>({});
  const [activeModal, setActiveModal] = useState<FieldKey | null>(null);
  const [trekChangedAlert, setTrekChangedAlert] = useState(false);

  useEffect(() => {
    track("screen_viewed_assessment");

    const profile = getUserProfile();
    const ctx = profile?.tripContext ?? null;
    setTripContext(ctx);
    if (ctx && ctx.trekId !== "other_or_unsure") {
      setTrek(getActiveTrekById(ctx.trekId) ?? null);
    }

    // Restore existing location selections, clearing them if trek changed
    const existing = getAltitudeLocationSelections();
    const entries = Object.values(existing).filter(Boolean) as LocationSelection[];
    if (entries.length > 0) {
      const prevTrekId = entries[0].trekId;
      if (prevTrekId !== ctx?.trekId) {
        saveAltitudeLocationSelections({});
        setTrekChangedAlert(true);
      } else {
        setLocationSelections(existing);
      }
    }
  }, []);

  function handleChange(key: FieldKey, rawValue: string) {
    setValues((prev) => ({ ...prev, [key]: rawValue }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));

    // Clear location selection if the manual value no longer matches
    const sel = locationSelections[key];
    if (sel && rawValue !== String(sel.altitudeMeters)) {
      const next = { ...locationSelections };
      delete next[key];
      setLocationSelections(next);
      saveAltitudeLocationSelections(next);
    }
  }

  function handleLocationApply(fieldKey: FieldKey, location: NLocation) {
    setValues((prev) => ({ ...prev, [fieldKey]: String(location.altitudeMeters) }));
    setErrors((prev) => ({ ...prev, [fieldKey]: undefined }));

    const sel: LocationSelection = {
      locationId: location.locationId,
      trekId: tripContext!.trekId,
      altitudeMeters: location.altitudeMeters,
      nameEn: location.nameEn,
      nameHe: location.nameHe,
    };
    const next = { ...locationSelections, [fieldKey]: sel };
    setLocationSelections(next);
    saveAltitudeLocationSelections(next);

    track("village_lookup_applied", {
      trekId: tripContext!.trekId,
      fieldName: fieldKey,
      altitudeBand: getAltitudeBand(location.altitudeMeters),
    });

    setActiveModal(null);
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
      track("below_2500_blocked");
      setPhase("below_threshold");
      return;
    }

    saveAltitudeData(altitudeData);
    track("altitude_completed");
    router.push("/symptoms");
  }

  function resetForm() {
    setValues(EMPTY_VALUES);
    setErrors({});
    setPhase("form");
  }

  function renderField(key: FieldKey, label: string) {
    const hasError = Boolean(errors[key]);
    const sel = locationSelections[key];
    const isCurrentAlt = key === "currentAltitude";

    return (
      <div key={key} className={styles.field}>
        {/* Label row: label on right (RTL start), lookup button on left (RTL end) */}
        <div className={styles.fieldLabelRow}>
          <label htmlFor={key} className={styles.fieldLabel}>
            {label}
          </label>
          {trek && (
            <button
              type="button"
              className={styles.lookupBtn}
              onClick={() => {
                track("village_lookup_opened", {
                  trekId: tripContext!.trekId,
                  fieldName: key,
                });
                setActiveModal(key);
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {isCurrentAlt
                ? "מצא את הכפר שאני נמצא בו"
                : "חפש כפר במסלול"}
            </button>
          )}
        </div>

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

        {sel && (
          <p className={styles.selectedLocation}>
            {`נבחר: ${sel.nameEn} — ${sel.nameHe} · גובה משוער ${sel.altitudeMeters} מ׳`}
          </p>
        )}

        {hasError && (
          <p id={`${key}-error`} className={styles.fieldError} role="alert">
            {errors[key]}
          </p>
        )}
      </div>
    );
  }

  /* ── Below-threshold screen ─────────────────────────────────────── */
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

  /* ── Main form ──────────────────────────────────────────────────── */
  return (
    <>
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

          {/* Trek context banner */}
          {trek && (
            <div className={styles.trekBadge}>
              {`מסלול נבחר: ${trek.nameEn} — ${trek.nameHe}`}
            </div>
          )}

          {trekChangedAlert && (
            <div className={styles.trekChangedAlert} role="status">
              {"המסלול עודכן. בחירות כפרים קודמות נוקו, אך הגבהים שהוזנו נשמרו."}
            </div>
          )}

          {!tripContext && (
            <p className={styles.noTrekNote}>
              {"כדי להשתמש בחיפוש כפרים יש לבחור טרק במסך פרטי המסלול. ניתן להמשיך בהזנת גבהים ידנית."}
            </p>
          )}

          {tripContext?.trekId === "other_or_unsure" && (
            <p className={styles.noTrekNote}>
              {"חיפוש כפרים זמין רק לאחר בחירת טרק מהרשימה. ניתן להמשיך בהזנת גבהים ידנית."}
            </p>
          )}

          <p className={styles.intro}>
            {"יש להכניס את גבהי השינה והגובה הנוכחי במטרים. הנתונים משמשים להערכת קצב העלייה והסיכון למחלת גבהים."}
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>
              {"גבהי שינה בימים האחרונים:"}
            </h2>
            {SECTION_2.map(({ key, label }) => renderField(key, label))}
          </section>

          <hr className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.sectionHeading}>
              {"הגובה הנוכחי ותכנון הלילה הבא:"}
            </h2>
            {SECTION_1.map(({ key, label }) => renderField(key, label))}
          </section>

          <button type="submit" className={styles.btnSubmit}>
            {"המשך"}
          </button>
        </form>
      </div>

      {/* Village lookup modal — rendered outside the page div so it overlays everything */}
      {activeModal && trek && (
        <VillageLookupModal
          trek={trek}
          onSelect={(loc) => handleLocationApply(activeModal, loc)}
          onManual={() => setActiveModal(null)}
        />
      )}
    </>
  );
}
