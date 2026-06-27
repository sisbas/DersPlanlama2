import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Upload, 
  Trash2, 
  History, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  FileText, 
  Brain, 
  Plus, 
  MessageSquare, 
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  FileSpreadsheet,
  Settings
} from "lucide-react";
import { PlanItem, Teacher, ClassUnit, Classroom, Course } from "../types";
import { HISTORICAL_SCHEDULES, HistoricalSchedule } from "../data/historicalSchedules";

const SAMPLE_RAW_SCHEDULE = `	                                                                PAZARTESİ																	
SAATLER	MEZ SAY 1	MEZ SAY 2	MEZ SAY 3	MEZ EA 1	MEZ EA 2	MEZ EA 3	TYT											
9.30-10.10	GEOMETRİ BERNA	GEOMETRİ ARZU	FİZİK TUĞÇE	EDEBİYAT CÜNEYT	TARİH CEREN	COĞRAFYA FİLİZ	KİMYA ÖZLEM											
10.20-11.00	GEOMETRİ BERNA	GEOMETRİ ARZU	FİZİK TUĞÇE	EDEBİYAT CÜNEYT	TARİH CEREN	COĞRAFYA FİLİZ	KİMYA ÖZLEM											
11.10-11.50	TÜRKÇE ESRA	KİMYA ÖZLEM	TYT MAT BERNA	GEOMETRİ ARZU	FELSEFE NAZLI	TARİH CEREN	BİYOLOJİ SELİN											
12.00-12.40	TÜRKÇE ESRA	KİMYA ÖZLEM	TYT MAT BERNA	GEOMETRİ ARZU	FELSEFE NAZLI	TARİH CEREN	BİYOLOJİ SELİN											
                                                                                                           20 DAKİKA ARA	30 DAKİKA ARA																	
13.10-13.50	FİZİK TUĞÇE	BİYOLOJİ SELİN 	TÜRKÇE ESRA	COĞRAFYA FİLİZ	GEOMETRİ MEHTAP	GEOMETRİ MEHTAP												
14.00-14.40	FİZİK TUĞÇE	BİYOLOJİ SELİN 	TÜRKÇE ESRA	COĞRAFYA FİLİZ	GEOMETRİ MEHTAP	GEOMETRİ MEHTAP												
	                                                                    SALI																	
SAATLER	  MEZ SAY 1	  MEZ SAY 2	  MEZ SAY 3	  MEZ EA 1	  MEZ EA 2	  MEZ EA 3	TYT	12 SAY 1	  12 SAY 2	  12 SAY 3	  12 EA 1 	  12 EA 2 	 12 EA 3 	  10. SINIF	10. SINIF			
9.30-10.10	BİYOLOJİ BERİNAY	BİYOLOJİ SELİN 	TÜRKÇE ESRA	FELSEFE NAZLI	COĞRAFYA YELDA	TÜRKÇE EBRU	TYT MAT ESRA											
10.20-11.00	BİYOLOJİ BERİNAY	BİYOLOJİ SELİN 	TÜRKÇE ESRA	FELSEFE NAZLI	COĞRAFYA YELDA	TÜRKÇE EBRU	TYT MAT ESRA											
11.10-11.50	TÜRKÇE ESRA	FİZİK SEDA	FİZİK TUĞÇE	TÜRKÇE EBRU 	AYT MAT MEHTAP	COĞRAFYA FİLİZ	TÜRKÇE DUYGU											
12.00-12.40	TÜRKÇE ESRA	FİZİK SEDA	FİZİK TUĞÇE	TÜRKÇE EBRU 	AYT MAT MEHTAP	COĞRAFYA FİLİZ	TÜRKÇE DUYGU											
                                                                                                           20 DAKİKA ARA	30 DAKİKA ARA																	
13.10-13.50	TYT MAT MEHTAP	TYT  MAT SABRİ		TYT MAT MEHTAP	TÜRKÇE CÜNEYT	TYT MAT ARZU												
14.00-14.40	TYT MAT MEHTAP	TYT  MAT SABRİ		TYT MAT MEHTAP	TÜRKÇE CÜNEYT	TYT MAT ARZU												
																		
																		
17.00-17.35								GEOMETRİ SABRİ	AYT MAT BERNA	KİMYA ÖZLEM	TYT MAT ARZU	TARİH GÜLEN	TARİH GÜLEN	TARİH CEREN	KİMYA HANDAN			
17.45-18.20								GEOMETRİ SABRİ	AYT MAT BERNA	KİMYA ÖZLEM	TYT MAT ARZU	TARİH GÜLEN	TARİH GÜLEN	TARİH CEREN	KİMYA HANDAN			
18.30-19.05								KİMYA ÖZLEM	KİMYA HANDAN	TYT MAT BERNA	TARİH CEREN	TYT MAT SABRİ	TYT MAT SABRİ	MAT ARZU	MAT ARZU			
19.15-19.50								KİMYA ÖZLEM	KİMYA HANDAN	TYT MAT BERNA	TARİH CEREN	TYT MAT SABRİ	TYT MAT SABRİ	MAT ARZU	MAT ARZU			
																		
	                                                                   PERŞEMBE																	
SAATLER	MEZ SAY 1	MEZ SAY 2	MEZ SAY 3	MEZ EA 1	MEZ EA 2	MEZ EA 3	TYT	12 SAY 1	12 SAY 2	12 SAY 3	12 EA 1 	12 EA 2 	12 EA 3 	10.SINIF	10.SINIF			
9.30-10.10	TYT MAT MEHTAP	KİMYA ÖZLEM	KİMYA HANDAN	AYT MAT ESRA	TARİH CEREN	AYT MAT SABRİ	TARİH GÜLEN											
10.20-11.00	TYT MAT MEHTAP	KİMYA ÖZLEM	KİMYA HANDAN	AYT MAT ESRA	TARİH CEREN	AYT MAT SABRİ	TARİH GÜLEN											
11.10-11.50	KİMYA HANDAN	AYT  MAT MEHTAP	AYT MAT ESRA	TARİH GÜLEN	EDEBİYAT EBRU	TARİH CEREN	GEOMETRİ SABRİ											
12.00-12.40	KİMYA HANDAN	AYT  MAT MEHTAP	AYT MAT ESRA	TARİH GÜLEN	EDEBİYAT EBRU	TARİH CEREN	FELSEFE NAZLI											
                                                                                                           20 DAKİKA ARA	30 DAKİKA ARA																	
13.10-13.50	FİZİK TUĞÇE	TÜRKÇE DUYGU	BİYOLOJİ BERİNAY	COĞRAFYA FİLİZ 	TÜRKÇE CÜNEYT	FELSEFE NAZLI	KİMYA ÖZLEM											
14.00-14.40	FİZİK TUĞÇE	TÜRKÇE DUYGU	BİYOLOJİ BERİNAY	COĞRAFYA FİLİZ 	TÜRKÇE CÜNEYT	FELSEFE NAZLI	KİMYA ÖZLEM											
																		
																		
17.00-17.35								FİZİK SEDA	BİYOLOJİBERİNAY	BİYOLOJİ SELİN	COĞRAFYA YELDA	EDEBİYAT CÜNEYT	COĞRAFYA FİLİZ	TÜRKÇE ESRA	FİZİK TUĞÇE			
17.45-18.20								FİZİK SEDA	BİYOLOJİ BERİNAY	BİYOLOJİ SELİN	COĞRAFYA YELDA	EDEBİYAT CÜNEYT	COĞRAFYA FİLİZ	TÜRKÇE ESRA	FİZİK TUĞÇE			
18.30-19.05								BİYOLOJİ SELİN	FİZİK TUĞÇE	FİZİK SEDA	FELSEFE NAZLI	COĞRAFYA YELDA	EDEBİYAT CÜNEYT	BİYOLOJİ BERİNAY	COĞRAFYA FİLİZ			
19.15-19.50								BİYOLOJİ SELİN	FİZİK TUĞÇE	FİZİK SEDA	FELSEFE NAZLI	COĞRAFYA YELDA	EDEBİYAT CÜNEYT	BİYOLOJİ BERİNAY	COĞRAFYA FİLİZ			
																		
	                                                                     CUMA																	
SAATLER	  MEZ SAY 1	  MEZ SAY 2	   MEZ SAY 3	  MEZ EA 1	  MEZ EA 2	  MEZ EA 3	TYT											
9.30-10.10	KİMYA HANDAN	FİZİK SEDA	BİYOLOJİ  BERİNAY	TÜRKÇE EBRU 	TYT MAT  ESRA 	EDEBİYAT DUYGU	COĞRAFYA YELDA											
10.20-11.00	KİMYA HANDAN	FİZİK SEDA	BİYOLOJİ  BERİNAY	TÜRKÇE EBRU 	TYT MAT ESRA	EDEBİYAT DUYGU	COĞRAFYA YELDA											
11.10-11.50	AYT MAT ESRA	TYT  MAT SABRİ	KİMYA HANDAN	TARİH GÜLEN	COĞRAFYA YELDA	TÜRKÇE EBRU	FİZİK SEDA											
12.00-12.40	AYT MAT ESRA	TYT  MAT SABRİ	KİMYA HANDAN	TARİHGÜLEN	COĞRAFYA YELDA	TÜRKÇE EBRU	FİZİK SEDA											
                                                                                                           20 DAKİKA ARA	30 DAKİKA ARA																	
13.10-13.50	BİYOLOJİ BERİNAY	TÜRKÇE DUYGU	GEOMETRİ SABRİ															
14.00-14.40	BİYOLOJİ BERİNAY	TÜRKÇE DUYGU	GEOMETRİ SABRİ															


	                                                                       CUMARTESİ													
	      12 SAY 1                             12 SAY 2                  12 SAY 3                   12 EA 1                             12 EA 2                               12 EA 3                   TYT                                      11 SAY 1                 11 SAY 2                    11 E A 1                     11 EA 2	12 SAY 2	12 SAY 3	12 EA 1	12 EA 2	12 EA3	TYT	TYT	11 SAY1	11 SAY2	11 EA1	11 EA2	9. SINIF	9. SINIF
8.45-9.25	TYT MAT ESRA	BİYOLOJİ BERİNAY	TÜRKÇE DUYGU	GEOMETRİ SABRİ	COĞRAFYA YELDA	TARİH GÜLEN	KİMYA HANDAN							
9.35-10.15	TYT MAT ESRA	BİYOLOJİ BERİNAY	TÜRKÇE DUYGU	GEOMETRİ SABRİ	COĞRAFYA YELDA	TARİH GÜLEN	KİMYA HANDAN							
10.25-11.05	TÜRKÇE EBRU	KİMYA HANDAN	FİZİK SEDA	COĞRAFYA YELDA	TARİH GÜLEN	GEOMETRİ ESRA	BİYOLOJİ BERİNAY							
11.15-11.55	TÜRKÇE EBRU	KİMYA HANDAN	FİZİK SEDA	COĞRAFYA YELDA	TARİH GÜLEN	GEOMETRİ ESRA	BİYOLOJİ BERİNAY							
12.05-12.45	FİZİK SEDA		AYT MAT SABRİ	EDEBİYAT EBRU	AYT MAT SABRİ	TÜRKÇE  DUYGU	ESRA MAT  TYT							
12.55-13.35	FİZİK SEDA		AYT MAT SABRİ	EDEBİYAT EBRU	AYT MAT SABRİ	TÜRKÇE DUYGU	ESRA MAT  TYT							
														
14.20-14.55									BİYOLOJİ BERİNAY	KİMYA HANDAN	TARİH GÜLEN	TÜRKÇE DUYGU	COĞRAFYA YELDA	FİZİK SEDA
15.00-15.35									BİYOLOJİ BERİNAY	KİMYA HANDAN	TARİH GÜLEN	TÜRKÇE DUYGU	COĞRAFYA YELDA	FİZİK SEDA
15.40-16.15									FİZİK SEDA	MAT ESRA	COĞRAFYA YELDA	MAT SABRİ	TARİH GÜLEN	TÜRKÇE EBRU
16.20-16.55									FİZİK SEDA	MAT ESRA	COĞRAFYA YELDA	MAT SABRİ	TARİH GÜLEN	TÜRKÇE EBRU
														
														
														
	                                                                        PAZAR													
	12 SAY 1                                  12 SAY 2                 12 SAY 3                           12 EA 1                     12 EA 2                            12 EA 3                       TYT                                      11 SAY 1                 11 SAY 2                    11 E A 1                       11 EA 2	12 SAY 2	12 SAY3	12 EA1	12 EA 2	12 EA 3	TYT	TYT	11 SAY1	11 SAY2	11 EA1	11 EA2	9. SINIF	9. SINIF
8.45-9.25	KİMYA ÖZLEM	GEOMETRİ ARZU	BİYOLOJİ SELİN	AYT MAT BERNA	FELSEFE NAZLI	AYT MAT MEHTAP	TÜRKÇE CÜNEYT	TÜRKÇE CÜNEYT						
9.35-10.15	KİMYA ÖZLEM	GEOMETRİ ARZU	BİYOLOJİ SELİN 	AYT MAT BERNA	FELSEFE NAZLI	AYT MAT MEHTAP	TÜRKÇE CÜNEYT	TÜRKÇE CÜNEYT						
10.25-11.05	AYT MAT MEHTAP	TYT MAT BERNA	GEOMETRİ ARZU	TARİH CEREN	TÜRKÇE ESRA	COĞRAFYA FİLİZ	FİZİK TUĞÇE	FELSEFE NAZLI						
11.15-11.55	AYT MAT MEHTAP	TYT MAT BERNA	GEOMETRİ ARZU	TARİH CEREN	TÜRKÇE ESRA	COĞRAFYA FİLİZ	FİZİK TUĞÇE	FELSEFE NAZLI						
12.05-12.45	BİYOLOJİ SELİN	TÜRKÇE CÜNEYT	KİMYA ÖZLEM	TÜRKÇE ESRA	GEO ARZU	FELSEFE NAZLI	COĞRAFYA FİLİZ	TARİH CEREN						
12.55-13.35	BİYOLOJİ SELİN	TÜRKÇE CÜNEYT	KİMYA ÖZLEM	TÜRKÇE ESRA	GEO ARZU	FELSEFE  NAZLI	COĞRAFYA FİLİZ	TARİH CEREN						
														
14.20-14.55									 MAT MEHTAP	 FİZİK TUĞÇE	MAT BERNA	COĞRAFYA FİLİZ	KİMYA ÖZLEM	BİYOLOJİ SELİN
15.00-15.35									 MAT MEHTAP	 FİZİK TUĞÇE	MAT BERNA	COĞRAFYA FİLİZ	KİMYA ÖZLEM	BİYOLOJİ SELİN
15.40-16.15									KİMYA ÖZLEM	BİYOLOJİ SELİN	TÜRKÇE ESRA	TARİH CEREN	MAT BERNA	MAT BERNA
16.20-16.55									KİMYA ÖZLEM	BİYOLOJİ SELİN	TÜRKÇE ESRA	TARİH CEREN	MAT BERNA	MAT BERNA`;

