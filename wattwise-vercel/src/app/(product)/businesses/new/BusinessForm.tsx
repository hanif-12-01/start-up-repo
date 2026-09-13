'use client';

import { useActionState, useState, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { createBusinessAction } from './actions';
import { Reveal } from '@/components/motion/Reveal';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';
import { FirstRunWelcomeModal } from '@/components/onboarding/FirstRunWelcomeModal';
import { BusinessSetupGuide } from '@/components/onboarding/BusinessSetupGuide';

const STORAGE_FIRST_RUN_CHOICE_KEY = 'wattwise:guided-setup:choice';

const BUSINESS_TYPES = [
  { value: 'KOS_PROPERTY', label: 'Kos / Properti' },
  { value: 'FNB', label: 'F&B / Restoran' },
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'RETAIL', label: 'Retail / Toko' },
  { value: 'OFFICE', label: 'Kantor' },
  { value: 'WORKSHOP', label: 'Bengkel / Workshop' },
  { value: 'OTHER', label: 'Lainnya' },
];

const SEGMENTS = [
  { value: 'KOS', label: 'Kos' },
  { value: 'FNB', label: 'F&B' },
  { value: 'LAUNDRY', label: 'Laundry' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'COLD_STORAGE', label: 'Cold Storage' },
  { value: 'OTHER', label: 'Lainnya' },
];

const ELECTRICAL_SYSTEMS = [
  { value: 'ALL_IN', label: 'Listrik Ditanggung Pemilik' },
  { value: 'TOKEN_PER_KAMAR', label: 'Token per Kamar / Unit' },
  { value: 'SUB_METER', label: 'Sub-Meter per Kamar / Unit' },
  { value: 'PATUNGAN', label: 'Biaya Listrik Patungan' },
  { value: 'CAMPURAN', label: 'Sistem Campuran' },
] as const;



const PAYMENT_METHODS = [
  { value: 'POSTPAID', label: 'Pascabayar (Bayar di Akhir Bulan)' },
  { value: 'PREPAID', label: 'Prabayar / Token (Beli di Awal)' },
];

const METER_TYPES = [
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'ANALOG', label: 'Analog / Putar' },
  { value: 'SMART', label: 'Smart Meter' },
  { value: 'OTHER', label: 'Lainnya' },
];

const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--focus)] disabled:opacity-50 transition';

const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]';

const helperClass = 'mt-1 block text-xs leading-relaxed text-[var(--muted)]';

