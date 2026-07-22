export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col justify-center items-center px-4 py-16 max-w-4xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Vercel Foundation — IT-DIAG-00B
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-50 tracking-tight leading-tight mb-4">
        WattWise AI
      </h1>
      
      <p className="text-xl sm:text-2xl font-medium text-emerald-400 mb-6">
        Listrik Lebih Cerdas, Cash Flow Lebih Terkendali.
      </p>

      <blockquote className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 text-slate-300 text-base sm:text-lg italic mb-10 max-w-2xl">
        &ldquo;Mulai dari tagihan yang Anda punya. WattWise membantu menemukan apa yang perlu diperiksa lebih dahulu.&rdquo;
      </blockquote>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full mb-12">
        <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/40">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">1</div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Tahu Lebih Awal</h3>
          <p className="text-sm text-slate-400">Pencatatan tagihan sederhana, estimasi perubahan biaya, dan tren tanpa mewajibkan data kWh atau meteran.</p>
        </div>
        <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/40">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">2</div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Tahu Apa Yang Dicek</h3>
          <p className="text-sm text-slate-400">Mempersempit maksimal tiga kandidat bagian yang perlu diperiksa terlebih dahulu secara terpandu dan aman.</p>
        </div>
        <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/40">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">3</div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Tahu Hasilnya</h3>
          <p className="text-sm text-slate-400">Rencana tindakan hemat dan evaluasi terukur pada periode berikutnya untuk melihat dampak nyata.</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-400 pt-6 border-t border-slate-800 w-full">
        <span>✅ Safe wording &amp; non-causal explanation</span>
        <span>•</span>
        <span>✅ Next.js 16 App Router</span>
        <span>•</span>
        <span>✅ Region Singapore (sin1)</span>
      </div>
    </main>
  );
}
