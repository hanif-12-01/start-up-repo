<?php

namespace App\Services\Reports;

use Carbon\Carbon;

class ReportExportService
{
    /**
     * Export report data to a stream resource.
     *
     * @param  resource  $stream
     * @param  array<string, mixed>  $report
     */
    public function export($stream, array $report): void
    {
        // 1. Write UTF-8 BOM for Excel compatibility
        fwrite($stream, "\xEF\xBB\xBF");

        // Helper to write a sanitized row
        $writeRow = function (array $row) use ($stream) {
            $sanitized = array_map([$this, 'sanitizeForCsv'], $row);
            fputcsv($stream, $sanitized);
        };

        // 2. Title & Positioning
        $writeRow(['WattWise AI - Laporan Bulanan']);
        $writeRow(['Penyedia Dokumen', 'Hybrid AI Decision Support']);
        $writeRow(['Tanggal Ekspor', Carbon::now()->toDateTimeString()]);
        $writeRow([]);

        // 3. Required Disclaimers
        $writeRow(['CATATAN PENTING & DISCLAIMER']);
        $writeRow(['1', 'Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.']);
        $writeRow(['2', 'WattWise AI bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.']);
        $writeRow(['3', 'Perhitungan peralatan berdasarkan data daya dan jam pakai yang Anda input. Tanpa sensor, WattWise AI tidak mengukur konsumsi aktual tiap alat.']);
        $writeRow(['4', 'Sisa pendapatan setelah listrik belum memperhitungkan biaya operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.']);
        $writeRow([]);

        // 4. Business & Period Details
        $businessName = $report['business']['name'] ?? '-';
        $businessType = $this->formatBusinessType($report['business']['business_type'] ?? null);
        $selectedMonth = $report['selected_month'] ?? '-';
        $completeness = $this->formatCompleteness($report['data_completeness'] ?? null);

        $writeRow(['INFORMASI USAHA & PERIODE']);
        $writeRow(['Nama Usaha', 'Tipe Usaha', 'Periode Laporan', 'Status Kelengkapan Data']);
        $writeRow([$businessName, $businessType, $selectedMonth, $completeness]);
        $writeRow([]);

        // 5. Monthly Metrics Summary
        $electricity = $report['electricity'] ?? [];
        $revenue = $report['revenue'] ?? [];
        $impact = $report['financial_impact'] ?? [];

        $usageKwh = $electricity['usage_kwh'] !== null ? $electricity['usage_kwh'].' kWh' : 'Tidak tersedia';
        $billAmount = $electricity['bill_amount'] !== null ? 'Rp '.number_format($electricity['bill_amount'], 0, ',', '.') : 'Tidak tersedia';
        $tariff = $electricity['tariff_per_kwh'] !== null ? 'Rp '.number_format($electricity['tariff_per_kwh'], 0, ',', '.') : 'Tidak tersedia';

        $revenueAmount = $revenue['amount'] !== null ? 'Rp '.number_format($revenue['amount'], 0, ',', '.') : 'Tidak tersedia';

        $ratio = $impact['electricity_revenue_ratio_percent'] !== null ? number_format($impact['electricity_revenue_ratio_percent'], 1, ',', '.').'%' : 'Tidak tersedia';
        $remaining = $impact['remaining_revenue_after_electricity'] !== null ? 'Rp '.number_format($impact['remaining_revenue_after_electricity'], 0, ',', '.') : 'Tidak tersedia';

        $writeRow(['RINGKASAN METRIK BULANAN']);
        $writeRow([
            'Prediksi pemakaian listrik (kWh)',
            'Estimasi tagihan listrik (Rupiah)',
            'Tarif per kWh (Rupiah)',
            'Total Pendapatan (Rupiah)',
            'Rasio Listrik terhadap Pendapatan (%)',
            'Sisa Pendapatan setelah Listrik (Rupiah)',
        ]);
        $writeRow([
            $usageKwh,
            $billAmount,
            $tariff,
            $revenueAmount,
            $ratio,
            $remaining,
        ]);
        $writeRow([]);

        // 6. Efficiency Score Section
        $scoreData = $report['efficiency_score'] ?? [];
        $score = $scoreData['score'] !== null ? (string) $scoreData['score'] : 'Tidak tersedia';
        $label = $scoreData['label'] ?? 'Tidak tersedia';
        $confidence = $scoreData['confidence'] ?? 'Tidak tersedia';
        $explanation = $scoreData['explanation'] ?? '';

        $writeRow(['SKOR EFISIENSI LISTRIK']);
        $writeRow(['Skor Efisiensi', 'Kategori Efisiensi', 'Tingkat Kepercayaan', 'Penjelasan']);
        $writeRow([$score, $label, $this->formatConfidence($confidence), $explanation]);
        $writeRow([]);

        // 7. Appliance Candidates
        $writeRow(['KANDIDAT PERALATAN YANG PERLU DICEK']);
        $writeRow(['Peringkat', 'Nama Peralatan', 'Kategori', 'Estimasi Pemakaian Bulanan (kWh)', 'Estimasi Biaya Bulanan (Rupiah)', 'Catatan / Alasan']);

        $candidates = $report['appliances']['top_candidates'] ?? [];
        if (! empty($candidates)) {
            foreach ($candidates as $index => $candidate) {
                $cKwh = $candidate['estimated_monthly_kwh'] !== null ? number_format($candidate['estimated_monthly_kwh'], 2, ',', '.').' kWh' : '-';
                $cCost = $candidate['estimated_monthly_cost'] !== null ? 'Rp '.number_format($candidate['estimated_monthly_cost'], 0, ',', '.') : '-';
                $writeRow([
                    (string) ($index + 1),
                    $candidate['name'] ?? '',
                    $this->formatApplianceCategory($candidate['category'] ?? ''),
                    $cKwh,
                    $cCost,
                    $candidate['ranking_reason'] ?? '',
                ]);
            }
        } else {
            $writeRow(['-', 'Tidak ada data peralatan', '-', '-', '-', '-']);
        }
        $writeRow([]);

        // 8. Recommendations
        $writeRow(['REKOMENDASI HEMAT']);
        $writeRow(['Prioritas', 'Judul Rekomendasi', 'Deskripsi', 'Rencana Tindakan', 'Alasan', 'Potensi Hemat Bulanan (Rupiah)']);

        $recommendations = $report['recommendations'] ?? [];
        if (! empty($recommendations)) {
            foreach ($recommendations as $rec) {
                $priority = $this->formatPriority($rec['priority'] ?? '');
                $saving = ($rec['estimated_saving_idr'] ?? null) !== null ? 'Rp '.number_format($rec['estimated_saving_idr'], 0, ',', '.') : '-';
                $writeRow([
                    $priority,
                    $rec['title'] ?? '',
                    $rec['description'] ?? '',
                    $rec['action'] ?? '',
                    $rec['reason'] ?? '',
                    $saving,
                ]);
            }
        } else {
            $writeRow(['-', 'Tidak ada rekomendasi penghematan', '-', '-', '-', '-']);
        }
    }

