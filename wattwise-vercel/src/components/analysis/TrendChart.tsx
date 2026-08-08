'use client';

import { decimal, formatMonth, rupiah } from '@/lib/format';

export interface TrendPoint {
  period: string; // e.g. '2026-05'
  label: string;  // e.g. 'Mei 2026'
  usageKwh: number | null;
  billAmount: number | null;
  tariff: number | null;
  type: 'historical' | 'derived' | 'forecast';
}

export function TrendChart({
  points,
  metric = 'kwh',
}: {
  points: TrendPoint[];
  metric?: 'kwh' | 'rupiah';
}) {
  if (!points || points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--muted)]">
        Belum cukup data untuk grafik tren. Tambahkan minimal satu tagihan.
      </div>
    );
  }

  const values = points
    .map((p) => (metric === 'kwh' ? p.usageKwh : p.billAmount))
    .filter((v): v is number => v !== null && Number.isFinite(v));

  const maxVal = Math.max(...values, 10);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  // SVG viewport dimensions
  const svgWidth = 640;
  const svgHeight = 200;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (points.length === 1) return svgWidth / 2;
    return paddingX + (index / (points.length - 1)) * chartW;
  };

  const getY = (val: number | null) => {
    if (val === null) return svgHeight - paddingBottom;
    const norm = (val - minVal) / range;
    return svgHeight - paddingBottom - norm * chartH;
  };

  // Group points into continuous paths based on type
  const pointCoords = points.map((p, idx) => {
    const val = metric === 'kwh' ? p.usageKwh : p.billAmount;
    return {
      x: getX(idx),
      y: getY(val),
      val,
      point: p,
    };
  });

  // Create SVG path strings for historical solid line vs forecast dashed line
  const histCoords = pointCoords.filter((c) => c.point.type !== 'forecast');
  const forecastCoords = pointCoords.filter((c) => c.point.type === 'forecast');

  let histPath = '';
  if (histCoords.length > 0) {
    histPath = `M ${histCoords[0].x} ${histCoords[0].y}` + histCoords.slice(1).map((c) => ` L ${c.x} ${c.y}`).join('');
  }

  let forecastPath = '';
  if (forecastCoords.length > 0 && histCoords.length > 0) {
    const lastHist = histCoords.at(-1)!;
    forecastPath = `M ${lastHist.x} ${lastHist.y}` + forecastCoords.map((c) => ` L ${c.x} ${c.y}`).join('');
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[500px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto text-[var(--foreground)] font-sans"
          role="img"
          aria-label={`Grafik tren ${metric === 'kwh' ? 'pemakaian kWh' : 'biaya Rupiah'}`}
        >
          <title>{`Grafik tren ${metric === 'kwh' ? 'pemakaian (kWh)' : 'biaya (Rp)'}`}</title>
          <desc>Visualisasi tren historis dan estimasi proyeksi pemakaian listrik.</desc>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingTop}
            x2={svgWidth - paddingX}
            y2={paddingTop}
            stroke="var(--border)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={paddingTop + chartH / 2}
            x2={svgWidth - paddingX}
            y2={paddingTop + chartH / 2}
            stroke="var(--border)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={svgHeight - paddingBottom}
            x2={svgWidth - paddingX}
            y2={svgHeight - paddingBottom}
            stroke="var(--border)"
          />

          {/* Max/Min Value Labels */}
          <text
            x={paddingX - 6}
            y={paddingTop + 4}
            textAnchor="end"
            className="text-[10px] font-bold fill-[var(--muted)] tabular-nums"
          >
            {metric === 'kwh' ? `${decimal.format(maxVal)} kWh` : rupiah.format(maxVal)}
          </text>
          <text
            x={paddingX - 6}
            y={svgHeight - paddingBottom + 4}
            textAnchor="end"
            className="text-[10px] font-bold fill-[var(--muted)] tabular-nums"
          >
            {metric === 'kwh' ? `${decimal.format(minVal)} kWh` : rupiah.format(minVal)}
          </text>

          {/* Historical Solid Line */}
          {histPath && (
            <path
              d={histPath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast Dashed Line */}
          {forecastPath && (
            <path
              d={forecastPath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points & Labels */}
          {pointCoords.map((c, idx) => {
            const isForecast = c.point.type === 'forecast';
            const isDerived = c.point.type === 'derived';

            return (
              <g key={`${c.point.period}-${idx}`}>
                {/* Vertical guideline */}
                <line
                  x1={c.x}
                  y1={paddingTop}
                  x2={c.x}
                  y2={svgHeight - paddingBottom}
                  stroke="var(--border)"
                  strokeDasharray="2 2"
                  opacity="0.5"
                />

                {/* Point circle */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isForecast ? 5 : 4}
                  fill={isForecast ? 'var(--background)' : isDerived ? 'var(--muted)' : 'var(--primary)'}
                  stroke="var(--primary)"
                  strokeWidth="2"
                />

                {/* Period X-Axis Label */}
                <text
                  x={c.x}
                  y={svgHeight - paddingBottom + 18}
                  textAnchor="middle"
                  className="text-[11px] font-bold fill-[var(--foreground)]"
                >
                  {formatMonth(c.point.period)}
                </text>

                {/* Value Label above point */}
                {c.val !== null && (
                  <text
                    x={c.x}
                    y={c.y - 10}
                    textAnchor="middle"
                    className={`text-[10px] font-black tabular-nums ${
                      isForecast
                        ? 'fill-[var(--primary)]'
                        : isDerived
                          ? 'fill-[var(--muted)]'
                          : 'fill-[var(--foreground)]'
                    }`}
                  >
                    {metric === 'kwh' ? `${decimal.format(c.val)} kWh` : rupiah.format(c.val)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs text-[var(--muted)] border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-[var(--primary)] rounded-full inline-block" />
          <span className="font-semibold">Data Tagihan Tercatat</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-4 border-b-2 border-dashed border-[var(--primary)] inline-block" />
          <span className="font-semibold">Proyeksi Skenario</span>
        </div>
      </div>
    </div>
  );
}
