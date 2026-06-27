import { PlanItem, Teacher, ClassUnit, Classroom, Course, PlanTuru } from "../types";
import { SchoolScheduleConfig, getActivePeriodsCountForDay } from "./timeSettings";
import { normalizeSeviye, getLevelWindowViolation } from "./levelPolicy";
import { getCoursePedagogicalProfile } from "./pedagogicalProfiles";

const MAX_SAME_TEACHER_CLASS_DAILY = 2;

export function getDay(slot: string): string {
  return slot.split("-")[0] || "";
}

export function getPeriodNo(slot: string): number {
  return parseInt(slot.split("-")[1] || "", 10);
}

export function isSchedulablePlan(plan: PlanItem): boolean {
  return plan.planTuru !== PlanTuru.BOS && plan.planTuru !== PlanTuru.KAPALI && plan.durum !== "Conflict Detected";
}

export function canTeacherTeachCourse(teacher: Teacher, course: Course): boolean {
  const extendedTeacher = teacher as Teacher & { canTeachCourseIds?: string[]; bransYetkinlikleri?: string[] };
  if (extendedTeacher.canTeachCourseIds?.includes(course.id)) return true;
  if (extendedTeacher.bransYetkinlikleri?.includes(course.brans)) return true;
  return teacher.brans === course.brans;
}

export function isTeacherCadreCompatible(teacher: Teacher, cls: ClassUnit, course: Course): boolean {
  const teacherKademeOk = !teacher.kademe || !cls.kademe || teacher.kademe === cls.kademe;
  const courseKademeOk = !course.kademe || !cls.kademe || course.kademe === cls.kademe;
  return teacherKademeOk && courseKademeOk;
}

export function isTeacherAvailable(teacher: Teacher, day: string, periodNo: number, slot: string): boolean {
  if (teacher.uygunPeriyotlar && teacher.uygunPeriyotlar.length > 0) {
    return teacher.uygunPeriyotlar.includes(slot);
  }

  const periodNoStr = String(periodNo);
  const dayOk = teacher.uygunGunler ? teacher.uygunGunler.includes(day) : true;
  const hourOk = teacher.uygunSaatler ? teacher.uygunSaatler.includes(periodNoStr) : true;

  return dayOk && hourOk;
}

export function getWeeklyNeedTotal(cls: ClassUnit): number | undefined {
  const values = Object.values(cls.haftalikDersIhtiyaci || {}).map(Number).filter(Number.isFinite);
  if (values.length === 0) return undefined;
  return values.reduce((total, value) => total + value, 0);
}

export function getDefaultWeeklyBounds(cls: ClassUnit): { min: number; max: number } | undefined {
  if (cls.minHaftalikDers !== undefined && cls.maxHaftalikDers !== undefined) {
    return { min: cls.minHaftalikDers, max: cls.maxHaftalikDers };
  }

  const explicitNeed = getWeeklyNeedTotal(cls);
  if (explicitNeed !== undefined) {
    return { min: explicitNeed, max: explicitNeed };
  }

  const seviye = normalizeSeviye(cls);

  if (seviye === "9") return { min: 8, max: 8 };
  if (seviye === "10") return { min: 8, max: 8 };
  if (seviye === "11") return { min: 8, max: 12 };
  if (seviye === "12") return { min: 12, max: 20 };
  if (seviye === "Mezun") return { min: 20, max: 24 };

  return undefined;
}

export function calculateGap(previousPeriodNo: number, currentPeriodNo: number, config: SchoolScheduleConfig): number {
  let gap = Math.max(0, currentPeriodNo - previousPeriodNo - 1);

  if (
    config.ogleArasiPeriyotNo &&
    previousPeriodNo < config.ogleArasiPeriyotNo &&
    currentPeriodNo > config.ogleArasiPeriyotNo
  ) {
    gap = Math.max(0, gap - 1);
  }

  return gap;
}

export function shiftPeriod(periodNo: number, shift: number, config: SchoolScheduleConfig): number {
  if (shift === 0) return periodNo;

  let current = periodNo;
  let steps = Math.abs(shift);
  const direction = Math.sign(shift);

  while (steps > 0) {
    current += direction;
    if (config.ogleArasiPeriyotNo === current) current += direction;
    steps--;
  }

  return current;
}

