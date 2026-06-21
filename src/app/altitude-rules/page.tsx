"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./altitude-rules.module.css";

const ITEMS = [
  {
    title: "1. גובה השינה חשוב יותר מהגובה המקסימלי ביום ההליכה",
    body: "אפשר לעלות במהלך היום לגובה גבוה יותר, אך הסיכון מושפע ומחושב בעיקר לפי הגובה שבו ישנים בלילה.",
  },
  {
    title: "2. לא לעלות את גובה השינה ביותר מ-500 מ' ליום",
    body: "למשל – אם אתמול ישנת בגובה 3300 מ׳, גובה השינה היום יהיה 3800 מ׳ או פחות.",
  },
  {
    title: "3. על כל 1,000 מ׳ של עלייה בגובה השינה — להוסיף יום התאקלמות",
    body: "אם שלשום ישנת בגובה 3000 מ׳, אתמול ב3500 והיום בגובה 4000 מ׳, מחר יש לישון לילה נוסף בגובה 4000 מ׳ לפני המשך עלייה. זה נקרא יום התאקלמות.",
  },
  {
    title: "4. כאב ראש, בחילה, סחרחורת ותשישות יכולים להיות תסמינים של מחלת גבהים",
    body: "ויש להתייחס אליהם",
  },
  {
    title: "5. אם מופיעים תסמינים — לא ממשיכים לעלות!",
    body: "נשארים באותו גובה, וממשיכים לעלות רק לאחר שהתסמינים חלפו.",
  },
  {
    title: "6. אם התסמינים מחמירים או לא משתפרים — יורדים",
    body: "ירידה של 300–500 מ׳ יכולה לשפר מחלת גבהים.",
  },
  {
    title: "7. סימני אזהרה מחייבים התייחסות מיידית",
    body: "חוסר יציבות בהליכה, קוצר נשימה במנוחה, בלבול, ישנוניות חריגה, הקאות חוזרות או החמרה משמעותית בכאב ראש הם סימני אזהרה. במצב כזה יש לרדת בגובה ולפנות לעזרה רפואית.",
  },
  {
    title: "8. כדורי אצטזולאמיד (אורמוקס / דיאמוקס) מאיצים אקלום לגובה",
    body: "אצטזולאמיד יכול לסייע בתהליך האקלום לגובה, אך אינו מחליף עלייה הדרגתית או ירידה בגובה במקרה של החמרה. יש להשתמש בו רק אם הומלץ או נרשם מראש על ידי רופא.",
  },
  {
    title: "9. הסיכון למחלת גבהים מתחיל בגובה 2500 מטר ועולה ככל שעולים בגובה מהר יותר",
    body: "ניתן להפחית את הסיכון למחלת גבהים על ידי עליה הדרגתית לפי הכללים ושימוש בתרופות (אם נרשמו על ידי רופא).",
  },
];

export default function AltitudeRulesScreen() {
  const router = useRouter();
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  function toggle(index: number) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.push("/")}
          aria-label="חזרה למסך הבית"
        >
          <svg
            width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <h1 className={styles.screenTitle}>{"כללים לעליה בטוחה בגובה"}</h1>
      </header>

      <div className={styles.content}>
        <div className={styles.accordion}>
          {ITEMS.map((item, i) => {
            const isOpen = openItems.has(i);
            return (
              <div key={i} className={styles.item}>
                <button
                  type="button"
                  className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""}`}
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.title}</span>
                  <svg
                    className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                    width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isOpen && (
                  <div className={styles.body}>{item.body}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.medicalNote}>
          <p>{"המידע בדף זה הוא מידע כללי בלבד ואינו מחליף ייעוץ רפואי, הערכה רפואית או שיקול דעת מקצועי בשטח."}</p>
        </div>
      </div>
    </div>
  );
}
