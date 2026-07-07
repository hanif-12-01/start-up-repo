"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Zap, ChevronLeft, ChevronRight, X, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  body: string;
  target?: string; // data-tour value
}

const TOUR_VERSION = "1.0.0";

const steps: TourStep[] = [
  {
    title: "Baru pertama kali pakai WattWise?",
    body: "Kami akan bantu tunjukkan bagian penting agar Anda tahu harus mulai dari mana.",
  },
  {
    target: "dashboard-title",
    title: "Ringkasan listrik bulan ini",
    body: "Di halaman ini Anda melihat kondisi listrik kos atau usaha berdasarkan data yang sudah Anda masukkan.",
  },
  {
    target: "stat-estimated-cost",
    title: "Perkiraan biaya listrik",
    body: "Angka ini membantu Anda memperkirakan biaya listrik bulan ini. Ini bukan tagihan resmi PLN, tetapi perkiraan dari data yang Anda input.",
  },
  {
    target: "stat-usage",
    title: "Pemakaian listrik",
    body: "Bagian ini menunjukkan jumlah pemakaian listrik dalam kWh. Kalau belum paham kWh, cukup ingat: semakin tinggi angkanya, biasanya biaya listrik ikut naik.",
  },
  {
    target: "stat-saving",
    title: "Peluang hemat",
    body: "Di sini WattWise memperkirakan berapa rupiah yang mungkin bisa dihemat jika saran hemat dijalankan.",
  },
  {
    target: "stat-status",
    title: "Status bulan ini",
    body: "Status ini membantu Anda tahu apakah pemakaian masih aman, perlu dicek, atau cenderung boros.",
  },
  {
    target: "run-analysis",
    title: "Jalankan analisis",
    body: "Gunakan tombol ini setelah data listrik diperbarui. WattWise akan membaca pola terbaru dan memperbarui ringkasan.",
  },
  {
    target: "pattern-reading",
    title: "Cara WattWise membaca pola",
    body: "WattWise membandingkan data bulan ini, bulan sebelumnya, rata-rata pemakaian, dan data peralatan yang Anda input.",
  },
  {
    target: "technical-detail",
    title: "Detail teknis untuk yang ingin tahu",
    body: "Jika Anda atau teknisi ingin melihat asumsi perhitungan, buka bagian detail teknis. Pengguna awam boleh melewati bagian ini.",
  },
  {
    target: "sidebar-catat-data",
    title: "Mulai dari catat data",
    body: "Langkah paling penting adalah mencatat tagihan, token, kWh, atau angka meter secara rutin setiap bulan.",
  },
  {
    target: "sidebar-rekomendasi",
    title: "Lihat saran hemat",
    body: "Setelah data masuk, buka saran hemat untuk melihat langkah sederhana yang bisa dilakukan.",
  },
  {
    target: "sidebar-laporan",
    title: "Gunakan laporan internal",
    body: "Laporan bulanan membantu Anda mengevaluasi biaya listrik kos atau usaha dari waktu ke waktu.",
  },
  {
    title: "Panduan selesai",
    body: "Sekarang Anda bisa mulai dari Catat Data, lalu kembali ke Ringkasan Listrik Bulan Ini untuk melihat hasilnya.",
  },
];

