"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AltitudeData,
  DailyInput,
  LLSInput,
  RedFlags,
  RiskLevel,
} from "@/types";
import { isBelowThreshold } from "@/types";
import {
  clearCurrentAssessment,
  getUserProfile,
  saveCompletedAssessment,
  STORAGE_KEYS,
} from "@/lib/storage";
import { riskEngine } from "@/lib/riskEngine";
import styles from "./result.module.css";

// ── Presentation-layer mapping ────────────────────────────────────────────────

type DisplayReason = { title: string; text: string };

const BUCKETS = {
  warningSign: new Set([
    "חוסר יציבות בהליכה / קושי ללכת בקו ישר",
    "תשישות חמורה",
    "בלבול / ישנוניות חריגה / שינוי במצב הכרה",
    "קוצר נשימה במנוחה",
    "כאב ראש חריג",
    "הקאות חוזרות",
  ]),
  severeSymptom: new Set([
    "כאב ראש בדרגה חמורה",
    "תסמיני עיכול בדרגה חמורה",
    "תשישות בדרגה חמורה",
  ]),
  headacheWithSymptoms: new Set([
    "כאב ראש בגובה עם ניקוד LLS",
    "כאב ראש עם ניקוד LLS גבוה (6 ומעלה)",
  ]),
  symptomsNoHeadache: new Set([
    "תסמינים ללא כאב ראש בניקוד LLS גבוה",
    "סחרחורת חמורה ללא קושי ללכת בקו ישר",
    "ניקוד LLS נמוך עם גורם סיכון",
  ]),
  prolongedSymptoms: new Set([
    "מחלת גבהים קלה נמשכת 3 ימים ברצף ללא שיפור",
  ]),
  backgroundDisease: new Set([
    "מחלת רקע",
    "מחלת רקע בנוכחות מחלת גבהים קלה",
  ]),
  respiratoryIllness: new Set(["מחלה נשימתית רצנטית"]),
  fastAscent: new Set([
    "עלייה יומית בגובה שינה של יותר מ-500 מטר",
    "לילה ראשון בגובה מעל 2800 מטר לאחר שני לילות מתחת 2500",
  ]),
  cumulativeAscent: new Set([
    "עלייה מצטברת של 1000 מטר ומעלה ללא יום התאקלמות",
  ]),
  priorIllness: new Set([
    "היסטוריה של מחלת גבהים בינונית או חמורה",
  ]),
};

function buildDisplayReasons(engineReasons: string[]): DisplayReason[] {
  const rs = new Set(engineReasons);
  const has = (b: Set<string>) => [...rs].some((r) => b.has(r));
  const out: DisplayReason[] = [];

  if (has(BUCKETS.warningSign))
    out.push({ title: "סימני אזהרה:", text: "דווח על סימן אזהרה שעשוי להעיד על מחלת גבהים משמעותית." });
  if (has(BUCKETS.headacheWithSymptoms))
    out.push({ title: "כאב ראש עם תסמינים נוספים:", text: "כאב ראש בשילוב תסמינים נוספים יכול להתאים לתמונה של מחלת גבהים." });
  if (has(BUCKETS.symptomsNoHeadache))
    out.push({ title: "תסמינים ללא כאב ראש:", text: "דווחו מספר תסמינים היכולים להתאים למחלת גבהים." });
  if (has(BUCKETS.severeSymptom))
    out.push({ title: "תסמין חמור:", text: "דווח על תסמין חמור, ולכן רמת הסיכון עלתה." });
  if (has(BUCKETS.prolongedSymptoms))
    out.push({ title: "תסמינים ממושכים:", text: "תסמינים שנמשכים מספר ימים ללא שיפור מעלים את רמת הסיכון." });
  if (has(BUCKETS.backgroundDisease))
    out.push({ title: "מחלת רקע:", text: "מחלת רקע רלוונטית יכולה להעלות את הסיכון להסתבכות בגובה." });
  if (has(BUCKETS.respiratoryIllness))
    out.push({ title: "מחלה נשימתית רצנטית:", text: "מחלה נשימתית לאחרונה יכולה להקשות על הסתגלות לגובה ולהעלות את רמת הסיכון." });
  if (has(BUCKETS.fastAscent))
    out.push({ title: "עלייה יומית מהירה:", text: "קצב העלייה בגובה השינה בימים האחרונים מעלה את רמת הסיכון." });
  if (has(BUCKETS.cumulativeAscent))
    out.push({ title: "עלייה מצטברת ללא יום התאקלמות:", text: "עלייה מצטברת משמעותית בגובה השינה ללא יום התאקלמות מעלה את רמת הסיכון." });
  if (has(BUCKETS.priorIllness))
    out.push({ title: "מחלת גבהים בעבר:", text: "מחלת גבהים משמעותית בעבר מעלה את הסיכון להופעה חוזרת." });

  return out;
}