export function BusinessForm({ isFirstBusiness = false }: { isFirstBusiness?: boolean }) {
  const [state, formAction, isPending] = useActionState(createBusinessAction, null);

  // First-run welcome & guided mode state
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [isGuideActive, setIsGuideActive] = useState<boolean>(false);
  const [isOptionalExpanded, setIsOptionalExpanded] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isFirstBusiness) {
      const timer = setTimeout(() => {
        try {
          const savedChoice = localStorage.getItem(STORAGE_FIRST_RUN_CHOICE_KEY);
          if (!savedChoice) {
            setShowWelcome(true);
          } else if (savedChoice === 'guided') {
            setIsGuideActive(true);
          }
        } catch {}
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isFirstBusiness]);

  const handleSelectGuided = () => {
    try {
      localStorage.setItem(STORAGE_FIRST_RUN_CHOICE_KEY, 'guided');
    } catch {}
    setShowWelcome(false);
    setIsGuideActive(true);
  };

  const handleSelectSelf = () => {
    try {
      localStorage.setItem(STORAGE_FIRST_RUN_CHOICE_KEY, 'self');
    } catch {}
    setShowWelcome(false);
    setIsGuideActive(false);
  };

  const fieldErr = (name: string) => state?.fieldErrors?.[name];

  return (
    <>
      <FirstRunWelcomeModal
        isOpen={showWelcome}
        onSelectGuided={handleSelectGuided}
        onSelectSelf={handleSelectSelf}
      />

      {/* Guide Stepper when active */}
      <BusinessSetupGuide
        isActive={isGuideActive}
        onDismiss={() => setIsGuideActive(false)}
      />

      <div className="flex items-center justify-between pb-2">
        <p className="text-xs text-[var(--muted)]">
          Tanda <span className="text-[var(--danger)] font-bold">*</span> menunjukkan kolom yang wajib diisi. Kolom lainnya dapat dilewati.
        </p>
        {!isGuideActive && isFirstBusiness && (
          <button
            type="button"
            onClick={() => setIsGuideActive(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)]/50 px-3 py-1.5 text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary-soft)] transition"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Mulai panduan pengisian
          </button>
        )}
      </div>

      {state?.error && (
        <Reveal direction="up" duration={0.2}>
          <div role="alert" className="p-3 bg-[var(--danger-surface)]/80 border border-[var(--danger-border)] rounded-md text-sm text-[var(--danger)]">
            {state.error}
          </div>
        </Reveal>
      )}

      <form data-tour-id="business-profile-form" action={formAction} className="space-y-8">
        {/* SECTION 1: INFORMASI DASAR USAHA */}
        <section
          data-tour-id="setup-basic-info"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4 shadow-2xs transition-all"
        >
          <div className="border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)]">
                1
              </span>
              <h2 className="text-base font-bold text-[var(--foreground)]">
                Informasi Dasar Usaha
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Supaya WattWise tahu lokasi usaha mana yang sedang dianalisis.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelClass}>
                Nama Usaha <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                disabled={isPending}
                className={inputClass}
                placeholder="Contoh: Toko Berkah atau Kos Nyaman"
              />
              <span className={helperClass}>Nama unik untuk menandai lokasi usaha Anda.</span>
              {fieldErr('name') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('name')}</p>}
            </div>

            <div>
              <label htmlFor="businessType" className={labelClass}>
                Tipe Usaha <span className="text-[var(--danger)]">*</span>
              </label>
              <select id="businessType" name="businessType" required disabled={isPending} className={inputClass} defaultValue="">
                <option value="" disabled>Pilih tipe usaha</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <span className={helperClass}>Bidang aktivitas utama di lokasi ini.</span>
              {fieldErr('businessType') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('businessType')}</p>}
            </div>

            <div>
              <label htmlFor="segment" className={labelClass}>
                Segmen Analisis <span className="text-[var(--danger)]">*</span>
              </label>
              <select id="segment" name="segment" required disabled={isPending} className={inputClass} defaultValue="">
                <option value="" disabled>Pilih segmen</option>
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <span className={helperClass}>Digunakan untuk acuan perbandingan pola konsumsi yang serupa.</span>
              {fieldErr('segment') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('segment')}</p>}
            </div>

            <div>
              <label htmlFor="electricalSystem" className={labelClass}>
                Sistem Listrik <span className="text-[var(--danger)]">*</span>
              </label>
              <select id="electricalSystem" name="electricalSystem" required disabled={isPending} className={inputClass} defaultValue="">
                <option value="" disabled>Pilih sistem listrik</option>
                {ELECTRICAL_SYSTEMS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
              <span className={helperClass}>Cara pembagian dan tanggung jawab biaya listrik di lokasi.</span>
              {fieldErr('electricalSystem') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('electricalSystem')}</p>}
            </div>

            <div>
              <label htmlFor="city" className={labelClass}>
                Kota
              </label>
              <input id="city" name="city" type="text" disabled={isPending} className={inputClass} placeholder="Contoh: Bandung" />
              <span className={helperClass}>Opsional — kota domisili usaha.</span>
              {fieldErr('city') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('city')}</p>}
            </div>

            <div>
              <label htmlFor="province" className={labelClass}>
                Provinsi
              </label>
              <input id="province" name="province" type="text" disabled={isPending} className={inputClass} placeholder="Contoh: Jawa Barat" />
              <span className={helperClass}>Opsional — provinsi lokasi usaha.</span>
              {fieldErr('province') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('province')}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className={labelClass}>
                Alamat Lengkap
              </label>
              <input id="address" name="address" type="text" disabled={isPending} className={inputClass} placeholder="Contoh: Jl. Sukajadi No. 12" />
              <span className={helperClass}>Opsional — alamat jalan atau patokan lokasi usaha.</span>
              {fieldErr('address') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('address')}</p>}
            </div>
          </div>
        </section>

        {/* SECTION 2: INFORMASI LISTRIK */}
        <section
          data-tour-id="setup-electricity-info"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4 shadow-2xs transition-all"
        >
          <div className="border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)]">
                2
              </span>
              <h2 className="text-base font-bold text-[var(--foreground)]">
                Informasi Listrik
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Informasi ini membantu WattWise membaca tagihan dengan lebih tepat. Belum tahu? Anda bisa melewati bagian ini.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="powerVa" className={labelClass}>
                Daya Terpasang (VA)
              </label>
              <input
                id="powerVa"
                name="powerVa"
                type="number"
                min="1"
                disabled={isPending}
                className={inputClass}
                placeholder="Contoh: 2200 atau 5500"
              />
              <span className={helperClass}>
                Daya listrik usaha Anda, misalnya 2.200 VA atau 5.500 VA. Biasanya dapat dilihat pada tagihan atau struk listrik. Belum tahu? Anda bisa melewati bagian ini.
              </span>
              {fieldErr('powerVa') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('powerVa')}</p>}
            </div>

            <div>
              <label htmlFor="customerType" className={labelClass}>
                Golongan Pelanggan
              </label>
              <input
                id="customerType"
                name="customerType"
                type="text"
                disabled={isPending}
                className={inputClass}
                placeholder="Contoh: B1, B2, atau R1"
              />
              <span className={helperClass}>
                Kode golongan listrik seperti B1, B2, atau R1. Biasanya tercantum pada informasi pelanggan atau tagihan listrik. Belum tahu? Anda bisa melewati bagian ini.
              </span>
              {fieldErr('customerType') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('customerType')}</p>}
            </div>

            <div>
              <label htmlFor="tariffRupiahPerKwh" className={labelClass}>
                Tarif Rata-rata / kWh (Rp)
              </label>
              <input
                id="tariffRupiahPerKwh"
                name="tariffRupiahPerKwh"
                type="number"
                min="0"
                step="0.01"
                disabled={isPending}
                className={inputClass}
                placeholder="Contoh: 1444.70"
              />
              <span className={helperClass}>
                Biaya rata-rata untuk setiap kWh listrik. Jika Anda belum mengetahuinya, Anda dapat melengkapinya nanti.
              </span>
              {fieldErr('tariffRupiahPerKwh') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('tariffRupiahPerKwh')}</p>}
            </div>

            <div>
              <label htmlFor="paymentMethod" className={labelClass}>
                Metode Pembayaran
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                disabled={isPending}
                className={inputClass}
                defaultValue=""
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <span className={helperClass}>Cara pembayaran listrik di lokasi: Pascabayar bulanan atau Token/prabayar.</span>
              {fieldErr('paymentMethod') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('paymentMethod')}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="meterType" className={labelClass}>
                Tipe Meter Listrik
              </label>
              <select
                id="meterType"
                name="meterType"
                disabled={isPending}
                className={inputClass}
                defaultValue=""
              >
                {METER_TYPES.map((mt) => (
                  <option key={mt.value} value={mt.value}>{mt.label}</option>
                ))}
              </select>
              <span className={helperClass}>Jenis meteran listrik di tempat usaha: Digital (layar LCD), Analog (piringan putar), atau Smart Meter.</span>
              {fieldErr('meterType') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('meterType')}</p>}
            </div>
          </div>
        </section>

        {/* SECTION 3: INFORMASI TAMBAHAN USAHA (OPSIONAL) */}
        <section
          data-tour-id="setup-context-info"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4 shadow-2xs transition-all"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--surface-muted)] border border-[var(--border)] text-xs font-bold text-[var(--muted)]">
                  3
                </span>
                <h2 className="text-base font-bold text-[var(--foreground)]">
                  Informasi Tambahan Usaha
                </h2>
                <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
                  Opsional
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Informasi tambahan membantu memberi konteks terhadap perubahan pemakaian listrik.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOptionalExpanded((prev) => !prev)}
              className="rounded-xl border border-[var(--border)] p-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition"
              aria-expanded={isOptionalExpanded}
              title={isOptionalExpanded ? 'Sembunyikan bagian opsional' : 'Buka bagian opsional'}
            >
              {isOptionalExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {isOptionalExpanded && (
            <div className="grid gap-4 md:grid-cols-2 pt-1 animate-in fade-in duration-150">
              <div>
                <label htmlFor="occupiedRoomCount" className={labelClass}>
                  Kamar / Unit Terisi
                </label>
                <input
                  id="occupiedRoomCount"
                  name="occupiedRoomCount"
                  type="number"
                  min="0"
                  disabled={isPending}
                  className={inputClass}
                  placeholder="Contoh: 8"
                />
                <span className={helperClass}>
                  Isi jika usaha Anda memiliki kamar atau unit, misalnya kos, kontrakan, atau properti sewa.
                </span>
                {fieldErr('occupiedRoomCount') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('occupiedRoomCount')}</p>}
              </div>

              <div>
                <label htmlFor="roomCount" className={labelClass}>
                  Total Kapasitas Kamar / Unit
                </label>
                <input
                  id="roomCount"
                  name="roomCount"
                  type="number"
                  min="0"
                  max="10000"
                  disabled={isPending}
                  className={inputClass}
                  placeholder="Contoh: 10"
                />
                <span className={helperClass}>
                  Kapasitas maksimal kamar atau unit yang tersedia di lokasi.
                </span>
                {fieldErr('roomCount') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('roomCount')}</p>}
              </div>

              <div>
                <label htmlFor="employeeCount" className={labelClass}>
                  Jumlah Pegawai
                </label>
                <input
                  id="employeeCount"
                  name="employeeCount"
                  type="number"
                  min="0"
                  disabled={isPending}
                  className={inputClass}
                  placeholder="Contoh: 4"
                />
                <span className={helperClass}>
                  Jumlah orang yang biasanya bekerja di lokasi ini.
                </span>
                {fieldErr('employeeCount') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('employeeCount')}</p>}
              </div>

              <div>
                <label htmlFor="operatingDaysPerMonth" className={labelClass}>
                  Hari Operasi / Bulan
                </label>
                <input
                  id="operatingDaysPerMonth"
                  name="operatingDaysPerMonth"
                  type="number"
                  min="1"
                  max="31"
                  disabled={isPending}
                  className={inputClass}
                  placeholder="Contoh: 26 atau 30"
                />
                <span className={helperClass}>
                  Perkiraan jumlah hari usaha beroperasi aktif dalam satu bulan (1–31 hari).
                </span>
                {fieldErr('operatingDaysPerMonth') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('operatingDaysPerMonth')}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="businessNotes" className={labelClass}>
                  Catatan Usaha
                </label>
                <textarea
                  id="businessNotes"
                  name="businessNotes"
                  rows={2}
                  disabled={isPending}
                  className={inputClass}
                  placeholder="Opsional — tuliskan informasi yang dapat membantu memahami pola usaha, misalnya jam ramai atau perubahan operasional."
                />
                <span className={helperClass}>
                  Informasi bebas mengenai aktivitas usaha yang dapat memengaruhi penggunaan listrik.
                </span>
                {fieldErr('businessNotes') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('businessNotes')}</p>}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="electricityNotes" className={labelClass}>
                  Catatan Profil Listrik
                </label>
                <textarea
                  id="electricityNotes"
                  name="electricityNotes"
                  rows={2}
                  disabled={isPending}
                  className={inputClass}
                  placeholder="Opsional — misalnya perubahan daya, meter, atau informasi kelistrikan lain yang ingin Anda ingat."
                />
                <span className={helperClass}>
                  Catatan riwayat kelistrikan seperti perubahan instalasi atau pergantian meteran.
                </span>
                {fieldErr('electricityNotes') && <p className="text-xs text-[var(--danger)] mt-1">{fieldErr('electricityNotes')}</p>}
              </div>
            </div>
          )}
        </section>

        {/* SUBMIT BUTTON SECTION */}
        <section data-tour-id="setup-submit" className="pt-2">
          <InteractiveMotion>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold text-sm sm:text-base rounded-xl transition duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--surface)] disabled:opacity-50 shadow-xs"
            >
              {isPending ? 'Menyimpan Profil Usaha...' : 'Simpan Profil Usaha'}
            </button>
          </InteractiveMotion>
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            Setelah profil disimpan, kita akan menambahkan tagihan pertama agar WattWise mulai membaca pola listrik usaha Anda.
          </p>
        </section>
      </form>
    </>
  );
}
