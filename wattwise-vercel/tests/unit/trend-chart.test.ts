import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrendChart, type TrendPoint } from '@/components/analysis/TrendChart';

describe('TrendChart UX Refinement Unit Tests', () => {
  const samplePoints3: TrendPoint[] = [
    {
      period: '2026-06',
      label: 'Juni 2026',
      usageKwh: 400,
      billAmount: 850000,
      tariff: 1444.7,
      type: 'historical',
    },
    {
      period: '2026-07',
      label: 'Juli 2026',
      usageKwh: 420,
      billAmount: 900000,
      tariff: 1444.7,
      type: 'historical',
    },
    {
      period: '2026-08',
      label: 'Agustus 2026',
      usageKwh: 450,
      billAmount: 950000,
      tariff: 1444.7,
      type: 'historical',
    },
  ];

  it('renders graceful empty state when points array is empty', () => {
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: [], metric: 'rupiah' })
    );
    expect(html).toContain('Belum ada data tagihan untuk ditampilkan');
  });

  it('renders graceful empty state when all points have null values', () => {
    const nullPoints: TrendPoint[] = [
      {
        period: '2026-08',
        label: 'Agustus 2026',
        usageKwh: null,
        billAmount: null,
        tariff: null,
        type: 'historical',
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: nullPoints, metric: 'kwh' })
    );
    expect(html).toContain('Belum ada data tagihan untuk ditampilkan');
  });

  it('renders single data point with low-data guidance banner and no broken delta', () => {
    const singlePoint: TrendPoint[] = [
      {
        period: '2026-08',
        label: 'Agustus 2026',
        usageKwh: 450,
        billAmount: 950000,
        tariff: 1444.7,
        type: 'historical',
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: singlePoint, metric: 'rupiah' })
    );

    // Check header
    expect(html).toContain('RIWAYAT BIAYA');
    expect(html).toContain('Tren tagihan listrik');

    // Check decision summary
    expect(html).toContain('Tagihan terakhir');
    expect(html).toContain('950.000');
    expect(html).toContain('Perlu 1 bulan lagi');
    expect(html).toContain('1 bulan data tercatat');

    // Check guidance note
    expect(html).toContain('Tambahkan data bulan berikutnya untuk mulai melihat perubahan');
  });

  it('renders 2 data points with limited history banner and valid MoM change', () => {
    const twoPoints: TrendPoint[] = [
      {
        period: '2026-07',
        label: 'Juli 2026',
        usageKwh: 400,
        billAmount: 800000,
        tariff: 1444.7,
        type: 'historical',
      },
      {
        period: '2026-08',
        label: 'Agustus 2026',
        usageKwh: 460,
        billAmount: 920000,
        tariff: 1444.7,
        type: 'historical',
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: twoPoints, metric: 'rupiah' })
    );

    expect(html).toContain('920.000');
    expect(html).toContain('+15%');
    expect(html).toContain('Naik');
    expect(html).toContain('2 bulan data tercatat');
    expect(html).toContain('Data masih terbatas (2 bulan)');
  });

  it('calculates direction Turun when value decreases', () => {
    const decreasingPoints: TrendPoint[] = [
      {
        period: '2026-07',
        label: 'Juli 2026',
        usageKwh: 500,
        billAmount: 1000000,
        tariff: 1444.7,
        type: 'historical',
      },
      {
        period: '2026-08',
        label: 'Agustus 2026',
        usageKwh: 400,
        billAmount: 800000,
        tariff: 1444.7,
        type: 'historical',
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: decreasingPoints, metric: 'rupiah' })
    );

    expect(html).toContain('-20%');
    expect(html).toContain('Turun');
  });

  it('calculates direction Stabil when value change is within +-2%', () => {
    const stablePoints: TrendPoint[] = [
      {
        period: '2026-07',
        label: 'Juli 2026',
        usageKwh: 500,
        billAmount: 1000000,
        tariff: 1444.7,
        type: 'historical',
      },
      {
        period: '2026-08',
        label: 'Agustus 2026',
        usageKwh: 505,
        billAmount: 1010000,
        tariff: 1444.7,
        type: 'historical',
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: stablePoints, metric: 'rupiah' })
    );

    expect(html).toContain('+1%');
    expect(html).toContain('Stabil');
  });

  it('renders kwh metric with correct labels and decimal formatting', () => {
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: samplePoints3, metric: 'kwh' })
    );

    expect(html).toContain('RIWAYAT PENGGUNAAN');
    expect(html).toContain('Tren pemakaian listrik');
    expect(html).toContain('Pemakaian terakhir');
    expect(html).toContain('450 kWh');
    expect(html).toContain('Pemakaian tercatat');
  });

  it('renders forecast point with dashed series and distinct legend', () => {
    const pointsWithForecast: TrendPoint[] = [
      ...samplePoints3,
      {
        period: '2026-09',
        label: 'September 2026',
        usageKwh: 480,
        billAmount: 990000,
        tariff: 1444.7,
        type: 'forecast',
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, {
        points: pointsWithForecast,
        metric: 'rupiah',
        forecastLabel: 'Estimasi berikutnya',
      })
    );

    expect(html).toContain('Estimasi berikutnya');
    expect(html).toContain('stroke-dasharray="6 4"');
  });

  it('renders accessible table disclosure matching chart points', () => {
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: samplePoints3, metric: 'rupiah' })
    );

    expect(html).toContain('Lihat data grafik dalam tabel');
    expect(html).toContain('Juni 2026');
    expect(html).toContain('Juli 2026');
    expect(html).toContain('Agustus 2026');
    expect(html).toContain('850.000');
    expect(html).toContain('900.000');
    expect(html).toContain('950.000');
  });
});