// ── Level configuration ───────────────────────────────────────────────────────

type LevelConfig = {
  word: string;
  suffix: string;
  cssVar: string;
  gaugeColor: string;
  mainRecommendation: string;
  baseActions: string[];
};

const MEDICATION_YELLOW =
  "יש לשקול נטילת אורמוקס / דיאמוקס / אצטזולאמיד מניעתי - (אם הומלץ או נרשם מראש על ידי רופא).";

const LEVEL_CONFIG: Record<RiskLevel, LevelConfig> = {
  green: {
    word: "ירוק",
    suffix: "סיכון נמוך",
    cssVar: "var(--color-green)",
    gaugeColor: "#2d7a4f",
    mainRecommendation: "ניתן להמשיך עלייה בגובה",
    baseActions: [],
  },
  yellow: {
    word: "צהוב",
    suffix: "סיכון מוגבר קל",
    cssVar: "var(--color-yellow)",
    gaugeColor: "#c8900a",
    mainRecommendation: "ניתן להמשיך עלייה בתשומת לב להתפתחות תסמינים",
    baseActions: [],
  },
  orange: {
    word: "כתום",
    suffix: "סיכון גבוה",
    cssVar: "var(--color-orange)",
    gaugeColor: "#c95c00",
    mainRecommendation: "לא מומלץ להמשיך לעלות בגובה",
    baseActions: [
      "יש להישאר באותו הגובה עד אקלום.",
      "יש לפנות לייעוץ רפואי להכוונת טיפול.",
      "יש לשקול נטילת אורמוקס / דיאמוקס / אצטזולאמיד טיפולי - (לפי הנחיית רופא או אם נרשם מראש).",
    ],
  },
  red: {
    word: "אדום",
    suffix: "סיכון גבוה מאוד",
    cssVar: "var(--color-red)",
    gaugeColor: "#b91c1c",
    mainRecommendation: "יש לרדת בגובה!",
    baseActions: [
      "יש לפנות מיידית לקבלת עזרה רפואית.",
      "שימוש בחמצן אם זמין.",
      "טיפול תרופתי לפי הנחיה רפואית או פרוטוקול רפואי קיים.",
    ],
  },
};

// ── Gauge SVG ─────────────────────────────────────────────────────────────────
// Half-circle gauge: RTL order green(right) → yellow → orange → red(left)
// Center: (120,115), radius: 90, strokeWidth: 26
// Needle fixed positions per level:
//   green  22.5° → tip (186.5, 87.5)
//   yellow 67.5° → tip (147.6, 48.5)
//   orange 112.5°→ tip (92.4, 48.5)
//   red   157.5° → tip (53.5, 87.5)

const NEEDLE_TIPS: Record<RiskLevel, [number, number]> = {
  green:  [186.5, 87.5],
  yellow: [147.6, 48.5],
  orange: [92.4,  48.5],
  red:    [53.5,  87.5],
};

