/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimePeriod } from "../types";

export interface SchoolScheduleConfig {
  activeDays: string[]; // ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
  longDays: string[]; // e.g. ["Salı", "Perşembe", "Cuma"]
  longDaysHours: { start: string; end: string }; // e.g. { start: "08:30", end: "20:00" }
  regularDaysHours: { start: string; end: string }; // e.g. { start: "08:30", end: "17:00" }
  lessonDuration: number; // e.g. 40 mins
  recessDuration: number; // e.g. 10 mins
  ogleArasiPeriyotNo?: number; // e.g. 5
  maxWeeklyHoursByGrade?: Record<string, number>; // e.g. { "9": 8, "10": 8 }
}

export const DEFAULT_SCHEDULE_CONFIG: SchoolScheduleConfig = {
  activeDays: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"],
  longDays: ["Salı", "Perşembe"],
  longDaysHours: { start: "08:30", end: "20:00" },
  regularDaysHours: { start: "08:30", end: "17:00" },
  lessonDuration: 40,
  recessDuration: 10,
  ogleArasiPeriyotNo: 5,
  maxWeeklyHoursByGrade: { "9": 8, "10": 8 },
};

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Generates slots for a specific start / end range.
 */
export function generateSlotsForHours(
  startStr: string,
  endStr: string,
  lessonDur: number,
  recessDur: number
): { periyotNo: number; baslangicSaati: string; bitisSaati: string }[] {
  const start = parseTimeToMinutes(startStr);
  const end = parseTimeToMinutes(endStr);
  const slots: { periyotNo: number; baslangicSaati: string; bitisSaati: string }[] = [];

  let current = start;
  let period = 1;
  while (current + lessonDur <= end) {
    slots.push({
      periyotNo: period,
      baslangicSaati: formatMinutesToTime(current),
      bitisSaati: formatMinutesToTime(current + lessonDur),
    });
    current += lessonDur + recessDur;
    period++;
  }
  return slots;
}

/**
 * Returns the maximum set of time slots (e.g. up to 14 periods for long days)
 */
export function getMasterTimeSlots(config: SchoolScheduleConfig): { periyotNo: number; baslangicSaati: string; bitisSaati: string }[] {
  const longSlots = generateSlotsForHours(
    config.longDaysHours.start,
    config.longDaysHours.end,
    config.lessonDuration,
    config.recessDuration
  );
  const regularSlots = generateSlotsForHours(
    config.regularDaysHours.start,
    config.regularDaysHours.end,
    config.lessonDuration,
    config.recessDuration
  );

  return longSlots.length > regularSlots.length ? longSlots : regularSlots;
}

/**
 * Returns how many periods are active on a given day.
 */
export function getActivePeriodsCountForDay(day: string, config: SchoolScheduleConfig): number {
  if (!config.activeDays.includes(day)) return 0;
  const isLongDay = config.longDays.includes(day);
  const hours = isLongDay ? config.longDaysHours : config.regularDaysHours;
  const slots = generateSlotsForHours(
    hours.start,
    hours.end,
    config.lessonDuration,
    config.recessDuration
  );
  return slots.length;
}

/**
 * Generates structured TimePeriod records for active days.
 */
export function generateFlexibleTimePeriods(config: SchoolScheduleConfig): TimePeriod[] {
  const periods: TimePeriod[] = [];
  const masterSlots = getMasterTimeSlots(config);

  config.activeDays.forEach((day) => {
    const activeCount = getActivePeriodsCountForDay(day, config);
    const daySlots = generateSlotsForHours(
      config.longDays.includes(day) ? config.longDaysHours.start : config.regularDaysHours.start,
      config.longDays.includes(day) ? config.longDaysHours.end : config.regularDaysHours.end,
      config.lessonDuration,
      config.recessDuration
    );

    masterSlots.forEach((slot, index) => {
      periods.push({
        id: `${day}-${slot.periyotNo}`,
        gun: day,
        baslangicSaati: index < daySlots.length ? daySlots[index].baslangicSaati : slot.baslangicSaati,
        bitisSaati: index < daySlots.length ? daySlots[index].bitisSaati : slot.bitisSaati,
        periyotNo: slot.periyotNo,
        aktifPasif: index < activeCount,
      });
    });
  });

  return periods;
}
