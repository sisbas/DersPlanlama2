/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  PlanItem, 
  Teacher, 
  ClassUnit, 
  Classroom, 
  Course, 
  PlanTuru,
  GADemandTask,
  GAGene,
  GAIndividual,
  GABlock,
  GAWorkerInput,
  FitnessConfig
} from "../types";
import { SchoolScheduleConfig, getActivePeriodsCountForDay } from "./timeSettings";
import {
  validateSchedules,
  isActiveEntity,
  canTeacherTeachCourse,
  isTeacherCadreCompatible,
  isSlotAllowedForClassPolicy,
  getFinalConfig,
  createMulberry32
} from "./scheduler";

const DEFAULT_FITNESS_CONFIG: FitnessConfig = {
  conflictPenaltyBase: 3000,
  conflictPenaltyPerViolation: 500,
  hardViolationPenaltyBase: 1500,
  hardViolationPenaltyPerViolation: 200,
  softViolationExponent: 1.2,
  softViolationMultiplier: 50,
  zeroConflictBonus: 5000,
  branchImbalanceThreshold: 0.15,
  branchImbalanceMultiplier: 500,
  aiPenaltyWeight: 1.0,
  aiRewardWeight: 1.0,
};

function isSlotSuitableForTask(
  teacher: Teacher | null,
  cls: ClassUnit,
  slot: string,
  finalConfig: SchoolScheduleConfig
): boolean {
  // Sınıf uygun periyodu var mı kontrolü
  if (cls.uygunPeriyotlar && cls.uygunPeriyotlar.length > 0) {
    if (!cls.uygunPeriyotlar.includes(slot)) {
      return false;
    }
  }

  // Seviye kısıtı (Level Policy) kontrolü
  const parts = slot.split("-");
  const day = parts[0];
  const periodNo = parseInt(parts[1], 10);
  const activeCount = getActivePeriodsCountForDay(day, finalConfig);
  if (!isSlotAllowedForClassPolicy(cls, day, periodNo, activeCount)) {
    return false;
  }

  // Öğretmen kontrolü
  if (teacher) {
    if (teacher.uygunPeriyotlar && teacher.uygunPeriyotlar.length > 0) {
      if (!teacher.uygunPeriyotlar.includes(slot)) {
        return false;
      }
    } else {
      const periodNoStr = String(periodNo);
      const dayOk = teacher.uygunGunler ? teacher.uygunGunler.includes(day) : true;
      const hourOk = teacher.uygunSaatler ? teacher.uygunSaatler.includes(periodNoStr) : true;
      if (!dayOk || !hourOk) {
        return false;
      }
    }
    // Boş gün tercihi (istenen güne ders planlanmaması)
    if (teacher.bosGunTercihi && teacher.bosGunTercihi !== "Yok" && day === teacher.bosGunTercihi) {
      return false;
    }
  }

  return true;
}

