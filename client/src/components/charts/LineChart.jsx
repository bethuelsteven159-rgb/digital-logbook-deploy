import { useId, useState } from "react";

import {
  CHART_AXIS,
  CHART_GRID,
  CHART_TEXT,
  niceMax,
  truncateLabel,
} from "./chartTheme";

const VIEW_WIDTH = 640;

const PADDING = { top: 14, right: 14, bottom: 26, left: 46 };

/**
 * SVG area/line chart with hover tooltip.
 *
 * props:
 * - data: [{ label, value }]
 * - height: svg height in viewBox units
 * - color: line colour
 * - formatValue / formatTooltip: value formatters
 * - ariaLabel: accessible name for the graphic
 */
export default function LineChart({
  data = [],
  height = 220,
  color = "#4f63d2",
  formatValue = (value) => String(value),
  formatTooltip = formatValue,
  ariaLabel = "Line chart",
}) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState(null);

  const values = data.map((point) => Math.max(0, Number(point.value) || 0));
  const maxValue = niceMax(Math.max(...values, 0));

  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const xStep =
    data.length > 1 ? innerWidth / (data.length - 1) : innerWidth / 2;

  function xAt(index) {
    if (data.length <= 1) {
      return PADDING.left + innerWidth / 2;
    }

    return PADDING.left + index * xStep;
  }

  function yAt(value) {
    if (maxValue === 0) {
      return PADDING.top + innerHeight;
    }

    return PADDING.top + innerHeight - (value / maxValue) * innerHeight;
  }

  const linePath = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(value)}`)
    .join(" ");

  const areaPath =
    values.length > 0
      ? `${linePath} L${xAt(values.length - 1)},${PADDING.top + innerHeight} L${xAt(0)},${PADDING.top + innerHeight} Z`
      : "";

  // Show at most ~7 tick labels along the x axis.
  const tickStride = Math.max(1, Math.ceil(data.length / 7));

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();

    const scale = VIEW_WIDTH / rect.width;
    const x = (event.clientX - rect.left) * scale;

    const rawIndex =
      data.length <= 1
        ? 0
        : Math.round((x - PADDING.left) / xStep);

    setHoverIndex(Math.min(Math.max(rawIndex, 0), data.length - 1));
  }

  const hovered = hoverIndex != null ? data[hoverIndex] : null;
  const hoveredPercent =
    hovered && data.length > 0
      ? ((xAt(hoverIndex) - PADDING.left) / innerWidth) * 100
      : 0;

  return (
    <div className="chart-frame" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        role="img"
        aria-label={ariaLabel}
        style={{ width: "100%", height: "auto", display: "block" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map((ratio) => {
          const y = PADDING.top + innerHeight * ratio;
          const value = maxValue * (1 - ratio);

          return (
            <g key={ratio}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={VIEW_WIDTH - PADDING.right}
                y2={y}
                stroke={CHART_GRID}
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill={CHART_TEXT}
              >
                {formatValue(Number(value.toFixed(2)))}
              </text>
            </g>
          );
        })}

        {values.length > 0 && (
          <>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {data.length <= 40 &&
              values.map((value, index) => (
                <circle
                  key={index}
                  cx={xAt(index)}
                  cy={yAt(value)}
                  r={hoverIndex === index ? 5 : 3}
                  fill="#fff"
                  stroke={color}
                  strokeWidth="2"
                />
              ))}

            {hoverIndex != null && (
              <line
                x1={xAt(hoverIndex)}
                y1={PADDING.top}
                x2={xAt(hoverIndex)}
                y2={PADDING.top + innerHeight}
                stroke={CHART_AXIS}
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            )}

            {data.map((point, index) =>
              index % tickStride === 0 || index === data.length - 1 ? (
                <text
                  key={point.label ?? index}
                  x={xAt(index)}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill={CHART_TEXT}
                >
                  {truncateLabel(point.label, 8)}
                </text>
              ) : null,
            )}
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="chart-tooltip"
          style={{
            position: "absolute",
            left: `calc(${Math.min(Math.max(hoveredPercent, 8), 92)}% )`,
            top: 0,
            transform: "translateX(-50%)",
            background: "#0f172a",
            color: "#fff",
            borderRadius: "8px",
            padding: "6px 10px",
            fontSize: "12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 8px 20px rgba(15, 23, 42, 0.25)",
            zIndex: 5,
          }}
        >
          <strong>{hovered.label}</strong>
          <div>{formatTooltip(hovered.value)}</div>
        </div>
      )}
    </div>
  );
}
