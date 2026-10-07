import { useState } from "react";

import { CHART_SERIES, CHART_TEXT } from "./chartTheme";

/**
 * SVG donut chart with a legend. Slices are drawn with stroke-dasharray
 * arcs on a single circle, so no path math is needed.
 *
 * props:
 * - data: [{ label, value }]
 * - size: diameter in viewBox units
 * - formatValue: legend value formatter
 * - centerLabel / centerValue: optional caption in the hole
 * - ariaLabel
 */
export default function DonutChart({
  data = [],
  size = 190,
  formatValue = (value) => String(value),
  centerLabel = "Total",
  ariaLabel = "Donut chart",
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const slices = data
    .map((point) => ({ ...point, value: Math.max(0, Number(point.value) || 0) }))
    .filter((point) => point.value > 0);

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const stroke = 26;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div
      className="chart-donut"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={ariaLabel}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#eef2f7"
            strokeWidth={stroke}
          />

          {slices.map((slice, index) => {
            const fraction = total > 0 ? slice.value / total : 0;
            const dash = fraction * circumference;

            const segment = (
              <circle
                key={slice.label ?? index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={CHART_SERIES[index % CHART_SERIES.length]}
                strokeWidth={hoverIndex === index ? stroke + 6 : stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
                style={{ transition: "stroke-width 0.12s ease" }}
                onPointerEnter={() => setHoverIndex(index)}
                onPointerLeave={() => setHoverIndex(null)}
              />
            );

            offset += dash;

            return segment;
          })}
        </svg>

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            pointerEvents: "none",
            padding: "0 34px",
          }}
        >
          {hoverIndex != null && slices[hoverIndex] ? (
            <>
              <span
                style={{
                  fontSize: "11px",
                  color: CHART_TEXT,
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {slices[hoverIndex].label}
              </span>
              <strong style={{ fontSize: "17px", color: "#0f172a" }}>
                {formatValue(slices[hoverIndex].value)}
              </strong>
              <span style={{ fontSize: "11px", color: CHART_TEXT }}>
                {total > 0
                  ? `${Math.round((slices[hoverIndex].value / total) * 100)}%`
                  : "0%"}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: "11px", color: CHART_TEXT }}>
                {centerLabel}
              </span>
              <strong style={{ fontSize: "17px", color: "#0f172a" }}>
                {formatValue(total)}
              </strong>
            </>
          )}
        </div>
      </div>

      <ul
        className="chart-legend"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "7px",
          minWidth: "150px",
        }}
      >
        {slices.map((slice, index) => (
          <li
            key={slice.label ?? index}
            onPointerEnter={() => setHoverIndex(index)}
            onPointerLeave={() => setHoverIndex(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "#374151",
              cursor: "default",
              fontWeight: hoverIndex === index ? 600 : 400,
            }}
          >
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "3px",
                background: CHART_SERIES[index % CHART_SERIES.length],
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {slice.label}
            </span>
            <strong>{formatValue(slice.value)}</strong>
            <span style={{ color: CHART_TEXT, minWidth: "34px", textAlign: "right" }}>
              {total > 0 ? `${Math.round((slice.value / total) * 100)}%` : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