interface HighlightCoords {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function GuidedTour() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<HighlightCoords | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);

  // Load initial settings
  useEffect(() => {
    setMounted(true);
    
    const completed = localStorage.getItem("wattwise_guided_tour_completed");
    const skipped = localStorage.getItem("wattwise_guided_tour_skipped");
    const version = localStorage.getItem("wattwise_guided_tour_version");

    if (version !== TOUR_VERSION) {
      localStorage.removeItem("wattwise_guided_tour_completed");
      localStorage.removeItem("wattwise_guided_tour_skipped");
      localStorage.setItem("wattwise_guided_tour_version", TOUR_VERSION);
      setActive(true);
      setCurrentStep(0);
    } else if (!completed && !skipped) {
      setActive(true);
      setCurrentStep(0);
    }
  }, []);

  // Update target element highlight coordinates
  const updateCoords = useCallback(() => {
    if (!active) return;
    
    const step = steps[currentStep];
    if (!step?.target) {
      setCoords(null);
      return;
    }

    const element = document.querySelector(`[data-tour="${step.target}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      // Only highlight if element is actually visible / has layout size
      if (rect.width > 0 && rect.height > 0) {
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        return;
      }
    }
    
    // Fallback to center if element not found or not rendered
    setCoords(null);
  }, [active, currentStep]);

  // Recalculate positions on scroll or resize
  useEffect(() => {
    if (!active) return;

    window.addEventListener("resize", updateCoords, { passive: true });
    window.addEventListener("scroll", updateCoords, { passive: true });

    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords);
    };
  }, [active, updateCoords]);

  // Handle step change side-effects (e.g. scroll target into view)
  useEffect(() => {
    if (!active) return;

    updateCoords();

    const step = steps[currentStep];
    if (step?.target) {
      // Give DOM time to update or animate if needed
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-tour="${step.target}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Re-calculate after smooth scroll has finished
          setTimeout(updateCoords, 300);
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [currentStep, active, updateCoords]);

  // Keyboard navigation & listener for custom reset event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key === "Escape") {
        handleSkip();
      }
    };

    const handleRestartTour = () => {
      setActive(true);
      setCurrentStep(0);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wattwise-start-tour", handleRestartTour);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wattwise-start-tour", handleRestartTour);
    };
  }, [active]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("wattwise_guided_tour_skipped", "true");
    setActive(false);
  };

  const handleComplete = () => {
    localStorage.setItem("wattwise_guided_tour_completed", "true");
    setActive(false);
  };

  const handleRestart = () => {
    setCurrentStep(1); // Skip the welcome step when manually restarting
  };

  if (!mounted || !active) return null;

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Determine card inline positioning (Desktop only)
  const getCardStyle = (): React.CSSProperties => {
    if (!coords) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "380px",
        zIndex: 9995,
      };
    }

    const cardWidth = 340;
    const cardHeight = 220;
    const gap = 12;

    const spaceBelow = window.innerHeight - (coords.top + coords.height);
    const spaceAbove = coords.top;
    
    const style: React.CSSProperties = {
      position: "fixed",
      zIndex: 9995,
      width: `${cardWidth}px`,
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    };

    // Calculate vertical position
    if (spaceBelow >= cardHeight) {
      style.top = `${coords.top + coords.height + gap}px`;
    } else if (spaceAbove >= cardHeight) {
      style.top = `${coords.top - cardHeight - gap}px`;
    } else {
      style.top = `${Math.max(20, (window.innerHeight - cardHeight) / 2)}px`;
    }

    // Calculate horizontal position (centered to target, within viewport padding)
    const targetCenter = coords.left + coords.width / 2;
    let cardLeft = targetCenter - cardWidth / 2;
    cardLeft = Math.max(20, Math.min(window.innerWidth - cardWidth - 20, cardLeft));
    style.left = `${cardLeft}px`;

    return style;
  };

  return (
    <>
      {/* ─── Cutout Highlight Layer ─── */}
      {coords && (
        <div
          style={{
            position: "fixed",
            top: `${coords.top - 6}px`,
            left: `${coords.left - 6}px`,
            width: `${coords.width + 12}px`,
            height: `${coords.height + 12}px`,
            borderRadius: "12px",
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)",
            zIndex: 9990,
            pointerEvents: "none",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          className="border-2 border-indigo-500/80 animate-in fade-in duration-200"
        />
      )}

      {/* ─── Centered Backdrop (when no target highlighted) ─── */}
      {!coords && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            zIndex: 9990,
          }}
          className="backdrop-blur-2xs animate-in fade-in duration-200"
          onClick={handleSkip}
        />
      )}

      {/* ─── Guided Tour Explanation Card ─── */}
      <div
        ref={cardRef}
        style={getCardStyle()}
        className={cn(
          "bg-white shadow-2xl border border-slate-100 font-sans animate-in zoom-in-95 duration-200",
          // Mobile responsive: dock to bottom
          coords 
            ? "fixed max-md:!bottom-4 max-md:!left-4 max-md:!right-4 max-md:!top-auto max-md:!width-auto max-md:!transform-none p-5 rounded-2xl" 
            : "p-6 rounded-3xl"
        )}
      >
        {/* Welcome Step Header Decoration */}
        {isFirstStep && (
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-4 animate-bounce">
            <Sparkles className="h-6 w-6" />
          </div>
        )}

        {/* Header Title */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className={cn(
            "font-extrabold text-slate-800 tracking-tight leading-tight",
            isFirstStep || isLastStep ? "text-lg text-center w-full" : "text-sm text-left"
          )}>
            {currentStepData.title}
          </h3>
          {!isFirstStep && !isLastStep && (
            <button
              onClick={handleSkip}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
              title="Tutup Panduan (ESC)"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body Content */}
        <p className={cn(
          "text-xs leading-relaxed text-slate-500 font-medium",
          isFirstStep || isLastStep ? "text-center mb-5" : "text-left mb-4"
        )}>
          {currentStepData.body}
        </p>

        {/* Step Indicator (Non-first / Non-last steps) */}
        {!isFirstStep && !isLastStep && (
          <div className="flex justify-between items-center mb-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Panduan WattWise</span>
            <span>{currentStep} / {steps.length - 2}</span>
          </div>
        )}

        {/* ─── Footer Controls ─── */}
        <div className={cn(
          "flex items-center gap-2",
          isFirstStep || isLastStep ? "justify-center" : "justify-between"
        )}>
          {isFirstStep ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleSkip}
                className="btn btn-outline border-slate-200 text-slate-500 hover:bg-slate-50 py-2.5 px-4 text-xs font-bold w-1/2 rounded-xl"
              >
                Lewati Dulu
              </button>
              <button
                onClick={handleNext}
                className="btn-primary py-2.5 px-4 text-xs font-bold w-1/2 flex items-center justify-center gap-1.5"
              >
                Mulai Panduan <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : isLastStep ? (
            <div className="flex gap-2 w-full">
              <button
                onClick={handleRestart}
                className="btn btn-outline border-slate-200 text-slate-650 hover:bg-slate-50 py-2.5 px-4 text-xs font-bold w-1/2 rounded-xl"
              >
                Ulangi Panduan
              </button>
              <button
                onClick={handleComplete}
                className="btn-primary py-2.5 px-4 text-xs font-bold w-1/2 flex items-center justify-center gap-1.5"
              >
                Selesai
              </button>
            </div>
          ) : (
            <>
              {/* Skip button for middle steps */}
              <button
                onClick={handleSkip}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-650 transition-colors py-1.5 px-2 rounded-lg"
              >
                Lewati
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleBack}
                  className="btn btn-outline border-slate-200 text-slate-600 hover:bg-slate-50 p-2 text-xs font-bold rounded-xl flex items-center justify-center"
                  aria-label="Kembali"
                  title="Kembali"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center justify-center gap-1"
                  aria-label="Lanjut"
                >
                  Lanjut <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
