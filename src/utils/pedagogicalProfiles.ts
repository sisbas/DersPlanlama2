import { Course } from "../types";

export interface CoursePedagogicalProfile {
  preferredBlockSize: number;
  minBlockSize: number;
  maxBlockSize: number;
  splitPolicy: "KEEP_SAME_DAY" | "SPLIT_ACROSS_DAYS" | "FLEXIBLE_SINGLE";
  cognitiveWeight: number;
}

export const DEFAULT_COURSE_PEDAGOGICAL_PROFILE: CoursePedagogicalProfile = {
  preferredBlockSize: 2,
  minBlockSize: 1,
  maxBlockSize: 2,
  splitPolicy: "SPLIT_ACROSS_DAYS",
  cognitiveWeight: 3,
};

export const BRANCH_PEDAGOGICAL_PROFILES: Record<string, CoursePedagogicalProfile> = {
  Matematik: { preferredBlockSize: 2, minBlockSize: 1, maxBlockSize: 2, splitPolicy: "SPLIT_ACROSS_DAYS", cognitiveWeight: 5 },
  Geometri: { preferredBlockSize: 2, minBlockSize: 1, maxBlockSize: 2, splitPolicy: "SPLIT_ACROSS_DAYS", cognitiveWeight: 5 },
  Fizik: { preferredBlockSize: 2, minBlockSize: 1, maxBlockSize: 2, splitPolicy: "SPLIT_ACROSS_DAYS", cognitiveWeight: 5 },
  Kimya: { preferredBlockSize: 2, minBlockSize: 1, maxBlockSize: 2, splitPolicy: "SPLIT_ACROSS_DAYS", cognitiveWeight: 4 },
  Biyoloji: { preferredBlockSize: 2, minBlockSize: 1, maxBlockSize: 2, splitPolicy: "SPLIT_ACROSS_DAYS", cognitiveWeight: 4 },
  Türkçe: { preferredBlockSize: 2, minBlockSize: 1, maxBlockSize: 2, splitPolicy: "FLEXIBLE_SINGLE", cognitiveWeight: 3 },
  Edebiyat: { preferredBlockSize: 2, minBlockSize: 1, maxBlockSize: 2, splitPolicy: "FLEXIBLE_SINGLE", cognitiveWeight: 3 },
  Rehberlik: { preferredBlockSize: 1, minBlockSize: 1, maxBlockSize: 1, splitPolicy: "FLEXIBLE_SINGLE", cognitiveWeight: 1 },
};

export function getCoursePedagogicalProfile(course: Course): CoursePedagogicalProfile {
  const extendedCourse = course as Course & Partial<CoursePedagogicalProfile> & { maxBlokSaat?: number; maxGunlukBlok?: number };
  const branchProfile = BRANCH_PEDAGOGICAL_PROFILES[course.brans] || DEFAULT_COURSE_PEDAGOGICAL_PROFILE;

  return {
    preferredBlockSize: extendedCourse.preferredBlockSize || branchProfile.preferredBlockSize,
    minBlockSize: extendedCourse.minBlockSize || branchProfile.minBlockSize,
    maxBlockSize: extendedCourse.maxBlockSize || extendedCourse.maxBlokSaat || extendedCourse.maxGunlukBlok || branchProfile.maxBlockSize,
    splitPolicy: extendedCourse.splitPolicy || branchProfile.splitPolicy,
    cognitiveWeight: extendedCourse.cognitiveWeight || branchProfile.cognitiveWeight,
  };
}
