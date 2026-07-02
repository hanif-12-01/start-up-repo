export interface ElectricityDataQualityInput {
  month: number;
  year: number;
  usageKwh: number;
  costIdr: number;
}

export type ElectricityDataQualityEntry = ElectricityDataQualityInput;

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function periodIndex(period: Pick<ElectricityDataQualityInput, "year" | "month">) {
  return period.year * 12 + period.month;
}

function pctIncrease(current: number, baseline: number) {
  return baseline > 0 ? (current - baseline) / baseline : 0;
}

function avg(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function pctText(value: number) {
  return `${Math.round(value * 100)}%`;
}

function idrText(value: number) {
  return Math.round(value).toLocaleString("id-ID");
}

function periodText(period: Pick<ElectricityDataQualityInput, "year" | "month">) {
  return `${MONTHS[period.month - 1] ?? `Bulan ${period.month}`} ${period.year}`;
}

export function buildElectricityDataQualityWarnings(
  input: ElectricityDataQualityInput,
  entries: ElectricityDataQualityEntry[]
) {
  const targetIndex = periodIndex(input);
  const previous = entries
    .filter(
      (entry) =>
        periodIndex(entry) < targetIndex &&
        entry.usageKwh > 0 &&
        entry.costIdr > 0
    )
    .sort((a, b) => periodIndex(a) - periodIndex(b));

  const warnings: string[] = [];
  const previousMonth = previous.find((entry) => periodIndex(entry) === targetIndex - 1);

  if (previousMonth) {
    const kwhRise = pctIncrease(input.usageKwh, previousMonth.usageKwh);
    const costRise = pctIncrease(input.costIdr, previousMonth.costIdr);

    if (kwhRise > 0.3) {
      warnings.push(
        `Pemakaian kWh naik ${pctText(kwhRise)} dibanding ${periodText(previousMonth)}. Pastikan angka meter atau token tidak salah input.`
      );
    }

    if (costRise > 0.3 && kwhRise < 0.05) {
      warnings.push(
        `Biaya listrik naik ${pctText(costRise)} dibanding ${periodText(previousMonth)}, tetapi kWh ${
          kwhRise > 0 ? `hanya naik ${pctText(kwhRise)}` : "tidak naik"
        }. Periksa tarif, denda, atau biaya tambahan.`
      );
    }
  }

  const lastThree = previous.slice(-3);
  if (lastThree.length === 3) {
    const threeMonthAvg = avg(lastThree.map((entry) => entry.usageKwh));
    const kwhRiseVsAvg = pctIncrease(input.usageKwh, threeMonthAvg);

    if (kwhRiseVsAvg > 0.5) {
      warnings.push(
        `Pemakaian kWh naik ${pctText(kwhRiseVsAvg)} dibanding rata-rata 3 bulan terakhir. Periksa apakah ada alat baru, jam operasional berubah, atau salah input.`
      );
    }
  }

  // ponytail: tariff anomaly uses last-3-entry average; replace with PLN tariff-class rules when tariff class is stored.
  const previousTariffs = previous.slice(-3).map((entry) => entry.costIdr / entry.usageKwh);
  if (previousTariffs.length > 0 && input.usageKwh > 0) {
    const tariffAverage = avg(previousTariffs);
    const currentTariff = input.costIdr / input.usageKwh;
    const tariffGap = pctIncrease(currentTariff, tariffAverage);

    if (Math.abs(tariffGap) > 0.3) {
      warnings.push(
        `Tarif efektif sekitar Rp${idrText(currentTariff)}/kWh terlihat ${
          tariffGap > 0 ? "lebih tinggi" : "lebih rendah"
        } ${pctText(Math.abs(tariffGap))} dari data sebelumnya. Cek ulang nominal biaya dan kWh.`
      );
    }
  }

  const latestPrevious = previous.at(-1);
  if (latestPrevious) {
    const gap = targetIndex - periodIndex(latestPrevious);

    if (gap > 1) {
      warnings.push(
        `Ada ${gap - 1} bulan yang terlewat antara ${periodText(latestPrevious)} dan ${periodText(input)}. Pastikan periode laporan sudah benar.`
      );
    }
  }

  return warnings;
}