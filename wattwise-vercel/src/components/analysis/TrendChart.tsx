'use client';

import { useId } from 'react';
import { decimal, formatMonthCompact, rupiah } from '@/lib/format';

export interface TrendPoint {
  period: string;
  label: string;
  usageKwh: number | null;
  billAmount: number | null;
  tariff: number | null;
  type: 'historical' | 'derived' | 'forecast';
}

type Metric = 'kwh' | 'rupiah';

function formatValue(value: number, metric: Metric) {
  return metric === 'kwh' ? `${decimal.format(value)} kWh` : rupiah.format(value);
}

export function TrendChart({
  points,
  metric = 'kwh',
  forecastLabel = 'Estimasi matematis',
}: {
  points: TrendPoint[];
  metric?: Metric;
  forecastLabel?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();

  if (!points.length) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-5 text-center text-sm text-[var(--muted)]">
        Belum cukup data untuk grafik tren. Tambahkan minimal satu tagihan.
      </div>
    );
  }

  const getPointValue = (point: TrendPoint) =>
    metric === 'kwh' ? point.usageKwh : point.billAmount;
  const values = points
    .map(getPointValue)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (!values.length) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-5 text-center text-sm text-[var(--muted)]">
        Nilai pemakaian belum tersedia. Lengkapi kWh atau tarif pada tagihan untuk menampilkan grafik.
      </div>
    );
  }

  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  const rawRange = rawMax - rawMin;
  const domainPadding = rawRange > 0 ? rawRange * 0.12 : Math.max(rawMax * 0.12, 1);
  const minValue = rawMin === 0 ? 0 : Math.max(0, rawMin - domainPadding);
  const maxValue = rawMax + domainPadding;
  const valueRange = maxValue - minValue || 1;

  const svgWidth = 760;
  const svgHeight = 320;
  const paddingLeft = 76;
  const paddingRight = 24;
  const paddingTop = 46;
  const paddingBottom = 68;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const getX = (index: number) =>
    points.length === 1
      ? paddingLeft + chartWidth / 2
      : paddingLeft + (index / (points.length - 1)) * chartWidth;
  const getY = (value: number) =>
    paddingTop + chartHeight - ((value - minValue) / valueRange) * chartHeight;

  const coordinates = points.map((point, index) => {
    const value = getPointValue(point);
    return {
      point,
      value,
      x: getX(index),
      y: value === null ? null : getY(value),
    };
  });
  const plottedCoordinates = coordinates.filter(
    (coordinate): coordinate is typeof coordinate & { value: number; y: number } =>
      coordinate.value !== null && coordinate.y !== null && Number.isFinite(coordinate.value),
  );
  const historicalCoordinates = plottedCoordinates.filter(
    (coordinate) => coordinate.point.type !== 'forecast',
  );
  const forecastCoordinates = plottedCoordinates.filter(
    (coordinate) => coordinate.point.type === 'forecast',
  );
  const pathFor = (items: typeof plottedCoordinates) =>
    items.length
      ? `M ${items[0].x} ${items[0].y}${items.slice(1).map((item) => ` L ${item.x} ${item.y}`).join('')}`
      : '';
  const historicalPath = pathFor(historicalCoordinates);
  const forecastPath =
    forecastCoordinates.length && historicalCoordinates.length
      ? pathFor([historicalCoordinates.at(-1)!, ...forecastCoordinates])
      : '';

  return (
    <figure className="w-full">
      <div
        className="overflow-x-auto pb-2 focus-visible:rounded-xl"
        tabIndex={0}
        aria-label="Area grafik dapat digulir horizontal pada layar kecil"
      >
        <div className="min-w-[680px]">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-auto w-full font-sans text-[var(--foreground)]"
            role="img"
            aria-labelledby={`${titleId} ${descriptionId}`}
          >
            <title id={titleId}>
              {`Grafik tren ${metric === 'kwh' ? 'pemakaian dalam kWh' : 'biaya dalam Rupiah'}`}
            </title>
            <desc id={descriptionId}>
              Data tercatat memakai garis utuh. {forecastLabel} berikutnya memakai garis putus-putus.
            </desc>

            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = paddingTop + chartHeight * ratio;
              const value = maxValue - valueRange * ratio;
              return (
                <g key={ratio}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="var(--chart-grid)"
                    strokeDasharray={ratio === 1 ? undefined : '4 5'}
                  />
                  <text
                    x={paddingLeft - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-[var(--muted)] text-[10px] font-semibold tabular-nums"
                  >
                    {formatValue(value, metric)}
                  </text>
                </g>
              );
            })}

            {historicalPath && (
              <path
                d={historicalPath}
                fill="none"
                stroke="var(--chart-series-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {forecastPath && (
              <path
                d={forecastPath}
                fill="none"
                stroke="var(--chart-series-forecast)"
                strokeWidth="2.5"
                strokeDasharray="7 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {coordinates.map((coordinate, index) => {
              const isForecast = coordinate.point.type === 'forecast';
              const isDerived = coordinate.point.type === 'derived';
              const showValue =
                coordinate.value !== null &&
                (index === 0 || index === coordinates.length - 1 || isForecast);
              return (
                <g key={`${coordinate.point.period}-${coordinate.point.type}-${index}`}>
                  <line
                    x1={coordinate.x}
                    y1={paddingTop}
                    x2={coordinate.x}
                    y2={svgHeight - paddingBottom}
                    stroke="var(--chart-grid)"
                    strokeDasharray="2 5"
                    opacity="0.7"
                  />
                  {coordinate.value !== null && coordinate.y !== null && (
                    <circle
                      cx={coordinate.x}
                      cy={coordinate.y}
                      r={isForecast ? 5 : 4}
                      fill={
                        isForecast
                          ? 'var(--surface)'
                          : isDerived
                            ? 'var(--chart-series-derived)'
                            : 'var(--chart-series-primary)'
                      }
                      stroke={
                        isForecast
                          ? 'var(--chart-series-forecast)'
                          : 'var(--chart-series-primary)'
                      }
                      strokeWidth="2.5"
                    >
                      <title>{`${coordinate.point.label}: ${formatValue(coordinate.value, metric)}`}</title>
                    </circle>
                  )}
                  <text
                    x={coordinate.x}
                    y={svgHeight - paddingBottom + 24}
                    textAnchor="middle"
                    className="fill-[var(--muted)] text-[10px] font-semibold"
                  >
                    {isForecast ? 'Estimasi' : formatMonthCompact(coordinate.point.period)}
                  </text>
                  {showValue && coordinate.y !== null && coordinate.value !== null && (
                    <text
                      x={coordinate.x}
                      y={coordinate.y - 12}
                      textAnchor="middle"
                      className={`text-[10px] font-extrabold tabular-nums ${
                        isForecast
                          ? 'fill-[var(--chart-series-forecast)]'
                          : isDerived
                            ? 'fill-[var(--chart-series-derived)]'
                            : 'fill-[var(--foreground)]'
                      }`}
                    >
                      {formatValue(coordinate.value, metric)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 rounded-full bg-[var(--chart-series-primary)]" aria-hidden="true" />
          <span className="font-semibold">Data tagihan tercatat</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 border-b-2 border-dashed border-[var(--chart-series-forecast)]" aria-hidden="true" />
          <span className="font-semibold">{forecastLabel} berikutnya</span>
        </span>
        {coordinates.some((coordinate) => coordinate.value === null) && (
          <span>Periode tanpa nilai tidak digambar sebagai titik nol.</span>
        )}
      </figcaption>

      <details className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm">
        <summary className="cursor-pointer font-bold text-[var(--foreground)]">
          Lihat data grafik dalam tabel
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pr-4">Periode</th>
                <th className="py-2 pr-4">Nilai</th>
                <th className="py-2">Jenis data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {points.map((point) => {
                const value = getPointValue(point);
                return (
                  <tr key={`${point.period}-${point.type}`}>
                    <td className="py-2 pr-4 font-semibold text-[var(--foreground)]">{point.label}</td>
                    <td className="py-2 pr-4 tabular-nums text-[var(--foreground)]">
                      {value === null ? 'Tidak tersedia' : formatValue(value, metric)}
                    </td>
                    <td className="py-2 text-[var(--muted)]">
                      {point.type === 'forecast'
                        ? forecastLabel
                        : point.type === 'derived'
                          ? 'Nilai turunan'
                          : 'Tercatat'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
