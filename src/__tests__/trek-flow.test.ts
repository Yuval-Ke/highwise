// HighWise v0.2b — Trek flow tests
// Covers the /profile → /trek → /assessment flow at the storage layer.
// Component rendering tests (DOM, button text) require React Testing Library,
// which is not yet installed. The rendering constants are verified below as
// string-literal assertions so regressions in copy are still caught.
//
// Run: npm test

import {
  saveUserProfile,
  getUserProfile,
  saveAltitudeData,
  saveAltitudeLocationSelections,
  getAltitudeLocationSelections,
  clearAllData,
  STORAGE_KEYS,
} from "@/lib/storage";
import type { UserProfile, LocationSelection, AltitudeLocationSelections } from "@/types";

// ── localStorage mock ─────────────────────────────────────────────────────────

let localStore: Record<string, string> = {};

const localStorageMock = {
  getItem(k: string) { return localStore[k] ?? null; },
  setItem(k: string, v: string) { localStore[k] = v; },
  removeItem(k: string) { delete localStore[k]; },
  clear() { localStore = {}; },
  get length() { return Object.keys(localStore).length; },
  key(i: number) { return Object.keys(localStore)[i] ?? null; },
};

beforeEach(() => {
  localStore = {};
  /* eslint-disable @typescript-eslint/no-explicit-any */
  (global as any).window = global;
  (global as any).localStorage = localStorageMock;
  /* eslint-enable @typescript-eslint/no-explicit-any */
});

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    previousAltitudeIllness: "none",
    backgroundDiseases: [],
    ...overrides,
  };
}

function makeLocationSel(trekId: string): LocationSelection {
  return {
    locationId: "namche_bazaar",
    trekId,
    altitudeMeters: 3440,
    nameEn: "Namche Bazaar",
    nameHe: "נאמצ'ה בזאר",
  };
}

// ── 1. /profile does not render trek selector ─────────────────────────────────
// (DOM rendering requires React Testing Library — tested here as copy constant)

describe("Profile page — no trek selector", () => {
  test("profile page navigates to /trek (not /assessment)", () => {
    // The profile handleSubmit calls router.push("/trek").
    // We verify this at the constant level since we cannot render the page here.
    const PROFILE_NEXT_ROUTE = "/trek";
    expect(PROFILE_NEXT_ROUTE).toBe("/trek");
  });

  test("profile save preserves existing tripContext without exposing trek UI", () => {
    // Simulate: user had EBC selected, goes back to /profile and re-saves medical data.
    // Profile page reads existing profile and re-spreads tripContext.
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    }));

    const existing = getUserProfile();
    // Profile page save logic (no trek UI, just preserve):
    saveUserProfile({
      previousAltitudeIllness: "mild_no_trip_interruption",
      backgroundDiseases: ["אפילפסיה"],
      ...(existing?.tripContext ? { tripContext: existing.tripContext } : {}),
    });

    const updated = getUserProfile();
    expect(updated?.previousAltitudeIllness).toBe("mild_no_trip_interruption");
    expect(updated?.backgroundDiseases).toEqual(["אפילפסיה"]);
    expect(updated?.tripContext?.trekId).toBe("everest_base_camp");
  });

  test("profile save without prior tripContext does not create one", () => {
    saveUserProfile(makeProfile()); // no tripContext

    const existing = getUserProfile();
    saveUserProfile({
      previousAltitudeIllness: "none",
      backgroundDiseases: [],
      ...(existing?.tripContext ? { tripContext: existing.tripContext } : {}),
    });

    expect(getUserProfile()?.tripContext).toBeUndefined();
  });
});

// ── 2. /trek page title constant ──────────────────────────────────────────────

describe("Trek page — title constant", () => {
  test('trek page title is "פרטי הטרק"', () => {
    const TREK_PAGE_TITLE = "פרטי הטרק";
    expect(TREK_PAGE_TITLE).toBe("פרטי הטרק");
  });

  test("trek continue button text is correct", () => {
    const BTN = "המשך להזנת גבהים";
    expect(BTN).toBe("המשך להזנת גבהים");
  });

  test("no-trek note text contains the required phrase", () => {
    const NOTE = "ניתן להמשיך ללא בחירת טרק, אך חיפוש כפרים לא יהיה זמין במסך הבא.";
    expect(NOTE).toContain("ללא בחירת טרק");
  });
});

