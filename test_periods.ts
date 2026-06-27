import { getMasterTimeSlots, getActivePeriodsCountForDay, DEFAULT_SCHEDULE_CONFIG } from "./src/utils/timeSettings";

console.log("Pazartesi count:", getActivePeriodsCountForDay("Pazartesi", DEFAULT_SCHEDULE_CONFIG));
console.log("Salı count:", getActivePeriodsCountForDay("Salı", DEFAULT_SCHEDULE_CONFIG));
console.log("Cumartesi count:", getActivePeriodsCountForDay("Cumartesi", DEFAULT_SCHEDULE_CONFIG));
