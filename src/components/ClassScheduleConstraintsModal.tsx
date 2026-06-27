import { useState, useEffect } from "react";
import { X, Calendar, CheckCircle2, Clock } from "lucide-react";
import { ClassUnit } from "../types";
import { SchoolScheduleConfig, getActivePeriodsCountForDay, getMasterTimeSlots } from "../utils/timeSettings";

interface ClassScheduleConstraintsModalProps {
  cls: ClassUnit;
  config: SchoolScheduleConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCls: ClassUnit) => void;
}

export default function ClassScheduleConstraintsModal({
  cls,
  config,
  isOpen,
  onClose,
  onSave
}: ClassScheduleConstraintsModalProps) {
  // If undefined, assume all valid slots are active
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      if (cls.uygunPeriyotlar && cls.uygunPeriyotlar.length > 0) {
        setSelectedSlots(new Set(cls.uygunPeriyotlar));
      } else {
        // Initialize with all active slots by default
        const allSet = new Set<string>();
        config.activeDays.forEach(day => {
          const maxP = getActivePeriodsCountForDay(day, config);
          for (let p = 1; p <= maxP; p++) {
            allSet.add(`${day}-${p}`);
          }
        });
        setSelectedSlots(allSet);
      }
    }
  }, [isOpen, cls, config]);

  if (!isOpen) return null;

  const toggleSlot = (day: string, p: number) => {
    const slotId = `${day}-${p}`;
    const newSet = new Set(selectedSlots);
    if (newSet.has(slotId)) {
      newSet.delete(slotId);
    } else {
      newSet.add(slotId);
    }
    setSelectedSlots(newSet);
  };

  const toggleDay = (day: string) => {
    const maxP = getActivePeriodsCountForDay(day, config);
    let allOnDaySelected = true;
    for (let p = 1; p <= maxP; p++) {
      if (!selectedSlots.has(`${day}-${p}`)) {
        allOnDaySelected = false;
        break;
      }
    }

    const newSet = new Set(selectedSlots);
    for (let p = 1; p <= maxP; p++) {
      if (allOnDaySelected) {
        newSet.delete(`${day}-${p}`);
      } else {
        newSet.add(`${day}-${p}`);
      }
    }
    setSelectedSlots(newSet);
  };

  const handleSave = () => {
    onSave({
      ...cls,
      uygunPeriyotlar: Array.from(selectedSlots)
    });
    onClose();
  };

  const maxMasterSlots = getMasterTimeSlots(config);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Sınıf Zaman Kısıtlamaları
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {cls.sinifAdi} sınıfının ders alabileceği gün ve saatleri seçin.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-900 leading-relaxed font-medium">
              Sınıfın derse katılabileceği yeşil blokları işaretleyin (örn: sadece akşam seansları veya haftasonu grupları).
              Sadece aktif olarak tanımlanmış gün ve periyotlar listelenmektedir. Tüm blokları hızlıca açıp kapamak için gün başlıklarına tıklayabilirsiniz.
            </p>
          </div>

          <div className="overflow-x-auto bg-slate-50 rounded-xl border border-slate-200">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200">
                  <th className="p-3 text-left font-bold text-slate-600 w-32 border-r border-slate-200">Gün</th>
                  {maxMasterSlots.map((slot) => (
                    <th key={slot.periyotNo} className="p-2 text-center font-bold text-slate-600 border-r border-slate-200 last:border-0 min-w-[70px]">
                      <div className="mb-1">P{slot.periyotNo}</div>
                      <div className="text-[9px] text-slate-400 font-mono font-normal">
                        {slot.baslangicSaati}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.activeDays.map((day) => {
                  const dayActiveCount = getActivePeriodsCountForDay(day, config);
                  
                  return (
                    <tr key={day} className="border-b border-slate-200 last:border-0 hover:bg-slate-100/30 transition-colors">
                      <td 
                        className="p-3 font-bold text-slate-700 bg-white border-r border-slate-200 cursor-pointer hover:text-indigo-600 select-none"
                        onClick={() => toggleDay(day)}
                      >
                        {day}
                      </td>
                      {maxMasterSlots.map((slot) => {
                        const isClosed = slot.periyotNo > dayActiveCount;
                        if (isClosed) {
                          return (
                            <td key={slot.periyotNo} className="p-2 bg-slate-200/50 border-r border-slate-200 last:border-0 text-center">
                              <span className="text-[9px] text-slate-400 block tracking-wider uppercase opacity-50">Kapalı</span>
                            </td>
                          );
                        }

                        const isSelected = selectedSlots.has(`${day}-${slot.periyotNo}`);
                        
                        return (
                          <td 
                            key={slot.periyotNo} 
                            className="p-1 border-r border-slate-200 last:border-0"
                          >
                            <button
                              onClick={() => toggleSlot(day, slot.periyotNo)}
                              className={`w-full h-12 rounded-lg flex items-center justify-center transition-all ${
                                isSelected 
                                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" 
                                  : "bg-white hover:bg-slate-100 text-slate-300 border border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border border-slate-300" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl mt-auto">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors bg-slate-200/50"
          >
            İptal
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            Değişiklikleri Kaydet
          </button>
        </div>

      </div>
    </div>
  );
}
