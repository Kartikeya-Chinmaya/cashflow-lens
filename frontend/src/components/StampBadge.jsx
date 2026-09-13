const BUCKET_COLOR = {
  Low: "var(--color-stamp)",
  Medium: "var(--color-caution)",
  High: "var(--color-oxide)",
};

const BUCKET_WASH = {
  Low: "var(--color-stamp-wash)",
  Medium: "var(--color-caution-wash)",
  High: "var(--color-oxide-wash)",
};

const BUCKET_LABEL = {
  Low: "Low risk",
  Medium: "Medium risk",
  High: "High risk",
};

// Each bucket gets its own tilt and inkiness so three stamps side by side
// don't read as one component copy-pasted three times.
const BUCKET_TILT = {
  Low: "-2.5deg",
  Medium: "-3.5deg",
  High: "-2deg",
};

export default function StampBadge({ bucket, animate = false, size = "md", suffix = "" }) {
  const color = BUCKET_COLOR[bucket] || "var(--color-ink)";
  const wash = BUCKET_WASH[bucket] || "transparent";
  const glow = `color-mix(in srgb, ${color} 55%, transparent)`;
  const label = (BUCKET_LABEL[bucket] || bucket) + suffix;
  const tilt = BUCKET_TILT[bucket] || "-3deg";
  const isLg = size === "lg";

  return (
    <span
      className={animate ? "animate-stamp-impact" : ""}
      style={{
        display: "inline-block",
        transform: `rotate(${tilt})`,
        padding: isLg ? 4 : 3,
        border: `1px solid ${color}`,
        borderRadius: "999px",
        opacity: 0.94,
        boxShadow: `0 0 ${isLg ? 30 : 16}px ${glow}`,
      }}
    >
      <span
        style={{
          display: "block",
          border: `${isLg ? 2.5 : 2}px solid ${color}`,
          borderRadius: "999px",
          color,
          padding: isLg ? "0.45rem 1.3rem" : "0.2rem 0.85rem",
          fontSize: isLg ? "1rem" : "0.78rem",
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
          background: `radial-gradient(ellipse at 30% 20%, ${wash}, transparent 70%)`,
          textShadow: `0 0 8px ${wash}`,
        }}
      >
        {label}
      </span>
    </span>
  );
}