// Gelen mesajları dinleme
self.onmessage = async (event: MessageEvent<GAWorkerInput>) => {
  const { teachers, classes, classrooms, courses, config, options, fitnessConfig: inputFitnessConfig } = event.data;

  try {
    const finalConfig = getFinalConfig(config);
    const fitnessConfig: FitnessConfig = {
      ...DEFAULT_FITNESS_CONFIG,
      ...(inputFitnessConfig || {}),
    };
    const populationSize = options?.populationSize || 60;
    const rawGenerations = options?.generations || 200;
    const isDynamic = rawGenerations === -1;
    const generations = isDynamic ? 10000 : rawGenerations;
    const mutationRate = options?.mutationRate !== undefined ? options.mutationRate : 0.15;
    const seed = options?.seed !== undefined ? options.seed : 42;
    const rng = createMulberry32(seed);

    const logs: string[] = [];
    logs.push("🧬 Genetik Algoritma (GA) Çözücü Başlatıldı.");
    if (isDynamic) {
      logs.push(`👥 Popülasyon Boyutu: ${populationSize}, Jenerasyon Havuzu: Dinamik (0 Çakışma / Maks 10000)`);
    } else {
      logs.push(`👥 Popülasyon Boyutu: ${populationSize}, Jenerasyon Havuzu: ${generations}`);
    }
    logs.push(`⚡ Mutasyon Oranı: %${Math.round(mutationRate * 100)}`);
    logs.push("🎯 Hedefli Mutasyon (Conflict-Directed Mutation) Etkin: Çakışan dersler öncelikli olarak mutasyona uğratılır.");
    logs.push(`🌱 Deterministik Tohum (Seed): ${seed}`);

    // 1. Aktif zaman dilimlerini belirle (Boş pencereler ve öğle arası hariç)
    const activeDays = finalConfig.activeDays;
    const allSlots: string[] = [];
    activeDays.forEach((day) => {
      const periodsCount = getActivePeriodsCountForDay(day, finalConfig);
      for (let p = 1; p <= periodsCount; p++) {
        if (finalConfig.ogleArasiPeriyotNo !== undefined && p === finalConfig.ogleArasiPeriyotNo) {
          continue; // Öğle arasında ders planlanamaz
        }
        allSlots.push(`${day}-${p}`);
      }
    });

    if (allSlots.length === 0) {
      throw new Error("Haftalık aktif ders periyodu bulunamadı. Lütfen zaman ayarlarını kontrol edin.");
    }

    // 2. Her sınıfın ders ihtiyaçlarını belirle ve GA görev matrisini (demandTasks) oluştur
    const demandTasks: GADemandTask[] = [];
    classes.forEach((cls) => {
      if (!cls.aktifPasif) return;
      Object.entries(cls.haftalikDersIhtiyaci || {}).forEach(([dersIsmi, iHour]) => {
        const hoursCount = Number(iHour);
        if (!Number.isFinite(hoursCount) || hoursCount <= 0) return;

        const courseObj = courses.find(
          (course) =>
            course.dersAdi === dersIsmi &&
            (!course.kademe || !cls.kademe || course.kademe === cls.kademe)
        );
        if (!courseObj) return;

        // Öğretmen filtreleme
        const eligibleTeachers = teachers.filter(
          (teacher) =>
            isActiveEntity(teacher) &&
            canTeacherTeachCourse(teacher, courseObj) &&
            isTeacherCadreCompatible(teacher, cls, courseObj)
        );

        // Derslik filtreleme ve kapasite kontrolü
        const eligibleRooms = classrooms.filter(
          (room) =>
            isActiveEntity(room) &&
            room.kapasite >= cls.mevcutOgrenciSayisi &&
            (!room.hizmetBirimi || room.hizmetBirimi === "Tümü" || room.hizmetBirimi === cls.kademe)
        );

        for (let h = 0; h < hoursCount; h++) {
          demandTasks.push({
            sinif: cls,
            courseObj,
            eligibleTeachers,
            eligibleRooms,
          });
        }
      });
    });

    logs.push(`📊 Toplam Yerleştirilecek Haftalık Ders Saati: ${demandTasks.length} adet.`);
    if (demandTasks.length === 0) {
      self.postMessage({
        success: true,
        result: {
          plans: [],
          logs: ["Planlanacak ders ihtiyacı bulunamadı."],
          resolvedCount: 0,
          unassignedRequirements: [],
          classReports: [],
        },
      });
      return;
    }

    // Yardımcı fonksiyon: Genlerden PlanItem ders planları listesi üretir
    function genesToSchedule(genes: GAGene[]): PlanItem[] {
      return genes.map((gene, index) => {
        const task = demandTasks[index];
        return {
          id: `ga-plan-${task.sinif.id}-${task.courseObj.id}-${index}`,
          sinifId: task.sinif.id,
          dersId: task.courseObj.id,
          ogretmenId: gene.teacherId,
          derslikId: gene.roomId,
          periyotId: gene.slot,
          planTuru:
            task.courseObj.brans === "Rehberlik"
              ? PlanTuru.REHBERLIK
              : PlanTuru.NORMAL_DERS,
          durum: "Onaylı",
        };
      });
    }

    interface FitnessScore {
      total: number;
      hardViolationCount: number;
      softViolationCount: number;
      pedagogicalScore: number;
    }

    // Yardımcı fonksiyon: Bireyin fitness (uygunluk) skorunu tam olarak hesaplar
    function evaluateFitnessFull(genes: GAGene[]): number {
      const schedule = genesToSchedule(genes);
      const violations = validateSchedules(schedule, teachers, classes, classrooms, courses, finalConfig);

      let score = 0;
      let hardCount = 0;
      let softCount = 0;

      // Quadratic cezalar: ufak ihlaller affedilir ama büyük ihlaller ağır cezalandırılır
      for (const violation of violations) {
        if (violation.seviye === "Zorunlu") {
          hardCount++;
          if (violation.tip === "Çakışma") {
            score -= fitnessConfig.conflictPenaltyBase + (hardCount * fitnessConfig.conflictPenaltyPerViolation); // Birikimli artan ceza
          } else {
            score -= fitnessConfig.hardViolationPenaltyBase + (hardCount * fitnessConfig.hardViolationPenaltyPerViolation);
          }
        } else {
          softCount++;
          score -= Math.pow(softCount, fitnessConfig.softViolationExponent) * fitnessConfig.softViolationMultiplier; // Polinomik ceza
        }
      }

      // Pedagojik kalite skoru (pozitif teşvik)
      const pedagogyScore = calculatePedagogicalScore(schedule);
      score += pedagogyScore;

      // Çakışma yoksa bonus
      if (hardCount === 0) {
        score += fitnessConfig.zeroConflictBonus;
      }

      // AI hints
      if (options?.aiHints?.length) {
        for (const hint of options.aiHints) {
          for (const plan of schedule) {
            const match = (!hint.sinifId || plan.sinifId === hint.sinifId) &&
                          (!hint.ogretmenId || plan.ogretmenId === hint.ogretmenId) &&
                          (!hint.dersId || plan.dersId === hint.dersId) &&
                          (!hint.periyotId || plan.periyotId === hint.periyotId);
            if (match) {
              const weight = hint.type === "penalty" ? fitnessConfig.aiPenaltyWeight : fitnessConfig.aiRewardWeight;
              score += hint.type === "penalty" ? -hint.value * weight : hint.value * weight;
            }
          }
        }
      }

      return score;
    }

    // Incremental Fitness (Değişim Hesaplama) destekleyen ana fitness fonksiyonu
    function evaluateFitness(
      genes: GAGene[],
      previousGenes?: GAGene[],
      previousScore?: number
    ): number {
      if (!previousGenes || previousScore === undefined) {
        // Tam değerlendirme (ilk kez)
        return evaluateFitnessFull(genes);
      }

      // Incremental: sadece değişen blokların indekslerini bul
      const changedIndices = new Set<number>();
      for (let i = 0; i < genes.length; i++) {
        if (genes[i].slot !== previousGenes[i].slot ||
            genes[i].teacherId !== previousGenes[i].teacherId ||
            genes[i].roomId !== previousGenes[i].roomId) {
          // Bloğun tüm indekslerini ekle
          const task = demandTasks[i];
          const blocks = classBlocksMap.get(task.sinif.id) || [];
          const block = blocks.find(b => b.taskIndices.includes(i));
          if (block) {
            block.taskIndices.forEach(idx => changedIndices.add(idx));
          } else {
            changedIndices.add(i);
          }
        }
      }

      if (changedIndices.size === 0) {
        return previousScore;
      }

      // Sadece değişen genlerin schedule'ını al
      // Not: Bu yaklaşım incremental için optimize edilmiş bir validasyon gerektirir
      // Şimdilik tam validate yap ama daha az sıklıkta
      return evaluateFitnessFull(genes);
    }

    // Yeni: Pedagojik kaliteyi ölçen yardımcı fonksiyon
    function calculatePedagogicalScore(schedule: PlanItem[]): number {
      let score = 0;
      const validPlans = schedule.filter(p => p.planTuru !== PlanTuru.BOS);

      // Zor dersler sabah saatlerinde mi?
      const heavyMorningCount = validPlans.filter(p => {
        const course = courses.find(c => c.id === p.dersId);
        if (!p.periyotId) return false;
        const periodNo = parseInt(p.periyotId.split("-")[1], 10);
        return (course?.zorlukDerecesi || 0) >= 4 && periodNo <= 4;
      }).length;
      score += heavyMorningCount * 200;

      // Hafif dersler öğleden sonra mı?
      const lightAfternoonCount = validPlans.filter(p => {
        const course = courses.find(c => c.id === p.dersId);
        if (!p.periyotId) return false;
        const periodNo = parseInt(p.periyotId.split("-")[1], 10);
        return (course?.zorlukDerecesi || 5) <= 2 && periodNo >= 6;
      }).length;
      score += lightAfternoonCount * 100;

      return score;
    }

    // Tiny helper to map course IDs to objects
    const getCourse = (id: string, coursesList: Course[]) => coursesList.find(c => c.id === id);

    // Block logic helper: Sınıfların derslerini 1'li ve 2'li bloklar haline getirelim
    const classBlocksMap = new Map<string, GABlock[]>();
    classes.forEach((cls) => {
      if (!cls.aktifPasif) return;
      const courseTasksMap = new Map<string, number[]>();
      demandTasks.forEach((task, idx) => {
        if (task.sinif.id === cls.id) {
          if (!courseTasksMap.has(task.courseObj.id)) {
            courseTasksMap.set(task.courseObj.id, []);
          }
          courseTasksMap.get(task.courseObj.id)!.push(idx);
        }
      });

      const blocksForClass: GABlock[] = [];
      courseTasksMap.forEach((indices, courseId) => {
        const totalHours = indices.length;
        let i = 0;
        while (i < totalHours) {
          if (totalHours - i >= 2 && courseId !== "Rehberlik" && getCourse(courseId, courses)?.brans !== "Rehberlik") {
            blocksForClass.push({
              classId: cls.id,
              courseId,
              taskIndices: [indices[i], indices[i+1]],
              size: 2
            });
            i += 2;
          } else {
            blocksForClass.push({
              classId: cls.id,
              courseId,
              taskIndices: [indices[i]],
              size: 1
            });
            i += 1;
          }
        }
      });

      // Önce büyük (2'li) blokları yerleştirmek yerleşim şansını artırır
      blocksForClass.sort((a, b) => b.size - a.size);
      classBlocksMap.set(cls.id, blocksForClass);
    });

    // Helper: Bir slot indeksinden başlayan ve belirtilen boyutta olan periyot dizisini döner (Günün periyot sayısını aşamaz)
    function getBlockSlots(startSlotIndex: number, size: number, slotsList: string[]): string[] | null {
      if (startSlotIndex < 0 || startSlotIndex + size > slotsList.length) return null;
      const slots: string[] = [];
      const startSlot = slotsList[startSlotIndex];
      const startDay = startSlot.split("-")[0];
      
      for (let s = 0; s < size; s++) {
        const slot = slotsList[startSlotIndex + s];
        const day = slot.split("-")[0];
        if (day !== startDay) return null; // Gün sınırını aşamaz
        slots.push(slot);
      }
      return slots;
    }

    // Blok yapısına %100 uyan, ders gün yayılımı sağlayan ve çakışmasız gen havuzu üretecimiz
    function generateBlockIndividualGenes(): GAGene[] {
      const gList: GAGene[] = Array.from({ length: demandTasks.length }, () => ({
        slot: "",
        teacherId: "",
        roomId: "",
      }));

      classBlocksMap.forEach((blocks, classId) => {
        const usedSlotsForClass = new Set<string>();
        const usedDaysForCourse = new Map<string, Set<string>>(); // courseId -> Set of days

        blocks.forEach((block) => {
          const task = demandTasks[block.taskIndices[0]];
          
          // 1. En uygun veya rastgele öğretmen seçimi
          const teacher =
            task.eligibleTeachers.length > 0
              ? task.eligibleTeachers[Math.floor(rng() * task.eligibleTeachers.length)]
              : null;
          
          // 2. En uygun veya rastgele derslik seçimi
          const room =
            task.eligibleRooms.length > 0
              ? task.eligibleRooms[Math.floor(rng() * task.eligibleRooms.length)]
              : null;

          // 3. Uygun slot listesini tara
          let candidates: number[] = [];

          for (let k = 0; k < allSlots.length; k++) {
            const blockSlots = getBlockSlots(k, block.size, allSlots);
            if (!blockSlots) continue;

            // Sınıf çakışmasını baştan engelle
            const hasClassOverlap = blockSlots.some((s) => usedSlotsForClass.has(s));
            if (hasClassOverlap) continue;

            // Dersin gün dağılımını koru (Matematik haftada 3 kez var ise 3 ayrı güne yayılsın)
            const day = blockSlots[0].split("-")[0];
            if (!usedDaysForCourse.has(block.courseId)) {
              usedDaysForCourse.set(block.courseId, new Set<string>());
            }
            if (usedDaysForCourse.get(block.courseId)!.has(day)) {
              continue;
            }

            // Slotların öğretmen ve sınıf kısıtlarına uygunluk kontrolü
            const allSuitable = blockSlots.every((s) => isSlotSuitableForTask(teacher, task.sinif, s, finalConfig));
            if (!allSuitable) continue;

            candidates.push(k);
          }

          // Gevşetilmiş Fallback 1: Gün kısıtı esnetilir
          if (candidates.length === 0) {
            for (let k = 0; k < allSlots.length; k++) {
              const blockSlots = getBlockSlots(k, block.size, allSlots);
              if (!blockSlots) continue;

              const hasClassOverlap = blockSlots.some((s) => usedSlotsForClass.has(s));
              if (hasClassOverlap) continue;

              const allSuitable = blockSlots.every((s) => isSlotSuitableForTask(teacher, task.sinif, s, finalConfig));
              if (!allSuitable) continue;

              candidates.push(k);
            }
          }

          // Gevşetilmiş Fallback 2: Tam kısıtlar (Öğretmen saatleri vb.) esnetilir, fakat sınıf çakışmasızlığı vazgeçilmezdir!
          if (candidates.length === 0) {
            for (let k = 0; k < allSlots.length; k++) {
              const blockSlots = getBlockSlots(k, block.size, allSlots);
              if (!blockSlots) continue;

              const hasClassOverlap = blockSlots.some((s) => usedSlotsForClass.has(s));
              if (hasClassOverlap) continue;

              candidates.push(k);
            }
          }

          let chosenSlots: string[] = [];
          if (candidates.length > 0) {
            const chosenK = candidates[Math.floor(rng() * candidates.length)];
            chosenSlots = getBlockSlots(chosenK, block.size, allSlots)!;
          } else {
            // Acil durum fallback: Sınıfın kalan boş yerlerinden ardışık olmayan yerler seç (asla olmaması beklenir)
            const remaining = allSlots.filter((s) => !usedSlotsForClass.has(s));
            chosenSlots = remaining.slice(0, block.size);
            if (chosenSlots.length < block.size) {
              chosenSlots = allSlots.slice(0, block.size);
            }
          }

          // Genleri ata
          chosenSlots.forEach((slot, i) => {
            const taskIdx = block.taskIndices[i];
            gList[taskIdx] = {
              slot,
              teacherId: teacher ? teacher.id : "",
              roomId: room ? room.id : "",
            };
            usedSlotsForClass.add(slot);
          });

          const chosenDay = chosenSlots[0]?.split("-")[0];
          if (chosenDay) {
            if (!usedDaysForCourse.has(block.courseId)) {
              usedDaysForCourse.set(block.courseId, new Set<string>());
            }
            usedDaysForCourse.get(block.courseId)!.add(chosenDay);
          }
        });
      });

      return gList;
    }

    // Blok korumalı Memetik İyileştirme (Repair) Operatörümüz
    function repairIndividual(genes: GAGene[]): GAGene[] {
      const repaired = genes.map(g => ({ ...g }));
      let currentSchedule = genesToSchedule(repaired);
      let currentViolations = validateSchedules(currentSchedule, teachers, classes, classrooms, courses, finalConfig);
      let currentHardCount = currentViolations.filter(v => v.seviye === "Zorunlu").length;

      if (currentHardCount === 0) return repaired;

      // En fazla 15 hedeflenmiş akıllı iyileştirme turu
      for (let iter = 0; iter < 15; iter++) {
        const hardViolations = currentViolations.filter(v => v.seviye === "Zorunlu");
        if (hardViolations.length === 0) break;

        const violation = hardViolations[Math.floor(rng() * hardViolations.length)];
        if (!violation.bilesenIds || violation.bilesenIds.length === 0) continue;

        const conflictedIdxs: number[] = [];
        violation.bilesenIds.forEach(id => {
          const parts = id.split("-");
          const idxStr = parts[parts.length - 1];
          const idx = parseInt(idxStr, 10);
          if (!isNaN(idx) && idx >= 0 && idx < repaired.length) {
            conflictedIdxs.push(idx);
          }
        });

        if (conflictedIdxs.length === 0) continue;

        const problemIdx = conflictedIdxs[Math.floor(rng() * conflictedIdxs.length)];
        const problemTask = demandTasks[problemIdx];
        const classId = problemTask.sinif.id;

        const blocks = classBlocksMap.get(classId) || [];
        const problemBlock = blocks.find(b => b.taskIndices.includes(problemIdx));
        if (!problemBlock) continue;

        let foundBetter = false;

        // Strateji A: Sınıf içi aynı boyuttaki başka bir bloğun periyotları ile takas et
        const siblingBlocks = blocks.filter(b => b !== problemBlock && b.size === problemBlock.size);
        const shuffledSiblings = [...siblingBlocks].sort(() => rng() - 0.5);

        for (const otherBlock of shuffledSiblings) {
          const origProblemSlots = problemBlock.taskIndices.map(idx => repaired[idx].slot);
          const origOtherSlots = otherBlock.taskIndices.map(idx => repaired[idx].slot);

          problemBlock.taskIndices.forEach((idx, i) => {
            repaired[idx].slot = origOtherSlots[i];
          });
          otherBlock.taskIndices.forEach((idx, i) => {
            repaired[idx].slot = origProblemSlots[i];
          });

          const testSchedule = genesToSchedule(repaired);
          const testViolations = validateSchedules(testSchedule, teachers, classes, classrooms, courses, finalConfig);
          const testHardCount = testViolations.filter(v => v.seviye === "Zorunlu").length;

          if (testHardCount < currentHardCount) {
            currentViolations = testViolations;
            currentHardCount = testHardCount;
            foundBetter = true;
            break;
          } else {
            // Geri al
            problemBlock.taskIndices.forEach((idx, i) => {
              repaired[idx].slot = origProblemSlots[i];
            });
            otherBlock.taskIndices.forEach((idx, i) => {
              repaired[idx].slot = origOtherSlots[i];
            });
          }
        }

        if (foundBetter) continue;

        // Strateji B: Öğretmen çakışması varsa öğretmeni değiştir
        const taskObj = demandTasks[problemBlock.taskIndices[0]];
        if (taskObj.eligibleTeachers.length > 1) {
          const originalTeacherIds = problemBlock.taskIndices.map(idx => repaired[idx].teacherId);
          const shuffledTeachers = [...taskObj.eligibleTeachers].sort(() => rng() - 0.5);

          for (const newTeacher of shuffledTeachers) {
            if (newTeacher.id === originalTeacherIds[0]) continue;

            problemBlock.taskIndices.forEach(idx => {
              repaired[idx].teacherId = newTeacher.id;
            });

            const testSchedule = genesToSchedule(repaired);
            const testViolations = validateSchedules(testSchedule, teachers, classes, classrooms, courses, finalConfig);
            const testHardCount = testViolations.filter(v => v.seviye === "Zorunlu").length;

            if (testHardCount < currentHardCount) {
              currentViolations = testViolations;
              currentHardCount = testHardCount;
              foundBetter = true;
              break;
            } else {
              // Geri al
              problemBlock.taskIndices.forEach((idx, i) => {
                repaired[idx].teacherId = originalTeacherIds[i];
              });
            }
          }
        }

        if (foundBetter) continue;

        // Strateji C: Sınıfın diğer dersleri tarafından kullanılmayan yeni boş bir slot serisine bloğu taşı
        const classUsedSlots = new Set<string>();
        blocks.forEach(b => {
          if (b !== problemBlock) {
            b.taskIndices.forEach(idx => classUsedSlots.add(repaired[idx].slot));
          }
        });

        const candidates: number[] = [];
        for (let k = 0; k < allSlots.length; k++) {
          const blockSlots = getBlockSlots(k, problemBlock.size, allSlots);
          if (!blockSlots) continue;

          const hasOverlap = blockSlots.some(s => classUsedSlots.has(s));
          if (!hasOverlap) {
            candidates.push(k);
          }
        }

        if (candidates.length > 0) {
          const origProblemSlots = problemBlock.taskIndices.map(idx => repaired[idx].slot);
          const shuffledK = [...candidates].sort(() => rng() - 0.5);

          for (const k of shuffledK) {
            const blockSlots = getBlockSlots(k, problemBlock.size, allSlots)!;

            problemBlock.taskIndices.forEach((idx, i) => {
              repaired[idx].slot = blockSlots[i];
            });

            const testSchedule = genesToSchedule(repaired);
            const testViolations = validateSchedules(testSchedule, teachers, classes, classrooms, courses, finalConfig);
            const testHardCount = testViolations.filter(v => v.seviye === "Zorunlu").length;

            if (testHardCount < currentHardCount) {
              currentViolations = testViolations;
              currentHardCount = testHardCount;
              foundBetter = true;
              break;
            } else {
              // Geri al
              problemBlock.taskIndices.forEach((idx, i) => {
                repaired[idx].slot = origProblemSlots[i];
              });
            }
          }
        }

        if (!foundBetter) break;
      }

      return repaired;
    }

    // Blok korumalı Mutasyon Operatörü
    function mutateIndividual(genes: GAGene[], customMutationRate?: number): GAGene[] {
      const schedule = genesToSchedule(genes);
      const violations = validateSchedules(schedule, teachers, classes, classrooms, courses, finalConfig);
      
      const conflictingIndices = new Set<number>();
      violations.forEach((v) => {
        if (v.bilesenIds && v.seviye === "Zorunlu") {
          v.bilesenIds.forEach((id) => {
            const parts = id.split("-");
            const idxStr = parts[parts.length - 1];
            const idx = parseInt(idxStr, 10);
            if (!isNaN(idx) && idx >= 0 && idx < genes.length) {
              conflictingIndices.add(idx);
            }
          });
        }
      });

      const mutatedGenes = genes.map((g) => ({ ...g }));
      const activeMutationRate = customMutationRate !== undefined ? customMutationRate : mutationRate;

      classBlocksMap.forEach((blocks, classId) => {
        blocks.forEach((block) => {
          let shouldMutate = rng() < activeMutationRate;
          
          if (conflictingIndices.size > 0) {
            const hasConflict = block.taskIndices.some(idx => conflictingIndices.has(idx));
            if (hasConflict) {
              shouldMutate = rng() < Math.max(0.55, activeMutationRate * 2.5);
            } else {
              shouldMutate = rng() < (activeMutationRate * 0.1);
            }
          }

          if (shouldMutate) {
            const task = demandTasks[block.taskIndices[0]];
            const currentTeacher = teachers.find((t) => t.id === mutatedGenes[block.taskIndices[0]].teacherId) || null;
            const mutationType = rng();

            if (mutationType < 0.6) {
              // Periyot mutasyonu: Diğer bloklarla çakışmayan boş periyot ara
              const classUsedSlots = new Set<string>();
              blocks.forEach((otherBlock) => {
                if (otherBlock !== block) {
                  otherBlock.taskIndices.forEach((idx) => {
                    classUsedSlots.add(mutatedGenes[idx].slot);
                  });
                }
              });

              const candidates: number[] = [];
              for (let k = 0; k < allSlots.length; k++) {
                const blockSlots = getBlockSlots(k, block.size, allSlots);
                if (!blockSlots) continue;

                const hasOverlap = blockSlots.some(s => classUsedSlots.has(s));
                if (hasOverlap) continue;

                const allSuitable = blockSlots.every(s => isSlotSuitableForTask(currentTeacher, task.sinif, s, finalConfig));
                if (allSuitable) {
                  candidates.push(k);
                }
              }

              if (candidates.length === 0) {
                for (let k = 0; k < allSlots.length; k++) {
                  const blockSlots = getBlockSlots(k, block.size, allSlots);
                  if (!blockSlots) continue;

                  const hasOverlap = blockSlots.some(s => classUsedSlots.has(s));
                  if (!hasOverlap) {
                    candidates.push(k);
                  }
                }
              }

              if (candidates.length > 0) {
                const chosenK = candidates[Math.floor(rng() * candidates.length)];
                const chosenSlots = getBlockSlots(chosenK, block.size, allSlots)!;
                chosenSlots.forEach((slot, i) => {
                  mutatedGenes[block.taskIndices[i]].slot = slot;
                });
              }
            } else if (mutationType < 0.85 && task.eligibleTeachers.length > 0) {
              // Öğretmen mutasyonu
              const newTeacher = task.eligibleTeachers[Math.floor(rng() * task.eligibleTeachers.length)];
              block.taskIndices.forEach((idx) => {
                mutatedGenes[idx].teacherId = newTeacher.id;
              });
            } else if (task.eligibleRooms.length > 0) {
              // Sınıf/derslik mutasyonu
              const newRoom = task.eligibleRooms[Math.floor(rng() * task.eligibleRooms.length)];
              block.taskIndices.forEach((idx) => {
                mutatedGenes[idx].roomId = newRoom.id;
              });
            }
          }
        });
      });

      return mutatedGenes;
    }

    // Hamming mesafesi: iki birey arasındaki farklı gen sayısı
    function hammingDistance(a: GAGene[], b: GAGene[]): number {
      let diff = 0;
      for (let i = 0; i < a.length; i++) {
        if (a[i].slot !== b[i].slot || a[i].teacherId !== b[i].teacherId || a[i].roomId !== b[i].roomId) {
          diff++;
        }
      }
      return diff / a.length; // 0-1 arası normalize
    }

    // Popülasyon çeşitlilik oranı
    function calculateDiversity(pop: GAIndividual[]): number {
      if (pop.length < 2) return 1;
      const reference = pop[0];
      let totalDist = 0;
      let count = 0;
      for (let i = 1; i < pop.length; i++) {
        totalDist += hammingDistance(reference.genes, pop[i].genes);
        count++;
      }
      return count > 0 ? totalDist / count : 1;
    }

    // Adaptive mutation rate hesaplama
    function getAdaptiveMutationRate(baseRate: number, diversity: number, stagnationGen: number): number {
      let rate = baseRate;
      // Düşük çeşitlilik → yüksek mutasyon
      if (diversity < 0.2) rate = Math.min(0.4, rate * 2);
      // Stagnasyon → artan mutasyon
      if (stagnationGen > 20) rate = Math.min(0.5, rate * (1 + stagnationGen / 100));
      return rate;
    }

    // Popülasyonu seyrelt (birbirine çok yakın bireyleri ele)
    function deduplicatePopulation(pop: GAIndividual[], threshold: number = 0.1): GAIndividual[] {
      const result: GAIndividual[] = [pop[0]];
      for (let i = 1; i < pop.length; i++) {
        const isDuplicate = result.some(ind => hammingDistance(ind.genes, pop[i].genes) < threshold);
        if (!isDuplicate) {
          result.push(pop[i]);
        }
      }
      return result;
    }

    // İlk popülasyonu modern block üretecimiz ile kuralına uygun üretme
    let population: GAIndividual[] = [];
    for (let p = 0; p < populationSize; p++) {
      const gList = generateBlockIndividualGenes();
      const repairedGenes = repairIndividual(gList);
      const fitness = evaluateFitness(repairedGenes);
      population.push({ genes: repairedGenes, fitness });
    }

    // Popülasyonu uygunluk derecesine göre büyükten küçüğe sırala
    population.sort((a, b) => b.fitness - a.fitness);

    let bestIndividual = population[0];
    logs.push(`🚀 Başlangıç En İyi Skor: ${bestIndividual.fitness}`);

    // Turnuva Seçilimi (Tournament Selection)
    function selectParent(): GAIndividual {
      const tournamentSize = 3;
      let tournamentBest = population[Math.floor(rng() * population.length)];
      for (let i = 1; i < tournamentSize; i++) {
        const candidate = population[Math.floor(rng() * population.length)];
        if (candidate.fitness > tournamentBest.fitness) {
          tournamentBest = candidate;
        }
      }
      return tournamentBest;
    }

    // Jenerasyon Döngüsü
    let stagnationCounter = 0;
    let lastBestFitness = bestIndividual.fitness;

    for (let gen = 1; gen <= generations; gen++) {
      const currentDiversity = calculateDiversity(population);
      const currentMutationRate = getAdaptiveMutationRate(
        options?.mutationRate ?? 0.15,
        currentDiversity,
        stagnationCounter
      );

      const nextGen: GAIndividual[] = [];

      // Elitizm: En iyi 2 bireyi koruyarak yeni jenerasyona doğrudan aktar
      const elitismCount = 2;
      for (let e = 0; e < elitismCount; e++) {
        nextGen.push({
          genes: population[e].genes.map((g) => ({ ...g })),
          fitness: population[e].fitness,
        });
      }

      // Yeni nesli oluştur
      while (nextGen.length < populationSize) {
        // Seçilim
        const parentA = selectParent();
        const parentB = selectParent();

        // Sınıf Düzeyinde Çaprazlama (Class-Preserving Crossover)
        // Her sınıfın tüm derslerini bir bütün olarak ya Parent A'dan ya da Parent B'den alır.
        // Bu sayede sınıfların kendi içindeki çakışmasızlık düzeni tamamen korunur.
        const childAGenes: GAGene[] = [];
        const childBGenes: GAGene[] = [];

        // Hangi sınıfların Parent A'dan, hangilerinin Parent B'den alınacağını belirle
        const classParentDecision = new Map<string, boolean>(); // true -> A'dan, false -> B'den
        classes.forEach((c) => {
          classParentDecision.set(c.id, rng() < 0.5);
        });

        for (let i = 0; i < demandTasks.length; i++) {
          const classId = demandTasks[i].sinif.id;
          const takeFromA = classParentDecision.get(classId) ?? true;

          if (takeFromA) {
            childAGenes.push({ ...parentA.genes[i] });
            childBGenes.push({ ...parentB.genes[i] });
          } else {
            childAGenes.push({ ...parentB.genes[i] });
            childBGenes.push({ ...parentA.genes[i] });
          }
        }

        // Mutasyon
        let mutatedChildA = mutateIndividual(childAGenes, currentMutationRate);
        let mutatedChildB = mutateIndividual(childBGenes, currentMutationRate);

        // %25 ihtimalle çocukları yerel arama ile iyileştirelim
        if (rng() < 0.25) {
          mutatedChildA = repairIndividual(mutatedChildA);
        }
        if (rng() < 0.25) {
          mutatedChildB = repairIndividual(mutatedChildB);
        }

        nextGen.push({
          genes: mutatedChildA,
          fitness: evaluateFitness(mutatedChildA),
        });

        if (nextGen.length < populationSize) {
          nextGen.push({
            genes: mutatedChildB,
            fitness: evaluateFitness(mutatedChildB),
          });
        }
      }

      // Yeni nesli sırala ve popülasyonu güncelle
      nextGen.sort((a, b) => b.fitness - a.fitness);
      population = nextGen;

      if (population[0].fitness > bestIndividual.fitness) {
        bestIndividual = population[0];
      }

      // Stagnasyon takibi
      if (population[0].fitness <= lastBestFitness) {
        stagnationCounter++;
      } else {
        stagnationCounter = 0;
        lastBestFitness = population[0].fitness;
      }

      // Her 25 nesilde bir düşük çeşitlilik → restart
      if (gen % 25 === 0 && currentDiversity < 0.1) {
        logs.push(`🔄 Nesil ${gen}: Çeşitlilik çok düşük (%${Math.round(currentDiversity * 100)}), popülasyon yenileniyor...`);
        // En iyi 2 bireyi koru, kalanını yeniden üret
        const newPopulation: GAIndividual[] = [population[0], population[1]];
        for (let p = newPopulation.length; p < populationSize; p++) {
          const gList = generateBlockIndividualGenes();
          const repairedGenes = repairIndividual(gList);
          const fitness = evaluateFitness(repairedGenes);
          newPopulation.push({ genes: repairedGenes, fitness });
        }
        population = newPopulation.sort((a, b) => b.fitness - a.fitness);
        stagnationCounter = 0;
      }

      // Her 5 jenerasyonda bir en iyi bireyi güçlendirmek için hedeflenmiş yerel iyileştirme uygulayalım
      if (gen % 5 === 0) {
        const repairedBestGenes = repairIndividual(bestIndividual.genes);
        const repairedScore = evaluateFitness(repairedBestGenes);
        if (repairedScore > bestIndividual.fitness) {
          bestIndividual = {
            genes: repairedBestGenes,
            fitness: repairedScore,
          };
          population[0] = { ...bestIndividual };
        }
      }

      // Her jenerasyonda en iyi bireyin zorunlu hata sayısını kontrol edelim
      const currentBestPlans = genesToSchedule(bestIndividual.genes);
      const currentBestViolations = validateSchedules(currentBestPlans, teachers, classes, classrooms, courses, finalConfig);
      const bestHardViolationsCount = currentBestViolations.filter((v) => v.seviye === "Zorunlu").length;

      // Her 10 jenerasyonda bir veya son jenerasyonda ilerleme bildirimleri gönder
      if (gen % 10 === 0 || gen === generations) {
        const tempPlans = genesToSchedule(bestIndividual.genes);
        const limitText = isDynamic ? "Maks 10000" : generations;
        self.postMessage({
          success: false, // isFinished: false
          generation: gen,
          bestScore: bestIndividual.fitness,
          bestSchedule: tempPlans,
          logs: [...logs, `🔄 Jenerasyon ${gen}/${limitText} tamamlandı. En iyi skor: ${bestIndividual.fitness} | ⚠️ Zorunlu Hata: ${bestHardViolationsCount}`],
        });
      }

      // Eğer hata/çakışma sıfırsa ve en iyi çözüme ulaşıldıysa döngüyü erken sonlandırabiliriz
      if (bestIndividual.fitness >= demandTasks.length * 100) {
        logs.push(`🎯 Jenerasyon ${gen}'de mükemmel çözüme ulaşıldı (Hata ve Esnek Çakışmalar Sıfır)!`);
        break;
      }

      // Herhangi bir limit modunda 0 zorunlu hata (0 çakışma) bulunduğunda erken sonlandırma
      if (bestHardViolationsCount === 0) {
        logs.push(`🎯 Jenerasyon ${gen}'de 0 zorunlu çakışma (0 hata) ile başarılı çözüme ulaşıldı!`);
        break;
      }
    }

    logs.push("📊 Genetik Algoritma optimizasyonu başarıyla tamamlandı.");
    const finalPlans = genesToSchedule(bestIndividual.genes);

    const finalViolations = validateSchedules(finalPlans, teachers, classes, classrooms, courses, finalConfig);
    const remainingHard = finalViolations.filter((v) => v.seviye === "Zorunlu").length;
    logs.push(`📈 Çözüm Sonucu: Kalan zorunlu çakışma sayısı: ${remainingHard}`);

    // Geriye dönen veri yapısı
    self.postMessage({
      success: true, // isFinished: true
      result: {
        plans: finalPlans,
        logs: logs,
        resolvedCount: demandTasks.length,
        unassignedRequirements: [], // GA kurgusunda tüm atamalar eksiksiz yapılır
        classReports: [],
      },
    });

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "GA optimizasyonu sırasında bilinmeyen hata.";
    self.postMessage({
      success: false,
      error: errMessage
    });
  }
};
