const BUCKET_CLASSES = {
  Low: "bg-emerald-950/40 text-emerald-400 border-emerald-800/50",
  Medium: "bg-amber-950/40 text-amber-400 border-amber-800/50",
  High: "bg-rose-950/40 text-rose-400 border-rose-800/50",
};

const BUCKET_LABEL = {
  Low: "Low risk",
  Medium: "Medium risk",
  High: "High risk",
};

export default function StampBadge({ bucket, animate = false, size = "md", suffix = "" }) {
  const cls = BUCKET_CLASSES[bucket] || "bg-neutral-800/40 text-neutral-300 border-neutral-700";
  const label = (BUCKET_LABEL[bucket] || bucket) + suffix;
  const sizeCls = size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center border rounded-md font-medium whitespace-nowrap ${cls} ${sizeCls} ${
        animate ? "animate-stamp-impact" : ""
      }`}
    >
      {label}
    </span>
  );
}
