/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlanItem, Teacher, ClassUnit, Classroom, Course, AIHintItem } from "../types";
import { SchoolScheduleConfig } from "./timeSettings";
import { AtaOptimizerResult } from "./scheduler";

/**
 * Runs a heuristic CP-SAT style local optimizer inside the browser.
 * It removes hard conflicts and places remaining curriculum hours by respecting Ata Akademi kuralları.
 */
export async function runAlgorithmicOptimizer(
  currentPlans: PlanItem[],
  teachers: Teacher[],
  classes: ClassUnit[],
  classrooms: Classroom[],
  courses: Course[],
  config?: SchoolScheduleConfig,
  options?: {
    optimizationMode?: "completeness" | "pedagogical" | "balanced";
    seed?: number;
  }
): Promise<AtaOptimizerResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./scheduler.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.postMessage({
      currentPlans,
      teachers,
      classes,
      classrooms,
      courses,
      config,
      options,
    });

    worker.onmessage = (event) => {
      const { success, result, error } = event.data;
      worker.terminate();
      if (success) {
        resolve(result);
      } else {
        reject(new Error(error || "Optimizasyon sırasında bilinmeyen bir hata oluştu."));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };
  });
}

/**
 * Runs the population-based Genetic Algorithm (GA) optimizer in a dedicated Web Worker.
 * Returns a cancelable promise allowing real-time progress callbacks and immediate termination.
 */
export function runGeneticOptimizer(
  teachers: Teacher[],
  classes: ClassUnit[],
  classrooms: Classroom[],
  courses: Course[],
  config?: SchoolScheduleConfig,
  options?: {
    populationSize?: number;
    generations?: number;
    mutationRate?: number;
    seed?: number;
    aiHints?: Array<{
      sinifId?: string;
      ogretmenId?: string;
      dersId?: string;
      periyotId?: string;
      type: "penalty" | "reward";
      value: number;
    }>;
  },
  onProgress?: (progressData: {
    generation: number;
    bestScore: number;
    bestSchedule: PlanItem[];
    logs: string[];
  }) => void
): Promise<AtaOptimizerResult> & { terminate: () => void } {
  let worker: Worker | null = null;
  const promise = new Promise<AtaOptimizerResult>((resolve, reject) => {
    worker = new Worker(
      new URL("./geneticOptimizer.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.postMessage({
      teachers,
      classes,
      classrooms,
      courses,
      config,
      options,
    });

    worker.onmessage = (event) => {
      const data = event.data;
      if (data.success === true) {
        // Sonuç başarıyla üretildi ve süre tamamlandı
        worker?.terminate();
        resolve(data.result);
      } else if (data.success === false && data.generation !== undefined) {
        // Canlı jenerasyon güncellemeleri
        if (onProgress) {
          onProgress({
            generation: data.generation,
            bestScore: data.bestScore,
            bestSchedule: data.bestSchedule,
            logs: data.logs || [],
          });
        }
      } else {
        worker?.terminate();
        reject(new Error(data.error || "Genetik Algoritma sırasında bilinmeyen bir hata oluştu."));
      }
    };

    worker.onerror = (error) => {
      worker?.terminate();
      reject(error);
    };
  });

  return Object.assign(promise, {
    terminate: () => {
      if (worker) {
        worker.terminate();
        worker = null;
      }
    },
  });
}

/**
 * Birden fazla GA konfigürasyonunu paralel çalıştırır.
 * Farklı seed ve mutation rate'lerle aynı onda dener.
 */
export async function runParallelGeneticOptimizer(
  teachers: Teacher[],
  classes: ClassUnit[],
  classrooms: Classroom[],
  courses: Course[],
  config?: SchoolScheduleConfig,
  options?: {
    aiHints?: AIHintItem[];
    onProgress?: (progress: { islandIndex: number; generation: number; bestScore: number; logs: string[] }) => void;
  }
): Promise<{ best: AtaOptimizerResult; allResults: AtaOptimizerResult[]; islandResults: Array<{ seed: number; score: number }> }> {
  const islandConfigs = [
    { seed: 42,  mutationRate: 0.15, populationSize: 60,  label: "Varsayılan" },
    { seed: 123, mutationRate: 0.25, populationSize: 80,  label: "Keşif Ağırlıklı" },
    { seed: 456, mutationRate: 0.10, populationSize: 100, label: "Sömürü Ağırlıklı" },
    { seed: 789, mutationRate: 0.20, populationSize: 50,  label: "Dengeli" },
  ];

  const runners = islandConfigs.map((cfg, index) =>
    runGeneticOptimizer(teachers, classes, classrooms, courses, config, {
      ...options,
      seed: cfg.seed,
      mutationRate: cfg.mutationRate,
      populationSize: cfg.populationSize,
      generations: -1, // dynamic
    }, (progress) => {
      options?.onProgress?.({
        islandIndex: index,
        generation: progress.generation,
        bestScore: progress.bestScore,
        logs: progress.logs,
      });
    })
  );

  const results = await Promise.allSettled(runners.map(r => r));

  const succeeded = results
    .map((r, i) => ({ index: i, result: r }))
    .filter((r): r is { index: number; result: PromiseFulfilledResult<AtaOptimizerResult> } =>
      r.result.status === "fulfilled"
    )
    .map(r => ({ index: r.index, ...r.result.value }));

  // En yüksek resolvedCount + en düşük conflict'e göre sırala
  succeeded.sort((a, b) => {
    const aScore = a.resolvedCount - (a.plans.length > 0 ? 1 : 0);
    const bScore = b.resolvedCount - (b.plans.length > 0 ? 1 : 0);
    return bScore - aScore;
  });

  const islandResults = islandConfigs.map((cfg, i) => ({
    seed: cfg.seed,
    score: succeeded.find(s => s.index === i)?.resolvedCount ?? 0,
  }));

  return {
    best: succeeded[0] || { plans: [], logs: [], resolvedCount: 0, unassignedRequirements: [] },
    allResults: succeeded,
    islandResults,
  };
}