export function areConsecutivePeriods(previousPeriodNo: number, currentPeriodNo: number, config: SchoolScheduleConfig): boolean {
  if (currentPeriodNo === previousPeriodNo + 1) return true;

  if (
    config.ogleArasiPeriyotNo &&
    previousPeriodNo === config.ogleArasiPeriyotNo - 1 &&
    currentPeriodNo === config.ogleArasiPeriyotNo + 1
  ) {
    return true;
  }

  return false;
}

export function getConsecutiveRunLength(periods: Set<number>, periodNo: number, config: SchoolScheduleConfig): number {
  let length = 1;

  let previous = shiftPeriod(periodNo, -1, config);
  while (periods.has(previous)) {
    length++;
    previous = shiftPeriod(previous, -1, config);
  }

  let next = shiftPeriod(periodNo, 1, config);
  while (periods.has(next)) {
    length++;
    next = shiftPeriod(next, 1, config);
  }

  return length;
}

export function getMaxCourseBlockHours(course: Course): number {
  return getCoursePedagogicalProfile(course).maxBlockSize || 2;
}

export interface ScheduleIndex {
  teacherSlot: Set<string>;
  classSlot: Set<string>;
  roomSlot: Set<string>;

  teacherWeekly: Map<string, number>;
  classWeekly: Map<string, number>;
  teacherDaily: Map<string, number>;
  teacherClassDaily: Map<string, number>;
  classCourseDaily: Map<string, number>;

  teacherDayPeriods: Map<string, Set<number>>;
  classCourseDayPeriods: Map<string, Set<number>>;
  
  effectiveAllowedPeriods?: Map<string, string[]>;
  effectiveAvailablePeriods?: Map<string, string[]>;
}

export interface IndexedPlacement {
  teacherId: string;
  classId: string;
  courseId: string;
  roomId: string;
  slot: string;
}

function indexKey(...parts: Array<string | number>): string {
  return parts.join("|");
}

function increaseCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) || 0) + 1);
}

function decreaseCount(map: Map<string, number>, key: string): void {
  const nextValue = (map.get(key) || 0) - 1;
  if (nextValue <= 0) {
    map.delete(key);
    return;
  }
  map.set(key, nextValue);
}

function addPeriod(map: Map<string, Set<number>>, key: string, periodNo: number): void {
  if (!map.has(key)) map.set(key, new Set<number>());
  map.get(key)!.add(periodNo);
}

function removePeriod(map: Map<string, Set<number>>, key: string, periodNo: number): void {
  const periods = map.get(key);
  if (!periods) return;

  periods.delete(periodNo);
  if (periods.size === 0) map.delete(key);
}

export function buildScheduleIndex(
  plans: PlanItem[],
  effectiveAllowedPeriods?: Map<string, string[]>,
  effectiveAvailablePeriods?: Map<string, string[]>
): ScheduleIndex {
  const index: ScheduleIndex = {
    teacherSlot: new Set<string>(),
    classSlot: new Set<string>(),
    roomSlot: new Set<string>(),

    teacherWeekly: new Map<string, number>(),
    classWeekly: new Map<string, number>(),
    teacherDaily: new Map<string, number>(),
    teacherClassDaily: new Map<string, number>(),
    classCourseDaily: new Map<string, number>(),

    teacherDayPeriods: new Map<string, Set<number>>(),
    classCourseDayPeriods: new Map<string, Set<number>>(),
    effectiveAllowedPeriods,
    effectiveAvailablePeriods,
  };

  plans.filter(isSchedulablePlan).forEach((plan) => {
    addPlanToScheduleIndex(index, plan);
  });

  return index;
}

function addPlanToScheduleIndex(index: ScheduleIndex, plan: PlanItem): void {
  addIndexedPlacement(index, {
    teacherId: plan.ogretmenId,
    classId: plan.sinifId,
    courseId: plan.dersId,
    roomId: plan.derslikId,
    slot: plan.periyotId,
  });
}

