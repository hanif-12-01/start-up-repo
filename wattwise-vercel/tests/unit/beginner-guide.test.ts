import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  GUIDE_STEPS,
  STORAGE_COMPLETED_KEY,
  STORAGE_DISMISSED_SESSION_KEY,
} from '@/components/onboarding/guide-steps';

describe('UX-ONBOARD-01 — Beginner Guided Tour / Panduan Pemula', () => {
  it('CASE 1: Guide defines exactly 6 sequential stages covering DATA -> UNDERSTAND -> PREDICT -> DECIDE/ACT -> MEASURE', () => {
    expect(GUIDE_STEPS).toHaveLength(6);
    expect(GUIDE_STEPS[0].stage).toBe('DATA');
    expect(GUIDE_STEPS[1].stage).toBe('DATA');
    expect(GUIDE_STEPS[2].stage).toBe('UNDERSTAND');
    expect(GUIDE_STEPS[3].stage).toBe('PREDICT');
    expect(GUIDE_STEPS[4].stage).toBe('DECIDE / ACT');
    expect(GUIDE_STEPS[5].stage).toBe('MEASURE');
  });

  it('CASE 2: Step 1 covers business profile preparation without automated mutation', () => {
    const step1 = GUIDE_STEPS[0];
    expect(step1.title).toContain('1. Siapkan profil usaha');
    expect(step1.detailedContext).toMatch(/jenis usaha/i);
    expect(step1.detailedContext).toMatch(/daya listrik/i);
    expect(step1.detailedContext).toMatch(/tarif listrik/i);
    expect(step1.ctaLabel).toBe('Kelola Usaha');
    expect(step1.ctaHref).toBe('/businesses');
  });

  it('CASE 3: Step 2 covers electricity bill recording without automated creation', () => {
    const step2 = GUIDE_STEPS[1];
    expect(step2.title).toContain('2. Catat tagihan listrik');
    expect(step2.shortDescription).toMatch(/pemakaian kWh dan biaya listrik setiap bulan/i);
    expect(step2.ctaLabel).toBe('Tambah Tagihan');
    expect(step2.ctaHref).toBe('/bills/new');
  });

  it('CASE 4: Step 3 covers understanding consumption changes truthfully', () => {
    const step3 = GUIDE_STEPS[2];
    expect(step3.title).toContain('3. Pahami perubahan konsumsi');
    expect(step3.ctaLabel).toBe('Lihat Analisis');
    expect(step3.ctaHref).toBe('/analysis');
    // Must not claim automatic root-cause discovery
    expect(step3.shortDescription).not.toMatch(/menemukan penyebab pasti|garansi hemat/i);
  });

  it('CASE 5: Forecast step copy adheres strictly to truthfulness and N-BEATS eligibility rules', () => {
    const step4 = GUIDE_STEPS[3];
    expect(step4.title).toContain('4. Lihat perkiraan bulan berikutnya');
    expect(step4.stage).toBe('PREDICT');
    expect(step4.ctaHref).toBe('/predictions');

    // Rule: <6 continuous months -> historical estimate
    expect(step4.shortDescription).toContain('kurang dari 6 bulan berurutan');
    expect(step4.shortDescription).toContain('estimasi historis');

    // Rule: >=6 continuous months -> N-BEATS
    expect(step4.shortDescription).toContain('minimal 6 bulan histori berurutan');
    expect(step4.shortDescription).toContain('Prediksi AI N-BEATS');

    // Rule: fallback -> historical estimate
    expect(step4.detailedContext).toContain('fallback');

    // Forbidden terms: Model A / Model B / multiple AI engines
    const fullStep4Text = `${step4.title} ${step4.shortDescription} ${step4.detailedContext}`;
    expect(fullStep4Text).not.toMatch(/model a|model b/i);
    expect(fullStep4Text).not.toMatch(/H01_02|H03_05|H06_12/i);
    expect(fullStep4Text).not.toMatch(/onnx|wasm|tensor/i);
  });

  it('CASE 6: Step 5 covers decision and action guidance (Langkah Berikutnya)', () => {
    const step5 = GUIDE_STEPS[4];
    expect(step5.title).toContain('5. Tentukan langkah berikutnya');
    expect(step5.stage).toBe('DECIDE / ACT');
    expect(step5.detailedContext).toContain('Langkah Berikutnya');
    expect(step5.ctaLabel).toBe('Lihat Rekomendasi');
    expect(step5.ctaHref).toBe('/recommendations');
  });

  it('CASE 7: Step 6 covers measurement and evaluation (Rencana Hemat / outcome)', () => {
    const step6 = GUIDE_STEPS[5];
    expect(step6.title).toContain('6. Catat hasil dan evaluasi');
    expect(step6.stage).toBe('MEASURE');
    expect(step6.detailedContext).toMatch(/Rencana Hemat/i);
    expect(step6.detailedContext).toMatch(/Panduan kapan saja/i);
    expect(step6.ctaLabel).toBe('Kembali ke Dashboard');
    expect(step6.ctaHref).toBe('/dashboard');
  });

  it('CASE 8: Storage keys match non-database browser persistence contract', () => {
    expect(STORAGE_COMPLETED_KEY).toBe('wattwise:onboarding:v1:completed');
    expect(STORAGE_DISMISSED_SESSION_KEY).toBe('wattwise:onboarding:v1:dismissed');
  });

  it('CASE 9: Component source code contains no database imports or server mutation actions', () => {
    const contextFile = readFileSync(join(process.cwd(), 'src/components/onboarding/BeginnerGuideContext.tsx'), 'utf8');
    const bannerFile = readFileSync(join(process.cwd(), 'src/components/onboarding/BeginnerWelcomeBanner.tsx'), 'utf8');
    const modalFile = readFileSync(join(process.cwd(), 'src/components/onboarding/BeginnerGuideModal.tsx'), 'utf8');

    const combinedCode = `${contextFile} ${bannerFile} ${modalFile}`;
    expect(combinedCode).not.toContain('@/server/db');
    expect(combinedCode).not.toContain('drizzle-orm');
    expect(combinedCode).not.toContain('INSERT INTO');
    expect(combinedCode).not.toContain('DELETE FROM');
    expect(combinedCode).not.toContain('UPDATE ');
  });

  it('CASE 10: ProductShell integrates replay button and Dashboard integrates welcome banner', () => {
    const shellFile = readFileSync(join(process.cwd(), 'src/components/product/ProductShell.tsx'), 'utf8');
    const dashboardFile = readFileSync(join(process.cwd(), 'src/app/(product)/dashboard/page.tsx'), 'utf8');

    expect(shellFile).toContain('<BeginnerGuideProvider>');
    expect(shellFile).toContain('<BeginnerGuideModal />');
    expect(shellFile).toContain('<GuideReplayButton');
    expect(dashboardFile).toContain('<BeginnerWelcomeBanner />');
  });
});