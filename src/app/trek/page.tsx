"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TripContext } from "@/types";
import { saveUserProfile, getUserProfile, saveAltitudeLocationSelections, getAltitudeLocationSelections } from "@/lib/storage";
import { track } from "@/lib/analytics";
import {
  NEPAL_DATA,
  getTrekById,
  getTrekDisplayName,
  getPopularTreks,
  getTreksByRegion,
  searchTreks,
} from "@/lib/nepalData";
import styles from "./trek.module.css";

const OTHER_OR_UNSURE = "other_or_unsure";

export default function TrekContextPage() {
  const router = useRouter();
  const [selectedTrekId, setSelectedTrekId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return getUserProfile()?.tripContext?.trekId ?? "";
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [trekQuery, setTrekQuery] = useState("");
  const trekSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    track("screen_viewed_trek");
    if (!getUserProfile()) {
      router.replace("/profile");
    }
  }, [router]);

  useEffect(() => {
    if (dropdownOpen) trekSearchRef.current?.focus();
  }, [dropdownOpen]);

  function handleSelectTrek(trekId: string) {
    setSelectedTrekId(trekId);
    setDropdownOpen(false);
    setTrekQuery("");
    track("trek_selected", { trekId });
  }

  function getSelectedLabel(): string {
    if (!selectedTrekId) return "";
    if (selectedTrekId === OTHER_OR_UNSURE) return "המסלול שלי לא ברשימה / לא בטוח";
    const trek = getTrekById(selectedTrekId);
    return trek ? getTrekDisplayName(trek) : "";
  }

  const filteredTreks = trekQuery ? searchTreks(trekQuery) : NEPAL_DATA.treks;
  const popularTreks = getPopularTreks().filter((t) =>
    filteredTreks.some((f) => f.trekId === t.trekId)
  );
  const regionMap = getTreksByRegion();

  function handleContinue() {
    const existingProfile = getUserProfile();
    if (!existingProfile) {
      router.replace("/profile");
      return;
    }
    const newTrekId = selectedTrekId || undefined;
    const prevTrekId = existingProfile.tripContext?.trekId;

    // Clear stale location selections when the trek changes
    if (newTrekId !== prevTrekId) {
      const existing = getAltitudeLocationSelections();
      const hasSelections = Object.values(existing).some(Boolean);
      if (hasSelections) {
        saveAltitudeLocationSelections({});
      }
    }

    const tripContext: TripContext | undefined = newTrekId
      ? { countryId: "nepal", trekId: newTrekId }
      : undefined;
    saveUserProfile({
      previousAltitudeIllness: existingProfile.previousAltitudeIllness,
      backgroundDiseases: existingProfile.backgroundDiseases,
      ...(tripContext ? { tripContext } : {}),
    });
    track("trek_context_completed", newTrekId ? { trekId: newTrekId } : {});
    router.push("/assessment");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.push("/profile")}
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
        <h1 className={styles.screenTitle}>{"פרטי הטרק"}</h1>
      </header>

      <div className={styles.content}>
        <p className={styles.desc}>
          {"בחירת טרק תאפשר מילוי גובה משוער לפי כפרים מוכרים במסלול."}
        </p>

        <div className={styles.countryRow}>
          <span className={styles.countryKey}>{"מדינה:"}</span>
          <span className={styles.countryValue}>{"נפאל"}</span>
        </div>

        {/* Trek selector */}
        <div className={styles.trekSelectorWrapper}>
          <label className={styles.trekSelectorLabel} htmlFor="trek-trigger">
            {"מסלול בנפאל — אופציונלי, מומלץ"}
          </label>

          <button
            id="trek-trigger"
            type="button"
            className={`${styles.trekTrigger} ${dropdownOpen ? styles.trekTriggerOpen : ""}`}
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            onClick={() => setDropdownOpen((o) => !o)}
          >
            <span
              className={
                selectedTrekId ? styles.trekTriggerSelected : styles.trekTriggerPlaceholder
              }
            >
              {selectedTrekId ? getSelectedLabel() : "בחר מסלול..."}
            </span>
            <svg
              className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ""}`}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className={styles.trekDropdown} role="listbox">
              <div className={styles.trekSearchBar}>
                <input
                  ref={trekSearchRef}
                  type="search"
                  className={styles.trekSearchInput}
                  placeholder="חפש מסלול..."
                  value={trekQuery}
                  onChange={(e) => setTrekQuery(e.target.value)}
                  aria-label="חיפוש מסלול"
                />
              </div>

              {popularTreks.length > 0 && (
                <>
                  <div className={styles.optGroupLabel}>{"מסלולים נפוצים בנפאל"}</div>
                  {popularTreks.map((trek) => (
                    <button
                      key={trek.trekId}
                      type="button"
                      role="option"
                      aria-selected={selectedTrekId === trek.trekId}
                      className={`${styles.trekOption} ${
                        selectedTrekId === trek.trekId ? styles.trekOptionSelected : ""
                      }`}
                      onClick={() => handleSelectTrek(trek.trekId)}
                    >
                      {getTrekDisplayName(trek)}
                    </button>
                  ))}
                </>
              )}

              {filteredTreks.length > 0 && (
                <>
                  <div className={styles.optGroupLabel}>{"כל המסלולים לפי אזור"}</div>
                  {Array.from(regionMap.entries()).map(([region, treks]) => {
                    const visible = treks.filter((t) =>
                      filteredTreks.some((f) => f.trekId === t.trekId)
                    );
                    if (visible.length === 0) return null;
                    return (
                      <div key={region}>
                        <div className={styles.regionLabel}>{region}</div>
                        {visible.map((trek) => (
                          <button
                            key={trek.trekId}
                            type="button"
                            role="option"
                            aria-selected={selectedTrekId === trek.trekId}
                            className={`${styles.trekOption} ${styles.trekOptionIndented} ${
                              selectedTrekId === trek.trekId ? styles.trekOptionSelected : ""
                            }`}
                            onClick={() => handleSelectTrek(trek.trekId)}
                          >
                            {getTrekDisplayName(trek)}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </>
              )}

              {filteredTreks.length === 0 && (
                <p className={styles.trekNoResults}>{"לא נמצאו מסלולים תואמים"}</p>
              )}

              <div className={styles.trekDropdownDivider} />
              <button
                type="button"
                role="option"
                aria-selected={selectedTrekId === OTHER_OR_UNSURE}
                className={`${styles.trekOption} ${
                  selectedTrekId === OTHER_OR_UNSURE ? styles.trekOptionSelected : ""
                }`}
                onClick={() => handleSelectTrek(OTHER_OR_UNSURE)}
              >
                {"המסלול שלי לא ברשימה / לא בטוח"}
              </button>
            </div>
          )}

          {!selectedTrekId && !dropdownOpen && (
            <p className={styles.noTrekNote}>
              {"ניתן להמשיך ללא בחירת טרק, אך חיפוש כפרים לא יהיה זמין במסך הבא."}
            </p>
          )}

          {selectedTrekId && (
            <button
              type="button"
              className={styles.clearTrekBtn}
              onClick={() => {
                setSelectedTrekId("");
                setTrekQuery("");
              }}
            >
              {"הסר בחירת מסלול"}
            </button>
          )}
        </div>

        <button type="button" className={styles.btnSubmit} onClick={handleContinue}>
          {"המשך להזנת גבהים"}
        </button>
      </div>
    </div>
  );
}
