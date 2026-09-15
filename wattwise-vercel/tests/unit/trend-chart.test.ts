import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TrendChart,
  calculateTooltipPlacement,
  type TrendPoint,
} from '@/components/analysis/TrendChart';

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

  // --- Requirements 1, 2, 3: Accessibility & Native Tooltip Removal ---

  it('ensures no duplicate DOM IDs are rendered across heading, description, and SVG', () => {
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: samplePoints3, metric: 'kwh' })
    );
    const idMatches = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    const uniqueIds = new Set(idMatches);
    expect(idMatches.length).toBe(uniqueIds.size);
  });

  it('does not render native <title> or <desc> inside the SVG that triggers browser popup', () => {
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: samplePoints3, metric: 'kwh' })
    );
    const svgMatch = html.match(/<svg[\s\S]*?<\/svg>/);
    expect(svgMatch).not.toBeNull();
    const svgContent = svgMatch![0];
    expect(svgContent).not.toMatch(/<title[^>]*>/);
    expect(svgContent).not.toMatch(/<desc[^>]*>/);
  });

  it('retains accessible name on SVG referencing visible title and description via aria-labelledby', () => {
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points: samplePoints3, metric: 'kwh' })
    );
    const svgMatch = html.match(/<svg[^>]*aria-labelledby="([^"]+)"/);
    expect(svgMatch).not.toBeNull();
    const labeledBy = svgMatch![1].split(' ');
    expect(labeledBy.length).toBe(2);
    const [titleId, descId] = labeledBy;
    expect(html).toContain(`id="${titleId}"`);
    expect(html).toContain(`id="${descId}"`);
  });

  // --- Requirement 4: Custom Tooltip Content Semantics ---

  it('renders custom tooltip with period, value, status, and delta context for historical point', () => {
    const html = renderToStaticMarkup(
      React.createElement(TrendChart, {
        points: samplePoints3,
        metric: 'kwh',
        initialHoveredIndex: 2, // 'Agustus 2026', 450 kWh
      })
    );
    expect(html).toContain('Agustus 2026');
    expect(html).toContain('450 kWh');
    expect(html).toContain('Tercatat');
    expect(html).toContain('+7,1% dari Juli 2026');
  });

  it('renders custom tooltip with forecast explanation for forecast point', () => {
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
        metric: 'kwh',
        initialHoveredIndex: 3, // forecast point
      })
    );
    expect(html).toContain('September 2026');
    expect(html).toContain('480 kWh');
    expect(html).toContain('Estimasi');
    expect(html).toContain('Perkiraan berdasarkan data yang tersedia.');
  });

  // --- Requirements 5, 6, 7: calculateTooltipPlacement Pure Helper ---

  describe('calculateTooltipPlacement pure helper', () => {
    it('places tooltip below when point is in the upper portion of the chart', () => {
      const result = calculateTooltipPlacement({
        anchorX: 300,
        anchorY: 40,
        tooltipWidth: 200,
        tooltipHeight: 80,
        containerWidth: 600,
        containerHeight: 300,
        gap: 12,
        margin: 10,
      });
      expect(result.placement).toBe('below');
      expect(result.y).toBe(40 + 12); // 52
    });

    it('places tooltip above when point is in the lower portion of the chart', () => {
      const result = calculateTooltipPlacement({
        anchorX: 300,
        anchorY: 260,
        tooltipWidth: 200,
        tooltipHeight: 80,
        containerWidth: 600,
        containerHeight: 300,
        gap: 12,
        margin: 10,
      });
      expect(result.placement).toBe('above');
      expect(result.y).toBe(260 - 12 - 80); // 168
    });

    it('aligns tooltip toward the right when point is near left edge', () => {
      const result = calculateTooltipPlacement({
        anchorX: 20,
        anchorY: 150,
        tooltipWidth: 200,
        tooltipHeight: 80,
        containerWidth: 600,
        containerHeight: 300,
        gap: 12,
        margin: 10,
      });
      expect(result.align).toBe('left');
      expect(result.x).toBe(10); // clamped to safe margin
    });

    it('aligns tooltip toward the left when point is near right edge', () => {
      const result = calculateTooltipPlacement({
        anchorX: 590,
        anchorY: 150,
        tooltipWidth: 200,
        tooltipHeight: 80,
        containerWidth: 600,
        containerHeight: 300,
        gap: 12,
        margin: 10,
      });
      expect(result.align).toBe('right');
      expect(result.x).toBe(600 - 200 - 10); // 390
    });

    it('centers tooltip horizontally when point is centered', () => {
      const result = calculateTooltipPlacement({
        anchorX: 300,
        anchorY: 150,
        tooltipWidth: 200,
        tooltipHeight: 80,
        containerWidth: 600,
        containerHeight: 300,
        gap: 12,
        margin: 10,
      });
      expect(result.align).toBe('center');
      expect(result.x).toBe(300 - 100); // 200
    });

    it('causes a vertical flip when tooltip height cannot fit in the preferred placement', () => {
      // Preferred is 'above' (e.g. anchorY = 80 with preferredPlacement: 'above'), but tooltipHeight = 90
      // Above space: 80 - 12 - 10 = 58 < 90 -> cannot fit above!
      // Below space: 300 - 80 - 12 - 10 = 198 >= 90 -> fits below!
      const flipToBelow = calculateTooltipPlacement({
        anchorX: 300,
        anchorY: 80,
        tooltipWidth: 200,
        tooltipHeight: 90,
        containerWidth: 600,
        containerHeight: 300,
        preferredPlacement: 'above',
        gap: 12,
        margin: 10,
      });
      expect(flipToBelow.placement).toBe('below');
      expect(flipToBelow.y).toBe(80 + 12); // 92

      // Preferred is 'below' (e.g. anchorY = 220 with preferredPlacement: 'below'), but tooltipHeight = 90
      // Below space: 300 - 220 - 12 - 10 = 58 < 90 -> cannot fit below!
      // Above space: 220 - 12 - 10 = 198 >= 90 -> fits above!
      const flipToAbove = calculateTooltipPlacement({
        anchorX: 300,
        anchorY: 220,
        tooltipWidth: 200,
        tooltipHeight: 90,
        containerWidth: 600,
        containerHeight: 300,
        preferredPlacement: 'below',
        gap: 12,
        margin: 10,
      });
      expect(flipToAbove.placement).toBe('above');
      expect(flipToAbove.y).toBe(220 - 12 - 90); // 118
    });

    it('guarantees horizontal clamping never produces negative or overflowing coordinates', () => {
      // Negative anchorX
      const negResult = calculateTooltipPlacement({
        anchorX: -100,
        anchorY: 100,
        tooltipWidth: 250,
        tooltipHeight: 80,
        containerWidth: 500,
        containerHeight: 300,
        gap: 12,
        margin: 10,
      });
      expect(negResult.x).toBeGreaterThanOrEqual(0);
      expect(negResult.x).toBe(10);

      // Extremely large anchorX exceeding container
      const overflowResult = calculateTooltipPlacement({
        anchorX: 9999,
        anchorY: 100,
        tooltipWidth: 250,
        tooltipHeight: 80,
        containerWidth: 500,
        containerHeight: 300,
        gap: 12,
        margin: 10,
      });
      expect(overflowResult.x).toBe(500 - 250 - 10); // 240
      expect(overflowResult.x + 250).toBeLessThanOrEqual(500);

      // Narrow container smaller than tooltip
      const narrowResult = calculateTooltipPlacement({
        anchorX: 50,
        anchorY: 100,
        tooltipWidth: 300,
        tooltipHeight: 80,
        containerWidth: 200,
        containerHeight: 300,
        gap: 12,
        margin: 10,
      });
      expect(narrowResult.x).toBeGreaterThanOrEqual(0);
    });
  });
});
