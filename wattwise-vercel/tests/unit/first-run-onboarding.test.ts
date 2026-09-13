import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createBusinessSchema } from '@/server/validation/journey';
import { CORE_TOUR_STEPS } from '@/components/onboarding/guide-steps';

describe('Guided First-Run Onboarding & Simple Business Setup Tests', () => {
  describe('Phase 1: First-Run Welcome & Mode Selection', () => {
    it('contains welcome screen with owner-friendly explanation and non-technical reassurance', () => {
      const modalFilePath = join(process.cwd(), 'src', 'components', 'onboarding', 'FirstRunWelcomeModal.tsx');
      const modalContent = readFileSync(modalFilePath, 'utf8');

      expect(modalContent).toContain('Selamat datang di WattWise 👋');
      expect(modalContent).toContain('WattWise membantu Anda memahami biaya listrik usaha');
      expect(modalContent).toContain('Kami bisa membimbing Anda dari awal');
      expect(modalContent).toContain('Bimbing saya dari awal');
      expect(modalContent).toContain('Saya ingin isi sendiri');
      expect(modalContent).toContain('Anda bisa melewati informasi yang belum diketahui dan melengkapinya nanti');

      // Accessibility checks
      expect(modalContent).toContain('role="dialog"');
      expect(modalContent).toContain('aria-modal="true"');
      expect(modalContent).toContain('aria-labelledby="first-run-welcome-title"');
      expect(modalContent).toContain("e.key === 'Escape'");
    });

    it('uses client storage key to persist user choice and prevent unwanted loops', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      expect(formContent).toContain('wattwise:guided-setup:choice');
      expect(formContent).toContain('FirstRunWelcomeModal');
      expect(formContent).toContain('BusinessSetupGuide');
    });
  });

  describe('Phase 2: Simplified Business Setup Presentation & Domain Safety', () => {
    it('structures business setup form into 3 clear, distinct visual sections', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      // Section 1: Informasi Dasar Usaha
      expect(formContent).toContain('setup-basic-info');
      expect(formContent).toContain('Informasi Dasar Usaha');
      expect(formContent).toContain('Supaya WattWise tahu lokasi usaha mana yang sedang dianalisis');

      // Section 2: Informasi Listrik
      expect(formContent).toContain('setup-electricity-info');
      expect(formContent).toContain('Informasi Listrik');
      expect(formContent).toContain('Informasi ini membantu WattWise membaca tagihan dengan lebih tepat');

      // Section 3: Informasi Tambahan Usaha (Opsional)
      expect(formContent).toContain('setup-context-info');
      expect(formContent).toContain('Informasi Tambahan Usaha');
      expect(formContent).toContain('Informasi tambahan membantu memberi konteks terhadap perubahan pemakaian listrik');

      // Section 4: Submit button
      expect(formContent).toContain('setup-submit');
      expect(formContent).toContain('Simpan Profil Usaha');
    });

    it('explains technical electricity fields clearly with skip reassurances', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      expect(formContent).toContain('Daya Terpasang (VA)');
      expect(formContent).toContain('Belum tahu? Anda bisa melewati bagian ini');
      expect(formContent).toContain('Golongan Pelanggan');
      expect(formContent).toContain('Tarif Rata-rata / kWh (Rp)');
      expect(formContent).toContain('Tipe Meter Listrik');
      expect(formContent).toContain('Kamar / Unit Terisi');
    });

    it('BusinessSetupGuide contains 4 sequential steps guiding owner from basic info to save', () => {
      const guideFilePath = join(process.cwd(), 'src', 'components', 'onboarding', 'BusinessSetupGuide.tsx');
      const guideContent = readFileSync(guideFilePath, 'utf8');

      expect(guideContent).toContain('Kenali usaha Anda');
      expect(guideContent).toContain('setup-basic-info');
      expect(guideContent).toContain('Kenali listrik usaha');
      expect(guideContent).toContain('setup-electricity-info');
      expect(guideContent).toContain('Tambahkan konteks jika relevan');
      expect(guideContent).toContain('setup-context-info');
      expect(guideContent).toContain('Simpan profil usaha');
      expect(guideContent).toContain('setup-submit');
    });

    it('strictly preserves createBusinessSchema validation contracts', () => {
      // Valid minimum required fields
      const minValid = {
        name: 'Toko Berkah',
        businessType: 'RETAIL',
        segment: 'RETAIL',
        electricalSystem: 'ALL_IN',
      };
      const parsedMin = createBusinessSchema.safeParse(minValid);
      expect(parsedMin.success).toBe(true);

      // Missing required name
      const missingName = { ...minValid, name: '' };
      expect(createBusinessSchema.safeParse(missingName).success).toBe(false);

      // Missing required businessType
      const missingType = { ...minValid, businessType: '' };
      expect(createBusinessSchema.safeParse(missingType).success).toBe(false);

      // Optional fields correctly accepted without schema drift
      const fullValid = {
        ...minValid,
        city: 'Bandung',
        province: 'Jawa Barat',
        address: 'Jl. Sukajadi No. 12',
        powerVa: 2200,
        customerType: 'B1',
        tariffRupiahPerKwh: '1444.70',
        paymentMethod: 'POSTPAID',
        meterType: 'DIGITAL',
        roomCount: 5,
        occupiedRoomCount: 4,
        employeeCount: 3,
        operatingDaysPerMonth: 26,
        businessNotes: 'Buka jam 08:00 - 20:00',
        electricityNotes: 'Meteran digital baru',
      };
      const parsedFull = createBusinessSchema.safeParse(fullValid);
      expect(parsedFull.success).toBe(true);
    });
  });

  describe('Phase 3: First Bill Activation Transition & Guidance', () => {
    it('FirstBusinessSuccessModal invites user to add their first bill', () => {
      const modalFilePath = join(process.cwd(), 'src', 'components', 'onboarding', 'FirstBusinessSuccessModal.tsx');
      const modalContent = readFileSync(modalFilePath, 'utf8');

      expect(modalContent).toContain('Profil usaha siap 🎉');
      expect(modalContent).toContain('Sekarang tambahkan satu tagihan listrik');
      expect(modalContent).toContain('Tambahkan tagihan pertama');
      expect(modalContent).toContain('Nanti saja');
      expect(modalContent).toContain('/bills/new?businessId=');
    });

    it('FirstBillGuide defines 3 core steps: period, total amount, and optional kWh', () => {
      const guideFilePath = join(process.cwd(), 'src', 'components', 'onboarding', 'FirstBillGuide.tsx');
      const guideContent = readFileSync(guideFilePath, 'utf8');

      expect(guideContent).toContain('Periode Tagihan');
      expect(guideContent).toContain('bill-period');
      expect(guideContent).toContain('Total Tagihan (Rupiah)');
      expect(guideContent).toContain('bill-amount');
      expect(guideContent).toContain('Pemakaian (kWh) — Opsional');
      expect(guideContent).toContain('bill-kwh');
      expect(guideContent).toContain('Jika tidak tersedia di struk pembayaran, Anda dapat melewati bagian ini');
    });

    it('BillForm embeds FirstBillGuide and target attributes', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'bills', 'new', 'BillForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      expect(formContent).toContain('FirstBillGuide');
      expect(formContent).toContain('data-tour-id="bill-period"');
      expect(formContent).toContain('data-tour-id="bill-amount"');
      expect(formContent).toContain('data-tour-id="bill-kwh"');
      expect(formContent).toContain('data-tour-id="bill-submit"');
    });

    it('FirstBillSuccessModal provides safe non-kausal transition copy without false promises', () => {
      const modalFilePath = join(process.cwd(), 'src', 'components', 'onboarding', 'FirstBillSuccessModal.tsx');
      const modalContent = readFileSync(modalFilePath, 'utf8');

      expect(modalContent).toContain('Data pertama berhasil dicatat');
      expect(modalContent).toContain('WattWise sekarang sudah mulai menyimpan riwayat listrik usaha Anda');
      expect(modalContent).toContain('Setelah ada data bulan berikutnya');
      expect(modalContent).toContain('WattWise dapat mulai membandingkan perubahan antarbulan');
      expect(modalContent).toContain('Buka Dashboard');

      // Causal safety assertions
      expect(modalContent).not.toMatch(/Anda terbukti boros/i);
      expect(modalContent).not.toMatch(/Pasti hemat|garansi hemat/i);
      expect(modalContent).not.toMatch(/Pasti rusak/i);
    });
  });

  describe('Phase 4: Product Guide Continuity & Language Alignment', () => {
    it('CORE_TOUR_STEPS answer "What is this useful for?" without raw technical jargon', () => {
      const stepChart = CORE_TOUR_STEPS.find((s) => s.id === 'step-chart');
      expect(stepChart).toBeDefined();
      expect(stepChart?.instruction).toContain('Di sini Anda bisa melihat apakah biaya atau pemakaian listrik berubah dari bulan ke bulan');
      expect(stepChart?.detailedContext).toContain('Setelah data mencukupi, WattWise dapat membantu memperkirakan periode berikutnya');

      const stepDiagnostics = CORE_TOUR_STEPS.find((s) => s.id === 'step-diagnostics');
      expect(stepDiagnostics).toBeDefined();
      expect(stepDiagnostics?.instruction).toContain('Gunakan bagian ini ketika Anda ingin memahami perubahan yang terjadi dan apa yang perlu diperiksa');
    });

    it('Dashboard embeds DashboardActivationModals to coordinate first-business and first-bill transitions', () => {
      const dashboardFilePath = join(process.cwd(), 'src', 'app', '(product)', 'dashboard', 'page.tsx');
      const dashboardContent = readFileSync(dashboardFilePath, 'utf8');

      expect(dashboardContent).toContain('DashboardActivationModals');
      expect(dashboardContent).toContain('initialFirstBusiness');
      expect(dashboardContent).toContain('initialFirstBillSuccess');
    });
  });
});
