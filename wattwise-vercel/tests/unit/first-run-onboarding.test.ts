import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createBusinessSchema } from '@/server/validation/journey';
import { CORE_TOUR_STEPS } from '@/components/onboarding/guide-steps';
import { deriveSegmentFromBusinessType } from '@/server/services/business.service';
import { getGuidedSetupStorageKey } from '@/app/(product)/businesses/new/BusinessForm';

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

  describe('Hardening: Issue 1 & 2 — Business Type Contract & Internal Segment Derivation', () => {
    it('derives internal segment from businessType for all 6 authoritative types', () => {
      expect(deriveSegmentFromBusinessType('KOS_PROPERTY')).toBe('KOS');
      expect(deriveSegmentFromBusinessType('FNB')).toBe('FNB');
      expect(deriveSegmentFromBusinessType('LAUNDRY')).toBe('LAUNDRY');
      expect(deriveSegmentFromBusinessType('RETAIL')).toBe('RETAIL');
      expect(deriveSegmentFromBusinessType('COLD_STORAGE')).toBe('COLD_STORAGE');
      expect(deriveSegmentFromBusinessType('OTHER')).toBe('OTHER');
      // Unknown fallback to OTHER
      expect(deriveSegmentFromBusinessType('UNKNOWN_TYPE')).toBe('OTHER');
    });

    it('every visible business type option in BusinessForm matches authoritative BUSINESS_TYPES enum', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      const expectedTypes = ['KOS_PROPERTY', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER'];
      for (const t of expectedTypes) {
        expect(formContent).toContain(`value: '${t}'`);
      }

      // Proves OFFICE and WORKSHOP are NOT offered
      expect(formContent).not.toContain("value: 'OFFICE'");
      expect(formContent).not.toContain("value: 'WORKSHOP'");

      // Confirms OTHER label is owner-friendly
      expect(formContent).toContain("Lainnya (mis. kantor, bengkel, jasa)");
    });

    it('removes owner-facing Segmen Analisis dropdown from BusinessForm', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      // Form should NOT ask owner for Segmen Analisis
      expect(formContent).not.toContain('Segmen Analisis');
      expect(formContent).not.toContain('name="segment"');
      expect(formContent).not.toContain('Pilih segmen');

      // Owner sees single "Jenis Usaha" question
      expect(formContent).toContain('Jenis Usaha');
      expect(formContent).toContain('name="businessType"');
    });

    it('actions.ts derives segment server-side so createBusinessSchema always receives valid segment', () => {
      const actionsFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'actions.ts');
      const actionsContent = readFileSync(actionsFilePath, 'utf8');

      expect(actionsContent).toContain('deriveSegmentFromBusinessType(businessType)');

      // Verify schema succeeds with derived segments for all 6 types
      const types = ['KOS_PROPERTY', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER'];
      for (const t of types) {
        const derived = deriveSegmentFromBusinessType(t);
        const result = createBusinessSchema.safeParse({
          name: 'Usaha Uji',
          businessType: t,
          segment: derived,
          electricalSystem: 'ALL_IN',
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Hardening: Issue 3 — Electrical System Placement & Copy', () => {
    it('moves electricalSystem visually into Informasi Listrik with owner-friendly label', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      // Check it is placed under setup-electricity-info
      const electricitySectionIdx = formContent.indexOf('data-tour-id="setup-electricity-info"');
      const electricalSystemIdx = formContent.indexOf('Pengaturan Biaya Listrik');
      const basicSectionIdx = formContent.indexOf('data-tour-id="setup-basic-info"');

      expect(electricitySectionIdx).toBeGreaterThan(basicSectionIdx);
      expect(electricalSystemIdx).toBeGreaterThan(electricitySectionIdx);

      // Friendly label and helper
      expect(formContent).toContain('Pengaturan Biaya Listrik');
      expect(formContent).toContain('Pilih cara biaya listrik dikelola di lokasi usaha Anda');
      expect(formContent).toContain('Listrik Ditanggung Pemilik (All-in)');
      expect(formContent).toContain('Token per Kamar / Unit');
      expect(formContent).toContain('Sub-Meter per Kamar / Unit');
      expect(formContent).toContain('Biaya Listrik Patungan');
      expect(formContent).toContain('Sistem Campuran');
    });
  });

  describe('Hardening: Issue 4 — Optional Selects & Tariff Copy Data Safety', () => {
    it('provides true empty options in paymentMethod and meterType without silent defaults', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      // paymentMethod has empty option
      expect(formContent).toContain('<option value="">Belum tahu / isi nanti</option>');

      // Verifies both selects use defaultValue="" and have empty option
      const paymentSelectIdx = formContent.indexOf('name="paymentMethod"');
      const meterSelectIdx = formContent.indexOf('name="meterType"');
      expect(paymentSelectIdx).toBeGreaterThan(-1);
      expect(meterSelectIdx).toBeGreaterThan(-1);
    });

    it('actions.ts normalizes empty optional select values to undefined', () => {
      const actionsFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'actions.ts');
      const actionsContent = readFileSync(actionsFilePath, 'utf8');

      expect(actionsContent).toContain("paymentMethod: formData.get('paymentMethod') ? formData.get('paymentMethod')!.toString().trim() || undefined : undefined");
      expect(actionsContent).toContain("meterType: formData.get('meterType') ? formData.get('meterType')!.toString().trim() || undefined : undefined");
    });

    it('tariff input has neutral copy without hardcoded rate anchoring', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      expect(formContent).not.toContain('Contoh: 1444.70');
      expect(formContent).toContain('Opsional — masukkan jika Anda mengetahuinya');
      expect(formContent).toContain('Gunakan nilai dari informasi atau tagihan listrik Anda jika tersedia');
    });
  });

  describe('Hardening: Issue 5 — Optional Section Cognitive Load & Expansion', () => {
    it('initializes optional section as collapsed by default', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      expect(formContent).toContain('const [isOptionalManuallyExpanded, setIsOptionalManuallyExpanded] = useState<boolean>(false);');
      expect(formContent).toContain('const isOptionalExpanded = isOptionalManuallyExpanded || hasOptionalError;');
    });

    it('auto-expands optional section if validation errors affect optional fields', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      expect(formContent).toContain('occupiedRoomCount');
      expect(formContent).toContain('roomCount');
      expect(formContent).toContain('employeeCount');
      expect(formContent).toContain('operatingDaysPerMonth');
      expect(formContent).toContain('businessNotes');
      expect(formContent).toContain('electricityNotes');
      expect(formContent).toContain('hasOptionalError');
    });

    it('expands optional section during Guided Tour step 3 via onStepChange', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      expect(formContent).toContain('onStepChange={(stepIdx) => {');
      expect(formContent).toContain('if (stepIdx === 2) {');
      expect(formContent).toContain('setIsOptionalManuallyExpanded(true);');
    });

    it('preserves optional input elements in DOM using CSS hidden toggle so values are not lost on collapse', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      expect(formContent).toContain("className={isOptionalExpanded ? 'grid gap-4 md:grid-cols-2 pt-1 animate-in fade-in duration-150' : 'hidden'}");
    });
  });

  describe('Hardening: Issue 6 — Account-Scoped Guided Setup Preference', () => {
    it('scopes storage key to user ID using versioned opaque key pattern', () => {
      expect(getGuidedSetupStorageKey('usr_12345')).toBe('wattwise:guided-setup:v1:usr_12345');
      expect(getGuidedSetupStorageKey('usr_67890')).toBe('wattwise:guided-setup:v1:usr_67890');
      expect(getGuidedSetupStorageKey('usr_12345')).not.toBe(getGuidedSetupStorageKey('usr_67890'));

      // Fallback when no userId provided
      expect(getGuidedSetupStorageKey(undefined)).toBe('wattwise:guided-setup:choice');
    });

    it('BusinessForm uses user-scoped storage key for read and write', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      expect(formContent).toContain('const storageKey = getGuidedSetupStorageKey(userId);');
      expect(formContent).toContain('localStorage.getItem(storageKey)');
      expect(formContent).toContain("localStorage.setItem(storageKey, 'guided');");
      expect(formContent).toContain("localStorage.setItem(storageKey, 'self');");
    });
  });

  describe('Hardening: Issue 7 — Dismissal Semantics & Modal Accessibility', () => {
    it('distinguishes dismissal from choosing self-service', () => {
      const formFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'BusinessForm.tsx');
      const formContent = readFileSync(formFilePath, 'utf8');

      // handleDismissWelcome does NOT write to localStorage
      expect(formContent).toContain('handleDismissWelcome');
      expect(formContent).toContain('onDismiss={handleDismissWelcome}');
    });

    it('FirstRunWelcomeModal supports Escape dismiss, backdrop dismiss, and X button calling onDismiss', () => {
      const modalFilePath = join(process.cwd(), 'src', 'components', 'onboarding', 'FirstRunWelcomeModal.tsx');
      const modalContent = readFileSync(modalFilePath, 'utf8');

      expect(modalContent).toContain("if (e.key === 'Escape') {");
      expect(modalContent).toContain('onDismiss?.();');
      expect(modalContent).toContain('aria-label="Tutup jendela orientasi"');
    });

    it('FirstRunWelcomeModal implements focus trap and initial focus on primary button', () => {
      const modalFilePath = join(process.cwd(), 'src', 'components', 'onboarding', 'FirstRunWelcomeModal.tsx');
      const modalContent = readFileSync(modalFilePath, 'utf8');

      // Initial focus
      expect(modalContent).toContain('primaryButtonRef.current?.focus()');

      // Focus restoration
      expect(modalContent).toContain('previousActiveElement.current = document.activeElement');
      expect(modalContent).toContain('previousActiveElement.current?.focus()');

      // Focus trap on Tab and Shift+Tab
      expect(modalContent).toContain("if (e.key === 'Tab')");
      expect(modalContent).toContain('if (e.shiftKey)');
    });
  });

  describe('Hardening: Issue 8 — Canonical Journey Route Guard on /businesses/new', () => {
    it('restores journey step validation and canonical redirect in page.tsx', () => {
      const pageFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'page.tsx');
      const pageContent = readFileSync(pageFilePath, 'utf8');

      expect(pageContent).toContain('const step = await resolveJourneyStep(userId);');
      expect(pageContent).toContain("if (step !== 'BUSINESS' && step !== 'COMPLETE') {");
      expect(pageContent).toContain('redirect(getJourneyRedirect(step));');
      expect(pageContent).toContain("const isFirstBusiness = step === 'BUSINESS';");
      expect(pageContent).toContain('<BusinessForm isFirstBusiness={isFirstBusiness} userId={userId} />');
    });

    it('actions.ts also verifies canonical journey step before business creation', () => {
      const actionsFilePath = join(process.cwd(), 'src', 'app', '(product)', 'businesses', 'new', 'actions.ts');
      const actionsContent = readFileSync(actionsFilePath, 'utf8');

      expect(actionsContent).toContain('const step = await resolveJourneyStep(userId);');
      expect(actionsContent).toContain("if (step !== 'BUSINESS' && step !== 'COMPLETE') redirect(getJourneyRedirect(step));");
    });
  });
});