    /**
     * Sanitize cell content to prevent CSV Formula Injection.
     * Prepends a single quote if the value starts with: =, +, -, @, tab, CR, or LF.
     */
    public function sanitizeForCsv(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_numeric($value)) {
            return (string) $value;
        }

        $value = (string) $value;

        if ($value === '') {
            return '';
        }

        if (preg_match('/^[\s\x00-\x1F\x7F]*[=\+\-\@\t\r\n]/', $value)) {
            return "'".$value;
        }

        return $value;
    }

    private function formatBusinessType(?string $type): string
    {
        switch ($type) {
            case 'KOS_PROPERTY': return 'Kos / Properti';
            case 'FNB': return 'Warung / F&B';
            case 'LAUNDRY': return 'Laundry';
            case 'RETAIL': return 'Toko / Retail';
            case 'COLD_STORAGE': return 'Cold Storage';
            case 'OTHER': return 'Lainnya';
            default: return $type ?? '-';
        }
    }

    private function formatCompleteness(?string $status): string
    {
        switch ($status) {
            case 'COMPLETE': return 'Lengkap';
            case 'NO_ELECTRICITY': return 'Data Listrik Kosong';
            case 'NO_REVENUE': return 'Data Pendapatan Kosong';
            case 'NO_APPLIANCES': return 'Peralatan Kosong';
            case 'PARTIAL': return 'Kurang Lengkap (Sebagian)';
            default: return $status ?? '-';
        }
    }

    private function formatConfidence(?string $level): string
    {
        switch ($level) {
            case 'HIGH': return 'Tinggi';
            case 'MEDIUM': return 'Sedang';
            case 'LOW': return 'Rendah';
            default: return $level ?? '-';
        }
    }

    private function formatPriority(?string $priority): string
    {
        switch ($priority) {
            case 'HIGH': return 'Prioritas Tinggi';
            case 'MEDIUM': return 'Prioritas Sedang';
            case 'LOW': return 'Prioritas Ringan';
            default: return $priority ?? '-';
        }
    }

    private function formatApplianceCategory(?string $category): string
    {
        return $category ? strtoupper($category) : '';
    }
}
