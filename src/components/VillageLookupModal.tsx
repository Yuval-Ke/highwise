"use client";

import { useState, useEffect, useRef } from "react";
import type { NTrek, NLocation } from "@/lib/nepalData";
import { searchLocations, getTrekDisplayName, getLocationDisplayName } from "@/lib/nepalData";
import styles from "./VillageLookupModal.module.css";

type Props = {
  trek: NTrek;
  onSelect: (location: NLocation) => void;
  onManual: () => void;
};

export function VillageLookupModal({ trek, onSelect, onManual }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<NLocation | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = searchLocations(trek, query);
  const preTrek = filtered.filter((l) => l.section === "pre_trek");
  const onRoute = filtered.filter((l) => l.section === "on_route");

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="vlm-title">
      <div className={styles.modal}>
        <header className={styles.modalHeader}>
          <h2 id="vlm-title" className={styles.modalTitle}>{"בחר/י כפר במסלול"}</h2>
          <p className={styles.modalTrekLabel}>{`מסלול: ${getTrekDisplayName(trek)}`}</p>
        </header>

        <div className={styles.searchBar}>
          <input
            ref={searchRef}
            type="search"
            className={styles.searchInput}
            placeholder="חיפוש כפר בעברית או באנגלית"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            aria-label="חיפוש כפר"
          />
        </div>

        <div className={styles.locationList} role="listbox" aria-label="רשימת כפרים">
          {preTrek.length > 0 && (
            <>
              <div className={styles.sectionLabel} role="presentation">{"לפני הטרק"}</div>
              {preTrek.map((loc) => (
                <button
                  key={loc.locationId}
                  type="button"
                  role="option"
                  aria-selected={selected?.locationId === loc.locationId}
                  className={`${styles.locationRow} ${selected?.locationId === loc.locationId ? styles.locationRowSelected : ""}`}
                  onClick={() => setSelected(loc)}
                >
                  {getLocationDisplayName(loc)}
                </button>
              ))}
            </>
          )}

          {onRoute.length > 0 && (
            <>
              <div className={styles.sectionLabel} role="presentation">{"במסלול"}</div>
              {onRoute.map((loc) => (
                <button
                  key={loc.locationId}
                  type="button"
                  role="option"
                  aria-selected={selected?.locationId === loc.locationId}
                  className={`${styles.locationRow} ${selected?.locationId === loc.locationId ? styles.locationRowSelected : ""}`}
                  onClick={() => setSelected(loc)}
                >
                  {getLocationDisplayName(loc)}
                </button>
              ))}
            </>
          )}

          {filtered.length === 0 && (
            <p className={styles.emptyState}>{"לא נמצאו תוצאות לחיפוש זה"}</p>
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.btnApply}
            disabled={!selected}
            onClick={() => { if (selected) onSelect(selected); }}
          >
            {"השתמש בגובה המשוער הזה"}
          </button>
          <button
            type="button"
            className={styles.btnManual}
            onClick={onManual}
          >
            {"לא מצאתי את הכפר — אזין גובה ידנית"}
          </button>
        </div>
      </div>
    </div>
  );
}