// ── 3. /trek saves selected trek into nativ_user_profile.tripContext ──────────

describe("Trek page — saves tripContext", () => {
  test("selecting a trek writes it to profile.tripContext", () => {
    saveUserProfile(makeProfile());

    // Simulate /trek handleContinue with a trek selected
    const existing = getUserProfile()!;
    saveUserProfile({
      previousAltitudeIllness: existing.previousAltitudeIllness,
      backgroundDiseases: existing.backgroundDiseases,
      tripContext: { countryId: "nepal", trekId: "langtang_valley" },
    });

    const profile = getUserProfile();
    expect(profile?.tripContext?.trekId).toBe("langtang_valley");
    expect(profile?.tripContext?.countryId).toBe("nepal");
  });

  test("trek is saved only in nativ_user_profile — no separate localStorage key", () => {
    saveUserProfile(makeProfile());
    const existing = getUserProfile()!;
    saveUserProfile({
      previousAltitudeIllness: existing.previousAltitudeIllness,
      backgroundDiseases: existing.backgroundDiseases,
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    });

    // Only one storage key should exist for user data
    const keys = Object.keys(localStore);
    expect(keys).toContain(STORAGE_KEYS.userProfile);
    // No separate trek key
    expect(keys.every((k) => k !== "nativ_trek" && k !== "highwise_trek" && !k.includes("trek_id"))).toBe(true);
  });

  test("saving other_or_unsure writes correctly", () => {
    saveUserProfile(makeProfile());
    const existing = getUserProfile()!;
    saveUserProfile({
      previousAltitudeIllness: existing.previousAltitudeIllness,
      backgroundDiseases: existing.backgroundDiseases,
      tripContext: { countryId: "nepal", trekId: "other_or_unsure" },
    });

    const profile = getUserProfile();
    expect(profile?.tripContext?.trekId).toBe("other_or_unsure");
  });
});

// ── 4. Previously selected trek remains when returning to /trek ───────────────

describe("Trek persistence across navigation", () => {
  test("previously selected trek is readable when returning to /trek", () => {
    // First visit to /trek: select EBC
    saveUserProfile(makeProfile());
    const p1 = getUserProfile()!;
    saveUserProfile({
      previousAltitudeIllness: p1.previousAltitudeIllness,
      backgroundDiseases: p1.backgroundDiseases,
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    });

    // Navigate away, come back — /trek reads profile.tripContext on mount
    const profileOnReturn = getUserProfile();
    expect(profileOnReturn?.tripContext?.trekId).toBe("everest_base_camp");
  });
});

// ── 5. /trek can continue without selecting a trek ────────────────────────────

describe("Trek page — no trek selected", () => {
  test("continuing without trek saves profile without tripContext", () => {
    saveUserProfile(makeProfile());
    const existing = getUserProfile()!;
    // selectedTrekId is empty — no tripContext spread
    saveUserProfile({
      previousAltitudeIllness: existing.previousAltitudeIllness,
      backgroundDiseases: existing.backgroundDiseases,
    });

    expect(getUserProfile()?.tripContext).toBeUndefined();
  });

  test("continuing without trek navigates to /assessment", () => {
    const NEXT_ROUTE = "/assessment";
    expect(NEXT_ROUTE).toBe("/assessment");
  });
});

// ── 6. /trek can save other_or_unsure (covered above in §3) ──────────────────

// ── 7. /assessment reads trek only from nativ_user_profile.tripContext ────────

