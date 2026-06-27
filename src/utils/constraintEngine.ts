import { PlanItem, Teacher, ClassUnit, Classroom, Course, ConstraintViolation, PlanTuru } from "../types";
import { SchoolScheduleConfig, getActivePeriodsCountForDay } from "./timeSettings";
import { 
  normalizeSeviye, 
  getLevelWindowViolation 
} from "./levelPolicy";
import { 
  isSchedulablePlan, 
  getDay, 
  getPeriodNo, 
  canTeacherTeachCourse, 
  isTeacherCadreCompatible, 
  isTeacherAvailable, 
  getDefaultWeeklyBounds, 
  calculateGap, 
  areConsecutivePeriods 
} from "./scheduleIndex";

const DEFAULT_ATA_AKADEMI_CONFIG: SchoolScheduleConfig = {
  activeDays: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"],
  longDays: ["Salı", "Perşembe", "Cuma"],
  longDaysHours: { start: "08:30", end: "20:00" },
  regularDaysHours: { start: "08:30", end: "17:00" },
  lessonDuration: 40,
  recessDuration: 10,
};

export function getFinalConfig(config?: SchoolScheduleConfig): SchoolScheduleConfig {
  return config || DEFAULT_ATA_AKADEMI_CONFIG;
}

function getTeacher(teacherId: string, teachers: Teacher[]): Teacher | undefined {
  return teachers.find((teacher) => teacher.id === teacherId);
}

function getClass(classId: string, classes: ClassUnit[]): ClassUnit | undefined {
  return classes.find((cls) => cls.id === classId);
}

function getRoom(roomId: string, classrooms: Classroom[]): Classroom | undefined {
  return classrooms.find((room) => room.id === roomId);
}

function getCourse(courseId: string, courses: Course[]): Course | undefined {
  return courses.find((course) => course.id === courseId);
}

function isHeavyCourse(course: Course | undefined): boolean {
  return (course?.zorlukDerecesi || 1) >= 4;
}

function getPlanIds(plans: PlanItem[]): string[] {
  return plans.map((plan) => plan.id);
}

function isActiveEntity(entity: { aktifPasif?: boolean }): boolean {
  return entity.aktifPasif !== false;
}

function addViolationOnce(violations: ConstraintViolation[], violation: ConstraintViolation): void {
  const same = violations.some((v) => v.id === violation.id);
  if (!same) violations.push(violation);
}