function RiskGauge({ level }: { level: RiskLevel }) {
  const [tipX, tipY] = NEEDLE_TIPS[level];
  const CX = 120, CY = 115;

  return (
    <svg
      viewBox="0 0 240 132"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.gauge}
      aria-hidden="true"
    >
      {/* Background ring */}
      <path d="M 210,115 A 90,90,0,0,0,30,115" stroke="#e2e8f0" strokeWidth="26" fill="none" strokeLinecap="butt" />

      {/* Green: 0°–45° (rightmost segment) */}
      <path d="M 210,115 A 90,90,0,0,0,183.64,51.36" stroke="#2d7a4f" strokeWidth="26" fill="none" strokeLinecap="butt" />

      {/* Yellow: 45°–90° */}
      <path d="M 183.64,51.36 A 90,90,0,0,0,120,25" stroke="#c8900a" strokeWidth="26" fill="none" strokeLinecap="butt" />

      {/* Orange: 90°–135° */}
      <path d="M 120,25 A 90,90,0,0,0,56.36,51.36" stroke="#c95c00" strokeWidth="26" fill="none" strokeLinecap="butt" />

      {/* Red: 135°–180° (leftmost segment) */}
      <path d="M 56.36,51.36 A 90,90,0,0,0,30,115" stroke="#b91c1c" strokeWidth="26" fill="none" strokeLinecap="butt" />

      {/* Black vertical divider at 90° — between yellow and orange */}
      <line x1="120" y1="12" x2="120" y2="38" stroke="#000000" strokeWidth="2.5" />

      {/* Needle */}
      <line
        x1={CX} y1={CY}
        x2={tipX} y2={tipY}
        stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r="5" fill="#1e293b" />

      {/* Labels */}
      <text x="35" y="130" fontFamily="Rubik,sans-serif" fontSize="9" fill="#6b7280" textAnchor="middle">{"סיכון גבוה"}</text>
      <text x="205" y="130" fontFamily="Rubik,sans-serif" fontSize="9" fill="#6b7280" textAnchor="middle">{"סיכון נמוך"}</text>
    </svg>
  );
}

// ── Computed result type ──────────────────────────────────────────────────────

type ResultAction = { text: string; urgent?: boolean };

type ResultData = {
  level: RiskLevel;
  mainRecommendation: string;
  actions: ResultAction[];
  displayReasons: DisplayReason[];
  engineReasons: string[];
  daily: DailyInput;
};

// ── Main component ────────────────────────────────────────────────────────────

