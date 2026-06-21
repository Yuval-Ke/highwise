"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { hasUserProfile, clearAllData } from "@/lib/storage";
import styles from "./home.module.css";

export default function Home() {
  const router = useRouter();
  const [profileExists, setProfileExists] = useState(false);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    setProfileExists(hasUserProfile());
  }, []);

  function handleStart() {
    router.push(profileExists ? "/assessment" : "/profile");
  }

  function handleConfirmReset() {
    clearAllData();
    setProfileExists(false);
    setShowReset(false);
  }

  return (
    <main className={styles.main}>
      <header className={styles.logoArea}>
        <div className={styles.logo}>
          <Image
            src="/assets/logo-highwise.png"
            alt="HighWise logo"
            width={520}
            height={520}
            priority
          />
        </div>
        <h1 className="sr-only">HighWise</h1>
        <p className={styles.subtitle}>
          {"כלי עזר להפחתת הסיכון למחלת גבהים"}
        </p>
      </header>

      {/* Realistic mountain + hiker photo */}
      <div className={styles.illustration}>
        <Image
          src="/home-illustration.png"
          alt="hiker standing in front of snow-capped mountains"
          width={720}
          height={290}
          style={{ width: "100%", height: "175px", objectFit: "cover", objectPosition: "center", display: "block" }}
          priority
        />
      </div>

      {/* Medical disclaimer — exact wording from UX_DECISIONS.md */}
      <section className={styles.disclaimer} aria-label="הבהרה רפואית">
        <div className={styles.disclaimerIcon} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <circle cx="12" cy="16" r="0.5" fill="currentColor" />
          </svg>
        </div>
        <div className={styles.disclaimerBody}>
          <p>
            <span className={styles.disclaimerLabel}>{"הבהרה רפואית: "}</span>
            {"שאלון זה מספק הערכת סיכון ראשונית בלבד למחלת גבהים (AMS) על סמך דיווח עצמי, ואינו מהווה אבחנה רפואית או מדידה פיזיולוגית אובייקטיבית. השימוש באפליקציה אינו מחליף ייעוץ רפואי או שיקול דעת מקצועי בשטח. בכל מקרה של החמרה בתסמינים או הופעת סימני אזהרה (כמו חוסר יציבות או קוצר נשימה במנוחה), יש לרדת בגובה ולפנות לעזרה רפואית מיידית."}
          </p>
        </div>
      </section>

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleStart}>
          {"הבנתי, התחל בדיקה"}
        </button>
        <button
          className={styles.btnSecondary}
          onClick={() => setShowReset(true)}
        >
          {"איפוס כל הנתונים"}
        </button>
        <button
          className={styles.btnInfo}
          onClick={() => router.push("/altitude-rules")}
        >
          {"כללים לעליה בטוחה בגובה"}
        </button>
      </div>

      {/* Reset confirmation dialog */}
      {showReset && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReset(false);
          }}
        >
          <div className={styles.dialog}>
            <p id="reset-dialog-title" className={styles.dialogMessage}>
              {"פעולה זו תמחק את כל הנתונים השמורים במכשיר זה. להמשיך?"}
            </p>
            <div className={styles.dialogButtons}>
              <button
                className={styles.btnCancel}
                onClick={() => setShowReset(false)}
              >
                {"ביטול"}
              </button>
              <button className={styles.btnDanger} onClick={handleConfirmReset}>
                {"מחק את כל הנתונים"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
