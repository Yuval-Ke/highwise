// HighWise v0.2b — Nepal trek dataset
// STATUS: FULL DATASET — 15 treks, 322 locations.
// review_draft: approximate altitudes; manually reviewed before production.

export type NLocation = {
  locationId: string;
  nameEn: string;
  nameHe: string;
  aliases: string[];
  altitudeMeters: number;
  order: number;
  section: "pre_trek" | "on_route";
  locationType: "city" | "village" | "settlement" | "camp" | "lodge_area" | "pass";
  needsReview?: boolean;
  sourceNote: string;
};

export type NTrek = {
  trekId: string;
  nameEn: string;
  nameHe: string;
  region: string;
  aliases: string[];
  popular: boolean;
  locations: NLocation[];
};

export type NCountry = {
  countryId: "nepal";
  nameEn: string;
  nameHe: string;
  treks: NTrek[];
};

const RD = "review_draft; approximate altitude; verify before production";
const NR = "needs_review; possible overnight/camp or route variation; verify before production";

export const NEPAL_DATA: NCountry = {
  countryId: "nepal",
  nameEn: "Nepal",
  nameHe: "נפאל",
  treks: [
    // ── 1. Everest Base Camp ─────────────────────────────────────────────────
    {
      trekId: "everest_base_camp",
      nameEn: "Everest Base Camp",
      nameHe: "מחנה הבסיס של האוורסט",
      region: "Everest region",
      aliases: ["ebc", "everest", "אוורסט", "base camp", "מחנה בסיס", "khumbu", "בייס קמפ"],
      popular: true,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "lukla", nameEn: "Lukla", nameHe: "לוקלה", aliases: ["לוקלא", "lukla airport", "tenzing hillary airport", "luka"], altitudeMeters: 2860, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "cheplung", nameEn: "Cheplung", nameHe: "צ'פלונג", aliases: ["chheplung", "cheplung village"], altitudeMeters: 2660, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghat", nameEn: "Ghat", nameHe: "גאט", aliases: ["ghat village", "ebc ghat"], altitudeMeters: 2530, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "phakding", nameEn: "Phakding", nameHe: "פקדינג", aliases: ["פאקדינג", "fakding"], altitudeMeters: 2610, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "toktok", nameEn: "Toktok", nameHe: "טוקטוק", aliases: ["tok tok"], altitudeMeters: 2760, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "benkar", nameEn: "Benkar", nameHe: "בנקר", aliases: ["benkar village"], altitudeMeters: 2630, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "monjo", nameEn: "Monjo", nameHe: "מונג'ו", aliases: ["מונגו", "monjo village"], altitudeMeters: 2835, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "jorsalle", nameEn: "Jorsalle", nameHe: "ג'ורסאל", aliases: ["jorsale", "ג'ורסל"], altitudeMeters: 2740, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "namche_bazaar", nameEn: "Namche Bazaar", nameHe: "נאמצ'ה בזאר", aliases: ["namche", "נאמצ'ה", "namche bazar"], altitudeMeters: 3440, order: 100, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "khumjung", nameEn: "Khumjung", nameHe: "חומג'ונג", aliases: ["khumjung village", "חומג'ונג"], altitudeMeters: 3790, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "khunde", nameEn: "Khunde", nameHe: "חונדה", aliases: ["kunde", "khunde village"], altitudeMeters: 3840, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "hotel_everest_view", nameEn: "Hotel Everest View", nameHe: "מלון נוף האוורסט", aliases: ["syangboche", "everest view hotel", "סיאנגבוצ'ה"], altitudeMeters: 3880, order: 130, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "tengboche", nameEn: "Tengboche", nameHe: "טנגבוצ'ה", aliases: ["tyangboche", "tengboche monastery", "טנגבוצ'ה"], altitudeMeters: 3860, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "deboche", nameEn: "Deboche", nameHe: "דבוצ'ה", aliases: ["devoche", "דבוצ'ה"], altitudeMeters: 3700, order: 150, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "pangboche", nameEn: "Pangboche", nameHe: "פנגבוצ'ה", aliases: ["פנגבוצ'ה", "pangboche village"], altitudeMeters: 3930, order: 160, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "shomare", nameEn: "Shomare", nameHe: "שומארה", aliases: ["somare", "שומרה"], altitudeMeters: 4010, order: 170, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "orsho", nameEn: "Orsho", nameHe: "אורשו", aliases: ["orsho settlement"], altitudeMeters: 4190, order: 180, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dingboche", nameEn: "Dingboche", nameHe: "דינגבוצ'ה", aliases: ["דינגבוצ'ה", "dingbuche"], altitudeMeters: 4410, order: 190, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "pheriche", nameEn: "Pheriche", nameHe: "פריצ'ה", aliases: ["פריצ'ה", "periche"], altitudeMeters: 4240, order: 200, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dughla", nameEn: "Dughla", nameHe: "דוגלה", aliases: ["thukla", "dughla pass", "טוקלה"], altitudeMeters: 4620, order: 210, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "lobuche", nameEn: "Lobuche", nameHe: "לובוצ'ה", aliases: ["לובוצ'ה", "lubuche"], altitudeMeters: 4910, order: 220, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "gorak_shep", nameEn: "Gorak Shep", nameHe: "גורק שפ", aliases: ["gorakshep", "גורק-שפ"], altitudeMeters: 5164, order: 230, section: "on_route", locationType: "lodge_area", sourceNote: RD },
      ],
    },

    // ── 2. Everest Three Passes ──────────────────────────────────────────────
    {
      trekId: "everest_three_passes",
      nameEn: "Everest Three Passes",
      nameHe: "שלושת המעברים של האוורסט",
      region: "Everest region",
      aliases: ["three passes", "3 passes", "שלושת המעברים", "שלושה מעברים", "kongma la", "cho la", "renjo la"],
      popular: false,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "lukla", nameEn: "Lukla", nameHe: "לוקלה", aliases: ["לוקלא", "lukla airport", "tenzing hillary airport"], altitudeMeters: 2860, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "cheplung", nameEn: "Cheplung", nameHe: "צ'פלונג", aliases: ["chheplung", "cheplung village"], altitudeMeters: 2660, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghat", nameEn: "Ghat", nameHe: "גאט", aliases: ["ghat village"], altitudeMeters: 2530, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "phakding", nameEn: "Phakding", nameHe: "פקדינג", aliases: ["פאקדינג", "fakding"], altitudeMeters: 2610, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "toktok", nameEn: "Toktok", nameHe: "טוקטוק", aliases: ["tok tok"], altitudeMeters: 2760, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "benkar", nameEn: "Benkar", nameHe: "בנקר", aliases: ["benkar village"], altitudeMeters: 2630, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "monjo", nameEn: "Monjo", nameHe: "מונג'ו", aliases: ["מונגו", "monjo village"], altitudeMeters: 2835, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "jorsalle", nameEn: "Jorsalle", nameHe: "ג'ורסאל", aliases: ["jorsale", "ג'ורסל"], altitudeMeters: 2740, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "namche_bazaar", nameEn: "Namche Bazaar", nameHe: "נאמצ'ה בזאר", aliases: ["namche", "נאמצ'ה", "namche bazar"], altitudeMeters: 3440, order: 100, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "khumjung", nameEn: "Khumjung", nameHe: "חומג'ונג", aliases: ["khumjung village"], altitudeMeters: 3790, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "khunde", nameEn: "Khunde", nameHe: "חונדה", aliases: ["kunde", "khunde village"], altitudeMeters: 3840, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "hotel_everest_view", nameEn: "Hotel Everest View", nameHe: "מלון נוף האוורסט", aliases: ["syangboche", "everest view hotel", "סיאנגבוצ'ה"], altitudeMeters: 3880, order: 130, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "thame", nameEn: "Thame", nameHe: "תאמה", aliases: ["thame village", "תאמה"], altitudeMeters: 3800, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "marlung", nameEn: "Marlung", nameHe: "מרלונג", aliases: ["marlung lodge"], altitudeMeters: 4210, order: 150, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "lungden", nameEn: "Lungden", nameHe: "לונגדן", aliases: ["lumde", "lungden village"], altitudeMeters: 4380, order: 160, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "gokyo", nameEn: "Gokyo", nameHe: "גוקיו", aliases: ["gokyo village", "gokyo lake"], altitudeMeters: 4790, order: 170, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "na_village", nameEn: "Na Village", nameHe: "נה", aliases: ["na", "na village khumbu"], altitudeMeters: 4400, order: 180, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "machhermo", nameEn: "Machhermo", nameHe: "מצ'רמו", aliases: ["machermo", "מצ'רמו"], altitudeMeters: 4470, order: 190, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "luza", nameEn: "Luza", nameHe: "לוזה", aliases: ["luza lodge"], altitudeMeters: 4360, order: 200, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "dole", nameEn: "Dole", nameHe: "דולה", aliases: ["dole lodge", "דולה"], altitudeMeters: 4200, order: 210, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "phortse_thanga", nameEn: "Phortse Thanga", nameHe: "פורצה תנגה", aliases: ["phortse thanga", "פורצ'ה תנגה"], altitudeMeters: 3680, order: 220, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "phortse", nameEn: "Phortse", nameHe: "פורצה", aliases: ["phortse village", "פורצ'ה"], altitudeMeters: 3810, order: 230, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "thagnak", nameEn: "Thagnak", nameHe: "תגנק", aliases: ["dragnag", "thagnak lodge"], altitudeMeters: 4700, order: 240, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "dzongla", nameEn: "Dzongla", nameHe: "דזונגלה", aliases: ["dzongla lodge", "דזונגלה"], altitudeMeters: 4830, order: 250, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "lobuche", nameEn: "Lobuche", nameHe: "לובוצ'ה", aliases: ["לובוצ'ה", "lubuche"], altitudeMeters: 4910, order: 260, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "gorak_shep", nameEn: "Gorak Shep", nameHe: "גורק שפ", aliases: ["gorakshep", "גורק-שפ"], altitudeMeters: 5164, order: 270, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "chhukung", nameEn: "Chhukung", nameHe: "צ'וקונג", aliases: ["chukung", "chhukung valley"], altitudeMeters: 4730, order: 280, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "dingboche", nameEn: "Dingboche", nameHe: "דינגבוצ'ה", aliases: ["דינגבוצ'ה", "dingbuche"], altitudeMeters: 4410, order: 290, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "pheriche", nameEn: "Pheriche", nameHe: "פריצ'ה", aliases: ["פריצ'ה", "periche"], altitudeMeters: 4240, order: 300, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dughla", nameEn: "Dughla", nameHe: "דוגלה", aliases: ["thukla", "טוקלה"], altitudeMeters: 4620, order: 310, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "shomare", nameEn: "Shomare", nameHe: "שומארה", aliases: ["somare", "שומרה"], altitudeMeters: 4010, order: 320, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "pangboche", nameEn: "Pangboche", nameHe: "פנגבוצ'ה", aliases: ["pangboche village"], altitudeMeters: 3930, order: 330, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "deboche", nameEn: "Deboche", nameHe: "דבוצ'ה", aliases: ["devoche"], altitudeMeters: 3700, order: 340, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tengboche", nameEn: "Tengboche", nameHe: "טנגבוצ'ה", aliases: ["tyangboche", "tengboche monastery"], altitudeMeters: 3860, order: 350, section: "on_route", locationType: "village", sourceNote: RD },
      ],
    },

    // ── 3. Gokyo Lakes ──────────────────────────────────────────────────────
    {
      trekId: "gokyo_lakes",
      nameEn: "Gokyo Lakes",
      nameHe: "אגמי גוקיו",
      region: "Everest region",
      aliases: ["gokyo", "גוקיו", "everest gokyo lakes", "גוקיו לייקס"],
      popular: true,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "lukla", nameEn: "Lukla", nameHe: "לוקלה", aliases: ["לוקלא", "lukla airport", "tenzing hillary airport"], altitudeMeters: 2860, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "cheplung", nameEn: "Cheplung", nameHe: "צ'פלונג", aliases: ["chheplung"], altitudeMeters: 2660, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghat", nameEn: "Ghat", nameHe: "גאט", aliases: ["ghat village"], altitudeMeters: 2530, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "phakding", nameEn: "Phakding", nameHe: "פקדינג", aliases: ["פאקדינג", "fakding"], altitudeMeters: 2610, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "toktok", nameEn: "Toktok", nameHe: "טוקטוק", aliases: ["tok tok"], altitudeMeters: 2760, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "benkar", nameEn: "Benkar", nameHe: "בנקר", aliases: ["benkar village"], altitudeMeters: 2630, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "monjo", nameEn: "Monjo", nameHe: "מונג'ו", aliases: ["מונגו", "monjo village"], altitudeMeters: 2835, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "jorsalle", nameEn: "Jorsalle", nameHe: "ג'ורסאל", aliases: ["jorsale"], altitudeMeters: 2740, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "namche_bazaar", nameEn: "Namche Bazaar", nameHe: "נאמצ'ה בזאר", aliases: ["namche", "נאמצ'ה", "namche bazar"], altitudeMeters: 3440, order: 100, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "khumjung", nameEn: "Khumjung", nameHe: "חומג'ונג", aliases: ["khumjung village"], altitudeMeters: 3790, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "mong_la", nameEn: "Mong La", nameHe: "מונג לה", aliases: ["mongla", "mong la viewpoint"], altitudeMeters: 3975, order: 120, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "phortse_thanga", nameEn: "Phortse Thanga", nameHe: "פורצה תנגה", aliases: ["phortse thanga"], altitudeMeters: 3680, order: 130, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "dole", nameEn: "Dole", nameHe: "דולה", aliases: ["dole lodge"], altitudeMeters: 4200, order: 140, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "luza", nameEn: "Luza", nameHe: "לוזה", aliases: ["luza lodge"], altitudeMeters: 4360, order: 150, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "machhermo", nameEn: "Machhermo", nameHe: "מצ'רמו", aliases: ["machermo"], altitudeMeters: 4470, order: 160, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "na_village", nameEn: "Na Village", nameHe: "נה", aliases: ["na", "na village khumbu"], altitudeMeters: 4400, order: 170, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "gokyo", nameEn: "Gokyo", nameHe: "גוקיו", aliases: ["gokyo village", "gokyo lake"], altitudeMeters: 4790, order: 180, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "thagnak", nameEn: "Thagnak", nameHe: "תגנק", aliases: ["dragnag"], altitudeMeters: 4700, order: 190, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "lungden", nameEn: "Lungden", nameHe: "לונגדן", aliases: ["lumde", "lungden camp"], altitudeMeters: 4380, order: 200, section: "on_route", locationType: "lodge_area", sourceNote: RD },
      ],
    },

    // ── 4. Everest Base Camp + Gokyo ────────────────────────────────────────
    {
      trekId: "everest_base_camp_gokyo",
      nameEn: "Everest Base Camp + Gokyo",
      nameHe: "מחנה הבסיס של האוורסט + גוקיו",
      region: "Everest region",
      aliases: ["ebc gokyo", "ebc+gokyo", "everest gokyo route", "אוורסט גוקיו"],
      popular: false,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "lukla", nameEn: "Lukla", nameHe: "לוקלה", aliases: ["לוקלא", "lukla airport"], altitudeMeters: 2860, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "cheplung", nameEn: "Cheplung", nameHe: "צ'פלונג", aliases: ["chheplung"], altitudeMeters: 2660, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghat", nameEn: "Ghat", nameHe: "גאט", aliases: ["ghat village"], altitudeMeters: 2530, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "phakding", nameEn: "Phakding", nameHe: "פקדינג", aliases: ["פאקדינג", "fakding"], altitudeMeters: 2610, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "toktok", nameEn: "Toktok", nameHe: "טוקטוק", aliases: ["tok tok"], altitudeMeters: 2760, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "benkar", nameEn: "Benkar", nameHe: "בנקר", aliases: ["benkar village"], altitudeMeters: 2630, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "monjo", nameEn: "Monjo", nameHe: "מונג'ו", aliases: ["מונגו", "monjo village"], altitudeMeters: 2835, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "jorsalle", nameEn: "Jorsalle", nameHe: "ג'ורסאל", aliases: ["jorsale"], altitudeMeters: 2740, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "namche_bazaar", nameEn: "Namche Bazaar", nameHe: "נאמצ'ה בזאר", aliases: ["namche", "נאמצ'ה", "namche bazar"], altitudeMeters: 3440, order: 100, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "khumjung", nameEn: "Khumjung", nameHe: "חומג'ונג", aliases: ["khumjung village"], altitudeMeters: 3790, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "khunde", nameEn: "Khunde", nameHe: "חונדה", aliases: ["kunde"], altitudeMeters: 3840, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "hotel_everest_view", nameEn: "Hotel Everest View", nameHe: "מלון נוף האוורסט", aliases: ["syangboche", "everest view hotel"], altitudeMeters: 3880, order: 130, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "tengboche", nameEn: "Tengboche", nameHe: "טנגבוצ'ה", aliases: ["tyangboche", "tengboche monastery"], altitudeMeters: 3860, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "deboche", nameEn: "Deboche", nameHe: "דבוצ'ה", aliases: ["devoche"], altitudeMeters: 3700, order: 150, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "pangboche", nameEn: "Pangboche", nameHe: "פנגבוצ'ה", aliases: ["pangboche village"], altitudeMeters: 3930, order: 160, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "shomare", nameEn: "Shomare", nameHe: "שומארה", aliases: ["somare"], altitudeMeters: 4010, order: 170, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "orsho", nameEn: "Orsho", nameHe: "אורשו", aliases: ["orsho settlement"], altitudeMeters: 4190, order: 180, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dingboche", nameEn: "Dingboche", nameHe: "דינגבוצ'ה", aliases: ["דינגבוצ'ה", "dingbuche"], altitudeMeters: 4410, order: 190, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "pheriche", nameEn: "Pheriche", nameHe: "פריצ'ה", aliases: ["periche"], altitudeMeters: 4240, order: 200, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dughla", nameEn: "Dughla", nameHe: "דוגלה", aliases: ["thukla"], altitudeMeters: 4620, order: 210, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "lobuche", nameEn: "Lobuche", nameHe: "לובוצ'ה", aliases: ["לובוצ'ה", "lubuche"], altitudeMeters: 4910, order: 220, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "gorak_shep", nameEn: "Gorak Shep", nameHe: "גורק שפ", aliases: ["gorakshep", "גורק-שפ"], altitudeMeters: 5164, order: 230, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "dzongla", nameEn: "Dzongla", nameHe: "דזונגלה", aliases: ["dzongla lodge"], altitudeMeters: 4830, order: 240, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "thagnak", nameEn: "Thagnak", nameHe: "תגנק", aliases: ["dragnag"], altitudeMeters: 4700, order: 250, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "gokyo", nameEn: "Gokyo", nameHe: "גוקיו", aliases: ["gokyo village", "gokyo lake"], altitudeMeters: 4790, order: 260, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "na_village", nameEn: "Na Village", nameHe: "נה", aliases: ["na", "na village khumbu"], altitudeMeters: 4400, order: 270, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "machhermo", nameEn: "Machhermo", nameHe: "מצ'רמו", aliases: ["machermo"], altitudeMeters: 4470, order: 280, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "luza", nameEn: "Luza", nameHe: "לוזה", aliases: ["luza lodge"], altitudeMeters: 4360, order: 290, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "dole", nameEn: "Dole", nameHe: "דולה", aliases: ["dole lodge"], altitudeMeters: 4200, order: 300, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "phortse_thanga", nameEn: "Phortse Thanga", nameHe: "פורצה תנגה", aliases: ["phortse thanga"], altitudeMeters: 3680, order: 310, section: "on_route", locationType: "lodge_area", sourceNote: RD },
      ],
    },

    // ── 5. Annapurna Circuit ─────────────────────────────────────────────────
    {
      trekId: "annapurna_circuit",
      nameEn: "Annapurna Circuit",
      nameHe: "סובב אנאפורנה",
      region: "Annapurna region",
      aliases: ["ac", "annapurna", "אנאפורנה", "אנפורנה", "סובב אנאפורנה", "manang", "thorong la"],
      popular: true,
      locations: [
        { locationId: "kathmandu_ac", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "pokhara", nameEn: "Pokhara", nameHe: "פוקהרה", aliases: ["פוקארה", "pokhara city", "pokhara lakeside"], altitudeMeters: 820, order: 20, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "besisahar", nameEn: "Besisahar", nameHe: "בסיסאהר", aliases: ["besishahar", "בסיסהר", "besi sahar"], altitudeMeters: 760, order: 30, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "bhulbhule", nameEn: "Bhulbhule", nameHe: "בולבולה", aliases: ["bhulbhule village"], altitudeMeters: 840, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ngadi", nameEn: "Ngadi", nameHe: "נגדי", aliases: ["ngadi village"], altitudeMeters: 930, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "syange", nameEn: "Syange", nameHe: "סיאנגה", aliases: ["syanqe", "syanghe"], altitudeMeters: 1100, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "jagat", nameEn: "Jagat", nameHe: "ג'גט", aliases: ["jagat village", "ג'גת"], altitudeMeters: 1300, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chamje", nameEn: "Chamje", nameHe: "צ'אמג'ה", aliases: ["chhamje", "chamje village"], altitudeMeters: 1430, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tal", nameEn: "Tal", nameHe: "טאל", aliases: ["tal village"], altitudeMeters: 1700, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dharapani", nameEn: "Dharapani", nameHe: "דהראפאני", aliases: ["dharapani village"], altitudeMeters: 1860, order: 100, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "danaqyu", nameEn: "Danaqyu", nameHe: "דאנקיו", aliases: ["danaque", "danakyu"], altitudeMeters: 2200, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "timang", nameEn: "Timang", nameHe: "טימנג", aliases: ["timang village"], altitudeMeters: 2750, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chame", nameEn: "Chame", nameHe: "צ'מה", aliases: ["צ'מה", "chhame"], altitudeMeters: 2670, order: 130, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "lower_pisang", nameEn: "Lower Pisang", nameHe: "לואר פיסאנג", aliases: ["pisang", "lower pisang village"], altitudeMeters: 3200, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "upper_pisang", nameEn: "Upper Pisang", nameHe: "אפר פיסאנג", aliases: ["upper pisang village", "pisang upper"], altitudeMeters: 3300, order: 150, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghyaru", nameEn: "Ghyaru", nameHe: "גיארו", aliases: ["gyaru", "ghyaru village"], altitudeMeters: 3730, order: 160, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ngawal", nameEn: "Ngawal", nameHe: "נגאוואל", aliases: ["ngawal village"], altitudeMeters: 3660, order: 170, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "braga", nameEn: "Braga", nameHe: "בראגה", aliases: ["braka", "braga village"], altitudeMeters: 3440, order: 180, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "manang", nameEn: "Manang", nameHe: "מאנאנג", aliases: ["מנאנג", "manang village"], altitudeMeters: 3540, order: 190, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "khangsar", nameEn: "Khangsar", nameHe: "חנגסר", aliases: ["khangsar village"], altitudeMeters: 3745, order: 200, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "shree_kharka", nameEn: "Shree Kharka", nameHe: "שרי חרקה", aliases: ["shri kharka", "shree kharka camp"], altitudeMeters: 4070, order: 210, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "tilicho_base_camp", nameEn: "Tilicho Base Camp", nameHe: "מחנה הבסיס של טיליצ'ו", aliases: ["tilicho bc", "tilicho camp"], altitudeMeters: 4150, order: 220, section: "on_route", locationType: "camp", needsReview: true, sourceNote: NR },
        { locationId: "yak_kharka", nameEn: "Yak Kharka", nameHe: "יאק חרקה", aliases: ["yak-kharka", "יאק-חרקה"], altitudeMeters: 4050, order: 230, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "ledar", nameEn: "Ledar", nameHe: "לדר", aliases: ["ledar camp", "leydar"], altitudeMeters: 4200, order: 240, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "thorong_phedi", nameEn: "Thorong Phedi", nameHe: "תורונג פדי", aliases: ["phedi", "thorong base"], altitudeMeters: 4450, order: 250, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "thorong_high_camp", nameEn: "Thorong High Camp", nameHe: "מחנה גבוה תורונג", aliases: ["high camp thorong", "thorong la camp"], altitudeMeters: 4850, order: 260, section: "on_route", locationType: "camp", needsReview: true, sourceNote: NR },
        { locationId: "muktinath", nameEn: "Muktinath", nameHe: "מוקטינאת", aliases: ["muktinath temple", "מוקטינת", "mukthinath"], altitudeMeters: 3760, order: 270, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "kagbeni", nameEn: "Kagbeni", nameHe: "קאגבני", aliases: ["kagbeni village"], altitudeMeters: 2800, order: 280, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "jomsom", nameEn: "Jomsom", nameHe: "ג'ומסום", aliases: ["jomosom", "ג'ומסום", "jomsom bazaar"], altitudeMeters: 2720, order: 290, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "marpha", nameEn: "Marpha", nameHe: "מרפה", aliases: ["marpha village"], altitudeMeters: 2670, order: 300, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tatopani", nameEn: "Tatopani", nameHe: "טטופאני", aliases: ["tato pani", "tatopani village"], altitudeMeters: 1190, order: 310, section: "on_route", locationType: "village", sourceNote: RD },
      ],
    },

    // ── 6. Annapurna Base Camp ───────────────────────────────────────────────
    {
      trekId: "annapurna_base_camp",
      nameEn: "Annapurna Base Camp",
      nameHe: "מחנה הבסיס של אנאפורנה",
      region: "Annapurna region",
      aliases: ["abc", "annapurna sanctuary", "sanctuary", "אנאפורנה", "אנפורנה", "מחנה בסיס"],
      popular: true,
      locations: [
        { locationId: "pokhara", nameEn: "Pokhara", nameHe: "פוקהרה", aliases: ["פוקארה", "pokhara city", "pokhara lakeside"], altitudeMeters: 820, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "nayapul", nameEn: "Nayapul", nameHe: "ניאפול", aliases: ["naya pul", "nayapul bus stop"], altitudeMeters: 1070, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "birethanti", nameEn: "Birethanti", nameHe: "בירתאנטי", aliases: ["birethanti village"], altitudeMeters: 1260, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "kimche", nameEn: "Kimche", nameHe: "קימצ'ה", aliases: ["kimchi", "kimche village"], altitudeMeters: 1640, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghandruk", nameEn: "Ghandruk", nameHe: "גאנדרוק", aliases: ["ghandrung", "ghandruk village"], altitudeMeters: 1940, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "landruk", nameEn: "Landruk", nameHe: "לנדרוק", aliases: ["landruk village"], altitudeMeters: 1565, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "samrung", nameEn: "Samrung", nameHe: "סמרונג", aliases: ["samrung village"], altitudeMeters: 1780, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "jhinu_danda", nameEn: "Jhinu Danda", nameHe: "ג'ינו דנדה", aliases: ["jhinu", "ג'ינו", "jhinu hot spring"], altitudeMeters: 1780, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "new_bridge", nameEn: "New Bridge", nameHe: "גשר חדש", aliases: ["new bridge annapurna"], altitudeMeters: 1340, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chhule", nameEn: "Chhule", nameHe: "צ'ולה", aliases: ["chuile", "chhule lodge"], altitudeMeters: 2300, order: 100, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "chhomrong", nameEn: "Chhomrong", nameHe: "צ'ומרונג", aliases: ["chomrong", "chhomrong village"], altitudeMeters: 2165, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "sinuwa", nameEn: "Sinuwa", nameHe: "סינואה", aliases: ["sinuwa village"], altitudeMeters: 2360, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "bamboo", nameEn: "Bamboo", nameHe: "במבוק", aliases: ["bamboo lodge", "bamboo annapurna"], altitudeMeters: 2300, order: 130, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "dovan", nameEn: "Dovan", nameHe: "דובאן", aliases: ["dobhan", "dovan lodge"], altitudeMeters: 2600, order: 140, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "himalaya", nameEn: "Himalaya", nameHe: "הימלאיה", aliases: ["himalaya hotel", "himalaya lodge"], altitudeMeters: 2920, order: 150, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "deurali", nameEn: "Deurali", nameHe: "דאורלי", aliases: ["deurali abc", "deurali lodge"], altitudeMeters: 3200, order: 160, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "hinku_cave", nameEn: "Hinku Cave Area", nameHe: "אזור מערת הינקו", aliases: ["hinku cave", "hinku"], altitudeMeters: 3100, order: 170, section: "on_route", locationType: "camp", sourceNote: RD },
        { locationId: "mbc", nameEn: "Machhapuchhre Base Camp", nameHe: "מחנה הבסיס של מצ'פוצ'רה", aliases: ["mbc", "fishtail base camp", "machapuchare base camp"], altitudeMeters: 3700, order: 180, section: "on_route", locationType: "camp", sourceNote: RD },
        { locationId: "annapurna_base_camp", nameEn: "Annapurna Base Camp", nameHe: "מחנה הבסיס של אנאפורנה", aliases: ["abc", "annapurna bc"], altitudeMeters: 4130, order: 190, section: "on_route", locationType: "camp", sourceNote: RD },
      ],
    },

    // ── 7. Mardi Himal ───────────────────────────────────────────────────────
    {
      trekId: "mardi_himal",
      nameEn: "Mardi Himal",
      nameHe: "מרדי הימאל",
      region: "Annapurna region",
      aliases: ["mardi", "מרדי", "mardi trail", "הימל"],
      popular: false,
      locations: [
        { locationId: "pokhara", nameEn: "Pokhara", nameHe: "פוקהרה", aliases: ["פוקארה", "pokhara city", "pokhara lakeside"], altitudeMeters: 820, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "kande", nameEn: "Kande", nameHe: "קאנדה", aliases: ["kande village", "kande bus stop"], altitudeMeters: 1770, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "dhampus", nameEn: "Dhampus", nameHe: "דמפוס", aliases: ["dhampus village"], altitudeMeters: 1650, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "australian_camp", nameEn: "Australian Camp", nameHe: "מחנה אוסטרלי", aliases: ["australian camp mardi"], altitudeMeters: 2060, order: 40, section: "on_route", locationType: "camp", sourceNote: RD },
        { locationId: "pothana", nameEn: "Pothana", nameHe: "פותאנה", aliases: ["pothana village"], altitudeMeters: 1900, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "pitam_deurali", nameEn: "Pitam Deurali", nameHe: "פיטם דאורלי", aliases: ["pitam deurali pass area"], altitudeMeters: 2100, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "forest_camp", nameEn: "Forest Camp", nameHe: "מחנה יער", aliases: ["forest camp mardi"], altitudeMeters: 2500, order: 70, section: "on_route", locationType: "camp", sourceNote: RD },
        { locationId: "rest_camp", nameEn: "Rest Camp", nameHe: "מחנה מנוחה", aliases: ["rest camp mardi"], altitudeMeters: 2600, order: 80, section: "on_route", locationType: "camp", sourceNote: RD },
        { locationId: "low_camp", nameEn: "Low Camp", nameHe: "מחנה תחתון", aliases: ["low camp mardi"], altitudeMeters: 2970, order: 90, section: "on_route", locationType: "camp", sourceNote: RD },
        { locationId: "middle_camp", nameEn: "Middle Camp", nameHe: "מחנה אמצעי", aliases: ["middle camp mardi"], altitudeMeters: 3200, order: 100, section: "on_route", locationType: "camp", sourceNote: RD },
        { locationId: "badal_danda", nameEn: "Badal Danda", nameHe: "בדל דנדה", aliases: ["badal danda ridge"], altitudeMeters: 3300, order: 110, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "high_camp", nameEn: "High Camp", nameHe: "מחנה גבוה", aliases: ["high camp mardi"], altitudeMeters: 3580, order: 120, section: "on_route", locationType: "camp", sourceNote: RD },
        { locationId: "landruk", nameEn: "Landruk", nameHe: "לנדרוק", aliases: ["landruk village"], altitudeMeters: 1565, order: 130, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "siding", nameEn: "Siding", nameHe: "סידינג", aliases: ["siding village"], altitudeMeters: 1700, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "kalimati", nameEn: "Kalimati", nameHe: "קאלימאטי", aliases: ["kali mati"], altitudeMeters: 1450, order: 150, section: "on_route", locationType: "lodge_area", needsReview: true, sourceNote: NR },
        { locationId: "lumre", nameEn: "Lumre", nameHe: "לומרה", aliases: ["lumre village"], altitudeMeters: 1450, order: 160, section: "on_route", locationType: "village", needsReview: true, sourceNote: NR },
        { locationId: "lwang", nameEn: "Lwang", nameHe: "לוואנג", aliases: ["lwang village", "lwang ghalel"], altitudeMeters: 1460, order: 170, section: "on_route", locationType: "village", needsReview: true, sourceNote: NR },
      ],
    },

    // ── 8. Ghorepani Poon Hill ───────────────────────────────────────────────
    {
      trekId: "ghorepani_poon_hill",
      nameEn: "Ghorepani Poon Hill",
      nameHe: "גורהפאני פון היל",
      region: "Annapurna region",
      aliases: ["poon hill", "ghorepani", "גורהפאני", "גורפאני", "פון היל"],
      popular: false,
      locations: [
        { locationId: "pokhara", nameEn: "Pokhara", nameHe: "פוקהרה", aliases: ["פוקארה", "pokhara city", "pokhara lakeside"], altitudeMeters: 820, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "nayapul", nameEn: "Nayapul", nameHe: "ניאפול", aliases: ["naya pul", "nayapul bus stop"], altitudeMeters: 1070, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "birethanti", nameEn: "Birethanti", nameHe: "בירתאנטי", aliases: ["birethanti village"], altitudeMeters: 1260, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "hille", nameEn: "Hille", nameHe: "הילה", aliases: ["hile", "hille village"], altitudeMeters: 1430, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tikhedhunga", nameEn: "Tikhedhunga", nameHe: "טיקדונגה", aliases: ["tikhe dhungha", "tirkhe dhunga"], altitudeMeters: 1540, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ulleri", nameEn: "Ulleri", nameHe: "אולרי", aliases: ["ulleri village"], altitudeMeters: 1960, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "banthanti", nameEn: "Banthanti", nameHe: "בנתנטי", aliases: ["banthanti lodge"], altitudeMeters: 2250, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "nangethanti", nameEn: "Nangethanti", nameHe: "ננגטנטי", aliases: ["nangethanti lodge"], altitudeMeters: 2460, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghorepani", nameEn: "Ghorepani", nameHe: "גורהפאני", aliases: ["ghorepani village"], altitudeMeters: 2880, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "deurali_pass", nameEn: "Deurali Pass Area", nameHe: "אזור מעבר דאורלי", aliases: ["deurali pass", "deurali poon hill"], altitudeMeters: 3090, order: 100, section: "on_route", locationType: "lodge_area", needsReview: true, sourceNote: NR },
        { locationId: "tadapani", nameEn: "Tadapani", nameHe: "טדאפאני", aliases: ["tadapani village"], altitudeMeters: 2630, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghandruk", nameEn: "Ghandruk", nameHe: "גאנדרוק", aliases: ["ghandrung", "ghandruk village"], altitudeMeters: 1940, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
      ],
    },

    // ── 9. Langtang Valley ───────────────────────────────────────────────────
    {
      trekId: "langtang_valley",
      nameEn: "Langtang Valley",
      nameHe: "עמק לנגטאנג",
      region: "Langtang region",
      aliases: ["langtang", "לנגטאנג", "לאנגטאנג", "langtang trek", "langtang national park"],
      popular: true,
      locations: [
        { locationId: "kathmandu_lt", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "syabrubesi", nameEn: "Syabrubesi", nameHe: "סיאברובסי", aliases: ["syabru besi", "סיאברו-בסי", "shyafru besi"], altitudeMeters: 1420, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "khanjim", nameEn: "Khanjim", nameHe: "חנג'ים", aliases: ["khanjim village"], altitudeMeters: 2235, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "sherpa_gaon", nameEn: "Sherpa Gaon", nameHe: "שרפה גאון", aliases: ["sherpa gaon village", "sherpa village"], altitudeMeters: 2560, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "bamboo", nameEn: "Bamboo", nameHe: "במבוק", aliases: ["bamboo langtang", "bamboo lodge"], altitudeMeters: 1970, order: 50, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "rimche", nameEn: "Rimche", nameHe: "רימצ'ה", aliases: ["rimche lodge"], altitudeMeters: 2450, order: 60, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "lama_hotel", nameEn: "Lama Hotel", nameHe: "לאמה הוטל", aliases: ["lama lodge", "lama hotel langtang"], altitudeMeters: 2470, order: 70, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "riverside", nameEn: "Riverside", nameHe: "ריברסייד", aliases: ["riverside langtang", "riverside lodge"], altitudeMeters: 2760, order: 80, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "ghodatabela", nameEn: "Ghodatabela", nameHe: "גודאטאבלה", aliases: ["ghoda tabela", "ghodatabela lodge"], altitudeMeters: 3030, order: 90, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "thangsyap", nameEn: "Thangsyap", nameHe: "תנגסיאפ", aliases: ["thyangsyap", "thangsyap village"], altitudeMeters: 3140, order: 100, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "sindum", nameEn: "Sindum", nameHe: "סינדום", aliases: ["sindum village"], altitudeMeters: 3410, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "langtang_village", nameEn: "Langtang Village", nameHe: "כפר לנגטאנג", aliases: ["langtang", "לנגטאנג", "langtang village"], altitudeMeters: 3440, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "mundum", nameEn: "Mundum", nameHe: "מונדום", aliases: ["mundu", "mundum village"], altitudeMeters: 3550, order: 130, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "kyanjin_gompa", nameEn: "Kyanjin Gompa", nameHe: "קיאנג'ין גומפה", aliases: ["kyanjin", "קיאנג'ין", "kyangyin gompa", "kyangjin"], altitudeMeters: 3870, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
      ],
    },

    // ── 10. Gosaikunda ───────────────────────────────────────────────────────
    {
      trekId: "gosaikunda",
      nameEn: "Gosaikunda",
      nameHe: "גוסאיקונדה",
      region: "Langtang region",
      aliases: ["gosaikunda", "גוסאי", "lauribina pass", "helambu gosaikunda"],
      popular: false,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "dhunche", nameEn: "Dhunche", nameHe: "דונצ'ה", aliases: ["dhunche village", "dunche"], altitudeMeters: 2030, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "thulo_syabru", nameEn: "Thulo Syabru", nameHe: "תולו סיאברו", aliases: ["syabru", "thulo syabru village"], altitudeMeters: 2210, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "deurali", nameEn: "Deurali", nameHe: "דאורלי", aliases: ["deurali gosaikunda"], altitudeMeters: 2500, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dhimsa", nameEn: "Dhimsa", nameHe: "דימסה", aliases: ["dhimsa village"], altitudeMeters: 2910, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chandanbari", nameEn: "Chandanbari", nameHe: "צ'נדנבארי", aliases: ["sing gompa", "chandanbari cheese factory"], altitudeMeters: 3330, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "cholangpati", nameEn: "Cholangpati", nameHe: "צ'ולנגפאטי", aliases: ["chyolangpati", "cholangpati lodge"], altitudeMeters: 3650, order: 70, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "lauribina", nameEn: "Lauribina", nameHe: "לאוריבינה", aliases: ["lauribina yak", "lauribina lodge"], altitudeMeters: 3900, order: 80, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "gosaikunda_lake", nameEn: "Gosaikunda Lake", nameHe: "אגם גוסאיקונדה", aliases: ["gosaikunda", "gosainkunda lake"], altitudeMeters: 4380, order: 90, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "phedi", nameEn: "Phedi", nameHe: "פדי", aliases: ["phedi gosaikunda"], altitudeMeters: 3630, order: 100, section: "on_route", locationType: "lodge_area", needsReview: true, sourceNote: NR },
        { locationId: "ghopte", nameEn: "Ghopte", nameHe: "גופטה", aliases: ["ghopte lodge"], altitudeMeters: 3430, order: 110, section: "on_route", locationType: "lodge_area", needsReview: true, sourceNote: NR },
        { locationId: "tharepati", nameEn: "Tharepati", nameHe: "תארפאטי", aliases: ["tharepati pass area"], altitudeMeters: 3650, order: 120, section: "on_route", locationType: "lodge_area", needsReview: true, sourceNote: NR },
        { locationId: "kutumsang", nameEn: "Kutumsang", nameHe: "קוטומסנג", aliases: ["kutumsang village"], altitudeMeters: 2470, order: 130, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chisapani", nameEn: "Chisapani", nameHe: "צ'יסאפאני", aliases: ["chisapani village", "chi sapani"], altitudeMeters: 2165, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
      ],
    },

    // ── 11. Helambu ──────────────────────────────────────────────────────────
    {
      trekId: "helambu",
      nameEn: "Helambu",
      nameHe: "הלמבו",
      region: "Langtang region",
      aliases: ["helambu", "הלמבו", "helambu circuit"],
      popular: false,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "sundarijal", nameEn: "Sundarijal", nameHe: "סונדריג'ל", aliases: ["sundari jal", "sundarijal reservoir"], altitudeMeters: 1350, order: 20, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "mulkharka", nameEn: "Mulkharka", nameHe: "מולחרקה", aliases: ["mulkharka village"], altitudeMeters: 1800, order: 30, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chisapani", nameEn: "Chisapani", nameHe: "צ'יסאפאני", aliases: ["chisapani helambu", "chi sapani"], altitudeMeters: 2165, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "pati_bhanjyang", nameEn: "Pati Bhanjyang", nameHe: "פאטי בנג'יאנג", aliases: ["pati bhanjyang village"], altitudeMeters: 1770, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "gul_bhanjyang", nameEn: "Gul Bhanjyang", nameHe: "גול בנג'יאנג", aliases: ["gul bhanjyang village"], altitudeMeters: 2140, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "kutumsang", nameEn: "Kutumsang", nameHe: "קוטומסנג", aliases: ["kutumsang village"], altitudeMeters: 2470, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "magen_goth", nameEn: "Magen Goth", nameHe: "מגן גות'", aliases: ["magen goth camp"], altitudeMeters: 3540, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tharepati", nameEn: "Tharepati", nameHe: "תארפאטי", aliases: ["tharepati pass area"], altitudeMeters: 3650, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghopte", nameEn: "Ghopte", nameHe: "גופטה", aliases: ["ghopte lodge"], altitudeMeters: 3430, order: 100, section: "on_route", locationType: "lodge_area", needsReview: true, sourceNote: NR },
        { locationId: "melamchi_gaon", nameEn: "Melamchi Gaon", nameHe: "מלמצ'י גאון", aliases: ["melamchi village"], altitudeMeters: 2550, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tarkeghyang", nameEn: "Tarkeghyang", nameHe: "טארקגיאנג", aliases: ["tarkeghyang village", "tarkegyang"], altitudeMeters: 2560, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "sermathang", nameEn: "Sermathang", nameHe: "סרמאתנג", aliases: ["sermathang village"], altitudeMeters: 2590, order: 130, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "kakani", nameEn: "Kakani", nameHe: "קאקני", aliases: ["kakani helambu", "kakani village"], altitudeMeters: 1990, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "melamchi_pul", nameEn: "Melamchi Pul Bazaar", nameHe: "שוק מלמצ'י פול", aliases: ["melamchi pul", "melamchi bazaar"], altitudeMeters: 870, order: 150, section: "on_route", locationType: "village", sourceNote: RD },
      ],
    },

    // ── 12. Manaslu Circuit ──────────────────────────────────────────────────
    {
      trekId: "manaslu_circuit",
      nameEn: "Manaslu Circuit",
      nameHe: "סובב מנאסלו",
      region: "Manaslu region",
      aliases: ["manaslu", "מנאסלו", "מנסלו", "larkya la"],
      popular: false,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "soti_khola", nameEn: "Soti Khola", nameHe: "סוטי חולה", aliases: ["soti khola village"], altitudeMeters: 710, order: 20, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "machha_khola", nameEn: "Machha Khola", nameHe: "מאצ'ה חולה", aliases: ["macha khola", "machha khola village"], altitudeMeters: 870, order: 30, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "khorla_besi", nameEn: "Khorla Besi", nameHe: "חורלה בסי", aliases: ["khorlabesi", "khorla besi village"], altitudeMeters: 970, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tatopani_manaslu", nameEn: "Tatopani", nameHe: "טטופאני", aliases: ["tatopani manaslu", "tatopani hot spring"], altitudeMeters: 990, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dobhan", nameEn: "Dobhan", nameHe: "דובן", aliases: ["dobhan village"], altitudeMeters: 1070, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "jagat", nameEn: "Jagat", nameHe: "ג'גט", aliases: ["jagat village"], altitudeMeters: 1340, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "philim", nameEn: "Philim", nameHe: "פילים", aliases: ["philim village"], altitudeMeters: 1570, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "deng", nameEn: "Deng", nameHe: "דנג", aliases: ["deng village"], altitudeMeters: 1860, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "bihi_phedi", nameEn: "Bihi Phedi", nameHe: "ביהי פדי", aliases: ["bihi phedi village"], altitudeMeters: 1990, order: 100, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghap", nameEn: "Ghap", nameHe: "גאפ", aliases: ["ghap village"], altitudeMeters: 2160, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "prok", nameEn: "Prok", nameHe: "פרוק", aliases: ["prok village"], altitudeMeters: 2380, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "namrung", nameEn: "Namrung", nameHe: "נמרונג", aliases: ["namrung village"], altitudeMeters: 2630, order: 130, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "lho", nameEn: "Lho", nameHe: "לו", aliases: ["lho village"], altitudeMeters: 3180, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "shyala", nameEn: "Shyala", nameHe: "שיאלה", aliases: ["shyala village"], altitudeMeters: 3500, order: 150, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "samagaun", nameEn: "Samagaun", nameHe: "סמגאון", aliases: ["sama gaon", "samagaon village"], altitudeMeters: 3530, order: 160, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "samdo", nameEn: "Samdo", nameHe: "סמדו", aliases: ["samdo village", "סאם דו"], altitudeMeters: 3875, order: 170, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dharmasala", nameEn: "Dharmasala", nameHe: "דהרמסלה", aliases: ["larkya phedi", "dharmasala manaslu"], altitudeMeters: 4460, order: 180, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "bimthang", nameEn: "Bimthang", nameHe: "בימתנג", aliases: ["bimthang village"], altitudeMeters: 3590, order: 190, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tilije", nameEn: "Tilije", nameHe: "טיליג'ה", aliases: ["tilije village"], altitudeMeters: 2300, order: 200, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "goa", nameEn: "Goa", nameHe: "גואה", aliases: ["goa village manaslu"], altitudeMeters: 2515, order: 210, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dharapani", nameEn: "Dharapani", nameHe: "דהראפאני", aliases: ["dharapani village"], altitudeMeters: 1860, order: 220, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tal", nameEn: "Tal", nameHe: "טאל", aliases: ["tal village"], altitudeMeters: 1700, order: 230, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "besisahar", nameEn: "Besisahar", nameHe: "בסיסאהר", aliases: ["besishahar", "besi sahar"], altitudeMeters: 760, order: 240, section: "pre_trek", locationType: "settlement", sourceNote: RD },
      ],
    },

    // ── 13. Tsum Valley ──────────────────────────────────────────────────────
    {
      trekId: "tsum_valley",
      nameEn: "Tsum Valley",
      nameHe: "עמק צום",
      region: "Manaslu region",
      aliases: ["tsum", "צום"],
      popular: false,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "soti_khola", nameEn: "Soti Khola", nameHe: "סוטי חולה", aliases: ["soti khola village"], altitudeMeters: 710, order: 20, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "machha_khola", nameEn: "Machha Khola", nameHe: "מאצ'ה חולה", aliases: ["macha khola", "machha khola village"], altitudeMeters: 870, order: 30, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "khorla_besi", nameEn: "Khorla Besi", nameHe: "חורלה בסי", aliases: ["khorlabesi"], altitudeMeters: 970, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dobhan", nameEn: "Dobhan", nameHe: "דובן", aliases: ["dobhan village"], altitudeMeters: 1070, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "jagat", nameEn: "Jagat", nameHe: "ג'גט", aliases: ["jagat village"], altitudeMeters: 1340, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "philim", nameEn: "Philim", nameHe: "פילים", aliases: ["philim village"], altitudeMeters: 1570, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ekle_bhatti", nameEn: "Ekle Bhatti", nameHe: "אקלה בהאטי", aliases: ["ekle bhatti tea house"], altitudeMeters: 1600, order: 80, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "lokpa", nameEn: "Lokpa", nameHe: "לוקפה", aliases: ["lokpa village"], altitudeMeters: 2240, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chumling", nameEn: "Chumling", nameHe: "צ'ומלינג", aliases: ["chumling village"], altitudeMeters: 2380, order: 100, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "gho", nameEn: "Gho", nameHe: "גו", aliases: ["gho village"], altitudeMeters: 2485, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chhokangparo", nameEn: "Chhokangparo", nameHe: "צ'וקנגפרו", aliases: ["chhekampar", "chhokangparo village"], altitudeMeters: 3030, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "lamagaon", nameEn: "Lamagaon", nameHe: "למגאון", aliases: ["lamagaon village"], altitudeMeters: 3200, order: 130, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "lar", nameEn: "Lar", nameHe: "לר", aliases: ["lar village"], altitudeMeters: 3245, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "nile", nameEn: "Nile", nameHe: "נילה", aliases: ["nile village tsum"], altitudeMeters: 3360, order: 150, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chhule_tsum", nameEn: "Chhule", nameHe: "צ'ולה", aliases: ["chule tsum", "chhule village"], altitudeMeters: 3345, order: 160, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "mu_gompa", nameEn: "Mu Gompa", nameHe: "מו גומפה", aliases: ["mu gompa monastery"], altitudeMeters: 3700, order: 170, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "phurbe", nameEn: "Phurbe", nameHe: "פורבה", aliases: ["phurbe village"], altitudeMeters: 3250, order: 180, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "rachen_gompa", nameEn: "Rachen Gompa", nameHe: "ראצ'ן גומפה", aliases: ["rachen gompa monastery"], altitudeMeters: 3240, order: 190, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "gumba_lungdang", nameEn: "Gumba Lungdang", nameHe: "גומבה לונגדנג", aliases: ["gumba lungdang camp"], altitudeMeters: 3200, order: 200, section: "on_route", locationType: "lodge_area", needsReview: true, sourceNote: NR },
        { locationId: "dumje", nameEn: "Dumje", nameHe: "דומג'ה", aliases: ["dumje village"], altitudeMeters: 2440, order: 210, section: "on_route", locationType: "village", sourceNote: RD },
      ],
    },

    // ── 14. Upper Mustang ────────────────────────────────────────────────────
    {
      trekId: "upper_mustang",
      nameEn: "Upper Mustang",
      nameHe: "מוסטנג עליון",
      region: "Mustang region",
      aliases: ["mustang", "מוסטנג", "lo manthang", "לו מנתנג"],
      popular: false,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "pokhara", nameEn: "Pokhara", nameHe: "פוקהרה", aliases: ["פוקארה", "pokhara city", "pokhara lakeside"], altitudeMeters: 820, order: 20, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "jomsom", nameEn: "Jomsom", nameHe: "ג'ומסום", aliases: ["jomosom", "ג'ומסום", "jomsom bazaar"], altitudeMeters: 2720, order: 30, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "kagbeni", nameEn: "Kagbeni", nameHe: "קאגבני", aliases: ["kagbeni village"], altitudeMeters: 2810, order: 40, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tangbe", nameEn: "Tangbe", nameHe: "טנגבה", aliases: ["tangbe village"], altitudeMeters: 3060, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chhusang", nameEn: "Chhusang", nameHe: "צ'וסנג", aliases: ["chuksang", "chhusang village"], altitudeMeters: 2980, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tetang", nameEn: "Tetang", nameHe: "טטנג", aliases: ["tetang village"], altitudeMeters: 3040, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chele", nameEn: "Chele", nameHe: "צ'לה", aliases: ["chele village"], altitudeMeters: 3050, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghyakar", nameEn: "Ghyakar", nameHe: "גיאקר", aliases: ["ghyakar village"], altitudeMeters: 3560, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "samar", nameEn: "Samar", nameHe: "סמר", aliases: ["samar village"], altitudeMeters: 3660, order: 100, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "syangboche_mustang", nameEn: "Syangboche", nameHe: "סיאנגבוצ'ה", aliases: ["syangboche mustang"], altitudeMeters: 3475, order: 110, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghiling", nameEn: "Ghiling", nameHe: "גילינג", aliases: ["ghiling village"], altitudeMeters: 3570, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghami", nameEn: "Ghami", nameHe: "גמי", aliases: ["ghami village"], altitudeMeters: 3520, order: 130, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dhakmar", nameEn: "Dhakmar", nameHe: "דקמר", aliases: ["dhakmar village"], altitudeMeters: 3820, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tsarang", nameEn: "Tsarang", nameHe: "צרנג", aliases: ["tsarang village", "charang"], altitudeMeters: 3560, order: 150, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "marang", nameEn: "Marang", nameHe: "מרנג", aliases: ["lo gekar", "marang village"], altitudeMeters: 3650, order: 160, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "gar_gompa", nameEn: "Gar Gompa", nameHe: "גר גומפה", aliases: ["ghar gompa", "gar gompa monastery"], altitudeMeters: 3950, order: 170, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "lo_manthang", nameEn: "Lo Manthang", nameHe: "לו מנתנג", aliases: ["lo manthang village", "mustang capital"], altitudeMeters: 3810, order: 180, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "dhigaon", nameEn: "Dhigaon", nameHe: "דיגאון", aliases: ["dhi", "dhigaon village"], altitudeMeters: 3400, order: 190, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "yara", nameEn: "Yara", nameHe: "יארה", aliases: ["yara village"], altitudeMeters: 3650, order: 200, section: "on_route", locationType: "village", needsReview: true, sourceNote: NR },
        { locationId: "tangge", nameEn: "Tangge", nameHe: "טנגה", aliases: ["tangge village"], altitudeMeters: 3240, order: 210, section: "on_route", locationType: "village", needsReview: true, sourceNote: NR },
        { locationId: "muktinath", nameEn: "Muktinath", nameHe: "מוקטינאת", aliases: ["muktinath temple", "מוקטינת", "mukthinath"], altitudeMeters: 3760, order: 220, section: "on_route", locationType: "village", sourceNote: RD },
      ],
    },

    // ── 15. Kanchenjunga Base Camp ───────────────────────────────────────────
    {
      trekId: "kanchenjunga_base_camp",
      nameEn: "Kanchenjunga Base Camp",
      nameHe: "מחנה הבסיס של קנצ'נג'ונגה",
      region: "Kanchenjunga region",
      aliases: ["kanchenjunga", "kangchenjunga", "kangchenjunga base camp", "קנצ'נג'ונגה", "קנצנגונגה", "kbc"],
      popular: false,
      locations: [
        { locationId: "kathmandu", nameEn: "Kathmandu", nameHe: "קטמנדו", aliases: ["ktm", "קאטמנדו", "kathmandu valley"], altitudeMeters: 1400, order: 10, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "bhadrapur", nameEn: "Bhadrapur", nameHe: "בהדרפור", aliases: ["bhadrapur airport", "mechi"], altitudeMeters: 93, order: 20, section: "pre_trek", locationType: "city", sourceNote: RD },
        { locationId: "taplejung", nameEn: "Taplejung", nameHe: "טפלג'ונג", aliases: ["taplejung bazaar"], altitudeMeters: 1820, order: 30, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "suketar", nameEn: "Suketar", nameHe: "סוקטר", aliases: ["suketar airport", "suketar village"], altitudeMeters: 2420, order: 40, section: "pre_trek", locationType: "settlement", sourceNote: RD },
        { locationId: "mitlung", nameEn: "Mitlung", nameHe: "מיטלונג", aliases: ["mitlung village"], altitudeMeters: 920, order: 50, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "chirwa", nameEn: "Chirwa", nameHe: "צ'ירווה", aliases: ["chirwa village"], altitudeMeters: 1270, order: 60, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "tapethok", nameEn: "Tapethok", nameHe: "טפתוק", aliases: ["tapethok village"], altitudeMeters: 1320, order: 70, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "lelep", nameEn: "Lelep", nameHe: "ללפ", aliases: ["lelep village"], altitudeMeters: 1860, order: 80, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "sekathum", nameEn: "Sekathum", nameHe: "סקתום", aliases: ["sekathum village"], altitudeMeters: 1650, order: 90, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "amjilosa", nameEn: "Amjilosa", nameHe: "אמג'ילוסה", aliases: ["amjilosa lodge"], altitudeMeters: 2300, order: 100, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "thangyam", nameEn: "Thangyam", nameHe: "תנגיאם", aliases: ["thangyam lodge"], altitudeMeters: 2400, order: 110, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "gyabla", nameEn: "Gyabla", nameHe: "ג'יאבלה", aliases: ["gyabla village"], altitudeMeters: 2730, order: 120, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "phale", nameEn: "Phale", nameHe: "פאלה", aliases: ["phale village"], altitudeMeters: 3140, order: 130, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ghunsa", nameEn: "Ghunsa", nameHe: "גונסה", aliases: ["ghunsa village"], altitudeMeters: 3475, order: 140, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "khambachen", nameEn: "Khambachen", nameHe: "חמבצ'ן", aliases: ["kambachen", "khambachen village"], altitudeMeters: 4145, order: 150, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "lhonak", nameEn: "Lhonak", nameHe: "לונק", aliases: ["lhonak camp", "להונק"], altitudeMeters: 4780, order: 160, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "pangpema", nameEn: "Pangpema", nameHe: "פנגפמה", aliases: ["pangpema north base camp"], altitudeMeters: 5140, order: 170, section: "on_route", locationType: "camp", needsReview: true, sourceNote: NR },
        { locationId: "sele_la", nameEn: "Sele La Camp", nameHe: "מחנה סלה לה", aliases: ["selele camp", "sele la pass camp"], altitudeMeters: 4200, order: 180, section: "on_route", locationType: "camp", needsReview: true, sourceNote: NR },
        { locationId: "tseram", nameEn: "Tseram", nameHe: "צ'רם", aliases: ["cheram", "tseram lodge"], altitudeMeters: 3870, order: 190, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "ramche", nameEn: "Ramche", nameHe: "רמצ'ה", aliases: ["ramche camp"], altitudeMeters: 4580, order: 200, section: "on_route", locationType: "lodge_area", sourceNote: RD },
        { locationId: "oktang", nameEn: "Oktang", nameHe: "אוקטנג", aliases: ["yalung base camp", "oktang south base camp"], altitudeMeters: 4500, order: 210, section: "on_route", locationType: "camp", needsReview: true, sourceNote: NR },
        { locationId: "tortong", nameEn: "Tortong", nameHe: "טורטונג", aliases: ["torongten", "tortong village"], altitudeMeters: 2995, order: 220, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "yamphudin", nameEn: "Yamphudin", nameHe: "יאמפודין", aliases: ["yamphudin village"], altitudeMeters: 2080, order: 230, section: "on_route", locationType: "village", sourceNote: RD },
        { locationId: "ranipul", nameEn: "Ranipul", nameHe: "ראניפול", aliases: ["tamewa", "ranipul village"], altitudeMeters: 1530, order: 240, section: "on_route", locationType: "village", sourceNote: RD },
      ],
    },
  ],
};