export function addIndexedPlacement(index: ScheduleIndex, placement: IndexedPlacement): void {
  const day = getDay(placement.slot);
  const periodNo = getPeriodNo(placement.slot);

  index.teacherSlot.add(indexKey(placement.teacherId, placement.slot));
  index.classSlot.add(indexKey(placement.classId, placement.slot));
  index.roomSlot.add(indexKey(placement.roomId, placement.slot));

  increaseCount(index.teacherWeekly, placement.teacherId);
  increaseCount(index.classWeekly, placement.classId);
  increaseCount(index.teacherDaily, indexKey(placement.teacherId, day));
  increaseCount(index.teacherClassDaily, indexKey(placement.teacherId, placement.classId, day));
  increaseCount(index.classCourseDaily, indexKey(placement.classId, placement.courseId, day));

  if (Number.isFinite(periodNo)) {
    addPeriod(index.teacherDayPeriods, indexKey(placement.teacherId, day), periodNo);
    addPeriod(index.classCourseDayPeriods, indexKey(placement.classId, placement.courseId, day), periodNo);
  }
}

export function removeIndexedPlacement(index: ScheduleIndex, placement: IndexedPlacement): void {
  const day = getDay(placement.slot);
  const periodNo = getPeriodNo(placement.slot);

  index.teacherSlot.delete(indexKey(placement.teacherId, placement.slot));
  index.classSlot.delete(indexKey(placement.classId, placement.slot));
  index.roomSlot.delete(indexKey(placement.roomId, placement.slot));

  decreaseCount(index.teacherWeekly, placement.teacherId);
  decreaseCount(index.classWeekly, placement.classId);
  decreaseCount(index.teacherDaily, indexKey(placement.teacherId, day));
  decreaseCount(index.teacherClassDaily, indexKey(placement.teacherId, placement.classId, day));
  decreaseCount(index.classCourseDaily, indexKey(placement.classId, placement.courseId, day));

  if (Number.isFinite(periodNo)) {
    removePeriod(index.teacherDayPeriods, indexKey(placement.teacherId, day), periodNo);
    removePeriod(index.classCourseDayPeriods, indexKey(placement.classId, placement.courseId, day), periodNo);
  }
}

export function rollbackIndexedPlacements(index: ScheduleIndex, placements: IndexedPlacement[]): void {
  for (let i = placements.length - 1; i >= 0; i--) {
    removeIndexedPlacement(index, placements[i]);
  }
}

function makeIndexedPlacement(
  slot: string,
  teacher: Teacher,
  cls: ClassUnit,
  room: Classroom,
  course: Course
): IndexedPlacement {
  return {
    teacherId: teacher.id,
    classId: cls.id,
    courseId: course.id,
    roomId: room.id,
    slot,
  };
}