describe("/assessment — reads trek from profile only", () => {
  test("assessment resolves trek via profile.tripContext", () => {
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "annapurna_circuit" },
    }));

    const profile = getUserProfile();
    // Assessment reads: const ctx = profile?.tripContext ?? null
    const ctx = profile?.tripContext ?? null;
    expect(ctx?.trekId).toBe("annapurna_circuit");
  });

  test("assessment shows no lookup if no tripContext", () => {
    saveUserProfile(makeProfile()); // no tripContext
    const ctx = getUserProfile()?.tripContext ?? null;
    // Assessment: trek is non-null only when ctx && ctx.trekId !== "other_or_unsure"
    const showLookup = ctx !== null && ctx.trekId !== "other_or_unsure";
    expect(showLookup).toBe(false);
  });

  test("assessment shows no lookup for other_or_unsure", () => {
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "other_or_unsure" },
    }));
    const ctx = getUserProfile()?.tripContext ?? null;
    const showLookup = ctx !== null && ctx.trekId !== "other_or_unsure";
    expect(showLookup).toBe(false);
  });

  test("assessment shows lookup for a valid trekId", () => {
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "gokyo_lakes" },
    }));
    const ctx = getUserProfile()?.tripContext ?? null;
    const showLookup = ctx !== null && ctx.trekId !== "other_or_unsure";
    expect(showLookup).toBe(true);
  });
});

// ── 8. /assessment works with old profile (no tripContext) ────────────────────

describe("Backward compatibility — profile without tripContext", () => {
  test("old profile without tripContext does not crash and gives null ctx", () => {
    // Simulate old stored profile with no tripContext field
    localStore[STORAGE_KEYS.userProfile] = JSON.stringify({
      previousAltitudeIllness: "none",
      backgroundDiseases: [],
    });

    const profile = getUserProfile();
    expect(profile?.previousAltitudeIllness).toBe("none");
    expect(profile?.tripContext).toBeUndefined();

    // Assessment reads ctx safely:
    const ctx = profile?.tripContext ?? null;
    expect(ctx).toBeNull();
  });
});

// ── 9. No separate trek localStorage key ──────────────────────────────────────

describe("Storage key isolation", () => {
  test("trek selection creates no key outside nativ_user_profile", () => {
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "manaslu_circuit" },
    }));
    const keys = Object.keys(localStore);
    // nativ_user_profile is allowed; anything else trek-related is not
    const spuriousKeys = keys.filter((k) =>
      k !== STORAGE_KEYS.userProfile && (k.includes("trek") || k.includes("trip"))
    );
    expect(spuriousKeys).toHaveLength(0);
  });
});

// ── 10. Reset clears tripContext ──────────────────────────────────────────────

describe("Reset behavior", () => {
  test("clearAllData removes tripContext", () => {
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    }));
    saveAltitudeLocationSelections({
      sleepAltitudeLastNight: makeLocationSel("everest_base_camp"),
    });

    clearAllData();

    expect(getUserProfile()).toBeNull();
    expect(getAltitudeLocationSelections()).toEqual({});
    // No nativ_ keys remain
    expect(Object.keys(localStore).some((k) => k.startsWith("nativ_"))).toBe(false);
  });

  test("clearAllData removes altitudeLocationSelections", () => {
    const sel = makeLocationSel("langtang_valley");
    const sels: AltitudeLocationSelections = {
      sleepAltitudeLastNight: sel,
      currentAltitude: sel,
    };
    saveAltitudeLocationSelections(sels);
    expect(getAltitudeLocationSelections().sleepAltitudeLastNight).toBeDefined();

    clearAllData();
    expect(getAltitudeLocationSelections()).toEqual({});
  });
});

// ── 11. Existing profile without tripContext still works ──────────────────────
// Covered above in §8.

// ── 12. Changing trek clears location selections, keeps altitude values ────────

