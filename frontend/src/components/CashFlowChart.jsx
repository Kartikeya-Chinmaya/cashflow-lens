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
  SEASONAL_DIP: "rgba(245, 158, 11, 0.1)",
  ISOLATED_SHOCK: "rgba(245, 158, 11, 0.1)",
  SUSTAINED_DECLINE: "rgba(244, 63, 94, 0.1)",
};

const SHAPE_ACCENT = {
  SEASONAL_DIP: "#f59e0b",
  ISOLATED_SHOCK: "#f59e0b",
  SUSTAINED_DECLINE: "#f43f5e",
};

const SHAPE_LABEL = {
  SEASONAL_DIP: "Seasonal dip",
  ISOLATED_SHOCK: "Isolated shock",
  SUSTAINED_DECLINE: "Sustained decline",
};

const SHAPE_CALLOUT_CLASSES = {
  SEASONAL_DIP: "bg-amber-500/10 border-amber-500 text-amber-300",
  ISOLATED_SHOCK: "bg-amber-500/10 border-amber-500 text-amber-300",
  SUSTAINED_DECLINE: "bg-rose-500/10 border-rose-500 text-rose-300",
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
          stroke="#e5e5e5"
          strokeWidth={dashed ? 1.5 : 2.25}
          strokeDasharray={dashed ? "4 4" : undefined}
        />
      </svg>
      <span className="text-sm text-neutral-400">{label}</span>
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  // Net cash flow first, baseline second — matches the legend order above
  // the chart, regardless of the order Recharts hands us.
  const ordered = [...payload].sort((a, b) => (a.dataKey === "net_flow" ? -1 : 1));
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2">
      <div className="font-mono text-xs text-neutral-500 mb-1">{label}</div>
      {ordered.map((entry) => (
        <div key={entry.dataKey} className="font-mono text-[13px] text-white">
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
      <circle cx={cx} cy={cy} r={3.5} fill={color} stroke="#09090b" strokeWidth={1.5} />
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

  const accentColor = SHAPE_ACCENT[flaggedShape] || "#e5e5e5";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-4">
        <LegendSwatch dashed={false} label="Net cash flow (actual)" />
        <LegendSwatch dashed={true} label="Baseline (expected for this month)" />
      </div>
      <div style={{ width: "100%", height: 340 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#71717a", fontFamily: "var(--font-mono)", fontSize: 10 }}
              interval={1}
              axisLine={{ stroke: "#27272a" }}
              tickLine={{ stroke: "#27272a" }}
            />
            <YAxis
              tick={{ fill: "#71717a", fontFamily: "var(--font-mono)", fontSize: 10 }}
              width={70}
              axisLine={{ stroke: "#27272a" }}
              tickLine={{ stroke: "#27272a" }}
            />
            <Tooltip content={<ChartTooltip />} />
            {flaggedRanges.map(([s, e], idx) => (
              <ReferenceArea
                key={idx}
                x1={data[s].month}
                x2={data[e].month}
                fill={SHAPE_WASH[flaggedShape] || "rgba(245, 158, 11, 0.1)"}
                stroke="none"
              />
            ))}
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#71717a"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1.5}
              name="Baseline"
            />
            <Line
              type="monotone"
              dataKey="net_flow"
              stroke="#e5e5e5"
              strokeWidth={2}
              name="Net cash flow"
              dot={(props) => (
                <LatestDot key={props.index} {...props} dataLength={data.length} color={accentColor} />
              )}
              activeDot={{ r: 4, fill: "#e5e5e5" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {isFlaggable && flaggedRanges.length > 0 && (
        <div
          className={`mt-4 text-xs p-2 pl-3 rounded-r border-l-2 ${
            SHAPE_CALLOUT_CLASSES[flaggedShape] || SHAPE_CALLOUT_CLASSES.SEASONAL_DIP
          }`}
        >
          {SHAPE_LABEL[flaggedShape]} detected across {flaggedRanges.reduce((n, [s, e]) => n + (e - s + 1), 0)} month
          {flaggedRanges.reduce((n, [s, e]) => n + (e - s + 1), 0) === 1 ? "" : "s"} of this borrower's history —
          shaded above.
        </div>
      )}
    </div>
  );
}
