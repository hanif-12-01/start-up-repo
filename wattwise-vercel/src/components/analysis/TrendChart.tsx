'use client';

import React, { useState, useId, useRef, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Info,
  Calendar,
} from 'lucide-react';
import {
  decimal,
  formatMonth,
  formatMonthCompact,
  rupiah,
  compactRupiah,
  compactDecimal,
} from '@/lib/format';

export interface TrendPoint {
  period: string;
  label: string;
  usageKwh: number | null;
  billAmount: number | null;
  tariff: number | null;
  type: 'historical' | 'derived' | 'forecast';
}

export type Metric = 'kwh' | 'rupiah';

export interface TrendChartProps {
  points: TrendPoint[];
  metric?: Metric;
  forecastLabel?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  initialHoveredIndex?: number | null;
}

export interface TooltipPlacementInput {
  anchorX: number;
  anchorY: number;
  tooltipWidth: number;
  tooltipHeight: number;
  containerWidth: number;
  containerHeight: number;
  preferredPlacement?: 'above' | 'below';
  gap?: number;
  margin?: number;
}

export interface TooltipPlacementResult {
  x: number;
  y: number;
  placement: 'above' | 'below';
  align: 'center' | 'left' | 'right';
}

export function calculateTooltipPlacement({
  anchorX,
  anchorY,
  tooltipWidth,
  tooltipHeight,
  containerWidth,
  containerHeight,
  preferredPlacement,
  gap = 12,
  margin = 10,
}: TooltipPlacementInput): TooltipPlacementResult {
  const safeMargin = Math.max(0, margin);
  const safeGap = Math.max(0, gap);

  // Vertical placement preference:
  // If preferredPlacement is specified, respect it; otherwise:
  // If point is in upper half of container (< containerHeight / 2), prefer below.
  // If point is in lower half (>= containerHeight / 2), prefer above.
  const defaultPreferred = anchorY < containerHeight / 2 ? 'below' : 'above';
  const preferred = preferredPlacement ?? defaultPreferred;

  const fitsAbove = anchorY - safeGap - tooltipHeight >= safeMargin;
  const fitsBelow = anchorY + safeGap + tooltipHeight <= containerHeight - safeMargin;

  let placement: 'above' | 'below';
  if (preferred === 'above') {
    if (fitsAbove) {
      placement = 'above';
    } else if (fitsBelow) {
      placement = 'below';
    } else {
      const spaceAbove = anchorY - safeGap - safeMargin;
      const spaceBelow = containerHeight - anchorY - safeGap - safeMargin;
      placement = spaceBelow > spaceAbove ? 'below' : 'above';
    }
  } else {
    if (fitsBelow) {
      placement = 'below';
    } else if (fitsAbove) {
      placement = 'above';
    } else {
      const spaceAbove = anchorY - safeGap - safeMargin;
      const spaceBelow = containerHeight - anchorY - safeGap - safeMargin;
      placement = spaceAbove > spaceBelow ? 'above' : 'below';
    }
  }

  // Calculate clamped Y
  const rawY = placement === 'above' ? anchorY - safeGap - tooltipHeight : anchorY + safeGap;
  const minY = safeMargin;
  const maxY = Math.max(minY, containerHeight - tooltipHeight - safeMargin);
  const clampedY = Math.max(0, Math.max(minY, Math.min(rawY, maxY)));

  // Horizontal placement:
  // Default: centered on anchorX
  const desiredX = anchorX - tooltipWidth / 2;
  const minX = safeMargin;
  const maxX = Math.max(minX, containerWidth - tooltipWidth - safeMargin);

  let align: 'center' | 'left' | 'right' = 'center';
  if (desiredX < minX) {
    align = 'left';
  } else if (desiredX > maxX) {
    align = 'right';
  }

  const clampedX = Math.max(0, Math.max(minX, Math.min(desiredX, maxX)));

  return {
    x: clampedX,
    y: clampedY,
    placement,
    align,
  };
}

