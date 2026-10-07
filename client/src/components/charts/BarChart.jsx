import { useState } from "react";

import {
  CHART_AXIS,
  CHART_GRID,
  CHART_TEXT,
  niceMax,
  truncateLabel,
} from "./chartTheme";

const VIEW_WIDTH = 640;

const PADDING = { top: 16, right: 14, bottom: 30, left: 46 };

/**
 * SVG vertical bar chart with rounded bars and hover tooltip.
 *
 * props:
 * - data: [{ label, value }]
 * - height, color, formatValue / formatTooltip, ariaLabel
 */
export default function BarChart({
  data = [],
  height = 220,
  color = "#4f63d2",
  formatValue = (value) => String(value),
  formatTooltip = formatValue,
  ariaLabel = "Bar chart",
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const values = data.map((point) => Math.max(0, Number(point.value) || 0));
  const maxValue = niceMax(Math.max(...values, 0));

  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const slotWidth = data.length > 0 ? innerWidth / data.length : innerWidth;
  const barWidth = Math.min(slotWidth * 0.62, 56);

  function slotCenter(index) {
    return PADDING.left + slotWidth * index + slotWidth / 2;
  }

  function barHeight(value) {
    if (maxValue === 0) {
      return 0;
    }

    return (value / maxValue) * innerHeight;
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const tickStride = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="chart-frame" style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        role="img"
        aria-label={ariaLabel}
        style={{ width: "100%", height: "auto", display: "block" }}
        onPointerLeave={() => setHoverIndex(null)}
      >
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

        {data.map((point, index) => {
          const value = values[index];
          const barH = barHeight(value);
          const x = slotCenter(index) - barWidth / 2;
          const y = PADDING.top + innerHeight - barH;
          const fill =
            hoverIndex === index
              ? color
              : `${color}cc`;

          return (
            <g
              key={point.label ?? index}
              onPointerEnter={() => setHoverIndex(index)}
            >
              {/* transparent hit area so hovering anywhere in the slot works */}
              <rect
                x={PADDING.left + slotWidth * index}
                y={PADDING.top}
                width={slotWidth}
                height={innerHeight}
                fill="transparent"
              />

              {barH > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={Math.min(6, barWidth / 2)}
                  fill={fill}
                  style={{ transition: "fill 0.12s ease" }}
                />
              )}

              {(index % tickStride === 0 || data.length <= 12) && (
                <text
                  x={slotCenter(index)}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill={CHART_TEXT}
                >
                  {truncateLabel(point.label, 9)}
                </text>
              )}
            </g>
          );
        })}

        <line
          x1={PADDING.left}
          y1={PADDING.top + innerHeight}
          x2={VIEW_WIDTH - PADDING.right}
          y2={PADDING.top + innerHeight}
          stroke={CHART_AXIS}
          strokeWidth="1.5"
        />
      </svg>

      {hoverIndex != null && data[hoverIndex] && (
        <div
          className="chart-tooltip"
          style={{
            position: "absolute",
            left: `${((slotCenter(hoverIndex) - PADDING.left) / innerWidth) * 100}%`,
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
          <strong>{data[hoverIndex].label}</strong>
          <div>{formatTooltip(data[hoverIndex].value)}</div>
        </div>
      )}
    </div>
  );
}