// ── Named export matching spec requirement ─────────────────────────────────────
export const nepalTreks: NTrek[] = NEPAL_DATA.treks;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getTrekById(trekId: string): NTrek | undefined {
  return NEPAL_DATA.treks.find((t) => t.trekId === trekId);
}

export function getTrekDisplayName(trek: NTrek): string {
  return `${trek.nameEn} — ${trek.nameHe}`;
}

export function getLocationDisplayName(loc: NLocation): string {
  return `${loc.nameEn} — ${loc.nameHe} · גובה משוער ${loc.altitudeMeters} מ׳`;
}

/** Filter and sort trek locations by a search query (English, Hebrew, aliases). */
export function searchLocations(trek: NTrek, query: string): NLocation[] {
  const sorted = [...trek.locations].sort((a, b) => a.order - b.order);
  const q = query.trim().toLowerCase();
  if (!q) return sorted;
  return sorted.filter((loc) => {
    const haystack = [
      loc.nameEn.toLowerCase(),
      loc.nameHe,
      ...loc.aliases.map((a) => a.toLowerCase()),
    ].join(" ");
    return haystack.includes(q);
  });
}

export function getPopularTreks(): NTrek[] {
  return NEPAL_DATA.treks.filter((t) => t.popular);
}

/** Returns treks grouped by region, preserving insertion order. */
export function getTreksByRegion(): Map<string, NTrek[]> {
  const map = new Map<string, NTrek[]>();
  for (const trek of NEPAL_DATA.treks) {
    const bucket = map.get(trek.region) ?? [];
    bucket.push(trek);
    map.set(trek.region, bucket);
  }
  return map;
}

/** Filter treks by a search query against nameEn, nameHe, and aliases. */
export function searchTreks(query: string): NTrek[] {
  const q = query.trim().toLowerCase();
  if (!q) return NEPAL_DATA.treks;
  return NEPAL_DATA.treks.filter((t) => {
    const haystack = [
      t.nameEn.toLowerCase(),
      t.nameHe,
      ...t.aliases.map((a) => a.toLowerCase()),
    ].join(" ");
    return haystack.includes(q);
  });
}