function formatExactValue(value: number, metric: Metric): string {
  return metric === 'kwh' ? `${decimal.format(value)} kWh` : rupiah.format(value);
}

function formatAxisTick(value: number, metric: Metric): string {
  return metric === 'kwh' ? `${compactDecimal(value)} kWh` : compactRupiah(value);
}

export function TrendChart({
  points,
  metric = 'kwh',
  forecastLabel = 'Estimasi berikutnya',
  eyebrow,
  title,
  description,
  className = '',
  initialHoveredIndex,
}: TrendChartProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(initialHoveredIndex ?? null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPlacementResult | null>(null);

  // Default headers if not provided by caller
  const defaultEyebrow = metric === 'rupiah' ? 'RIWAYAT BIAYA' : 'RIWAYAT PENGGUNAAN';
  const defaultTitle = metric === 'rupiah' ? 'Tren tagihan listrik' : 'Tren pemakaian listrik';
  const defaultDesc =
    metric === 'rupiah'
      ? 'Lihat perubahan biaya listrik dari bulan ke bulan.'
      : 'Lihat perubahan pemakaian listrik dalam kWh dari bulan ke bulan.';

  const displayEyebrow = eyebrow ?? defaultEyebrow;
  const displayTitle = title ?? defaultTitle;
  const displayDesc = description ?? defaultDesc;

  // Compute values
  const getPointValue = (point: TrendPoint) =>
    metric === 'kwh' ? point.usageKwh : point.billAmount;

  const validPoints = points.filter(
    (p) => getPointValue(p) !== null && Number.isFinite(getPointValue(p))
  );

  const historicalPoints = points.filter(
    (p) => p.type !== 'forecast' && getPointValue(p) !== null && Number.isFinite(getPointValue(p))
  );

  // Decision Summary calculation (A3)
  const latestRecorded = historicalPoints[historicalPoints.length - 1] ?? null;
  const prevRecorded = historicalPoints.length > 1 ? historicalPoints[historicalPoints.length - 2] : null;

  const latestVal = latestRecorded ? getPointValue(latestRecorded) : null;
  const prevVal = prevRecorded ? getPointValue(prevRecorded) : null;

  let momChangePercent: number | null = null;
  let momDirection: 'Naik' | 'Stabil' | 'Turun' | null = null;

  if (latestVal !== null && prevVal !== null && prevVal > 0) {
    momChangePercent = ((latestVal - prevVal) / prevVal) * 100;
    if (momChangePercent > 2) {
      momDirection = 'Naik';
    } else if (momChangePercent < -2) {
      momDirection = 'Turun';
    } else {
      momDirection = 'Stabil';
    }
  }

  // Value domain calculations
  const values = validPoints.map(getPointValue) as number[];
  const rawMax = values.length ? Math.max(...values) : 0;
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawRange = rawMax - rawMin;
  const domainPadding = rawRange > 0 ? rawRange * 0.15 : Math.max(rawMax * 0.15, 1);
  const minValue = rawMin === 0 ? 0 : Math.max(0, rawMin - domainPadding);
  const maxValue = rawMax + domainPadding;
  const valueRange = maxValue - minValue || 1;

  // SVG Geometry
  const svgWidth = 760;
  const svgHeight = 280;
  const paddingLeft = 84;
  const paddingRight = 32;
  const paddingTop = 44;
  const paddingBottom = 54;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (points.length <= 1) {
      return paddingLeft + chartWidth / 2;
    }
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (val: number) =>
    paddingTop + chartHeight - ((val - minValue) / valueRange) * chartHeight;

  // Map coordinates
  const coordinates = points.map((point, index) => {
    const val = getPointValue(point);
    return {
      point,
      value: val,
      index,
      x: getX(index),
      y: val === null ? null : getY(val),
    };
  });

  const plottedCoordinates = coordinates.filter(
    (c): c is typeof c & { value: number; y: number } =>
      c.value !== null && c.y !== null && Number.isFinite(c.value)
  );

  const historicalCoordinates = plottedCoordinates.filter((c) => c.point.type !== 'forecast');
  const forecastCoordinates = plottedCoordinates.filter((c) => c.point.type === 'forecast');

  const pathFor = (items: typeof plottedCoordinates) =>
    items.length
      ? `M ${items[0].x} ${items[0].y}${items.slice(1).map((item) => ` L ${item.x} ${item.y}`).join('')}`
      : '';

  const historicalPath = pathFor(historicalCoordinates);
  const forecastPath =
    forecastCoordinates.length && historicalCoordinates.length
      ? pathFor([historicalCoordinates[historicalCoordinates.length - 1], ...forecastCoordinates])
      : '';

  // Active hover/touch coordinate for tooltip
  const activeCoordinate =
    hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < coordinates.length
      ? coordinates[hoveredIndex]
      : null;

  useEffect(() => {
    if (hoveredIndex === null || !points.length || !validPoints.length) {
      return;
    }

    const updatePlacement = () => {
      const coord = coordinates[hoveredIndex];
      if (!coord || coord.value === null || coord.y === null) return;

      const container = containerRef.current;
      const svg = svgRef.current;
      if (!container || !svg) return;

      const containerRect = container.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();

      // Active coordinate rendered anchor in container coordinates
      const anchorX = svgRect.left + (coord.x / svgWidth) * svgRect.width - containerRect.left;
      const anchorY = svgRect.top + (coord.y / svgHeight) * svgRect.height - containerRect.top;

      const tooltipEl = tooltipRef.current;
      const tooltipWidth = tooltipEl ? tooltipEl.offsetWidth : 220;
      const tooltipHeight = tooltipEl ? tooltipEl.offsetHeight : 80;

      const result = calculateTooltipPlacement({
        anchorX,
        anchorY,
        tooltipWidth,
        tooltipHeight,
        containerWidth: containerRect.width,
        containerHeight: containerRect.height,
        gap: 12,
        margin: 10,
      });

      setTooltipPos(result);
    };

    const rafId = requestAnimationFrame(updatePlacement);

    const scrollEl = scrollContainerRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', updatePlacement, { passive: true });
    }
    window.addEventListener('resize', updatePlacement, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updatePlacement();
      });
      resizeObserver.observe(containerRef.current);
      if (tooltipRef.current) {
        resizeObserver.observe(tooltipRef.current);
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', updatePlacement);
      }
      window.removeEventListener('resize', updatePlacement);
      resizeObserver?.disconnect();
    };
  }, [hoveredIndex, points.length, validPoints.length, coordinates, svgWidth, svgHeight]);

  // Empty state: 0 points or 0 valid values
  if (!points.length || !validPoints.length) {
    return (
      <div className={`w-full rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/60 p-8 text-center ${className}`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--muted)] shadow-xs">
          <Calendar className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-sm font-black text-[var(--foreground)]">
          Belum ada data tagihan untuk ditampilkan
        </h3>
        <p className="mt-1 text-xs text-[var(--muted)] max-w-md mx-auto">
          Tambahkan tagihan listrik pertama Anda untuk mulai memantau tren dan pola pengeluaran bulanan.
        </p>
      </div>
    );
  }

  const currentPlacement =
    tooltipPos ??
    (activeCoordinate && activeCoordinate.value !== null && activeCoordinate.y !== null
      ? calculateTooltipPlacement({
          anchorX: activeCoordinate.x,
          anchorY: activeCoordinate.y,
          tooltipWidth: 220,
          tooltipHeight: 80,
          containerWidth: svgWidth,
          containerHeight: svgHeight,
          gap: 12,
          margin: 10,
        })
      : null);

  // Direction badge styling
  const directionConfig = {
    Naik: {
      label: 'Naik',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      Icon: TrendingUp,
    },
    Turun: {
      label: 'Turun',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
      Icon: TrendingDown,
    },
    Stabil: {
      label: 'Stabil',
      badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
      Icon: Minus,
    },
  };

  return (
    <figure className={`w-full ${className}`}>
      {/* Header with clear Information Hierarchy (A2) */}
      <div className="flex flex-col gap-1 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <p className="text-[10px] font-black tracking-widest uppercase text-[var(--primary)]">
            {displayEyebrow}
          </p>
          <h3 id={titleId} className="mt-0.5 text-base sm:text-lg font-black tracking-tight text-[var(--foreground)]">
            {displayTitle}
          </h3>
          <p id={descriptionId} className="mt-0.5 text-xs text-[var(--muted)]">
            {displayDesc}
          </p>
        </div>

        {/* Legend (A9) */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--muted)] sm:mt-0">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-3.5 rounded-full bg-[var(--chart-series-primary)]" aria-hidden="true" />
            <span className="font-semibold text-[11px] text-[var(--foreground)]">
              {metric === 'rupiah' ? 'Tagihan tercatat' : 'Pemakaian tercatat'}
            </span>
          </span>
          {points.some((p) => p.type === 'forecast') && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-3.5 border-b-2 border-dashed border-[var(--chart-series-forecast)]" aria-hidden="true" />
              <span className="font-semibold text-[11px] text-[var(--foreground)]">
                {forecastLabel}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Decision Summary Strip (A3) */}
      <div className="mt-3.5 grid gap-3 sm:grid-cols-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3.5 sm:p-4">
        <div>
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
            {metric === 'rupiah' ? 'Tagihan terakhir' : 'Pemakaian terakhir'}
          </span>
          <span className="mt-0.5 block text-base sm:text-lg font-black text-[var(--foreground)] tabular-nums">
            {latestVal !== null ? formatExactValue(latestVal, metric) : 'Belum ada data'}
          </span>
          {latestRecorded && (
            <span className="block text-[11px] text-[var(--muted)]">
              Periode {latestRecorded.label}
            </span>
          )}
        </div>

        <div>
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
            Perubahan vs bulan lalu
          </span>
          <div className="mt-1 flex items-center gap-2">
            {momChangePercent !== null && momDirection ? (
              <>
                <span className="text-sm sm:text-base font-extrabold tabular-nums text-[var(--foreground)]">
                  {momChangePercent > 0 ? `+${decimal.format(momChangePercent)}%` : `${decimal.format(momChangePercent)}%`}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${
                    directionConfig[momDirection].badgeClass
                  }`}
                >
                  {React.createElement(directionConfig[momDirection].Icon, {
                    className: 'h-3 w-3 shrink-0',
                    'aria-hidden': 'true',
                  })}
                  <span>{directionConfig[momDirection].label}</span>
                </span>
              </>
            ) : (
              <span className="text-xs text-[var(--muted)]">
                {historicalPoints.length <= 1 ? 'Perlu 1 bulan lagi' : 'Stabil'}
              </span>
            )}
          </div>
          {prevRecorded && latestVal !== null && prevVal !== null && (
            <span className="block text-[11px] text-[var(--muted)]">
              vs {formatExactValue(prevVal, metric)} ({prevRecorded.label})
            </span>
          )}
        </div>

        <div>
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
            Cakupan data
          </span>
          <span className="mt-0.5 block text-sm sm:text-base font-extrabold text-[var(--foreground)]">
            {historicalPoints.length} bulan data tercatat
          </span>
          <span className="block text-[11px] text-[var(--muted)]">
            {historicalPoints.length >= 3
              ? 'Pola tren sudah dapat diamati'
              : 'Tambah data untuk pola lebih akurat'}
          </span>
        </div>
      </div>

      {/* Low-data Guidance Banner (A8) */}
      {historicalPoints.length === 1 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)]/60 px-3.5 py-2.5 text-xs text-[var(--primary-dark)] dark:text-[var(--primary)]">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Tambahkan data bulan berikutnya untuk mulai melihat perubahan dan perbandingan tren.</span>
        </div>
      )}

      {historicalPoints.length === 2 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3.5 py-2 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Data masih terbatas (2 bulan). Setelah beberapa bulan pencatatan, grafik akan lebih membantu melihat pola penggunaan listrik.</span>
        </div>
      )}

      {/* Interactive Chart Canvas & Tooltip Container (A4, A5, A6, A7, A11) */}
      <div
        ref={containerRef}
        className="relative mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2 sm:p-4 shadow-xs"
      >
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-xl"
          tabIndex={0}
          aria-label="Area grafik tren listrik interaktif"
        >
          <div className="min-w-[560px]">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-auto w-full font-sans text-[var(--foreground)] select-none"
              role="img"
              aria-labelledby={`${titleId} ${descriptionId}`}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Horizontal Grid lines & Y-axis ticks with compact formatting */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = paddingTop + chartHeight * ratio;
                const tickValue = maxValue - valueRange * ratio;
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="var(--chart-grid)"
                      strokeWidth="1"
                      strokeDasharray={ratio === 1 ? undefined : '4 4'}
                      opacity="0.8"
                    />
                    <text
                      x={paddingLeft - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-[var(--muted)] text-[10px] font-bold tabular-nums"
                    >
                      {formatAxisTick(tickValue, metric)}
                    </text>
                  </g>
                );
              })}

              {/* Actual Series Solid Line */}
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

              {/* Forecast Series Dashed Line */}
              {forecastPath && (
                <path
                  d={forecastPath}
                  fill="none"
                  stroke="var(--chart-series-forecast)"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points, X labels, and Hit targets */}
              {coordinates.map((c) => {
                const isForecast = c.point.type === 'forecast';
                const isDerived = c.point.type === 'derived';
                const isLatestHistorical =
                  !isForecast &&
                  latestRecorded &&
                  c.point.period === latestRecorded.period;
                const isHovered = hoveredIndex === c.index;

                return (
                  <g key={`${c.point.period}-${c.point.type}-${c.index}`}>
                    {/* Vertical guideline */}
                    <line
                      x1={c.x}
                      y1={paddingTop}
                      x2={c.x}
                      y2={svgHeight - paddingBottom}
                      stroke="var(--chart-grid)"
                      strokeWidth="1"
                      strokeDasharray="2 4"
                      opacity={isHovered ? 0.9 : 0.35}
                    />

                    {/* Plotted circle marker */}
                    {c.value !== null && c.y !== null && (
                      <>
                        {/* Accent ring for latest recorded or hovered point */}
                        {(isLatestHistorical || isHovered) && (
                          <circle
                            cx={c.x}
                            cy={c.y}
                            r={isHovered ? 9 : 7.5}
                            fill={isForecast ? 'var(--chart-series-forecast)' : 'var(--chart-series-primary)'}
                            opacity={isHovered ? 0.35 : 0.22}
                          />
                        )}

                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={isForecast ? 5 : 4.5}
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
                          strokeWidth={isForecast ? 2.5 : 2}
                        />
                      </>
                    )}

                    {/* X-axis Month Label */}
                    <text
                      x={c.x}
                      y={svgHeight - paddingBottom + 22}
                      textAnchor="middle"
                      className={`text-[11px] font-bold ${
                        isForecast
                          ? 'fill-[var(--chart-series-forecast)]'
                          : isHovered
                          ? 'fill-[var(--foreground)] font-black'
                          : 'fill-[var(--muted)]'
                      }`}
                    >
                      {isForecast ? 'Estimasi' : formatMonthCompact(c.point.period)}
                    </text>

                    {/* Accessible Interactive Hit Target */}
                    <circle
                      cx={c.x}
                      cy={c.y ?? paddingTop + chartHeight / 2}
                      r={18}
                      fill="transparent"
                      className="cursor-pointer outline-none"
                      tabIndex={0}
                      role="button"
                      aria-label={`${c.point.label}: ${
                        c.value !== null ? formatExactValue(c.value, metric) : 'Tidak ada data'
                      }`}
                      onMouseEnter={() => setHoveredIndex(c.index)}
                      onFocus={() => setHoveredIndex(c.index)}
                      onBlur={() => setHoveredIndex(null)}
                      onClick={() => setHoveredIndex(hoveredIndex === c.index ? null : c.index)}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Floating Tooltip Card (A7) */}
        {activeCoordinate && activeCoordinate.value !== null && activeCoordinate.y !== null && currentPlacement && (
          <div
            ref={tooltipRef}
            role="tooltip"
            className="pointer-events-none absolute z-20 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] px-3 py-2 text-xs shadow-md whitespace-normal break-words"
            style={{
              left: `${currentPlacement.x}px`,
              top: `${currentPlacement.y}px`,
              maxWidth: 'min(280px, calc(100vw - 32px))',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[var(--foreground)]">
                {activeCoordinate.point.period ? formatMonth(activeCoordinate.point.period) : activeCoordinate.point.label}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] font-black uppercase ${
                  activeCoordinate.point.type === 'forecast'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {activeCoordinate.point.type === 'forecast' ? 'Estimasi' : 'Tercatat'}
              </span>
            </div>

            <div className="mt-1 text-sm font-black text-[var(--foreground)] tabular-nums">
              {formatExactValue(activeCoordinate.value, metric)}
            </div>

            {/* Delta context */}
            {activeCoordinate.index > 0 && coordinates[activeCoordinate.index - 1].value !== null && (
              <div className="mt-0.5 text-[10px] text-[var(--muted)] leading-normal">
                {(() => {
                  const prev = coordinates[activeCoordinate.index - 1].value!;
                  const diff = activeCoordinate.value - prev;
                  const pct = prev > 0 ? (diff / prev) * 100 : 0;
                  const prevLabel = coordinates[activeCoordinate.index - 1].point.label;
                  return `${pct >= 0 ? '+' : ''}${decimal.format(pct)}% dari ${prevLabel}`;
                })()}
              </div>
            )}

            {activeCoordinate.point.type === 'forecast' && (
              <div className="mt-1 text-[9px] leading-tight text-[var(--muted)] italic">
                Perkiraan berdasarkan data yang tersedia.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accessible Chart -> Table Disclosure (A10) */}
      <details className="group mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/60 transition">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-black text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] rounded-2xl select-none">
          <span>Lihat data grafik dalam tabel</span>
          <ChevronDown
            className="h-4 w-4 text-[var(--muted)] transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>

        <div className="border-t border-[var(--border)] p-4 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-xs">
            <thead className="text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th scope="col" className="py-2.5 pr-4 font-bold">Periode</th>
                <th scope="col" className="py-2.5 pr-4 font-bold">Nilai</th>
                <th scope="col" className="py-2.5 pr-4 font-bold">Perubahan</th>
                <th scope="col" className="py-2.5 font-bold">Jenis data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {points.map((point, idx) => {
                const val = getPointValue(point);
                const prevPointVal = idx > 0 ? getPointValue(points[idx - 1]) : null;
                let changeStr = '-';
                if (val !== null && prevPointVal !== null && prevPointVal > 0) {
                  const pct = ((val - prevPointVal) / prevPointVal) * 100;
                  changeStr = `${pct >= 0 ? '+' : ''}${decimal.format(pct)}%`;
                }

                return (
                  <tr key={`${point.period}-${point.type}`} className="hover:bg-[var(--surface)] transition">
                    <td className="py-2.5 pr-4 font-bold text-[var(--foreground)]">
                      {point.label}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums font-extrabold text-[var(--foreground)]">
                      {val === null ? 'Tidak tersedia' : formatExactValue(val, metric)}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums font-semibold text-[var(--muted)]">
                      {changeStr}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          point.type === 'forecast'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : point.type === 'derived'
                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {point.type === 'forecast'
                          ? forecastLabel
                          : point.type === 'derived'
                          ? 'Nilai turunan'
                          : 'Tercatat'}
                      </span>
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
