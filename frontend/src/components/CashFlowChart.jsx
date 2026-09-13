import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";

const SHAPE_WASH = {
  SEASONAL_DIP: "var(--color-caution-wash)",
  ISOLATED_SHOCK: "var(--color-caution-wash)",
  SUSTAINED_DECLINE: "var(--color-oxide-wash)",
};

const SHAPE_INK = {
  SEASONAL_DIP: "var(--color-caution)",
  ISOLATED_SHOCK: "var(--color-caution)",
  SUSTAINED_DECLINE: "var(--color-oxide)",
};

const SHAPE_LABEL = {
  SEASONAL_DIP: "Seasonal dip",
  ISOLATED_SHOCK: "Isolated shock",
  SUSTAINED_DECLINE: "Sustained decline",
};

function monthLabel(m) {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[m.calendar_month - 1];
}

function LegendSwatch({ dashed, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="26" height="10" style={{ overflow: "visible" }}>
        <line
          x1="0"
          y1="5"
          x2="26"
          y2="5"
          stroke="var(--color-ink)"
          strokeWidth={dashed ? 1.5 : 2.25}
          strokeDasharray={dashed ? "4 4" : undefined}
        />
      </svg>
      <span className="text-sm" style={{ color: "var(--color-ink)", opacity: 0.75 }}>
        {label}
      </span>
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  // Net cash flow first, baseline second — matches the legend order above
  // the chart, regardless of the order Recharts hands us.
  const ordered = [...payload].sort((a, b) => (a.dataKey === "net_flow" ? -1 : 1));
  return (
    <div
      style={{
        backgroundColor: "var(--color-paper)",
        border: "1px solid var(--color-ink)",
        padding: "0.6rem 0.85rem",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, opacity: 0.65, marginBottom: 4 }}>{label}</div>
      {ordered.map((entry) => (
        <div key={entry.dataKey} style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-ink)" }}>
          {`₹${Math.round(entry.value).toLocaleString()} (${entry.name})`}
        </div>
      ))}
    </div>
  );
}

function LatestDot({ cx, cy, index, dataLength, color }) {
  if (index !== dataLength - 1) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="var(--color-paper)" strokeWidth={1.5} />
    </g>
  );
}

export default function CashFlowChart({ months, flaggedShape }) {
  const data = months.map((m) => ({
    month: `${monthLabel(m)} ${m.year_index === 0 ? "Y1" : "Y2"}`,
    net_flow: m.net_flow,
    baseline: m.baseline,
    shape: m.shape,
  }));

  // STABLE isn't an anomaly worth calling out on the chart — only shade
  // the three flaggable shapes.
  const isFlaggable = flaggedShape && flaggedShape !== "STABLE";
  const flaggedRanges = [];
  let start = null;
  if (isFlaggable) {
    months.forEach((m, i) => {
      const flagged = m.shape === flaggedShape;
      if (flagged && start === null) start = i;
      if (!flagged && start !== null) {
        flaggedRanges.push([start, i - 1]);
        start = null;
      }
    });
    if (start !== null) flaggedRanges.push([start, months.length - 1]);
  }

  const accentColor = SHAPE_INK[flaggedShape] || "var(--color-ink)";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-3">
        <LegendSwatch dashed={false} label="Net cash flow (actual)" />
        <LegendSwatch dashed={true} label="Baseline (expected for this month)" />
      </div>
      <div style={{ width: "100%", height: 360 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-ruled)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--color-ink)", fontFamily: "var(--font-mono)", fontSize: 11 }}
            interval={1}
          />
          <YAxis
            tick={{ fill: "var(--color-ink)", fontFamily: "var(--font-mono)", fontSize: 11 }}
            width={70}
          />
          <Tooltip content={<ChartTooltip />} />
          {flaggedRanges.map(([s, e], idx) => (
            <ReferenceArea
              key={idx}
              x1={data[s].month}
              x2={data[e].month}
              fill={SHAPE_WASH[flaggedShape] || "var(--color-caution-wash)"}
              stroke={accentColor}
              strokeOpacity={0.3}
              strokeDasharray="2 3"
              label={
                e - s >= 1
                  ? {
                      value: SHAPE_LABEL[flaggedShape],
                      position: "insideTopLeft",
                      fill: accentColor,
                      fontSize: 13,
                      fontStyle: "italic",
                      fontFamily: "var(--font-serif)",
                      offset: 10,
                    }
                  : undefined
              }
            />
          ))}
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="var(--color-ink)"
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={1.5}
            name="Baseline"
          />
          <Line
            type="monotone"
            dataKey="net_flow"
            stroke="var(--color-ink)"
            strokeWidth={2.25}
            name="Net cash flow"
            dot={(props) => (
              <LatestDot key={props.index} {...props} dataLength={data.length} color={accentColor} />
            )}
            activeDot={{ r: 4, fill: "var(--color-ink)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
