const SHAPE_COLOR = {
  STABLE: "var(--color-ink)",
  SEASONAL_DIP: "var(--color-caution)",
  ISOLATED_SHOCK: "var(--color-caution)",
  SUSTAINED_DECLINE: "var(--color-oxide)",
};

const SHAPE_LABEL = {
  STABLE: "Stable",
  SEASONAL_DIP: "Seasonal dip",
  ISOLATED_SHOCK: "Isolated shock",
  SUSTAINED_DECLINE: "Sustained decline",
};

// Shape reads as a loan officer's marginal note, not a system status chip —
// serif italic against the sans/mono used everywhere else for data.
export default function ShapeTag({ shape, provisional = false }) {
  const color = SHAPE_COLOR[shape] || "var(--color-ink)";
  const label = SHAPE_LABEL[shape] || shape;

  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span
        className="inline-block h-2 w-2 shrink-0 translate-y-[-1px]"
        style={{ backgroundColor: color, transform: "rotate(45deg)" }}
      />
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          color,
          fontSize: "1rem",
          borderBottom: `1px solid ${color}55`,
        }}
      >
        {label}
      </span>
      {provisional && (
        <span
          className="text-xs"
          style={{ fontFamily: "var(--font-sans)", color: "var(--color-ruled)" }}
        >
          (unconfirmed)
        </span>
      )}
    </span>
  );
}
