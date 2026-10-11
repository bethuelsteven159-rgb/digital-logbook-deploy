import { useState } from "react";

import {
  CHART_AXIS,
  CHART_GRID,
  CHART_TEXT,
  niceMax,
} from "./chartTheme";

const VIEW_WIDTH = 640;

const PADDING = { top: 16, right: 18, bottom: 42, left: 52 };

/**
 * SVG scatter plot for comparing two numeric fields per entry.
 *
 * props:
 * - points: [{ x, y }]
 * - xLabel / yLabel: axis captions
 * - height, color, formatValue, ariaLabel
 */
export default function ScatterChart({
  points = [],
  xLabel = "X",
  yLabel = "Y",
  height = 260,
  color = "#4f63d2",
  formatValue = (value) => String(value),
  ariaLabel = "Scatter plot",
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const cleanPoints = points.filter(
    (point) =>
      Number.isFinite(Number(point.x)) &&
      Number.isFinite(Number(point.y)),
  );

  const maxX = niceMax(Math.max(...cleanPoints.map((p) => Number(p.x)), 0));
  const maxY = niceMax(Math.max(...cleanPoints.map((p) => Number(p.y)), 0));

  const innerWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  function xScale(value) {
    if (maxX === 0) {
      return PADDING.left + innerWidth / 2;
    }

    return PADDING.left + (value / maxX) * innerWidth;
  }

  function yScale(value) {
    if (maxY === 0) {
      return PADDING.top + innerHeight;
    }

    return PADDING.top + innerHeight - (value / maxY) * innerHeight;
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

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
          const gx = PADDING.left + innerWidth * ratio;
          const gy = PADDING.top + innerHeight * ratio;

          return (
            <g key={ratio}>
              <line
                x1={gx}
                y1={PADDING.top}
                x2={gx}
                y2={PADDING.top + innerHeight}
                stroke={CHART_GRID}
                strokeWidth="1"
              />
              <line
                x1={PADDING.left}
                y1={gy}
                x2={VIEW_WIDTH - PADDING.right}
                y2={gy}
                stroke={CHART_GRID}
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 8}
                y={gy + 4}
                textAnchor="end"
                fontSize="11"
                fill={CHART_TEXT}
              >
                {formatValue(Number((maxY * (1 - ratio)).toFixed(2)))}
              </text>
              <text
                x={gx}
                y={PADDING.top + innerHeight + 16}
                textAnchor="middle"
                fontSize="11"
                fill={CHART_TEXT}
              >
                {formatValue(Number((maxX * ratio).toFixed(2)))}
              </text>
            </g>
          );
        })}

        {cleanPoints.map((point, index) => (
          <circle
            key={index}
            cx={xScale(Number(point.x))}
            cy={yScale(Number(point.y))}
            r={hoverIndex === index ? 7 : 4.5}
            fill={hoverIndex === index ? color : `${color}b3`}
            stroke="#fff"
            strokeWidth="1.5"
            style={{ transition: "r 0.1s ease" }}
            onPointerEnter={() => setHoverIndex(index)}
            onPointerLeave={() => setHoverIndex(null)}
          />
        ))}

        {/* axes */}
        <line
          x1={PADDING.left}
          y1={PADDING.top + innerHeight}
          x2={VIEW_WIDTH - PADDING.right}
          y2={PADDING.top + innerHeight}
          stroke={CHART_AXIS}
          strokeWidth="1.5"
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + innerHeight}
          stroke={CHART_AXIS}
          strokeWidth="1.5"
        />

        <text
          x={PADDING.left + innerWidth / 2}
          y={height - 2}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill={CHART_TEXT}
        >
          {xLabel}
        </text>

        <text
          x="14"
          y={PADDING.top + innerHeight / 2}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill={CHART_TEXT}
          transform={`rotate(-90 14 ${PADDING.top + innerHeight / 2})`}
        >
          {yLabel}
        </text>
      </svg>

      {hoverIndex != null && cleanPoints[hoverIndex] && (
        <div
          className="chart-tooltip"
          style={{
            position: "absolute",
            left: `${((xScale(Number(cleanPoints[hoverIndex].x)) - PADDING.left) / innerWidth) * 100}%`,
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
          {`${formatValue(cleanPoints[hoverIndex].x)} · ${formatValue(cleanPoints[hoverIndex].y)}`}
        </div>
      )}
    </div>
  );
}
