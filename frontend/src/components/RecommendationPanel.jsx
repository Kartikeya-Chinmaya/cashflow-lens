function computeAfter(bucket, shape, installment) {
  if (bucket === "Low") {
    return {
      installment,
      dueOffsetDays: 0,
      graceInstallments: 0,
      tenureNote: "No change",
    };
  }
  if (bucket === "Medium" && (shape === "SEASONAL_DIP" || shape === "ISOLATED_SHOCK")) {
    return {
      installment,
      dueOffsetDays: 30,
      graceInstallments: 0,
      tenureNote: "No change",
    };
  }
  if (bucket === "Medium" && shape === "SUSTAINED_DECLINE") {
    return {
      installment: Math.round(installment * 0.8 * 100) / 100,
      dueOffsetDays: 0,
      graceInstallments: 0,
      tenureNote: "Extended by roughly 25% to keep total repayment unchanged",
    };
  }
  // High, any shape
  return {
    installment: Math.round(installment * 0.65 * 100) / 100,
    dueOffsetDays: 0,
    graceInstallments: 1,
    tenureNote: "Extended to keep total repayment unchanged, pending manual review",
  };
}

export default function RecommendationPanel({ bucket, shape, recommendation, installment }) {
  const after = computeAfter(bucket, shape, installment);
  const changed = after.installment !== installment || after.dueOffsetDays !== 0 || after.graceInstallments > 0;
  const delta = installment ? Math.round((1 - after.installment / installment) * 100) : 0;

  return (
    <div>
      <h2 className="text-xl mb-3" style={{ fontFamily: "var(--font-serif)" }}>
        Recommended repayment adjustment
      </h2>
      <p className="mb-5" style={{ color: "var(--color-ink)" }}>
        {recommendation}
      </p>

      {changed ? (
        <div style={{ maxWidth: 420 }}>
          <Row label="Current installment" value={`₹${installment.toLocaleString()}`} note="standard due date" />
          <Row
            label="Revised installment"
            value={`₹${after.installment.toLocaleString()}`}
            note={[
              after.graceInstallments > 0 && `${after.graceInstallments} grace installment first`,
              after.dueOffsetDays > 0 ? `due date shifted ${after.dueOffsetDays} days` : null,
            ]
              .filter(Boolean)
              .join(", ") || "same due date"}
            final
          />
          <p className="text-sm mt-3" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", opacity: 0.75 }}>
            {delta > 0 ? `${delta}% reduction. ` : ""}
            {after.tenureNote}.
          </p>
        </div>
      ) : (
        <p style={{ color: "var(--color-ink)", opacity: 0.6 }}>
          Repayment schedule is unchanged. Installment stays at ₹{installment.toLocaleString()} on the standard due date.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, note, final: isFinal = false }) {
  return (
    <div className={isFinal ? "rule-double pb-2 mb-1" : "pb-2 mb-2"} style={{ borderColor: "var(--color-ink)" }}>
      <div className="flex items-baseline">
        <span style={{ color: "var(--color-ink)", opacity: 0.75 }}>{label}</span>
        <span className="leader" />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: isFinal ? 600 : 400,
            fontSize: isFinal ? "1.15rem" : "1rem",
            textShadow: isFinal ? "0 0 14px color-mix(in srgb, var(--color-caution) 75%, transparent)" : "none",
          }}
        >
          {value}
        </span>
      </div>
      {note && (
        <div className="text-xs mt-0.5" style={{ opacity: 0.55 }}>
          {note}
        </div>
      )}
    </div>
  );
}