export default function ResultScreen() {
  const router = useRouter();
  const [result, setResult] = useState<ResultData | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    const profile = getUserProfile();
    const rawAssessment = localStorage.getItem(STORAGE_KEYS.currentAssessment);
    const assessment = rawAssessment
      ? (JSON.parse(rawAssessment) as Record<string, unknown>)
      : null;

    if (
      !profile ||
      !assessment?.altitudeData ||
      !assessment?.lls ||
      assessment.respiratoryRecentIllness === undefined ||
      !assessment.redFlags
    ) {
      router.replace("/");
      return;
    }

    const daily: DailyInput = {
      altitudeData:             assessment.altitudeData as AltitudeData,
      lls:                      assessment.lls as LLSInput,
      respiratoryRecentIllness: assessment.respiratoryRecentIllness as boolean,
      redFlags:                 assessment.redFlags as RedFlags,
      threeDaysMildIllness:     assessment.threeDaysMildIllness as boolean | undefined,
    };

    const engineResult = riskEngine({ profile, daily });

    if (isBelowThreshold(engineResult)) {
      router.replace("/assessment");
      return;
    }

    const { level, reasons: engineReasons, specificActions } = engineResult;
    const cfg = LEVEL_CONFIG[level];

    const actions: ResultAction[] =
      level === "yellow"
        ? [
            ...(specificActions.length > 0
              ? [{ text: "מומלץ לבצע יום התאקלמות - (לישון לילה נוסף באותו הגובה) לפני המשך עליה", urgent: true }]
              : []),
            { text: MEDICATION_YELLOW },
          ]
        : cfg.baseActions.map((text) => ({ text }));

    const displayReasons = buildDisplayReasons(engineReasons);

    const data: ResultData = {
      level,
      mainRecommendation: cfg.mainRecommendation,
      actions,
      displayReasons,
      engineReasons,
      daily,
    };

    setResult(data);

    if (!savedRef.current) {
      savedRef.current = true;
      // _savedId is written back after first save so page reloads don't duplicate
      if (!assessment._savedId) {
        const id = Date.now().toString();
        const levelConfig = LEVEL_CONFIG[level];
        saveCompletedAssessment({
          id,
          createdAt: new Date().toISOString(),
          altitudeData:             daily.altitudeData,
          lls:                      daily.lls,
          respiratoryRecentIllness: daily.respiratoryRecentIllness,
          redFlags:                 daily.redFlags,
          threeDaysMildIllness:     daily.threeDaysMildIllness,
          medicalBackgroundSnapshot: {
            previousAltitudeIllness: profile.previousAltitudeIllness,
            backgroundDiseases:      profile.backgroundDiseases,
          },
          result: {
            level,
            riskLevelText: `רמת סיכון: ${levelConfig.word} — ${levelConfig.suffix}`,
            mainRecommendation: cfg.mainRecommendation,
            actions: actions.map((a) => a.text),
            displayReasons,
          },
        });
        localStorage.setItem(
          STORAGE_KEYS.currentAssessment,
          JSON.stringify({ ...assessment, _savedId: id })
        );
      }
    }
  }, [router]);

  function handleNewAssessment() {
    clearCurrentAssessment();
    router.push("/assessment");
  }

  if (!result) return null;

  const cfg = LEVEL_CONFIG[result.level];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.screenTitle}>{"הערכת הסיכון למחלת גבהים"}</h1>
      </header>

      <div className={styles.content}>
        {/* Gauge */}
        <section className={styles.gaugeSection} aria-label="מד סיכון">
          <RiskGauge level={result.level} />
        </section>

        {/* Risk level text */}
        <p className={styles.riskLevelText} aria-live="polite">
          {"רמת סיכון: "}
          <span
            className={styles.riskWord}
            style={{ color: cfg.cssVar }}
          >
            {cfg.word}
          </span>
          {` — ${cfg.suffix}`}
        </p>

        {/* Recommendation card */}
        <div
          className={styles.recommendationCard}
          style={{ "--strip": cfg.cssVar } as React.CSSProperties}
        >
          <p className={styles.mainRecommendation}>{result.mainRecommendation}</p>
          {result.actions.length > 0 && (
            <ul className={styles.actionList}>
              {result.actions.map((action, i) => (
                <li
                  key={i}
                  className={`${styles.actionItem} ${action.urgent ? styles.actionItemUrgent : ""}`}
                >
                  <span
                    className={styles.actionBullet}
                    style={action.urgent ? { color: "var(--color-red)" } : undefined}
                    aria-hidden="true"
                  >{"•"}</span>
                  <span>{action.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Why section */}
        <div className={styles.whySection}>
          <button
            type="button"
            className={`${styles.whyBtn} ${whyOpen ? styles.whyBtnOpen : ""}`}
            onClick={() => setWhyOpen((o) => !o)}
            aria-expanded={whyOpen}
          >
            <span>{"למה קיבלתי את התוצאה הזאת?"}</span>
            <svg
              className={`${styles.whyChevron} ${whyOpen ? styles.whyChevronOpen : ""}`}
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {whyOpen && (
            <div className={styles.whyContent}>
              {result.displayReasons.length === 0 ? (
                <p className={styles.whyEmpty}>
                  {"לא זוהו בתשובותיך תסמינים משמעותיים, סימני אזהרה, מחלת רקע רלוונטית או קצב עלייה שמעלה את רמת הסיכון לפי כלי זה."}
                </p>
              ) : (
                <ul className={styles.reasonList}>
                  {result.displayReasons.map((r, i) => (
                    <li key={i} className={styles.reasonItem}>
                      <span className={styles.reasonTitle}>{r.title}</span>
                      {" "}
                      <span className={styles.reasonText}>{r.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={styles.buttons}>
          <button type="button" className={styles.btnPrimary} onClick={handleNewAssessment}>
            {"בדיקה חדשה"}
          </button>
          <button type="button" className={styles.btnSecondary} onClick={() => router.push("/")}>
            {"חזור למסך הבית"}
          </button>
        </div>

        {/* Medical clarification */}
        <aside className={styles.medicalClarification} aria-label="הבהרה רפואית">
          <p>
            <span className={styles.clarificationLabel}>{"הבהרה רפואית: "}</span>
            {"שאלון זה מספק הערכת סיכון ראשונית בלבד למחלת גבהים (AMS) על סמך דיווח עצמי, ואינו מהווה אבחנה רפואית או מדידה פיזיולוגית אובייקטיבית. השימוש באפליקציה אינו מחליף ייעוץ רפואי או שיקול דעת מקצועי בשטח. בכל מקרה של החמרה בתסמינים או הופעת סימני אזהרה (כמו חוסר יציבות או קוצר נשימה במנוחה), יש לרדת בגובה ולפנות לעזרה רפואית מיידית."}
          </p>
        </aside>
      </div>
    </div>
  );
}
