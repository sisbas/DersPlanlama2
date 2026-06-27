import { INITIAL_TEACHERS, INITIAL_CLASSROOMS, INITIAL_CLASSES, INITIAL_COURSES } from "./src/data/initialData";
import { runAlgorithmicOptimizer } from "./src/utils/schedulerRunners";

const testTeachers = INITIAL_TEACHERS.map(t => ({
  ...t,
  uygunSaatler: Array.from({length: 15}, (_, i) => String(i+1)),
  haftalikMaksimumDers: 40,
  gunlukMaksimumDers: 14
}));

async function run() {
  const r = await runAlgorithmicOptimizer([], testTeachers, INITIAL_CLASSES, INITIAL_CLASSROOMS, INITIAL_COURSES);
  console.log("Total classes:", INITIAL_CLASSES.length);
  INITIAL_CLASSES.forEach(cls => {
    const classPlans = r.plans.filter(p => p.sinifId === cls.id);
    const resolved = classPlans.filter(p => p.durum !== "Conflict Detected").length;
    console.log(`Class: ${cls.sinifAdi}, Need: ${Object.values(cls.haftalikDersIhtiyaci || {}).reduce((a, b) => a + Number(b), 0)}, Assigned: ${resolved}`);
  });
  console.log("Unassigned list:", r.unassignedRequirements?.slice(0, 5));
}
run();