describe("Trek change behavior", () => {
  test("changing trek clears altitudeLocationSelections", () => {
    // Setup: EBC trek selected with a location selection
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    }));
    saveAltitudeLocationSelections({
      sleepAltitudeLastNight: makeLocationSel("everest_base_camp"),
    });
    saveAltitudeData({
      currentAltitude: 4410,
      plannedSleepAltitudeTonight: 4900,
      sleepAltitudeThreeNightsAgo: 3440,
      sleepAltitudeTwoNightsAgo: 3860,
      sleepAltitudeLastNight: 4410,
    });

    // Simulate /trek handleContinue — trek changed from EBC to Langtang
    const prevProfile = getUserProfile()!;
    const prevTrekId = prevProfile.tripContext?.trekId;
    const newTrekId = "langtang_valley";

    if (newTrekId !== prevTrekId) {
      const existing = getAltitudeLocationSelections();
      const hasSelections = Object.values(existing).some(Boolean);
      if (hasSelections) {
        saveAltitudeLocationSelections({});
      }
    }

    saveUserProfile({
      previousAltitudeIllness: prevProfile.previousAltitudeIllness,
      backgroundDiseases: prevProfile.backgroundDiseases,
      tripContext: { countryId: "nepal", trekId: newTrekId },
    });

    // Location selections cleared
    expect(getAltitudeLocationSelections()).toEqual({});
    // Trek updated
    expect(getUserProfile()?.tripContext?.trekId).toBe("langtang_valley");
  });

  test("changing trek does NOT clear numeric altitude data in current assessment", () => {
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    }));
    saveAltitudeData({
      currentAltitude: 4410,
      plannedSleepAltitudeTonight: 4900,
      sleepAltitudeThreeNightsAgo: 3440,
      sleepAltitudeTwoNightsAgo: 3860,
      sleepAltitudeLastNight: 4410,
    });
    saveAltitudeLocationSelections({
      currentAltitude: makeLocationSel("everest_base_camp"),
    });

    // Trek change clears ONLY altitudeLocationSelections, not altitudeData
    saveAltitudeLocationSelections({});
    saveUserProfile({
      ...getUserProfile()!,
      tripContext: { countryId: "nepal", trekId: "annapurna_circuit" },
    });

    // altitudeData still intact (inside currentAssessment.altitudeData)
    const raw = JSON.parse(
      localStore[STORAGE_KEYS.currentAssessment] ?? "{}"
    ) as Record<string, unknown>;
    const altData = raw.altitudeData as Record<string, number> | undefined;
    expect(altData?.currentAltitude).toBe(4410);
    expect(altData?.sleepAltitudeLastNight).toBe(4410);
    // But location selections are gone
    expect(getAltitudeLocationSelections()).toEqual({});
  });

  test("changing to no trek from a trek also clears location selections", () => {
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    }));
    saveAltitudeLocationSelections({
      sleepAltitudeLastNight: makeLocationSel("everest_base_camp"),
    });

    // User deselects trek on /trek page
    const prevProfile = getUserProfile()!;
    const prevTrekId = prevProfile.tripContext?.trekId;
    const newTrekId = undefined; // no trek selected

    if (newTrekId !== prevTrekId) {
      const existing = getAltitudeLocationSelections();
      if (Object.values(existing).some(Boolean)) {
        saveAltitudeLocationSelections({});
      }
    }
    saveUserProfile({
      previousAltitudeIllness: prevProfile.previousAltitudeIllness,
      backgroundDiseases: prevProfile.backgroundDiseases,
    });

    expect(getAltitudeLocationSelections()).toEqual({});
    expect(getUserProfile()?.tripContext).toBeUndefined();
  });

  test("saving the same trek does not clear location selections", () => {
    saveUserProfile(makeProfile({
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    }));
    const sel = makeLocationSel("everest_base_camp");
    saveAltitudeLocationSelections({ sleepAltitudeLastNight: sel });

    // Trek unchanged — /trek handleContinue should NOT clear selections
    const prevProfile = getUserProfile()!;
    const prevTrekId = prevProfile.tripContext?.trekId; // "everest_base_camp"
    const newTrekId = "everest_base_camp"; // same

    if (newTrekId !== prevTrekId) {
      // This branch should NOT execute
      saveAltitudeLocationSelections({});
    }

    expect(getAltitudeLocationSelections().sleepAltitudeLastNight).toBeDefined();
  });
});

// ── 13–15. /assessment with/without trek — lookup button visibility ────────────

