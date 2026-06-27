import { ClassUnit } from "../types";

export type AtaSeviye = "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "Mezun" | "Bilinmiyor";
export type ViolationLevel = "Zorunlu" | "Esnek";
export type PeriodRule = "LAST_4" | "FIRST_6" | "DAYTIME" | "ANY_ACTIVE";

export interface ScheduleWindowPolicy {
  days: string[];
  periodRule: PeriodRule;
}

export interface LevelSchedulePolicy {
  hardWindows?: ScheduleWindowPolicy[];
  preferredWindows?: ScheduleWindowPolicy[];
  description: string;
}

const WEEKEND_DAYS = new Set(["Cumartesi", "Pazar"]);
const TUE_THU_DAYS = new Set(["Salı", "Perşembe"]);
const TUE_THU = ["Salı", "Perşembe"];
const WEEKEND = ["Cumartesi", "Pazar"];
const WEEKDAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

export const LEVEL_POLICIES: Partial<Record<AtaSeviye, LevelSchedulePolicy>> = {
  "5": {
    preferredWindows: [
      { days: WEEKDAYS, periodRule: "LAST_4" },
      { days: WEEKEND, periodRule: "FIRST_6" },
    ],
    description: "5. sınıflar için önerilen pencere hafta içi son 4 veya hafta sonu ilk 6 periyottur.",
  },
  "6": {
    preferredWindows: [
      { days: WEEKDAYS, periodRule: "LAST_4" },
      { days: WEEKEND, periodRule: "FIRST_6" },
    ],
    description: "6. sınıflar için önerilen pencere hafta içi son 4 veya hafta sonu ilk 6 periyottur.",
  },
  "7": {
    preferredWindows: [
      { days: WEEKDAYS, periodRule: "LAST_4" },
      { days: WEEKEND, periodRule: "FIRST_6" },
    ],
    description: "7. sınıflar için önerilen pencere hafta içi son 4 veya hafta sonu ilk 6 periyottur.",
  },
  "8": {
    hardWindows: [
      { days: WEEKDAYS, periodRule: "LAST_4" },
      { days: WEEKEND, periodRule: "FIRST_6" },
    ],
    description: "8. sınıflar için hafta içi son 4 veya hafta sonu ilk 6 periyot kullanılmalıdır.",
  },
  "9": {
    hardWindows: [{ days: WEEKEND, periodRule: "LAST_4" }],
    description: "9. sınıflara yalnızca hafta sonu son 4 periyot ders yazılabilir.",
  },
  "10": {
    hardWindows: [{ days: TUE_THU, periodRule: "LAST_4" }],
    description: "10. sınıflara yalnızca Salı ve Perşembe akşam son 4 periyot ders yazılabilir.",
  },
  "11": {
    hardWindows: [{ days: WEEKEND, periodRule: "LAST_4" }],
    description: "11. sınıflara yalnızca hafta sonu son 4 periyot ders yazılabilir.",
  },
  "12": {
    hardWindows: [
      { days: TUE_THU, periodRule: "LAST_4" },
      { days: WEEKEND, periodRule: "FIRST_6" },
    ],
    description: "12. sınıflara Salı/Perşembe akşam son 4 veya hafta sonu ilk 6 periyot ders yazılabilir.",
  },
  Mezun: {
    preferredWindows: [{ days: WEEKDAYS, periodRule: "DAYTIME" }],
    description: "Mezun gruplar için öncelikli pencere hafta içi gündüz periyotlarıdır.",
  },
};

export function parseSeviyeText(value: string): AtaSeviye | undefined {
  const raw = value.toLocaleLowerCase("tr-TR").trim();

  if (!raw) return undefined;
  if (raw.includes("mezun")) return "Mezun";
  if (/(^|\D)12(\D|$)/.test(raw)) return "12";
  if (/(^|\D)11(\D|$)/.test(raw)) return "11";
  if (/(^|\D)10(\D|$)/.test(raw)) return "10";
  if (/(^|\D)9(\D|$)/.test(raw)) return "9";
  if (/(^|\D)8(\D|$)/.test(raw)) return "8";
  if (/(^|\D)7(\D|$)/.test(raw)) return "7";
  if (/(^|\D)6(\D|$)/.test(raw)) return "6";
  if (/(^|\D)5(\D|$)/.test(raw)) return "5";

  return undefined;
}

export function normalizeSeviye(cls: ClassUnit): AtaSeviye {
  const explicit = parseSeviyeText(String(cls.seviye || ""));
  if (explicit) return explicit;

  const fromName = parseSeviyeText(cls.sinifAdi || "");
  if (fromName) return fromName;

  const rawName = String(cls.sinifAdi || "").toLocaleLowerCase("tr-TR");
  if (/\btyt\b|\bayt\b/.test(rawName)) return "Mezun";

  return "Bilinmiyor";
}

export function getLevelPolicy(cls: ClassUnit): LevelSchedulePolicy | undefined {
  return LEVEL_POLICIES[normalizeSeviye(cls)];
}

export function firstPeriodOfLastN(activePeriodCount: number, n: number): number {
  return Math.max(1, activePeriodCount - n + 1);
}

export function isInLastNPeriods(periodNo: number, activePeriodCount: number, n: number): boolean {
  if (activePeriodCount > 10) {
    return periodNo >= 7 && periodNo <= activePeriodCount;
  }
  return periodNo >= firstPeriodOfLastN(activePeriodCount, n) && periodNo <= activePeriodCount;
}

export function matchesPeriodRule(periodNo: number, activePeriodCount: number, periodRule: PeriodRule): boolean {
  if (periodRule === "ANY_ACTIVE") return periodNo >= 1 && periodNo <= activePeriodCount;
  if (periodRule === "LAST_4") return isInLastNPeriods(periodNo, activePeriodCount, 4);
  if (periodRule === "FIRST_6") return periodNo >= 1 && periodNo <= Math.min(6, activePeriodCount);
  if (periodRule === "DAYTIME") return periodNo >= 1 && periodNo < firstPeriodOfLastN(activePeriodCount, 4);
  return false;
}

export function windowMatches(window: ScheduleWindowPolicy, day: string, periodNo: number, activePeriodCount: number): boolean {
  return window.days.includes(day) && matchesPeriodRule(periodNo, activePeriodCount, window.periodRule);
}

export function getLevelWindowViolation(
  cls: ClassUnit,
  day: string,
  periodNo: number,
  activePeriodCount: number
): { seviye: ViolationLevel; message: string } | undefined {
  const policy = getLevelPolicy(cls);

  if (!policy) return undefined;

  const hardWindows = policy.hardWindows || [];
  const preferredWindows = policy.preferredWindows || [];

  if (hardWindows.length > 0 && !hardWindows.some((window) => windowMatches(window, day, periodNo, activePeriodCount))) {
    return {
      seviye: "Zorunlu",
      message: `Seviye Kısıtı: ${policy.description} Mevcut: ${day} P${periodNo}.`,
    };
  }

  if (preferredWindows.length > 0 && !preferredWindows.some((window) => windowMatches(window, day, periodNo, activePeriodCount))) {
    return {
      seviye: "Esnek",
      message: `Pedagojik Zaman Penceresi Uyarısı: ${policy.description} Mevcut: ${day} P${periodNo}.`,
    };
  }

  return undefined;
}

export function isSlotAllowedForClassPolicy(cls: ClassUnit, day: string, periodNo: number, activePeriodCount: number): boolean {
  const hardWindows = getLevelPolicy(cls)?.hardWindows || [];
  if (hardWindows.length === 0) return true;
  return hardWindows.some((window) => windowMatches(window, day, periodNo, activePeriodCount));
}
