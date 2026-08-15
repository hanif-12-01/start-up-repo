import { notFound } from "next/navigation";
import { OnnxProofClient } from "./onnx-proof-client";

export const metadata = {
  title: "WattWise AI ONNX Browser Proof (AI-EMBED-01B)",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnnxProofPage() {
  // Development and test harness guard: inaccessible in Production
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-bold text-emerald-400">
            WATTWISE AI-EMBED-01B: ONNX Browser Proof Harness
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real Browser ONNX Runtime Web (WASM) execution & numerical parity verification.
          </p>
        </header>
        <OnnxProofClient />
      </div>
    </main>
  );
}
