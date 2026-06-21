"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveThreeDaysData } from "@/lib/storage";
import { track } from "@/lib/analytics";
import styles from "./three-day.module.css";

export default function ThreeDayScreen() {
  const router = useRouter();
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    track("screen_viewed_three_day");
  }, []);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (answer === null) {
      setShowError(true);
      document.getElementById("three-day-question")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    saveThreeDaysData(answer);
    track("three_day_completed");
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
        <div className={styles.headerContent}>
          <span className={styles.screenLabel}>{"שאלת המשך"}</span>
          <h1 className={styles.screenTitle}>{"משך התסמינים"}</h1>
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <p className={styles.intro}>
          {"תסמינים שנמשכים מספר ימים ללא שיפור עשויים להעיד על סיכון גבוה יותר."}
        </p>

        <div
          id="three-day-question"
          className={`${styles.questionBlock} ${showError ? styles.questionBlockError : ""}`}
        >
          <p className={styles.questionLabel}>
            {"האם התסמינים נמשכים כבר 3 ימים ברצף ללא שיפור משמעותי?"}
          </p>
          <div role="radiogroup" aria-label="משך תסמינים" className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="threeDays"
                value="false"
                checked={answer === false}
                onChange={() => { setAnswer(false); setShowError(false); }}
              />
              <span>{"לא"}</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="threeDays"
                value="true"
                checked={answer === true}
                onChange={() => { setAnswer(true); setShowError(false); }}
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

        <button type="submit" className={styles.btnSubmit}>
          {"המשך"}
        </button>
      </form>
    </div>
  );
}