export function canPlaceAtaPlanFast(
  testSlot: string,
  teacher: Teacher,
  cls: ClassUnit,
  room: Classroom,
  course: Course,
  index: ScheduleIndex,
  finalConfig: SchoolScheduleConfig
): boolean {
  const day = getDay(testSlot);
  const periodNo = getPeriodNo(testSlot);
  const activeCount = getActivePeriodsCountForDay(day, finalConfig);

  if (!Number.isFinite(periodNo)) return false;
  if (!finalConfig.activeDays.includes(day)) return false;
  if (periodNo < 1 || periodNo > activeCount) return false;
  if (finalConfig.ogleArasiPeriyotNo && periodNo === finalConfig.ogleArasiPeriyotNo) return false;

  // Sınıf uygun periyot kontrolü (effectiveAllowedPeriods yoksa fallback de mevcuttur)
  if (index.effectiveAllowedPeriods) {
    const allowed = index.effectiveAllowedPeriods.get(cls.id) || [];
    if (!allowed.includes(testSlot)) return false;
  } else {
    // Sınıf uygun periyodu veya kullanıcı modalından gelen kısıtı varsa seviye kısıtını bypass et; aksi takdirde seviye politikasını fallback olarak uygula.
    if (cls.uygunPeriyotlar && cls.uygunPeriyotlar.length > 0) {
      if (!cls.uygunPeriyotlar.includes(testSlot)) return false;
    } else {
      const levelViolation = getLevelWindowViolation(cls, day, periodNo, activeCount);
      if (levelViolation?.seviye === "Zorunlu") return false;
    }
  }

  // Öğretmen uygunluk kontrolü
  if (index.effectiveAvailablePeriods) {
    const available = index.effectiveAvailablePeriods.get(teacher.id) || [];
    if (!available.includes(testSlot)) return false;
  } else {
    if (!isTeacherAvailable(teacher, day, periodNo, testSlot)) return false;
  }

  if (!canTeacherTeachCourse(teacher, course)) return false;
  if (!isTeacherCadreCompatible(teacher, cls, course)) return false;
  if (room.kapasite < cls.mevcutOgrenciSayisi) return false;
  if (room.hizmetBirimi && room.hizmetBirimi !== "Tümü" && room.hizmetBirimi !== cls.kademe) return false;

  if (index.teacherSlot.has(indexKey(teacher.id, testSlot))) return false;
  if (index.classSlot.has(indexKey(cls.id, testSlot))) return false;
  if (index.roomSlot.has(indexKey(room.id, testSlot))) return false;

  const teacherWeeklyCount = index.teacherWeekly.get(teacher.id) || 0;
  const clsWeeklyCount = index.classWeekly.get(cls.id) || 0;
  const teacherDailyCount = index.teacherDaily.get(indexKey(teacher.id, day)) || 0;
  const teacherClassDailyCount = index.teacherClassDaily.get(indexKey(teacher.id, cls.id, day)) || 0;
  const clsCourseDailyCount = index.classCourseDaily.get(indexKey(cls.id, course.id, day)) || 0;

  const weeklyLimit = teacher.haftalikMaksimumDers ?? Number.POSITIVE_INFINITY;
  if (teacherWeeklyCount + 1 > weeklyLimit) return false;

  const bounds = getDefaultWeeklyBounds(cls);
  if (bounds && clsWeeklyCount + 1 > bounds.max) return false;

  if (teacherDailyCount + 1 > (teacher.gunlukMaksimumDers ?? Number.POSITIVE_INFINITY)) return false;
  if (teacherClassDailyCount + 1 > MAX_SAME_TEACHER_CLASS_DAILY) return false;
  if (clsCourseDailyCount + 1 > getMaxCourseBlockHours(course)) return false;

  const coursePeriodsToday = index.classCourseDayPeriods.get(indexKey(cls.id, course.id, day)) || new Set<number>();
  const teacherPeriodsToday = index.teacherDayPeriods.get(indexKey(teacher.id, day)) || new Set<number>();

  const pMinus1 = shiftPeriod(periodNo, -1, finalConfig);
  const pPlus1 = shiftPeriod(periodNo, 1, finalConfig);

  // Aynı ders aynı gün içinde yazılıyorsa oturum parçalanmasın; öğle arası blok ardışıklığını kesmez.
  if (coursePeriodsToday.size > 0) {
    const isAdjacent = coursePeriodsToday.has(pMinus1) || coursePeriodsToday.has(pPlus1);
    if (!isAdjacent) return false;
  }

  const maxCourseBlockHours = getMaxCourseBlockHours(course);
  if (getConsecutiveRunLength(coursePeriodsToday, periodNo, finalConfig) > maxCourseBlockHours) return false;

  const maxTeacherConsecutive = teacher.pesPeseGirebilecegiMaxBlok || 4;
  if (getConsecutiveRunLength(teacherPeriodsToday, periodNo, finalConfig) > maxTeacherConsecutive) return false;

  return true;
}

export function tryStageBlockOnIndex(
  index: ScheduleIndex,
  blockSlots: string[],
  teacher: Teacher,
  cls: ClassUnit,
  room: Classroom,
  course: Course,
  finalConfig: SchoolScheduleConfig
): IndexedPlacement[] | undefined {
  const stagedPlacements: IndexedPlacement[] = [];

  for (const testSlot of blockSlots) {
    if (!canPlaceAtaPlanFast(testSlot, teacher, cls, room, course, index, finalConfig)) {
      rollbackIndexedPlacements(index, stagedPlacements);
      return undefined;
    }

    const placement = makeIndexedPlacement(testSlot, teacher, cls, room, course);
    addIndexedPlacement(index, placement);
    stagedPlacements.push(placement);
  }

  return stagedPlacements;
}
