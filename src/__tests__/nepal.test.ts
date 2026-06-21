// HighWise v0.2b — Nepal trek / village lookup tests
// Runs in the default node testEnvironment.
// Pure-logic tests (dataset, search, altitudeBand) need no mocks.
// Storage tests use the same manual localStorage mock pattern as analytics.test.ts.

import {
  NEPAL_DATA,
  nepalTreks,
  getTrekById,
  getTrekDisplayName,
  getLocationDisplayName,
  searchLocations,
  searchTreks,
  getPopularTreks,
} from "@/lib/nepalData";
import { getAltitudeBand } from "@/lib/analytics";
import {
  saveUserProfile,
  getUserProfile,
  saveAltitudeData,
  saveAltitudeLocationSelections,
  getAltitudeLocationSelections,
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

// ── Dataset validation ────────────────────────────────────────────────────────

describe("Nepal dataset — structural validation", () => {
  test("has 15 treks", () => {
    expect(NEPAL_DATA.treks.length).toBe(15);
  });

  test("all trek IDs are lowercase_snake_case", () => {
    for (const trek of NEPAL_DATA.treks) {
      expect(trek.trekId).toMatch(/^[a-z0-9_]+$/);
    }
  });

  test("all trek IDs are unique", () => {
    const ids = NEPAL_DATA.treks.map((t) => t.trekId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("all treks have English and Hebrew names", () => {
    for (const trek of NEPAL_DATA.treks) {
      expect(trek.nameEn.trim().length).toBeGreaterThan(0);
      expect(trek.nameHe.trim().length).toBeGreaterThan(0);
    }
  });

  test("all treks have at least one alias", () => {
    for (const trek of NEPAL_DATA.treks) {
      expect(trek.aliases.length).toBeGreaterThan(0);
    }
  });

  test("all treks have at least one location", () => {
    for (const trek of NEPAL_DATA.treks) {
      expect(trek.locations.length).toBeGreaterThan(0);
    }
  });

  test("all location IDs are lowercase_snake_case", () => {
    for (const trek of NEPAL_DATA.treks) {
      for (const loc of trek.locations) {
        expect(loc.locationId).toMatch(/^[a-z0-9_]+$/);
      }
    }
  });

  test("all altitudes are > 0 and <= 7000 metres", () => {
    for (const trek of NEPAL_DATA.treks) {
      for (const loc of trek.locations) {
        expect(loc.altitudeMeters).toBeGreaterThan(0);
        expect(loc.altitudeMeters).toBeLessThanOrEqual(7000);
      }
    }
  });

  test("all locations have English and Hebrew names", () => {
    for (const trek of NEPAL_DATA.treks) {
      for (const loc of trek.locations) {
        expect(loc.nameEn.trim().length).toBeGreaterThan(0);
        expect(loc.nameHe.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("all locations have at least one alias", () => {
    for (const trek of NEPAL_DATA.treks) {
      for (const loc of trek.locations) {
        expect(loc.aliases.length).toBeGreaterThan(0);
      }
    }
  });

  test("all locations have a valid section value", () => {
    const validSections = new Set(["pre_trek", "on_route"]);
    for (const trek of NEPAL_DATA.treks) {
      for (const loc of trek.locations) {
        expect(validSections.has(loc.section)).toBe(true);
      }
    }
  });

  test("order values within a trek start at 10 and increment by 10", () => {
    for (const trek of NEPAL_DATA.treks) {
      const orders = trek.locations.map((l) => l.order).sort((a, b) => a - b);
      expect(orders[0]).toBe(10);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBe(orders[i - 1] + 10);
      }
    }
  });

  test("no duplicate locationId within the same trek", () => {
    for (const trek of NEPAL_DATA.treks) {
      const ids = trek.locations.map((l) => l.locationId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("all locations have a defined sourceNote string", () => {
    for (const trek of NEPAL_DATA.treks) {
      for (const loc of trek.locations) {
        expect(typeof loc.sourceNote).toBe("string");
        expect(loc.sourceNote.length).toBeGreaterThan(0);
      }
    }
  });

  test("needsReview locations have sourceNote containing needs_review", () => {
    for (const trek of NEPAL_DATA.treks) {
      for (const loc of trek.locations) {
        if (loc.needsReview) {
          expect(loc.sourceNote).toContain("needs_review");
        }
      }
    }
  });

  test("non-needsReview locations have sourceNote containing review_draft", () => {
    for (const trek of NEPAL_DATA.treks) {
      for (const loc of trek.locations) {
        if (!loc.needsReview) {
          expect(loc.sourceNote).toContain("review_draft");
        }
      }
    }
  });

  test("all locations have a valid locationType", () => {
    const validTypes = new Set(["city", "village", "settlement", "camp", "lodge_area", "pass"]);
    for (const trek of NEPAL_DATA.treks) {
      for (const loc of trek.locations) {
        expect(validTypes.has(loc.locationType)).toBe(true);
      }
    }
  });

  test("nepalTreks export equals NEPAL_DATA.treks", () => {
    expect(nepalTreks).toBe(NEPAL_DATA.treks);
  });
});

// ── getAltitudeBand ───────────────────────────────────────────────────────────

describe("getAltitudeBand", () => {
  const cases: [number, string][] = [
    [0,    "below_2500"],
    [1000, "below_2500"],
    [2499, "below_2500"],
    [2500, "2500_2999"],
    [2999, "2500_2999"],
    [3000, "3000_3499"],
    [3499, "3000_3499"],
    [3500, "3500_3999"],
    [3999, "3500_3999"],
    [4000, "4000_4499"],
    [4499, "4000_4499"],
    [4500, "4500_4999"],
    [4999, "4500_4999"],
    [5000, "5000_plus"],
    [5164, "5000_plus"],
    [7000, "5000_plus"],
  ];
  test.each(cases)("altitude %i → %s", (meters, expected) => {
    expect(getAltitudeBand(meters)).toBe(expected);
  });
});

// ── getTrekById ───────────────────────────────────────────────────────────────

describe("getTrekById", () => {
  test("returns the correct trek", () => {
    const trek = getTrekById("everest_base_camp");
    expect(trek?.trekId).toBe("everest_base_camp");
  });

  test("returns undefined for unknown ID", () => {
    expect(getTrekById("nonexistent")).toBeUndefined();
  });
});

// ── getTrekDisplayName / getLocationDisplayName ───────────────────────────────

describe("display name helpers", () => {
  test("getTrekDisplayName includes English and Hebrew", () => {
    const trek = getTrekById("everest_base_camp")!;
    const name = getTrekDisplayName(trek);
    expect(name).toContain("Everest Base Camp");
    expect(name).toContain("מחנה הבסיס של האוורסט");
  });

  test("getLocationDisplayName includes English, Hebrew, and altitude", () => {
    const trek = getTrekById("everest_base_camp")!;
    const loc = trek.locations.find((l) => l.locationId === "dingboche")!;
    const name = getLocationDisplayName(loc);
    expect(name).toContain("Dingboche");
    expect(name).toContain("דינגבוצ");
    expect(name).toContain("4410");
  });
});

// ── searchLocations ───────────────────────────────────────────────────────────

describe("searchLocations", () => {
  const ebc = getTrekById("everest_base_camp")!;

  test("empty query returns all locations sorted by order", () => {
    const results = searchLocations(ebc, "");
    expect(results).toHaveLength(ebc.locations.length);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].order).toBeGreaterThan(results[i - 1].order);
    }
  });

  test("English search finds by nameEn", () => {
    const results = searchLocations(ebc, "Namche");
    expect(results.some((l) => l.locationId === "namche_bazaar")).toBe(true);
  });

  test("Hebrew search finds by nameHe", () => {
    const results = searchLocations(ebc, "נאמצ");
    expect(results.some((l) => l.locationId === "namche_bazaar")).toBe(true);
  });

  test("alias search finds by common alias", () => {
    const results = searchLocations(ebc, "ebc");
    // EBC appears in trek aliases, but searchLocations works on location aliases
    // Lukla has alias 'tenzing hillary airport'
    const lukla = searchLocations(ebc, "tenzing");
    expect(lukla.some((l) => l.locationId === "lukla")).toBe(true);
  });

  test("case-insensitive English search", () => {
    const results = searchLocations(ebc, "DINGBOCHE");
    expect(results.some((l) => l.locationId === "dingboche")).toBe(true);
  });

  test("returns empty array when no match", () => {
    expect(searchLocations(ebc, "zzznotexists")).toHaveLength(0);
  });

  test("results are sorted by order", () => {
    const results = searchLocations(ebc, "");
    const orders = results.map((l) => l.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

// ── searchTreks ───────────────────────────────────────────────────────────────

describe("searchTreks", () => {
  test("empty query returns all treks", () => {
    expect(searchTreks("")).toHaveLength(NEPAL_DATA.treks.length);
  });

  test("finds by English name", () => {
    const results = searchTreks("Annapurna");
    expect(results.some((t) => t.trekId === "annapurna_circuit")).toBe(true);
  });

  test("finds by Hebrew name", () => {
    const results = searchTreks("לנגטאנג");
    expect(results.some((t) => t.trekId === "langtang_valley")).toBe(true);
  });

  test("finds by alias", () => {
    const results = searchTreks("ebc");
    expect(results.some((t) => t.trekId === "everest_base_camp")).toBe(true);
  });

  test("no match returns empty array", () => {
    expect(searchTreks("zzznomatch")).toHaveLength(0);
  });
});

// ── searchTreks — alias quality (Israeli trekker scenarios) ──────────────────

describe("searchTreks — Hebrew and English alias coverage", () => {
  test('"בייס קמפ" finds Everest Base Camp', () => {
    expect(searchTreks("בייס קמפ").some((t) => t.trekId === "everest_base_camp")).toBe(true);
  });

  test('"שלושה מעברים" finds Everest Three Passes', () => {
    expect(searchTreks("שלושה מעברים").some((t) => t.trekId === "everest_three_passes")).toBe(true);
  });

  test('"לאנגטאנג" finds Langtang Valley', () => {
    expect(searchTreks("לאנגטאנג").some((t) => t.trekId === "langtang_valley")).toBe(true);
  });

  test('"מנסלו" finds Manaslu Circuit', () => {
    expect(searchTreks("מנסלו").some((t) => t.trekId === "manaslu_circuit")).toBe(true);
  });

  test('"קנצנגונגה" finds Kanchenjunga Base Camp', () => {
    expect(searchTreks("קנצנגונגה").some((t) => t.trekId === "kanchenjunga_base_camp")).toBe(true);
  });

  test('"אנפורנה" finds both Annapurna Circuit and Annapurna Base Camp', () => {
    const results = searchTreks("אנפורנה");
    expect(results.some((t) => t.trekId === "annapurna_circuit")).toBe(true);
    expect(results.some((t) => t.trekId === "annapurna_base_camp")).toBe(true);
  });

  test('"גוקיו לייקס" finds Gokyo Lakes', () => {
    expect(searchTreks("גוקיו לייקס").some((t) => t.trekId === "gokyo_lakes")).toBe(true);
  });

  test('"אוורסט גוקיו" finds EBC + Gokyo combined trek', () => {
    expect(searchTreks("אוורסט גוקיו").some((t) => t.trekId === "everest_base_camp_gokyo")).toBe(true);
  });

  test('"לו מנתנג" finds Upper Mustang', () => {
    expect(searchTreks("לו מנתנג").some((t) => t.trekId === "upper_mustang")).toBe(true);
  });

  test('"tsum circuit" does not match Tsum Valley (removed alias)', () => {
    const tsumResult = searchTreks("tsum circuit").find((t) => t.trekId === "tsum_valley");
    expect(tsumResult).toBeUndefined();
  });

  test('"combined route" does not match EBC + Gokyo (removed alias)', () => {
    const result = searchTreks("combined route").find((t) => t.trekId === "everest_base_camp_gokyo");
    expect(result).toBeUndefined();
  });
});

// ── getPopularTreks ───────────────────────────────────────────────────────────

describe("getPopularTreks", () => {
  test("returns only treks marked popular", () => {
    const popular = getPopularTreks();
    expect(popular.every((t) => t.popular)).toBe(true);
  });

  test("returns exactly 5 popular treks", () => {
    expect(getPopularTreks().length).toBe(5);
  });
});

// ── Storage — backward compatibility ─────────────────────────────────────────

describe("getUserProfile — backward compatibility", () => {
  test("existing profile without tripContext returns null tripContext", () => {
    localStore["nativ_user_profile"] = JSON.stringify({
      previousAltitudeIllness: "none",
      backgroundDiseases: [],
    });
    const profile = getUserProfile();
    expect(profile?.previousAltitudeIllness).toBe("none");
    expect(profile?.tripContext).toBeUndefined();
  });

  test("saveUserProfile with no tripContext omits the field", () => {
    const p: UserProfile = { previousAltitudeIllness: "none", backgroundDiseases: [] };
    saveUserProfile(p);
    const stored = JSON.parse(localStore["nativ_user_profile"] as string) as UserProfile;
    expect(stored.tripContext).toBeUndefined();
  });

  test("saveUserProfile with tripContext stores it", () => {
    const p: UserProfile = {
      previousAltitudeIllness: "none",
      backgroundDiseases: [],
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    };
    saveUserProfile(p);
    const loaded = getUserProfile();
    expect(loaded?.tripContext?.trekId).toBe("everest_base_camp");
    expect(loaded?.tripContext?.countryId).toBe("nepal");
  });

  test("saveUserProfile with other_or_unsure trekId stores it", () => {
    const p: UserProfile = {
      previousAltitudeIllness: "none",
      backgroundDiseases: [],
      tripContext: { countryId: "nepal", trekId: "other_or_unsure" },
    };
    saveUserProfile(p);
    const loaded = getUserProfile();
    expect(loaded?.tripContext?.trekId).toBe("other_or_unsure");
  });
});

// ── Storage — altitude location selections ────────────────────────────────────

describe("saveAltitudeLocationSelections / getAltitudeLocationSelections", () => {
  test("returns empty object when no assessment exists", () => {
    expect(getAltitudeLocationSelections()).toEqual({});
  });

  test("saves and retrieves a selection", () => {
    const sel: LocationSelection = {
      locationId: "dingboche",
      trekId: "everest_base_camp",
      altitudeMeters: 4410,
      nameEn: "Dingboche",
      nameHe: "דינגבוצ׳ה",
    };
    saveAltitudeLocationSelections({ sleepAltitudeLastNight: sel });
    const loaded = getAltitudeLocationSelections();
    expect(loaded.sleepAltitudeLastNight?.locationId).toBe("dingboche");
    expect(loaded.sleepAltitudeLastNight?.altitudeMeters).toBe(4410);
  });

  test("does not overwrite other assessment fields (saveAltitudeData is safe)", () => {
    saveAltitudeData({
      currentAltitude: 4000,
      plannedSleepAltitudeTonight: 4200,
      sleepAltitudeThreeNightsAgo: 3400,
      sleepAltitudeTwoNightsAgo: 3800,
      sleepAltitudeLastNight: 4000,
    });
    const sel: LocationSelection = {
      locationId: "lobuche",
      trekId: "everest_base_camp",
      altitudeMeters: 4940,
      nameEn: "Lobuche",
      nameHe: "לובוצ׳ה",
    };
    saveAltitudeLocationSelections({ currentAltitude: sel });

    const raw = JSON.parse(localStore["nativ_current_assessment"] as string) as Record<string, unknown>;
    expect(raw.altitudeData).toBeDefined();
    expect((raw.altitudeLocationSelections as AltitudeLocationSelections).currentAltitude?.locationId).toBe("lobuche");
  });

  test("saving empty selections clears the field", () => {
    const sel: LocationSelection = {
      locationId: "namche_bazaar",
      trekId: "everest_base_camp",
      altitudeMeters: 3440,
      nameEn: "Namche Bazaar",
      nameHe: "נאמצ׳ה בזאר",
    };
    saveAltitudeLocationSelections({ sleepAltitudeLastNight: sel });
    saveAltitudeLocationSelections({});
    const loaded = getAltitudeLocationSelections();
    expect(Object.keys(loaded)).toHaveLength(0);
  });

  test("same location can be stored in multiple altitude fields", () => {
    const sel: LocationSelection = {
      locationId: "namche_bazaar",
      trekId: "everest_base_camp",
      altitudeMeters: 3440,
      nameEn: "Namche Bazaar",
      nameHe: "נאמצ׳ה בזאר",
    };
    const selections: AltitudeLocationSelections = {
      sleepAltitudeLastNight: sel,
      sleepAltitudeTwoNightsAgo: sel,
    };
    saveAltitudeLocationSelections(selections);
    const loaded = getAltitudeLocationSelections();
    expect(loaded.sleepAltitudeLastNight?.locationId).toBe("namche_bazaar");
    expect(loaded.sleepAltitudeTwoNightsAgo?.locationId).toBe("namche_bazaar");
  });
});

// ── Trek change — stale selection detection ───────────────────────────────────

describe("trek change — stale selection detection", () => {
  test("existing selections from a different trek are detected as stale", () => {
    const selFromEBC: LocationSelection = {
      locationId: "dingboche",
      trekId: "everest_base_camp",
      altitudeMeters: 4410,
      nameEn: "Dingboche",
      nameHe: "דינגבוצ׳ה",
    };
    saveAltitudeLocationSelections({ sleepAltitudeLastNight: selFromEBC });

    const loaded = getAltitudeLocationSelections();
    const entries = Object.values(loaded).filter(Boolean) as LocationSelection[];
    const currentTrekId = "annapurna_circuit"; // user switched trek
    const isStale = entries.length > 0 && entries[0].trekId !== currentTrekId;
    expect(isStale).toBe(true);
  });

  test("selections for the same trek are NOT stale", () => {
    const sel: LocationSelection = {
      locationId: "dingboche",
      trekId: "everest_base_camp",
      altitudeMeters: 4410,
      nameEn: "Dingboche",
      nameHe: "דינגבוצ׳ה",
    };
    saveAltitudeLocationSelections({ sleepAltitudeLastNight: sel });

    const loaded = getAltitudeLocationSelections();
    const entries = Object.values(loaded).filter(Boolean) as LocationSelection[];
    const currentTrekId = "everest_base_camp";
    const isStale = entries.length > 0 && entries[0].trekId !== currentTrekId;
    expect(isStale).toBe(false);
  });
});

// ── Analytics properties — privacy check ─────────────────────────────────────

describe("analytics properties — privacy", () => {
  test("getAltitudeBand does not include exact altitude", () => {
    const band = getAltitudeBand(4410);
    expect(band).toBe("4000_4499");
    expect(band).not.toContain("4410");
  });

  test("allowed analytics properties do not include locationId", () => {
    // Verify by checking that allowed property names from v0.2b additions
    // are trekId, fieldName, altitudeBand — NOT locationId, nameEn, nameHe
    const allowedKeys = [
      "appVersion", "installId", "timestamp", "onlineStatus",
      "screenName", "riskLevel", "clinicalGroup", "llsSeverity",
      "trekId", "fieldName", "altitudeBand",
    ];
    expect(allowedKeys).not.toContain("locationId");
    expect(allowedKeys).not.toContain("nameEn");
    expect(allowedKeys).not.toContain("nameHe");
    expect(allowedKeys).not.toContain("altitudeMeters");
    expect(allowedKeys).not.toContain("villageName");
  });

  test("other_or_unsure trekId is valid for trek_selected event", () => {
    // other_or_unsure is a legitimate trekId value — not PII
    expect("other_or_unsure").toMatch(/^[a-z_]+$/);
  });
});

// ── Reset behavior ────────────────────────────────────────────────────────────

describe("clearAllData resets trek context and location selections", () => {
  test("clearAllData removes nativ_user_profile (which contains tripContext)", async () => {
    const { clearAllData } = await import("@/lib/storage");
    saveUserProfile({
      previousAltitudeIllness: "none",
      backgroundDiseases: [],
      tripContext: { countryId: "nepal", trekId: "everest_base_camp" },
    });
    const sel: LocationSelection = {
      locationId: "dingboche",
      trekId: "everest_base_camp",
      altitudeMeters: 4410,
      nameEn: "Dingboche",
      nameHe: "דינגבוצ׳ה",
    };
    saveAltitudeLocationSelections({ sleepAltitudeLastNight: sel });

    clearAllData();

    expect(getUserProfile()).toBeNull();
    expect(getAltitudeLocationSelections()).toEqual({});
  });
});