interface AiLearningPanelProps {
  currentPlans: PlanItem[];
  teachers: Teacher[];
  classes: ClassUnit[];
  classrooms: Classroom[];
  courses: Course[];
}

interface AIPattern {
  title: string;
  type: "teacher" | "classroom" | "cognitive" | "general";
  description: string;
}

interface AICompatibility {
  title: string;
  status: "success" | "info";
  description: string;
}

interface AIDeviation {
  title: string;
  status: "warning" | "info";
  description: string;
}

interface AIRecommendation {
  title: string;
  impact: "Yüksek" | "Orta" | "Düşük";
  description: string;
}

interface BranchMetric {
  key: string;
  label: string;
  rawKeywords: string[];
  group: "Matematik" | "Fen Bilimleri" | "Sosyal Bilimler" | "Türkçe & Edebiyat" | "Diğer";
}

interface AIAnalysisResult {
  patterns: AIPattern[];
  compatibility: AICompatibility[];
  deviations: AIDeviation[];
  recommendations: AIRecommendation[];
  aiInsights: string;
}

export default function AiLearningPanel({
  currentPlans,
  teachers,
  classes,
  classrooms,
  courses
}: AiLearningPanelProps) {
  // Toggle between unstructured copy-paste text and structured JSON archive files
  const [analysisMethod, setAnalysisMethod] = useState<"text" | "json">("text");

  const [unstructuredRawText, setUnstructuredRawText] = useState<string>(() => {
    const saved = localStorage.getItem("ata_unstructured_raw_text");
    return saved !== null ? saved : SAMPLE_RAW_SCHEDULE;
  });

  // Load past schedules from local storage or default to preloaded ones
  const [historicalSchedules, setHistoricalSchedules] = useState<HistoricalSchedule[]>(() => {
    const saved = localStorage.getItem("ata_historical_schedules");
    return saved ? JSON.parse(saved) : HISTORICAL_SCHEDULES;
  });

  const [selectedHistoricalId, setSelectedHistoricalId] = useState<string>(() => {
    return historicalSchedules.length > 0 ? historicalSchedules[0].id : "";
  });

  // Flexible Branch Mapping Configuration state
  const [branchesConfig, setBranchesConfig] = useState<BranchMetric[]>(() => {
    const saved = localStorage.getItem("ata_ai_branches_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      { key: "tyt_mat", label: "TYT Matematik", rawKeywords: ["TYT MAT", "TYT  MAT", "TYT MATEMATİK"], group: "Matematik" },
      { key: "ayt_mat", label: "AYT Matematik", rawKeywords: ["AYT MAT", "AYT  MAT", "AYT MATEMATİK"], group: "Matematik" },
      { key: "geometri", label: "Geometri", rawKeywords: ["GEOMETRİ", "GEOMETRI", "GEO"], group: "Matematik" },
      { key: "mat_genel", label: "Genel Matematik", rawKeywords: ["MAT ARZU", "MAT SABRİ", "MAT BERNA", "MAT ESRA", "MAT ", "MATEMATİK"], group: "Matematik" },
      { key: "fizik", label: "Fizik", rawKeywords: ["FİZİK", "FIZIK", "FİİZİK"], group: "Fen Bilimleri" },
      { key: "kimya", label: "Kimya", rawKeywords: ["KİMYA", "KIMYA"], group: "Fen Bilimleri" },
      { key: "biyoloji", label: "Biyoloji", rawKeywords: ["BİYOLOJİ", "BIYOLOJI", "BİYOLOJİBERİNAY"], group: "Fen Bilimleri" },
      { key: "turkce", label: "Türkçe", rawKeywords: ["TÜRKÇE", "TURKCE"], group: "Türkçe & Edebiyat" },
      { key: "edebiyat", label: "Edebiyat", rawKeywords: ["EDEBİYAT", "EDEBIYAT"], group: "Türkçe & Edebiyat" },
      { key: "tarih", label: "Tarih", rawKeywords: ["TARİH", "TARIH", "TARİHGÜLEN"], group: "Sosyal Bilimler" },
      { key: "cografya", label: "Coğrafya", rawKeywords: ["COĞRAFYA", "COGRAFYA"], group: "Sosyal Bilimler" },
      { key: "felsefe", label: "Felsefe", rawKeywords: ["FELSEFE"], group: "Sosyal Bilimler" }
    ];
  });

  const [showConfigSettings, setShowConfigSettings] = useState(false);
  const [newKeywordInputs, setNewKeywordInputs] = useState<Record<string, string>>({});
  const [newBranchLabel, setNewBranchLabel] = useState("");
  const [newBranchGroup, setNewBranchGroup] = useState<"Matematik" | "Fen Bilimleri" | "Sosyal Bilimler" | "Türkçe & Edebiyat" | "Diğer">("Diğer");
  const [newBranchKeywordsText, setNewBranchKeywordsText] = useState("");

  // Save config changes to local storage
  useEffect(() => {
    localStorage.setItem("ata_ai_branches_config", JSON.stringify(branchesConfig));
  }, [branchesConfig]);

  const handleAddKeyword = (branchKey: string) => {
    const kw = newKeywordInputs[branchKey]?.trim();
    if (!kw) return;
    setBranchesConfig(prev => prev.map(b => {
      if (b.key === branchKey) {
        if (b.rawKeywords.map(k => k.toUpperCase()).includes(kw.toUpperCase())) return b;
        return { ...b, rawKeywords: [...b.rawKeywords, kw] };
      }
      return b;
    }));
    setNewKeywordInputs(prev => ({ ...prev, [branchKey]: "" }));
  };

  const handleRemoveKeyword = (branchKey: string, keywordToRemove: string) => {
    setBranchesConfig(prev => prev.map(b => {
      if (b.key === branchKey) {
        return { ...b, rawKeywords: b.rawKeywords.filter(k => k !== keywordToRemove) };
      }
      return b;
    }));
  };

  const handleAddNewBranch = () => {
    if (!newBranchLabel.trim()) return;
    const key = "custom_" + Date.now();
    const keywords = newBranchKeywordsText.split(",").map(k => k.trim()).filter(Boolean);
    const newBranch: BranchMetric = {
      key,
      label: newBranchLabel.trim(),
      rawKeywords: keywords,
      group: newBranchGroup
    };
    setBranchesConfig(prev => [...prev, newBranch]);
    setNewBranchLabel("");
    setNewBranchKeywordsText("");
  };

  const handleDeleteBranch = (branchKey: string) => {
    if (confirm("Bu branşı silmek istediğinize emin misiniz?")) {
      setBranchesConfig(prev => prev.filter(b => b.key !== branchKey));
    }
  };

  const handleResetToDefaults = () => {
    if (confirm("Branş tanımlarını ve anahtar kelimelerini fabrika ayarlarına döndürmek istediğinize emin misiniz? Tüm özelleştirmeleriniz silinecektir.")) {
      localStorage.removeItem("ata_ai_branches_config");
      setBranchesConfig([
        { key: "tyt_mat", label: "TYT Matematik", rawKeywords: ["TYT MAT", "TYT  MAT", "TYT MATEMATİK"], group: "Matematik" },
        { key: "ayt_mat", label: "AYT Matematik", rawKeywords: ["AYT MAT", "AYT  MAT", "AYT MATEMATİK"], group: "Matematik" },
        { key: "geometri", label: "Geometri", rawKeywords: ["GEOMETRİ", "GEOMETRI", "GEO"], group: "Matematik" },
        { key: "mat_genel", label: "Genel Matematik", rawKeywords: ["MAT ARZU", "MAT SABRİ", "MAT BERNA", "MAT ESRA", "MAT ", "MATEMATİK"], group: "Matematik" },
        { key: "fizik", label: "Fizik", rawKeywords: ["FİZİK", "FIZIK", "FİİZİK"], group: "Fen Bilimleri" },
        { key: "kimya", label: "Kimya", rawKeywords: ["KİMYA", "KIMYA"], group: "Fen Bilimleri" },
        { key: "biyoloji", label: "Biyoloji", rawKeywords: ["BİYOLOJİ", "BIYOLOJI", "BİYOLOJİBERİNAY"], group: "Fen Bilimleri" },
        { key: "turkce", label: "Türkçe", rawKeywords: ["TÜRKÇE", "TURKCE"], group: "Türkçe & Edebiyat" },
        { key: "edebiyat", label: "Edebiyat", rawKeywords: ["EDEBİYAT", "EDEBIYAT"], group: "Türkçe & Edebiyat" },
        { key: "tarih", label: "Tarih", rawKeywords: ["TARİH", "TARIH", "TARİHGÜLEN"], group: "Sosyal Bilimler" },
        { key: "cografya", label: "Coğrafya", rawKeywords: ["COĞRAFYA", "COGRAFYA"], group: "Sosyal Bilimler" },
        { key: "felsefe", label: "Felsefe", rawKeywords: ["FELSEFE"], group: "Sosyal Bilimler" }
      ]);
    }
  };

  // Dynamic parsing function for paste text program
  const parseTextToBranchStats = (text: string) => {
    const stats: Record<string, number> = {};
    branchesConfig.forEach(b => {
      stats[b.key] = 0;
    });
    stats["other"] = 0;

    if (!text) return stats;

    const lines = text.split("\n");
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      const upperLine = trimmedLine.toUpperCase();
      const cells = trimmedLine.split(/\t| {2,}/);
      cells.forEach(cell => {
        const cleanCell = cell.trim().toUpperCase();
        if (!cleanCell || cleanCell === "SAATLER" || cleanCell.match(/^\d{1,2}\.\d{2}/) || cleanCell.includes("ARA") || cleanCell.includes("DAKİKA")) {
          return;
        }

        let matched = false;
        
        // Match specific ones first
        const specificBranches = branchesConfig.filter(b => b.key !== "mat_genel");
        const generalMat = branchesConfig.find(b => b.key === "mat_genel");

        for (const branch of specificBranches) {
          if (branch.rawKeywords.some(keyword => cleanCell.includes(keyword.toUpperCase()))) {
            stats[branch.key] = (stats[branch.key] || 0) + 1;
            matched = true;
            break;
          }
        }

        if (!matched && generalMat) {
          if (generalMat.rawKeywords.some(keyword => cleanCell.includes(keyword.toUpperCase()))) {
            stats[generalMat.key] = (stats[generalMat.key] || 0) + 1;
            matched = true;
          }
        }

        if (!matched) {
          if (cleanCell.length > 3 && !cleanCell.match(/^[0-9.-]+$/)) {
            stats["other"] = (stats["other"] || 0) + 1;
          }
        }
      });
    });

    return stats;
  };

  // Dynamic parsing function for active program plans
  const parsePlansToBranchStats = (plansList: PlanItem[]) => {
    const stats: Record<string, number> = {};
    branchesConfig.forEach(b => {
      stats[b.key] = 0;
    });
    stats["other"] = 0;

    plansList.forEach(plan => {
      if (plan.planTuru !== "Normal Ders") return;

      let branchName = "";
      const course = courses.find(c => c.id === plan.dersId);
      if (course) {
        branchName = (course.brans || course.dersAdi).toUpperCase();
      } else {
        const teacher = teachers.find(t => t.id === plan.ogretmenId);
        if (teacher) {
          branchName = (teacher.brans || "").toUpperCase();
        }
      }

      if (!branchName) return;

      let matched = false;
      const specificBranches = branchesConfig.filter(b => b.key !== "mat_genel");
      const generalMat = branchesConfig.find(b => b.key === "mat_genel");

      for (const branch of specificBranches) {
        if (branch.rawKeywords.some(keyword => branchName.includes(keyword.toUpperCase()) || keyword.toUpperCase().includes(branchName))) {
          stats[branch.key] = (stats[branch.key] || 0) + 1;
          matched = true;
          break;
        }
      }

      if (!matched && generalMat) {
        if (generalMat.rawKeywords.some(keyword => branchName.includes(keyword.toUpperCase()) || keyword.toUpperCase().includes(branchName))) {
          stats[generalMat.key] = (stats[generalMat.key] || 0) + 1;
          matched = true;
        }
      }

      if (!matched) {
        stats["other"] = (stats["other"] || 0) + 1;
      }
    });

    return stats;
  };

  const getPastProgramStats = () => {
    if (analysisMethod === "text") {
      return parseTextToBranchStats(unstructuredRawText);
    } else {
      const selectedHist = historicalSchedules.find(s => s.id === selectedHistoricalId);
      if (selectedHist && selectedHist.plans) {
        return parsePlansToBranchStats(selectedHist.plans);
      }
    }
    const emptyStats: Record<string, number> = {};
    branchesConfig.forEach(b => {
      emptyStats[b.key] = 0;
    });
    emptyStats["other"] = 0;
    return emptyStats;
  };

  // Derive stats dynamically!
  const pastStats = getPastProgramStats();
  const activeStats = parsePlansToBranchStats(currentPlans);

  const getGroupSum = (stats: Record<string, number>, groupName: string) => {
    return branchesConfig
      .filter(b => b.group === groupName)
      .reduce((sum, b) => sum + (stats[b.key] || 0), 0);
  };

  // State for AI analysis
  const [customPrompt, setCustomPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(() => {
    const saved = localStorage.getItem("ata_ai_analysis_result");
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Save unstructured raw text to local storage
  useEffect(() => {
    localStorage.setItem("ata_unstructured_raw_text", unstructuredRawText);
  }, [unstructuredRawText]);

  // Save historical schedules to local storage
  useEffect(() => {
    localStorage.setItem("ata_historical_schedules", JSON.stringify(historicalSchedules));
  }, [historicalSchedules]);

  // Save analysis result to local storage
  useEffect(() => {
    if (analysisResult) {
      localStorage.setItem("ata_ai_analysis_result", JSON.stringify(analysisResult));
    }
  }, [analysisResult]);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validate structure briefly
        if (!parsed.name || !Array.isArray(parsed.plans)) {
          alert("Geçersiz dosya formatı. Ders programı nesnesi 'name' ve 'plans' dizisi içermelidir.");
          return;
        }

        const newSchedule: HistoricalSchedule = {
          id: `hist-${Date.now()}`,
          name: parsed.name,
          uploadedAt: new Date().toISOString().split("T")[0],
          description: parsed.description || "Kullanıcı tarafından yüklenen geçmiş ders programı.",
          plans: parsed.plans,
          teachersCount: parsed.teachersCount || 10,
          classesCount: parsed.classesCount || 4
        };

        setHistoricalSchedules([newSchedule, ...historicalSchedules]);
        setSelectedHistoricalId(newSchedule.id);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } catch (err) {
        alert("Dosya okunamadı. Lütfen geçerli bir JSON dosyası yüklediğinizden emin olun.");
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteHistorical = (id: string) => {
    if (confirm("Bu geçmiş ders programını arşivden silmek istediğinize emin misiniz?")) {
      const filtered = historicalSchedules.filter((s) => s.id !== id);
      setHistoricalSchedules(filtered);
      if (selectedHistoricalId === id) {
        setSelectedHistoricalId(filtered.length > 0 ? filtered[0].id : "");
      }
    }
  };

  // Drag and drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => {
    setDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Pre-load default samples if list is empty
  const handleLoadSamples = () => {
    setHistoricalSchedules(HISTORICAL_SCHEDULES);
    if (HISTORICAL_SCHEDULES.length > 0) {
      setSelectedHistoricalId(HISTORICAL_SCHEDULES[0].id);
    }
  };

  // Clear current AI results
  const handleClearAnalysis = () => {
    setAnalysisResult(null);
    localStorage.removeItem("ata_ai_analysis_result");
  };

  // Call the server API endpoint for AI analysis
  const runAIAnalysis = async () => {
    setLoading(true);
    setLoadingStep(1);
    setError(null);

    // Simulate progressive loading steps for beautiful UX
    const timers = [
      setTimeout(() => setLoadingStep(2), 1200),
      setTimeout(() => setLoadingStep(3), 2400),
      setTimeout(() => setLoadingStep(4), 3800)
    ];

    try {
      const selectedHist = historicalSchedules.find((s) => s.id === selectedHistoricalId);
      
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentSchedule: {
            plans: currentPlans,
            teachers,
            classes,
            classrooms,
            courses
          },
          historicalSchedules: analysisMethod === "json" ? (selectedHist ? [selectedHist] : historicalSchedules) : [],
          unstructuredRawText: analysisMethod === "text" ? unstructuredRawText : "",
          customPrompt,
          branchAnalysis: {
            branchesConfig,
            pastStats,
            activeStats
          }
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Sunucu AI analizi sırasında hata döndürdü.");
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (err: any) {
      setError(err.message || "Yapay zeka analizi başlatılamadı. Lütfen internet bağlantınızı veya API anahtarınızı kontrol edin.");
    } finally {
      timers.forEach(clearTimeout);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  // Export current active schedule as JSON to make it easy for users to download and re-upload as past schedule!
  const handleExportCurrent = () => {
    const dataStr = JSON.stringify({
      name: `Ata Akademi Programı - ${new Date().toLocaleDateString("tr-TR")}`,
      description: "Sistemden dışa aktarılan aktif ders programı verisi.",
      plans: currentPlans,
      teachersCount: teachers.length,
      classesCount: classes.length
    }, null, 2);
    
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'ata_akademi_aktif_program.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Helper function to render formatted markdown response simply and cleanly
  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return <h4 key={index} className="text-sm font-bold text-slate-800 mt-4 mb-2 font-sans border-b border-slate-100 pb-1">{trimmed.replace("###", "").trim()}</h4>;
      } else if (trimmed.startsWith("##")) {
        return <h3 key={index} className="text-base font-bold text-indigo-950 mt-5 mb-2 font-sans">{trimmed.replace("##", "").trim()}</h3>;
      } else if (trimmed.startsWith("#")) {
        return <h2 key={index} className="text-lg font-bold text-indigo-900 mt-6 mb-3 font-sans">{trimmed.replace("#", "").trim()}</h2>;
      } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        return (
          <div key={index} className="flex items-start gap-2 ml-4 my-1 text-xs text-slate-650">
            <span className="text-indigo-500 mt-1">●</span>
            <span className="leading-relaxed">{trimmed.substring(1).trim()}</span>
          </div>
        );
      } else if (trimmed.match(/^\d+\./)) {
        return (
          <div key={index} className="flex items-start gap-2 ml-4 my-1 text-xs text-slate-650">
            <span className="font-bold text-indigo-600 font-mono">{trimmed.match(/^\d+\./)?.[0]}</span>
            <span className="leading-relaxed">{trimmed.replace(/^\d+\./, "").trim()}</span>
          </div>
        );
      } else if (trimmed === "") {
        return <div key={index} className="h-2"></div>;
      } else {
        // Simple bold parser
        const parts = trimmed.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} className="text-xs text-slate-600 leading-relaxed my-1.5 font-sans">
            {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-slate-800">{part}</strong> : part)}
          </p>
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Upper Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Historical Database Hub with flexible tabs */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-150 shadow-sm p-5 space-y-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 font-sans">Geçmiş Program Öğrenme</h3>
            </div>
            {analysisMethod === "json" && historicalSchedules.length === 0 && (
              <button
                onClick={handleLoadSamples}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                Örnekleri Yükle
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Yapay zekanın kurumsal alışkanlıklarınızı öğrenmesi için geçmiş haftalık programınızı yapıştırın veya arşiv program dosyasını yükleyin.
          </p>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setAnalysisMethod("text")}
              className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1 ${
                analysisMethod === "text"
                  ? "bg-white text-indigo-950 shadow-sm"
                  : "text-slate-600 hover:text-indigo-950 hover:bg-slate-50/50"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Metin / Tablo Yapıştır
            </button>
            <button
              type="button"
              onClick={() => setAnalysisMethod("json")}
              className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1 ${
                analysisMethod === "json"
                  ? "bg-white text-indigo-950 shadow-sm"
                  : "text-slate-600 hover:text-indigo-950 hover:bg-slate-50/50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              JSON Arşivi
            </button>
          </div>

          {/* Tab Content: Text Copy Paste */}
          {analysisMethod === "text" && (
            <div className="space-y-3 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700">Ders Programı Metni (Excel/Tablo)</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Metin alanını varsayılan Ata Akademi şablonu ile doldurmak ister misiniz?")) {
                        setUnstructuredRawText(SAMPLE_RAW_SCHEDULE);
                      }
                    }}
                    className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                  >
                    Varsayılana Dön
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setUnstructuredRawText("")}
                    className="text-[9px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                  >
                    Temizle
                  </button>
                </div>
              </div>

              <textarea
                value={unstructuredRawText}
                onChange={(e) => setUnstructuredRawText(e.target.value)}
                placeholder="Excel veya tablolardan kopyaladığınız ders programı metnini buraya yapıştırın. Yapay zeka öğretmenleri, şubeleri, saatleri ve blok yapıları otomatik çıkaracaktır."
                className="w-full h-64 p-2 text-[10px] border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono resize-none leading-normal"
              />

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150 flex items-start gap-1.5 text-[9px] text-slate-500 leading-normal">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Yukarıda, paylaştığınız <strong>Ata Akademi ders programı</strong> tam uyumlu olarak preloaded edilmiştir. Analizi başlatarak bu şablonun kurallarını mevcut programa uygulayabilirsiniz.
                </span>
              </div>
            </div>
          )}

          {/* Tab Content: JSON File Archive */}
          {analysisMethod === "json" && (
            <div className="space-y-4">
              {/* Drag & Drop File Zone */}
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition relative ${
                  dragOver 
                    ? "border-indigo-500 bg-indigo-50/50" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <Upload className={`w-5 h-5 ${dragOver ? "text-indigo-600 animate-bounce" : "text-slate-400"}`} />
                  <div className="text-[10px] font-bold text-slate-700">
                    {uploadSuccess ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Dosya Başarıyla Yüklendi!
                      </span>
                    ) : (
                      "Sürükle bırak veya bilgisayarından seç"
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Sadece program .JSON dosyaları</span>
                </div>
              </div>

              {/* List of historical schedules */}
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {historicalSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    onClick={() => setSelectedHistoricalId(schedule.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-start justify-between gap-2 ${
                      selectedHistoricalId === schedule.id
                        ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30"
                        : "border-slate-150 hover:border-slate-250 hover:bg-slate-50/30"
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${selectedHistoricalId === schedule.id ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-[11px] font-bold text-slate-800 truncate">{schedule.name}</span>
                      </div>
                      <p className="text-[9px] text-slate-505 line-clamp-1">{schedule.description}</p>
                      <div className="flex items-center gap-3 text-[8px] text-slate-400 font-medium pt-1 font-mono">
                        <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> {schedule.uploadedAt}</span>
                        <span>• {schedule.plans.length} Atama</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHistorical(schedule.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                      title="Arşivden Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {historicalSchedules.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-[10px] font-medium border border-dashed border-slate-200 rounded-xl">
                    Arşivde eski ders programı bulunamadı.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick instructions and active export */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex flex-col gap-2 mt-auto">
            <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-500" /> Aktif Programı İndirin
            </span>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Mevcut ders programınızı referans olarak kullanmak ve yapay zekaya öğretmek için indirin.
            </p>
            <button
              onClick={handleExportCurrent}
              disabled={currentPlans.length === 0}
              className="mt-1 w-full py-1.5 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              Mevcut Programı Dışa Aktar (.JSON)
            </button>
          </div>

        </div>

        {/* Right column: AI Optimization Engine panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-150 shadow-sm p-5 flex flex-col justify-between space-y-4">
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg animate-pulse">
                <Brain className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 font-sans">Ata Akademi Yapay Zeka Öğrenme Paneli</h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Gemini yapay zeka motoru, geçmişteki tüm başarılı atamaları tarayarak öğretmenlerinizin ideal çalışma saatleri, branşların ders yükü yığılımları ve sınıfların performans saatleri hakkında çıkarımlar yapar.
            </p>
          </div>

          {/* Custom Question input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-505" /> Özel AI Odak Sorusu (Opsiyonel)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Yapay zekanın özellikle odaklanmasını istediğiniz konuyu yazın. Örn: 'LGS öğretmenlerinin öğleden sonraki boşluklarını geçmiş yıllara göre değerlendir' veya 'YKS sayısal ders yığılımlarını incele'."
              className="w-full h-20 p-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition placeholder-slate-400 font-sans"
            />
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={runAIAnalysis}
              disabled={loading || (analysisMethod === "json" && historicalSchedules.length === 0) || (analysisMethod === "text" && !unstructuredRawText.trim()) || currentPlans.length === 0}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-md disabled:from-slate-300 disabled:to-slate-300 disabled:opacity-50 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Eski Programlardan Öğren & Mevcutla Karşılaştır
                </>
              )}
            </button>

            {analysisResult && (
              <button
                type="button"
                onClick={handleClearAnalysis}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Analizleri Temizle
              </button>
            )}
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Analiz Hatası:</strong>
                <p className="mt-0.5 text-[11px] leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Progressive Loading State UI */}
          {loading && (
            <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100/50 space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  Yapay Zeka Çıkarım Yapıyor...
                </span>
                <span className="text-[10px] font-mono font-bold text-indigo-600">{loadingStep * 25}%</span>
              </div>
              
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${loadingStep * 25}%` }}
                ></div>
              </div>

              <div className="space-y-1.5 text-[10px] font-semibold text-slate-600 font-sans">
                <div className={`flex items-center gap-2 transition-opacity ${loadingStep >= 1 ? "opacity-100 text-indigo-950" : "opacity-40"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${loadingStep >= 1 ? "text-indigo-600" : "text-slate-400"}`} />
                  Eski programlardaki öğretmen ve ders dağılım tercihleri öğreniliyor...
                </div>
                <div className={`flex items-center gap-2 transition-opacity ${loadingStep >= 2 ? "opacity-100 text-indigo-950" : "opacity-40"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${loadingStep >= 2 ? "text-indigo-600" : "text-slate-400"}`} />
                  Aktif program kısıtları ve yerleşim durumları derleniyor...
                </div>
                <div className={`flex items-center gap-2 transition-opacity ${loadingStep >= 3 ? "opacity-100 text-indigo-950" : "opacity-40"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${loadingStep >= 3 ? "text-indigo-600" : "text-slate-400"}`} />
                  Gemini-3.5 AI bilişsel yük ve ders dengesi analizini yürütüyor...
                </div>
                <div className={`flex items-center gap-2 transition-opacity ${loadingStep >= 4 ? "opacity-100 text-indigo-950" : "opacity-40"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${loadingStep >= 4 ? "text-indigo-600" : "text-slate-400"}`} />
                  Çakışma ve verimlilik artırıcı takas tavsiyeleri formüle ediliyor...
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Branş Bazlı Ders Saati Yükü Tablosu ve Analizörü */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm p-5 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 font-sans">Branş Bazlı Ders Saati Yükü Analizörü</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Yapıştırılan örnek program ile aktif olarak tasarladığınız ders programının branş yükü karşılaştırması.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowConfigSettings(!showConfigSettings)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border ${
              showConfigSettings 
                ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Settings className={`w-3.5 h-3.5 ${showConfigSettings ? "animate-spin-slow text-indigo-600" : "text-slate-500"}`} />
            Branş Eşleme Ayarları
          </button>
        </div>

        {/* Group Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Matematik", color: "from-blue-500 to-indigo-600", bg: "bg-blue-50/50", text: "text-blue-700" },
            { name: "Fen Bilimleri", color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50/50", text: "text-emerald-700" },
            { name: "Türkçe & Edebiyat", color: "from-amber-500 to-orange-600", bg: "bg-amber-50/50", text: "text-amber-700" },
            { name: "Sosyal Bilimler", color: "from-purple-500 to-pink-600", bg: "bg-purple-50/50", text: "text-purple-700" }
          ].map((grp) => {
            const pastSum = getGroupSum(pastStats, grp.name);
            const activeSum = getGroupSum(activeStats, grp.name);
            const ratio = pastSum > 0 ? Math.min(100, Math.round((activeSum / pastSum) * 100)) : 100;
            return (
              <div key={grp.name} className={`p-4 rounded-xl border border-slate-150 ${grp.bg} flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{grp.name} Grubu</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${grp.text} bg-white border border-slate-200`}>
                    {pastSum > 0 ? `%${ratio} Yerleşim` : "0 / 0 Saat"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-800">{activeSum} <span className="text-xs font-medium text-slate-500">saat</span></span>
                  <span className="text-xs text-slate-400 font-medium font-mono">/ {pastSum} saat</span>
                </div>
                {/* Visual Ratio Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${grp.color} rounded-full`} style={{ width: `${ratio}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-slate-400">
                    <span>Aktif Program</span>
                    <span>Referans Program</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Side-by-Side: Comparison table and settings drawer */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Comparison table card */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Branş Bazlı Detaylı Saat Dağılımı
              </span>
              <span className="text-[10px] text-slate-400 font-medium font-mono">Toplam {branchesConfig.length} Tanımlı Branş</span>
            </div>

            <div className="border border-slate-150 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-150 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider font-mono">
                      <th className="py-2.5 px-4">Branş / Ders</th>
                      <th className="py-2.5 px-3">Grup</th>
                      <th className="py-2.5 px-3 text-center">Referans (Geçmiş)</th>
                      <th className="py-2.5 px-3 text-center">Aktif Taslak</th>
                      <th className="py-2.5 px-4 text-right">Sapma (Fark)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {branchesConfig.map((branch) => {
                      const past = pastStats[branch.key] || 0;
                      const active = activeStats[branch.key] || 0;
                      const diff = active - past;
                      
                      return (
                        <tr key={branch.key} className="hover:bg-slate-50/40 transition">
                          <td className="py-3 px-4 font-bold text-slate-800">{branch.label}</td>
                          <td className="py-3 px-3">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              branch.group === "Matematik" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                              branch.group === "Fen Bilimleri" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              branch.group === "Türkçe & Edebiyat" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                              branch.group === "Sosyal Bilimler" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {branch.group}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold font-mono text-slate-500">{past} saat</td>
                          <td className="py-3 px-3 text-center font-bold font-mono text-indigo-950">{active} saat</td>
                          <td className="py-3 px-4 text-right">
                            {diff === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <CheckCircle2 className="w-3 h-3" /> Uyumlu
                              </span>
                            ) : diff > 0 ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 font-mono">
                                +{diff} saat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 font-mono font-bold">
                                {diff} saat
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Other category */}
                    <tr className="hover:bg-slate-50/40 transition bg-slate-50/20 font-medium">
                      <td className="py-3 px-4 font-bold text-slate-505 text-slate-600">Eşleşmeyen Diğer Kelimeler</td>
                      <td className="py-3 px-3"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">Diğer</span></td>
                      <td className="py-3 px-3 text-center font-semibold font-mono text-slate-400">{pastStats["other"] || 0} saat</td>
                      <td className="py-3 px-3 text-center font-semibold font-mono text-slate-400">{activeStats["other"] || 0} saat</td>
                      <td className="py-3 px-4 text-right">
                        {((activeStats["other"] || 0) - (pastStats["other"] || 0)) === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                            0 Fark
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                            {((activeStats["other"] || 0) - (pastStats["other"] || 0)) > 0 ? "+" : ""}{(activeStats["other"] || 0) - (pastStats["other"] || 0)} saat
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Settings Drawer */}
          <div className={`${showConfigSettings ? "block" : "hidden xl:block opacity-75 hover:opacity-100 transition-opacity"} border border-slate-150 rounded-xl p-4 bg-slate-50/50 space-y-4 h-fit`}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-sans">
                <Settings className="w-3.5 h-3.5 text-slate-500" /> Esnek Branş Kuralları
              </span>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="text-[9px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                Varsayılana Dön
              </button>
            </div>

            {/* Existing branches mapping */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {branchesConfig.map((branch) => (
                <div key={branch.key} className="p-3 bg-white border border-slate-150 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800">{branch.label}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteBranch(branch.key)}
                      className="text-[9px] text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="Branşı Sil"
                    >
                      Sil
                    </button>
                  </div>
                  
                  {/* Keyword Tags */}
                  <div className="flex flex-wrap gap-1">
                    {branch.rawKeywords.map((kw, kwIdx) => (
                      <span 
                        key={kwIdx} 
                        className="inline-flex items-center gap-1 text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 border border-slate-200 transition cursor-pointer"
                        onClick={() => handleRemoveKeyword(branch.key, kw)}
                        title="Silmek için tıklayın"
                      >
                        {kw} <span className="text-[7px] text-slate-400 font-normal">×</span>
                      </span>
                    ))}
                    {branch.rawKeywords.length === 0 && (
                      <span className="text-[9px] text-slate-400 italic">Anahtar kelime tanımlanmamış.</span>
                    )}
                  </div>

                  {/* Add keyword to branch input */}
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Yeni anahtar kelime..."
                      value={newKeywordInputs[branch.key] || ""}
                      onChange={(e) => setNewKeywordInputs(prev => ({ ...prev, [branch.key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddKeyword(branch.key);
                        }
                      }}
                      className="flex-1 px-2 py-1 text-[10px] border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddKeyword(branch.key)}
                      className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-md transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new custom branch */}
            <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-2.5 pt-3">
              <span className="text-[10px] font-extrabold text-indigo-950 uppercase tracking-wider block font-mono">
                + Yeni Branş / Ders Ekle
              </span>
              
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Branş Adı (örn: Coğrafya)"
                  value={newBranchLabel}
                  onChange={(e) => setNewBranchLabel(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />

                <select
                  value={newBranchGroup}
                  onChange={(e) => setNewBranchGroup(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="Matematik">Matematik</option>
                  <option value="Fen Bilimleri">Fen Bilimleri</option>
                  <option value="Türkçe & Edebiyat">Türkçe & Edebiyat</option>
                  <option value="Sosyal Bilimler">Sosyal Bilimler</option>
                  <option value="Diğer">Diğer</option>
                </select>

                <input
                  type="text"
                  placeholder="Kelimeler (virgülle ayırın, örn: COĞ, COGRAFYA)"
                  value={newBranchKeywordsText}
                  onChange={(e) => setNewBranchKeywordsText(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                />

                <button
                  type="button"
                  onClick={handleAddNewBranch}
                  disabled={!newBranchLabel.trim()}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Branşı Kaydet
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Lower Block: AI Insights Output */}
      {analysisResult && !loading && (
        <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden animate-fade-in">
          
          {/* Header Banner */}
          <div className="p-4 bg-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold font-sans">Yapay Zeka Analiz Raporu & Çıkarımları</h3>
                <p className="text-[10px] text-indigo-200">Arşiv verilerinden öğrenilen şablonlar doğrultusunda çıkarımlar ve tavsiyeler.</p>
              </div>
            </div>
            <div className="text-[10px] bg-indigo-900 border border-indigo-700 px-2 py-1 rounded-lg font-mono">
              Model: gemini-3.5-flash
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Bento Grid: Patterns, Compatibility, Deviations, Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Box 1: Learned Patterns */}
              <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Brain className="w-4 h-4 text-purple-600" />
                  Geçmişten Öğrenilen Desenler
                </div>
                <div className="space-y-2">
                  {analysisResult.patterns?.map((p, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200/60 text-[11px]">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        {p.title}
                      </div>
                      <p className="text-slate-505 text-slate-500 mt-1 leading-relaxed">{p.description}</p>
                    </div>
                  ))}
                  {(!analysisResult.patterns || analysisResult.patterns.length === 0) && (
                    <p className="text-[11px] text-slate-400 text-center py-2">Desen saptanamadı.</p>
                  )}
                </div>
              </div>

              {/* Box 2: Matching Decisions (Compatibility) */}
              <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Tarihsel Uyumlu Kararlar
                </div>
                <div className="space-y-2">
                  {analysisResult.compatibility?.map((c, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200/60 text-[11px]">
                      <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {c.title}
                      </div>
                      <p className="text-slate-505 text-slate-500 mt-1 leading-relaxed">{c.description}</p>
                    </div>
                  ))}
                  {(!analysisResult.compatibility || analysisResult.compatibility.length === 0) && (
                    <p className="text-[11px] text-slate-400 text-center py-2">Tam uyum eşleşmesi saptanamadı.</p>
                  )}
                </div>
              </div>

              {/* Box 3: Deviations / Variations */}
              <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Alışılmış Dışı Sapmalar / Değişiklikler
                </div>
                <div className="space-y-2">
                  {analysisResult.deviations?.map((d, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200/60 text-[11px]">
                      <div className="font-bold text-amber-700 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {d.title}
                      </div>
                      <p className="text-slate-505 text-slate-500 mt-1 leading-relaxed">{d.description}</p>
                    </div>
                  ))}
                  {(!analysisResult.deviations || analysisResult.deviations.length === 0) && (
                    <p className="text-[11px] text-slate-400 text-center py-2">Sapma gözlenmedi.</p>
                  )}
                </div>
              </div>

              {/* Box 4: Optimization Suggestions */}
              <div className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Lightbulb className="w-4 h-4 text-indigo-600 animate-bounce" />
                  AI Optimizasyon ve Yerleşim Önerileri
                </div>
                <div className="space-y-2">
                  {analysisResult.recommendations?.map((r, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200/60 text-[11px]">
                      <div className="font-bold text-indigo-950 flex items-center justify-between gap-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          {r.title}
                        </span>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${
                          r.impact === "Yüksek" 
                            ? "bg-rose-100 text-rose-700" 
                            : r.impact === "Orta" 
                              ? "bg-amber-100 text-amber-700" 
                              : "bg-slate-100 text-slate-600"
                        }`}>
                          Etki: {r.impact}
                        </span>
                      </div>
                      <p className="text-slate-505 text-slate-500 mt-1 leading-relaxed">{r.description}</p>
                    </div>
                  ))}
                  {(!analysisResult.recommendations || analysisResult.recommendations.length === 0) && (
                    <p className="text-[11px] text-slate-400 text-center py-2">Öneri üretilmedi.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Detailed Evaluation Report (Markdown output) */}
            <div className="p-5 rounded-2xl border border-slate-150 bg-white shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 border-b border-slate-100 pb-3">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Ata Akademi Eğitim Planlama Yöneticisi Değerlendirme Raporu
              </div>
              
              <div className="px-2 pb-2">
                {renderMarkdownText(analysisResult.aiInsights)}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
