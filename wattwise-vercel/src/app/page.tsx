import Link from 'next/link';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { StaggerGroup } from '@/components/motion/StaggerGroup';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';

export default function HomePage() {
  return (
    <PageReveal className="flex-1 flex flex-col justify-center items-center px-4 py-16 max-w-4xl mx-auto text-center">
      <Reveal direction="down" delay={0.05}>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
          WattWise AI — Energy Motion Foundation
        </div>
      </Reveal>

      <Reveal direction="up" delay={0.1}>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-50 tracking-tight leading-tight mb-4">
          WattWise AI
        </h1>
      </Reveal>

      <Reveal direction="up" delay={0.15}>
        <p className="text-xl sm:text-2xl font-medium text-emerald-400 mb-6">
          Listrik Lebih Cerdas, Cash Flow Lebih Terkendali.
        </p>
      </Reveal>

      <Reveal direction="up" delay={0.2}>
        <blockquote className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 text-slate-300 text-base sm:text-lg italic mb-8 max-w-2xl">
          &ldquo;Mulai dari tagihan yang Anda punya. WattWise membantu menemukan apa yang perlu diperiksa lebih dahulu.&rdquo;
        </blockquote>
      </Reveal>

      <Reveal direction="up" delay={0.25}>
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <InteractiveMotion>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-lg shadow-emerald-950/40 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Mulai Sekarang
            </Link>
          </InteractiveMotion>
          <InteractiveMotion>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Masuk Akun
            </Link>
          </InteractiveMotion>
        </div>
      </Reveal>

      <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full mb-12">
        <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/40 hover:border-emerald-500/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
            1
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Tahu Lebih Awal</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Pencatatan tagihan sederhana, estimasi perubahan biaya, dan tren tanpa mewajibkan data kWh atau meteran.
          </p>
        </div>
        <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/40 hover:border-emerald-500/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
            2
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Tahu Apa Yang Dicek</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Mempersempit maksimal tiga kandidat bagian yang perlu diperiksa terlebih dahulu secara terpandu dan aman.
          </p>
        </div>
        <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-700/40 hover:border-emerald-500/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
            3
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-2">Tahu Hasilnya</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Rencana tindakan hemat dan evaluasi terukur pada periode berikutnya untuk melihat dampak nyata.
          </p>
        </div>
      </StaggerGroup>

      <Reveal direction="up" delay={0.4}>
        <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-400 pt-6 border-t border-slate-800 w-full">
          <span>✅ Safe wording &amp; non-causal explanation</span>
          <span>•</span>
          <span>✅ Next.js 16 App Router</span>
          <span>•</span>
          <span>✅ Region Singapore (sin1)</span>
        </div>
      </Reveal>
    </PageReveal>
  );
}