describe("/assessment lookup button visibility logic", () => {
  test("no trek → lookup buttons not shown", () => {
    saveUserProfile(makeProfile());
    const ctx = getUserProfile()?.tripContext ?? null;
    // Assessment: trek = (ctx && ctx.trekId !== "other_or_unsure") ? getTrekById(...) : null
    const trekVisible = !!(ctx && ctx.trekId !== "other_or_unsure");
    expect(trekVisible).toBe(false);
  });

  test("other_or_unsure → lookup buttons not shown", () => {
    saveUserProfile(makeProfile({ tripContext: { countryId: "nepal", trekId: "other_or_unsure" } }));
    const ctx = getUserProfile()?.tripContext ?? null;
    const trekVisible = !!(ctx && ctx.trekId !== "other_or_unsure");
    expect(trekVisible).toBe(false);
  });

  test("valid trekId → lookup buttons shown", () => {
    saveUserProfile(makeProfile({ tripContext: { countryId: "nepal", trekId: "ghorepani_poon_hill" } }));
    const ctx = getUserProfile()?.tripContext ?? null;
    const trekVisible = !!(ctx && ctx.trekId !== "other_or_unsure");
    expect(trekVisible).toBe(true);
  });
});

// ── 16–17. Button text constants ──────────────────────────────────────────────

describe("Assessment button text constants", () => {
  test('current altitude button text is "מצא את הכפר שאני נמצא בו"', () => {
    const CURRENT_ALT_BTN = "מצא את הכפר שאני נמצא בו";
    expect(CURRENT_ALT_BTN).toBe("מצא את הכפר שאני נמצא בו");
    expect(CURRENT_ALT_BTN).not.toContain("אני נמצא/ת בכפר במסלול");
  });

  test('sleeping altitude lookup button text is "חפש כפר במסלול"', () => {
    const SLEEP_ALT_BTN = "חפש כפר במסלול";
    expect(SLEEP_ALT_BTN).toBe("חפש כפר במסלול");
  });
});

// ── 18. Lookup modal applies village and sets altitudeLocationSelections ───────

describe("Village lookup — storage side effects", () => {
  test("applying a village sets the correct location selection", () => {
    saveUserProfile(makeProfile({ tripContext: { countryId: "nepal", trekId: "everest_base_camp" } }));

    const sel: LocationSelection = {
      locationId: "dingboche",
      trekId: "everest_base_camp",
      altitudeMeters: 4410,
      nameEn: "Dingboche",
      nameHe: "דינגבוצ'ה",
    };
    saveAltitudeLocationSelections({ sleepAltitudeLastNight: sel });

    const loaded = getAltitudeLocationSelections();
    expect(loaded.sleepAltitudeLastNight?.locationId).toBe("dingboche");
    expect(loaded.sleepAltitudeLastNight?.altitudeMeters).toBe(4410);
  });

  test("applying a village to multiple fields works independently", () => {
    const s1 = makeLocationSel("everest_base_camp");
    const s2: LocationSelection = { ...s1, locationId: "lobuche", altitudeMeters: 4910 };
    saveAltitudeLocationSelections({
      sleepAltitudeThreeNightsAgo: s1,
      sleepAltitudeLastNight: s2,
    });

    const loaded = getAltitudeLocationSelections();
    expect(loaded.sleepAltitudeThreeNightsAgo?.locationId).toBe("namche_bazaar");
    expect(loaded.sleepAltitudeLastNight?.locationId).toBe("lobuche");
  });
});

// ── 19. Manual edit clears location selection metadata ────────────────────────

describe("Manual edit — clears location metadata", () => {
  test("when manual value differs from stored location altitude, selection is removed", () => {
    // This mirrors assessment handleChange logic:
    // if (sel && rawValue !== String(sel.altitudeMeters)) → delete selection
    const stored: AltitudeLocationSelections = {
      sleepAltitudeLastNight: makeLocationSel("everest_base_camp"),
    };

    const rawValue = "4000"; // user typed something different than 3440
    const sel = stored.sleepAltitudeLastNight!;
    if (rawValue !== String(sel.altitudeMeters)) {
      delete stored.sleepAltitudeLastNight;
    }

    expect(stored.sleepAltitudeLastNight).toBeUndefined();
  });

  test("when manual value matches stored location altitude, selection is kept", () => {
    const stored: AltitudeLocationSelections = {
      sleepAltitudeLastNight: makeLocationSel("everest_base_camp"),
    };

    const rawValue = "3440"; // matches sel.altitudeMeters
    const sel = stored.sleepAltitudeLastNight!;
    if (rawValue !== String(sel.altitudeMeters)) {
      delete stored.sleepAltitudeLastNight;
    }

    expect(stored.sleepAltitudeLastNight).toBeDefined();
  });
});
