'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setConsent, hasValidConsent } from '@/lib/consentStore';
import { getCachedConfig } from '@/lib/appConfigStore';
import styles from './consent.module.css';

const DEFAULT_VERSION = '1';

function getConsentVersion(): string {
  const config = getCachedConfig();
  return config?.consentVersion ?? DEFAULT_VERSION;
}

export default function ConsentPage() {
  const router = useRouter();

  useEffect(() => {
    const version = getConsentVersion();
    if (hasValidConsent(version)) {
      router.replace('/profile');
    }
  }, [router]);

  function handleAccept() {
    const version = getConsentVersion();
    setConsent(version);
    router.replace('/profile');
  }

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.iconWrap} aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <circle cx="12" cy="16" r="0.5" fill="currentColor" />
            </svg>
          </div>
          <h1 className={styles.title}>הסכמה לשימוש ופרטיות</h1>
        </header>

        <div className={styles.body}>
          <p className={styles.paragraph}>
            האפליקציה אינה מיועדת לייעוץ רפואי.
          </p>
          <p className={styles.paragraph}>
            האפליקציה עשויה לשמור ולשלוח נתוני שימוש ובדיקות ללא פרטים מזהים
            אישית, כגון גבהים שהוזנו, מסלול שנבחר, זמני בדיקה, LLS פנימי
            ותוצאת הסיכון.
          </p>
          <p className={styles.paragraph}>
            הנתונים אינם כוללים שם, טלפון או מייל, ומקושרים למזהה התקנה
            אקראי בלבד.
          </p>
        </div>

        <div className={styles.footer}>
          <button className={styles.acceptBtn} onClick={handleAccept}>
            אני מאשר/ת
          </button>
        </div>
      </div>
    </main>
  );
}
