<!doctype html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Bulanan WattWise AI</title>
    <style>
        @page { margin: 34px 38px 46px; }
        * { box-sizing: border-box; }
        body { color: #172033; font-family: "DejaVu Sans", sans-serif; font-size: 10px; line-height: 1.45; margin: 0; }
        h1, h2, h3, p { margin: 0; }
        .header { border-bottom: 3px solid #16a085; margin-bottom: 20px; padding-bottom: 14px; }
        .brand { color: #087f6b; font-size: 22px; font-weight: bold; letter-spacing: -.4px; }
        .subtitle { color: #596579; font-size: 10px; margin-top: 3px; }
        .meta { background: #f3f7f6; border: 1px solid #d8e8e4; border-radius: 6px; margin-bottom: 16px; padding: 12px; }
        .meta table, .metrics, .detail-table { border-collapse: collapse; width: 100%; }
        .meta td { padding: 2px 6px; vertical-align: top; }
        .label { color: #687589; font-size: 8px; text-transform: uppercase; }
        .value { color: #172033; font-size: 11px; font-weight: bold; }
        .section { margin-top: 17px; }
        .section h2 { border-left: 4px solid #16a085; font-size: 13px; margin-bottom: 9px; padding-left: 8px; }
        .metrics td { border: 1px solid #dce5e9; padding: 10px; vertical-align: top; width: 25%; }
        .metric-value { color: #087f6b; font-size: 13px; font-weight: bold; margin-top: 4px; }
        .detail-table th { background: #eaf4f2; color: #31524c; font-size: 8px; padding: 7px; text-align: left; text-transform: uppercase; }
        .detail-table td { border-bottom: 1px solid #e1e7eb; padding: 7px; vertical-align: top; }
        .detail-table tr { page-break-inside: avoid; }
        .status { background: #e9f7f3; border: 1px solid #cbe9e1; border-radius: 4px; padding: 10px; }
        .note { background: #fff8e8; border: 1px solid #f0dfb7; border-radius: 4px; color: #6e5722; padding: 9px; }
        .recommendation { border-bottom: 1px solid #e1e7eb; page-break-inside: avoid; padding: 8px 0; }
        .recommendation:last-child { border-bottom: 0; }
        .priority { color: #087f6b; font-size: 8px; font-weight: bold; text-transform: uppercase; }
        .muted { color: #687589; }
        .disclaimers { background: #f5f6f8; border-top: 2px solid #aab4c0; margin-top: 20px; padding: 12px; page-break-inside: avoid; }
        .disclaimers h2 { font-size: 11px; margin-bottom: 6px; }
        .disclaimers ol { margin: 0; padding-left: 17px; }
        .disclaimers li { margin-bottom: 4px; }
        .footer { color: #7a8697; font-size: 8px; margin-top: 12px; text-align: center; }
    </style>
</head>
<body>
@php
    $electricity = $report['electricity'] ?? [];
    $revenue = $report['revenue'] ?? [];
    $impact = $report['financial_impact'] ?? [];
    $efficiency = $report['efficiency_score'] ?? [];
    $appliances = array_slice($report['appliances']['top_candidates'] ?? [], 0, 3);
    $recommendations = array_slice($report['recommendations'] ?? [], 0, 5);
    $month = \Carbon\CarbonImmutable::createFromFormat('!Y-m', (string) ($report['selected_month'] ?? ''));
    $formatNumber = static fn ($value, int $decimals = 2): string => $value === null
        ? 'Belum tersedia'
        : number_format((float) $value, $decimals, ',', '.');
    $formatIdr = static fn ($value): string => $value === null
        ? 'Belum tersedia'
        : 'Rp '.number_format((float) $value, 0, ',', '.');
    $qualityLabels = [
        'COMPLETE' => 'Data listrik, pendapatan, dan peralatan tersedia untuk periode ini.',
        'NO_ELECTRICITY' => 'Data listrik belum tersedia; sebagian metrik tidak dapat dihitung.',
        'NO_REVENUE' => 'Data pendapatan belum tersedia; rasio biaya listrik tidak dapat dihitung.',
        'NO_APPLIANCES' => 'Data peralatan belum tersedia; kandidat konsumsi tertinggi tidak dapat ditampilkan.',
        'PARTIAL' => 'Data periode ini belum lengkap. Lengkapi input untuk analisis yang lebih berguna.',
    ];
@endphp

<header class="header">
    <div class="brand">WattWise AI</div>
    <div class="subtitle">Listrik Lebih Cerdas, Cash Flow Lebih Terkendali</div>
</header>

<section class="meta">
    <table>
        <tr>
            <td><div class="label">Usaha / Properti</div><div class="value">{{ \Illuminate\Support\Str::limit((string) ($report['business']['name'] ?? 'Usaha'), 100) }}</div></td>
            <td><div class="label">Periode Laporan</div><div class="value">{{ $month->locale('id')->translatedFormat('F Y') }}</div></td>
        </tr>
        <tr>
            <td><div class="label">Status Kualitas Data</div><div class="value">{{ $report['data_completeness'] ?? 'PARTIAL' }}</div></td>
            <td><div class="label">Dibuat</div><div class="value">{{ $generatedAt->locale('id')->translatedFormat('d F Y, H:i') }} {{ $generatedAt->format('T') }}</div></td>
        </tr>
    </table>
</section>

<section class="section">
    <h2>Ringkasan Bulanan</h2>
    <table class="metrics">
        <tr>
            <td><div class="label">Prediksi pemakaian listrik</div><div class="metric-value">{{ $formatNumber($electricity['usage_kwh'] ?? null) }} kWh</div></td>
            <td><div class="label">Estimasi tagihan listrik</div><div class="metric-value">{{ $formatIdr($electricity['bill_amount'] ?? null) }}</div></td>
            <td><div class="label">Pendapatan kotor</div><div class="metric-value">{{ $formatIdr($revenue['amount'] ?? null) }}</div></td>
            <td><div class="label">Rasio biaya listrik</div><div class="metric-value">{{ $formatNumber($impact['electricity_revenue_ratio_percent'] ?? null) }}%</div></td>
        </tr>
    </table>
</section>

<section class="section">
    <h2>Stand Meter & Efisiensi</h2>
    <table class="detail-table">
        <tr><th>Stand meter awal</th><th>Stand meter akhir</th><th>Skor / Status</th><th>Keyakinan</th></tr>
        <tr>
            <td>{{ $formatNumber($electricity['meter_start'] ?? null) }}</td>
            <td>{{ $formatNumber($electricity['meter_end'] ?? null) }}</td>
            <td>{{ $efficiency['score'] ?? '—' }} / {{ $efficiency['label'] ?? 'Data belum cukup' }}</td>
            <td>{{ $efficiency['confidence'] ?? 'LOW' }}</td>
        </tr>
    </table>
    <div class="status" style="margin-top: 8px;">{{ \Illuminate\Support\Str::limit((string) ($efficiency['explanation'] ?? 'Data belum cukup untuk menghitung skor efisiensi.'), 400) }}</div>
</section>

<section class="section">
    <h2>Kandidat Peralatan dengan Estimasi Konsumsi Tertinggi</h2>
    @if ($appliances === [])
        <p class="muted">Belum ada data peralatan untuk periode laporan ini.</p>
    @else
        <table class="detail-table">
            <tr><th>Peralatan</th><th>Estimasi kWh / bulan</th><th>Estimasi biaya</th><th>Catatan</th></tr>
            @foreach ($appliances as $appliance)
                <tr>
                    <td>{{ \Illuminate\Support\Str::limit((string) ($appliance['name'] ?? 'Peralatan'), 80) }}</td>
                    <td>{{ $formatNumber($appliance['estimated_monthly_kwh'] ?? null) }}</td>
                    <td>{{ $formatIdr($appliance['estimated_monthly_cost'] ?? null) }}</td>
                    <td>{{ \Illuminate\Support\Str::limit((string) ($appliance['ranking_reason'] ?? 'Berdasarkan data yang Anda input.'), 180) }}</td>
                </tr>
            @endforeach
        </table>
    @endif
</section>

<section class="section">
    <h2>Rekomendasi Prioritas</h2>
    @forelse ($recommendations as $recommendation)
        <div class="recommendation">
            <div class="priority">Prioritas {{ $recommendation['priority'] ?? 'MEDIUM' }}</div>
            <strong>{{ \Illuminate\Support\Str::limit((string) ($recommendation['title'] ?? 'Rekomendasi'), 100) }}</strong>
            <p>{{ \Illuminate\Support\Str::limit((string) ($recommendation['description'] ?? $recommendation['action'] ?? ''), 350) }}</p>
        </div>
    @empty
        <p class="muted">Belum ada rekomendasi untuk periode ini.</p>
    @endforelse
</section>

<section class="section">
    <h2>Catatan Kualitas Data</h2>
    <div class="note">{{ $qualityLabels[$report['data_completeness'] ?? 'PARTIAL'] ?? $qualityLabels['PARTIAL'] }}</div>
</section>

<section class="disclaimers">
    <h2>Catatan Penting</h2>
    <ol>
        @foreach (array_slice($report['disclaimers'] ?? [], 0, 4) as $disclaimer)
            <li>{{ \Illuminate\Support\Str::limit((string) $disclaimer, 500) }}</li>
        @endforeach
    </ol>
</section>

<footer class="footer">Laporan ini dihasilkan otomatis dari catatan usaha yang tersimpan di WattWise AI.</footer>
</body>
</html>
