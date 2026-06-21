import type { RiskLevel } from "@/types";

export type ResultTexts = {
  levelLabel: string;
  mainAction: string;
  subActions: string[];
};

export const BELOW_THRESHOLD_TEXT = {
  title: "הכלי מתוכנן לשימוש מעל גובה 2500 מ׳",
  body: "בגובה נמוך יותר הסבירות למחלת גבהים נמוכה, אך אם יש תסמינים משמעותיים או החמרה במצבך — מומלץ לפנות לבדיקה רפואית.",
};

export const RESULT_TEXTS: Record<RiskLevel, ResultTexts> = {
  green: {
    levelLabel: "ירוק",
    mainAction: "ניתן להמשיך עליה בגובה",
    subActions: [],
  },
  yellow: {
    levelLabel: "צהוב",
    mainAction: "ניתן להמשיך עלייה בתשומת לב להתפתחות תסמינים",
    subActions: [
      "יש לשקול נטילת אורמוקס (דיאמוקס / אצטזולאמיד) מניעתי — אם הומלץ או נרשם מראש על ידי רופא.",
    ],
  },
  orange: {
    levelLabel: "כתום",
    mainAction: "לא מומלץ להמשיך לעלות בגובה",
    subActions: [
      "יש להישאר באותו הגובה עד אקלום.",
      "יש לפנות לייעוץ רפואי להכוונת טיפול.",
      "יש לשקול נטילת אורמוקס (דיאמוקס / אצטזולאמיד) טיפולי לפי הנחיית רופא או אם נרשם מראש.",
    ],
  },
  red: {
    levelLabel: "אדום",
    mainAction: "יש לרדת בגובה!",
    subActions: [
      "יש לפנות מיידית לקבלת עזרה רפואית.",
      "שימוש בחמצן אם זמין.",
      "טיפול תרופתי לפי הנחיה רפואית או פרוטוקול רפואי קיים.",
    ],
  },
};
