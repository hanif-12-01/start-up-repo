<?php

namespace App\Services\Reports;

use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonInterface;

class PdfReportService
{
    /** @param array<string, mixed> $report */
    public function render(array $report, CarbonInterface $generatedAt): string
    {
        $pdf = Pdf::loadView('reports.monthly-pdf', [
            'report' => $report,
            'generatedAt' => $generatedAt,
        ])
            ->setPaper('a4')
            ->setOptions([
                'defaultFont' => 'DejaVu Sans',
                'dpi' => 96,
                'isRemoteEnabled' => false,
                'allowedRemoteHosts' => [],
                'isPhpEnabled' => false,
                'isJavascriptEnabled' => false,
                'isFontSubsettingEnabled' => true,
                'chroot' => resource_path('views/reports'),
            ])
            ->setWarnings(false)
            ->addInfo([
                'Title' => 'Laporan Bulanan WattWise AI',
                'Author' => 'WattWise AI',
                'Subject' => 'Estimasi biaya dan pemakaian listrik bulanan',
            ]);

        return $pdf->output();
    }
}