export function validateSchedules(
  plans: PlanItem[],
  teachers: Teacher[],
  classes: ClassUnit[],
  classrooms: Classroom[],
  courses: Course[],
  config?: SchoolScheduleConfig
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const finalConfig = getFinalConfig(config);
  const realPlans = plans.filter(isSchedulablePlan);

  const teacherSlotMap = new Map<string, PlanItem[]>();
  const classSlotMap = new Map<string, PlanItem[]>();
  const roomSlotMap = new Map<string, PlanItem[]>();

  const pushToMap = (map: Map<string, PlanItem[]>, key: string, plan: PlanItem) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(plan);
  };

  realPlans.forEach((plan) => {
    if (!plan.periyotId || !plan.sinifId || !plan.dersId || !plan.ogretmenId || !plan.derslikId) {
      violations.push({
        id: `vio-missing-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Eksik Atama: Ders kartında sınıf, ders, öğretmen, derslik veya periyot bilgiisi eksik.`,
        bilesenIds: [plan.id],
      });
      return;
    }

    pushToMap(teacherSlotMap, `${plan.ogretmenId}|${plan.periyotId}`, plan);
    pushToMap(classSlotMap, `${plan.sinifId}|${plan.periyotId}`, plan);
    pushToMap(roomSlotMap, `${plan.derslikId}|${plan.periyotId}`, plan);
  });

  teacherSlotMap.forEach((group, key) => {
    if (group.length <= 1) return;
    const [teacherId, slot] = key.split("|");
    const teacher = getTeacher(teacherId, teachers);
    violations.push({
      id: `vio-t-${teacherId}-${slot}`,
      seviye: "Zorunlu",
      tip: "Çakışma",
      mesaj: `Öğretmen Çakışması: ${teacher?.adSoyad || "Bilinmeyen Öğretmen"} aynı anda birden fazla sınıfta derse atanamaz (${slot}).`,
      bilesenIds: getPlanIds(group),
    });
  });

  classSlotMap.forEach((group, key) => {
    if (group.length <= 1) return;
    const [classId, slot] = key.split("|");
    const cls = getClass(classId, classes);
    violations.push({
      id: `vio-c-${classId}-${slot}`,
      seviye: "Zorunlu",
      tip: "Çakışma",
      mesaj: `Sınıf Çakışması: ${cls?.sinifAdi || "Bilinmeyen Sınıf"} aynı anda birden fazla ders alamaz (${slot}).`,
      bilesenIds: getPlanIds(group),
    });
  });

  roomSlotMap.forEach((group, key) => {
    if (group.length <= 1) return;
    const [roomId, slot] = key.split("|");
    const room = getRoom(roomId, classrooms);
    violations.push({
      id: `vio-r-${roomId}-${slot}`,
      seviye: "Zorunlu",
      tip: "Çakışma",
      mesaj: `Derslik Çakışması: ${room?.derslikAdi || "Bilinmeyen Derslik"} aynı anda birden fazla ders grubuna atanamaz (${slot}).`,
      bilesenIds: getPlanIds(group),
    });
  });

  realPlans.forEach((plan) => {
    const slot = plan.periyotId;
    const day = getDay(slot);
    const periodNo = getPeriodNo(slot);
    const activePeriodCount = getActivePeriodsCountForDay(day, finalConfig);

    const cls = getClass(plan.sinifId, classes);
    const room = getRoom(plan.derslikId, classrooms);
    const course = getCourse(plan.dersId, courses);
    const teacher = getTeacher(plan.ogretmenId, teachers);

    if (!Number.isFinite(periodNo)) {
      violations.push({
        id: `vio-period-format-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Periyot Formatı İhlali: ${slot} geçerli bir periyot formatı değildir. Beklenen format: Gün-PeriyotNo.`,
        bilesenIds: [plan.id],
      });
      return;
    }

    // Kurum açık günleri ve aktif periyot sınırı.
    if (!finalConfig.activeDays.includes(day) || periodNo > activePeriodCount || periodNo < 1) {
      violations.push({
        id: `vio-inactive-slot-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Çalışma Saati Dışı İhlali: Kurum ${day} günü Periyot ${periodNo} saatlerinde kapalıdır veya bu periyot aktif değildir.`,
        bilesenIds: [plan.id],
      });
    }

    // Öğle arası.
    if (finalConfig.ogleArasiPeriyotNo !== undefined && periodNo === finalConfig.ogleArasiPeriyotNo) {
      violations.push({
        id: `vio-recess-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Öğle Arası İhlali: Kurumun öğle arası periyodunda (Periyot ${periodNo}) derse veya etkinliğe atama yapılamaz.`,
        bilesenIds: [plan.id],
      });
    }

    // Eksik referans denetimi.
    if (!cls || !room || !course || !teacher) {
      const missing: string[] = [];
      if (!cls) missing.push("sınıf");
      if (!room) missing.push("derslik");
      if (!course) missing.push("ders");
      if (!teacher) missing.push("öğretmen");

      violations.push({
        id: `vio-ref-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Referans İhlali: Plan kartında sistemde bulunamayan ${missing.join(", ")} bilgisi var.`,
        bilesenIds: [plan.id],
      });
      return;
    }

    // Derslik kapasitesi.
    if (room.kapasite < cls.mevcutOgrenciSayisi) {
      violations.push({
        id: `vio-cap-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kapasite",
        mesaj: `Kapasite İhlali: ${room.derslikAdi} (kapasite: ${room.kapasite}) dersliği, ${cls.sinifAdi} sınıfının öğrenci sayısı (${cls.mevcutOgrenciSayisi}) için yetersizdir.`,
        bilesenIds: [plan.id],
      });
    }

    // Derslik hizmet birimi uyumu.
    if (room.hizmetBirimi && room.hizmetBirimi !== "Tümü" && room.hizmetBirimi !== cls.kademe) {
      violations.push({
        id: `vio-hizmet-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Hizmet Birimi Uyumsuzluğu: ${room.derslikAdi} dersliği ${room.hizmetBirimi} için ayrılmıştır, ancak ${cls.sinifAdi} sınıfı bir ${cls.kademe} sınıfıdır.`,
        bilesenIds: [plan.id],
      });
    }

    // Branş eşleşmesi. Rehberlik dahil tüm derslerde ders branşı ile öğretmen branşı eşleşmelidir.
    if (!canTeacherTeachCourse(teacher, course)) {
      violations.push({
        id: `vio-brans-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Branş İhlali: ${teacher.adSoyad} (${teacher.brans}) öğretmeni, ${course.dersAdi} (${course.brans}) branşı dışında derse atanamaz.`,
        bilesenIds: [plan.id],
      });
    }

    // Kademe eşleşmesi.
    if (!isTeacherCadreCompatible(teacher, cls, course)) {
      violations.push({
        id: `vio-kademe-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Kademe İhlali: ${teacher.adSoyad} / ${course.dersAdi} ataması ${cls.sinifAdi} sınıfının kademesiyle uyumlu değil.`,
        bilesenIds: [plan.id],
      });
    }

    // Sınıfa özel uygun periyotlar.
    if (cls.uygunPeriyotlar && cls.uygunPeriyotlar.length > 0 && !cls.uygunPeriyotlar.includes(slot)) {
      violations.push({
        id: `vio-cls-slot-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Sınıf Kısıtı İhlali: ${cls.sinifAdi} sınıfı belirlenen gün/saat kısıtlamalarına göre bu periyotta (${slot}) ders alamaz.`,
        bilesenIds: [plan.id],
      });
    }

    // Öğretmen kısıtı kontrolü.
    if (!isTeacherAvailable(teacher, day, periodNo, slot)) {
      violations.push({
        id: `vio-teacher-slot-${plan.id}`,
        seviye: "Zorunlu",
        tip: "Kural",
        mesaj: `Öğretmen Kısıtı İhlali: ${teacher.adSoyad} öğretmeni çalışma saati kısıtlamalarına göre bu periyotta (${slot}) uygun değildir.`,
        bilesenIds: [plan.id],
      });
    }

    // Ata Akademi sınıf seviye pencereleri.
    const levelViolation = getLevelWindowViolation(cls, day, periodNo, activePeriodCount);
    if (levelViolation) {
      violations.push({
        id: `vio-lvl-${normalizeSeviye(cls)}-${plan.id}`,
        seviye: levelViolation.seviye,
        tip: "Kural",
        mesaj: levelViolation.message,
        bilesenIds: [plan.id],
      });
    }
  });

  // Öğretmen yük, boş gün, pencere ve blok denetimi.
  teachers.forEach((teacher) => {
    const teacherPlans = realPlans.filter((plan) => plan.ogretmenId === teacher.id);
    const weeklyHours = teacherPlans.length;
    const weeklyLimit = teacher.haftalikMaksimumDers ?? Number.POSITIVE_INFINITY;

    if (weeklyHours > weeklyLimit) {
      violations.push({
        id: `vio-t-weekly-${teacher.id}`,
        seviye: "Esnek",
        tip: "Yük",
        mesaj: `Yük Uyarısı: ${teacher.adSoyad} haftalık maksimum ders saati limitini (${weeklyLimit}) aştı. Mevcut: ${weeklyHours} saat.`,
        bilesenIds: getPlanIds(teacherPlans),
      });
    }

    if (teacher.bosGunTercihi && teacher.bosGunTercihi !== "Yok") {
      const activeSlotsOnEmptyDay = teacherPlans.filter((plan) => getDay(plan.periyotId) === teacher.bosGunTercihi);

      if (activeSlotsOnEmptyDay.length > 0) {
        violations.push({
          id: `vio-t-empty-${teacher.id}-${teacher.bosGunTercihi}`,
          seviye: "Esnek",
          tip: "Tercih",
          mesaj: `Tercih İhlali: ${teacher.adSoyad} için belirlenmiş boş günde (${teacher.bosGunTercihi}) ders veya etkinlik planlandı.`,
          bilesenIds: getPlanIds(activeSlotsOnEmptyDay),
        });
      }
    }

    finalConfig.activeDays.forEach((day) => {
      const dayPlans = teacherPlans
        .filter((plan) => getDay(plan.periyotId) === day)
        .sort((a, b) => getPeriodNo(a.periyotId) - getPeriodNo(b.periyotId));

      if (dayPlans.length === 0) return;

      const dailyHours = dayPlans.length;
      const dailyMax = teacher.gunlukMaksimumDers ?? Number.POSITIVE_INFINITY;
      const idealLimit = teacher.idealGunlukDers || 6;

      if (dailyHours > dailyMax) {
        violations.push({
          id: `vio-t-daily-max-${teacher.id}-${day}`,
          seviye: "Zorunlu",
          tip: "Yük",
          mesaj: `Günlük Limit İhlali: ${teacher.adSoyad} öğretmene ${day} günü maksimum limiti olan ${dailyMax} saatin üzerinde (${dailyHours} saat) ders yazılamaz.`,
          bilesenIds: getPlanIds(dayPlans),
        });
      }

      if (dailyHours > idealLimit && dailyHours <= dailyMax) {
        violations.push({
          id: `vio-t-daily-ideal-${teacher.id}-${day}`,
          seviye: "Esnek",
          tip: "Yük",
          mesaj: `Günlük İdeal Yük Uyarısı: ${teacher.adSoyad} öğretmene ${day} günü ideal limit olan ${idealLimit} saatin üzerinde (${dailyHours} saat) ders atandı.`,
          bilesenIds: getPlanIds(dayPlans),
        });
      }

      const teacherClassDailyMap = new Map<string, PlanItem[]>();
      dayPlans.forEach((plan) => {
        if (!teacherClassDailyMap.has(plan.sinifId)) teacherClassDailyMap.set(plan.sinifId, []);
        teacherClassDailyMap.get(plan.sinifId)!.push(plan);
      });

      teacherClassDailyMap.forEach((group, classId) => {
        if (group.length <= 2) return;
        const cls = getClass(classId, classes);
        violations.push({
          id: `vio-t-max-class-${teacher.id}-${classId}-${day}`,
          seviye: "Zorunlu",
          tip: "Yük",
          mesaj: `Sınıf İçi Ders Yükü: ${teacher.adSoyad} öğretmeni ${cls?.sinifAdi || classId} sınıfına aynı gün maksimum 2 saat girebilir.`,
          bilesenIds: getPlanIds(group),
        });
      });

      const blockLimit = teacher.pesPeseGirebilecegiMaxBlok || 4;
      let consecutiveCount = 1;
      let lastPeriodNo = -1;
      let totalGaps = 0;
      let blockViolationWritten = false;

      dayPlans.forEach((plan) => {
        const periodNo = getPeriodNo(plan.periyotId);

        if (lastPeriodNo !== -1) {
          totalGaps += calculateGap(lastPeriodNo, periodNo, finalConfig);
          consecutiveCount = areConsecutivePeriods(lastPeriodNo, periodNo, finalConfig) ? consecutiveCount + 1 : 1;
        }

        lastPeriodNo = periodNo;

        if (consecutiveCount > blockLimit && !blockViolationWritten) {
          violations.push({
            id: `vio-t-consec-${teacher.id}-${day}`,
            seviye: "Esnek",
            tip: "Kural",
            mesaj: `Yorgunluk Uyarısı: ${teacher.adSoyad} öğretmeni ${day} günü limiti olan ${blockLimit} saatin üzerinde ardışık derse girdi.`,
            bilesenIds: getPlanIds(dayPlans),
          });
          blockViolationWritten = true;
        }
      });

      if (totalGaps > 2) {
        violations.push({
          id: `vio-t-gaps-${teacher.id}-${day}`,
          seviye: "Esnek",
          tip: "Tercih",
          mesaj: `Boşluk Uyarısı: ${teacher.adSoyad} öğretmenin ${day} günündeki dersleri arasında toplam ${totalGaps} saat boşluk bulunmaktadır.`,
          bilesenIds: getPlanIds(dayPlans),
        });
      }
    });
  });

  // Sınıf haftalık yük, bilişsel yük ve pedagojik blok denetimi.
  classes.forEach((cls) => {
    const clsPlans = realPlans.filter((plan) => plan.sinifId === cls.id);
    const totalWeeklyHours = clsPlans.length;
    const weeklyBounds = getDefaultWeeklyBounds(cls);

    if (weeklyBounds) {
      if (totalWeeklyHours < weeklyBounds.min) {
        violations.push({
          id: `vio-cls-min-${cls.id}`,
          seviye: "Esnek",
          tip: "Yük",
          mesaj: `Haftalık Eksik Yük Uyarısı: ${cls.sinifAdi} sınıfı hedeflenen minimum ders saatinin (${weeklyBounds.min}) altında kaldı. Mevcut: ${totalWeeklyHours} saat.`,
          bilesenIds: getPlanIds(clsPlans),
        });
      }

      if (totalWeeklyHours > weeklyBounds.max) {
        violations.push({
          id: `vio-cls-max-${cls.id}`,
          seviye: "Esnek",
          tip: "Yük",
          mesaj: `Haftalık Yük Uyarısı: ${cls.sinifAdi} sınıfı hedeflenen maksimum ders saatinin (${weeklyBounds.max}) üzerinde derse sahip. Mevcut: ${totalWeeklyHours} saat.`,
          bilesenIds: getPlanIds(clsPlans),
        });
      }
    }

    finalConfig.activeDays.forEach((day) => {
      const clsDayPlans = clsPlans
        .filter((plan) => getDay(plan.periyotId) === day)
        .sort((a, b) => getPeriodNo(a.periyotId) - getPeriodNo(b.periyotId));

      if (clsDayPlans.length === 0) return;

      let consecutiveHeavyCount = 0;
      let consecutiveCourseCount = 0;
      let consecutiveTeacherCount = 0;
      let lastPeriodNo = -1;
      let lastCourseId = "";
      let lastTeacherId = "";
      let currentCourseBlock: PlanItem[] = [];
      let currentTeacherBlock: PlanItem[] = [];
      const courseDailyMap = new Map<string, PlanItem[]>();

      clsDayPlans.forEach((plan) => {
        const periodNo = getPeriodNo(plan.periyotId);
        const course = getCourse(plan.dersId, courses);
        const consecutive = lastPeriodNo !== -1 && areConsecutivePeriods(lastPeriodNo, periodNo, finalConfig);

        if (!courseDailyMap.has(plan.dersId)) courseDailyMap.set(plan.dersId, []);
        courseDailyMap.get(plan.dersId)!.push(plan);

        if (isHeavyCourse(course)) {
          consecutiveHeavyCount = consecutive ? consecutiveHeavyCount + 1 : 1;
        } else {
          consecutiveHeavyCount = 0;
        }

        if (
          consecutiveHeavyCount > 3 &&
          ["11", "12", "Mezun"].includes(normalizeSeviye(cls))
        ) {
          addViolationOnce(violations, {
            id: `vio-cls-cog-${cls.id}-${day}`,
            seviye: "Esnek",
            tip: "Yük",
            mesaj: `Bilişsel Yük Uyarısı: ${cls.sinifAdi} sınıfının ${day} günü programında art arda 3 saatten fazla ağır ders var.`,
            bilesenIds: getPlanIds(clsDayPlans.filter((p) => isHeavyCourse(getCourse(p.dersId, courses)))),
          });
        }

        if (plan.dersId === lastCourseId && consecutive) {
          consecutiveCourseCount++;
          currentCourseBlock.push(plan);
        } else {
          consecutiveCourseCount = 1;
          lastCourseId = plan.dersId;
          currentCourseBlock = [plan];
        }

        if (consecutiveCourseCount > 2) {
          addViolationOnce(violations, {
            id: `vio-cls-cons-course-${cls.id}-${day}-${lastCourseId}`,
            seviye: "Zorunlu",
            tip: "Kural",
            mesaj: `Pedagojik İhlal: ${cls.sinifAdi} sınıfına ${day} günü art arda 2 saatten fazla ${course?.dersAdi || "aynı ders"} atanmış.`,
            bilesenIds: getPlanIds(currentCourseBlock),
          });
        }

        if (plan.ogretmenId === lastTeacherId && consecutive) {
          consecutiveTeacherCount++;
          currentTeacherBlock.push(plan);
        } else {
          consecutiveTeacherCount = 1;
          lastTeacherId = plan.ogretmenId;
          currentTeacherBlock = [plan];
        }

        if (consecutiveTeacherCount > 2) {
          const teacher = getTeacher(lastTeacherId, teachers);
          addViolationOnce(violations, {
            id: `vio-cls-cons-teacher-${cls.id}-${day}-${lastTeacherId}`,
            seviye: "Zorunlu",
            tip: "Kural",
            mesaj: `Pedagojik İhlal: ${cls.sinifAdi} sınıfına ${day} günü art arda 2 saatten fazla ${teacher?.adSoyad || "aynı öğretmen"} atanmış.`,
            bilesenIds: getPlanIds(currentTeacherBlock),
          });
        }

        lastPeriodNo = periodNo;
      });

      courseDailyMap.forEach((group, courseId) => {
        if (group.length <= 1) return;
        const periods = group.map((p) => getPeriodNo(p.periyotId)).sort((a, b) => a - b);
        let consecutive = true;
        for (let i = 1; i < periods.length; i++) {
          if (!areConsecutivePeriods(periods[i - 1], periods[i], finalConfig)) {
            consecutive = false;
            break;
          }
        }
        if (!consecutive) {
          const course = getCourse(courseId, courses);
          addViolationOnce(violations, {
            id: `vio-cls-consecutive-${cls.id}-${day}-${courseId}`,
            seviye: "Zorunlu",
            tip: "Kural",
            mesaj: `Ardışıklık İhlali: ${cls.sinifAdi} sınıfının ${day} günü ${course?.dersAdi || "dersi"} ardışık olarak planlanmalı. Araya boşluk veya başka ders giremez.`,
            bilesenIds: getPlanIds(group),
          });
        }
      });
    });

    // Dağılım İhlali Kontrolü (Aynı dersin saatleri ayrı günlere bölünemez)
    const courseWeeklyMap = new Map<string, PlanItem[]>();
    clsPlans.forEach((plan) => {
      if (!courseWeeklyMap.has(plan.dersId)) {
        courseWeeklyMap.set(plan.dersId, []);
      }
      courseWeeklyMap.get(plan.dersId)!.push(plan);
    });

    courseWeeklyMap.forEach((group, dersId) => {
      const course = getCourse(dersId, courses);
      if (!course) return;

      const uniqueDays = new Set(group.map(p => getDay(p.periyotId)));
      if (uniqueDays.size > 1) {
        addViolationOnce(violations, {
          id: `vio-cls-same-day-${cls.id}-${dersId}`,
          seviye: "Esnek",
          tip: "Tercih",
          mesaj: `Dağılım Uyarısı: ${cls.sinifAdi} sınıfının ${course.dersAdi} dersi ${uniqueDays.size} farklı güne yayılmış. Haftalık yük yüksekse bu kabul edilebilir; aynı gün içindeki dersler blok ve ardışık kalmalıdır.`,
          bilesenIds: getPlanIds(group),
        });
      }
    });
  });

  // --- BRANŞ BAZINDA DERS DAĞILIM DENGESİ DENETİMİ ---
  const branchTeachersMap = new Map<string, Teacher[]>();
  teachers.forEach((t) => {
    if (!isActiveEntity(t) || !t.brans) return;
    const branch = t.brans.trim();
    if (!branchTeachersMap.has(branch)) branchTeachersMap.set(branch, []);
    branchTeachersMap.get(branch)!.push(t);
  });

  branchTeachersMap.forEach((branchTeachers, branchName) => {
    if (branchTeachers.length < 2) return;

    // Sadece bu branştaki öğretmenlere atanan ders planlarını filtrele
    const branchPlans = realPlans.filter((p) => branchTeachers.some((t) => t.id === p.ogretmenId));
    if (branchPlans.length === 0) return;

    // Her öğretmenin atanan ders saatini ve limitini hesapla
    const teacherLoads = branchTeachers.map((t) => {
      const hours = branchPlans.filter((p) => p.ogretmenId === t.id).length;
      const limit = t.haftalikMaksimumDers || 24;
      const ratio = hours / limit;
      return { teacher: t, hours, limit, ratio };
    });

    const activeLoads = teacherLoads.filter((l) => l.limit > 0);
    if (activeLoads.length < 2) return;

    let maxHours = -1;
    let minHours = 999;
    let maxHourTeacher: Teacher | null = null;
    let minHourTeacher: Teacher | null = null;

    activeLoads.forEach((l) => {
      if (l.hours > maxHours) {
        maxHours = l.hours;
        maxHourTeacher = l.teacher;
      }
      if (l.hours < minHours) {
        minHours = l.hours;
        minHourTeacher = l.teacher;
      }
    });

    const hourDiff = maxHours - minHours;

    // Eğer aynı branştan öğretmenler arasında haftalık ders saati farkı 4 veya daha fazlaysa
    if (hourDiff >= 4) {
      violations.push({
        id: `vio-branch-balance-${branchName}`,
        seviye: "Esnek",
        tip: "Yük",
        mesaj: `Ders Dağılım Dengesizliği: ${branchName} branşı öğretmenleri arasında dengesiz ders dağılımı mevcut. ${maxHourTeacher?.adSoyad} (${maxHours} saat) ile ${minHourTeacher?.adSoyad} (${minHours} saat) arasındaki ders yükü farkı ${hourDiff} saattir.`,
        bilesenIds: getPlanIds(branchPlans),
      });
    }
  });

  return violations;
}
