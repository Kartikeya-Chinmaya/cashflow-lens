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
      <h2 className="text-xl font-serif font-medium text-white mb-3">Recommended repayment adjustment</h2>
      <p className="text-sm text-neutral-400 mb-5">{recommendation}</p>

      {changed ? (
        <div>
          <div className="grid grid-cols-2 gap-4 border-y border-neutral-800 py-5">
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-1">Current installment</div>
              <div className="font-serif text-2xl text-neutral-400">₹{installment.toLocaleString()}</div>
              <div className="text-xs text-neutral-500 mt-1">standard due date</div>
            </div>
            <div>
              <div className="text-xs font-mono text-neutral-500 mb-1">Revised installment</div>
              <div className="font-serif text-2xl text-amber-400">₹{after.installment.toLocaleString()}</div>
              <div className="text-xs text-neutral-500 mt-1">
                {[
                  after.graceInstallments > 0 && `${after.graceInstallments} grace installment first`,
                  after.dueOffsetDays > 0 ? `due date shifted ${after.dueOffsetDays} days` : null,
                ]
                  .filter(Boolean)
                  .join(", ") || "same due date"}
              </div>
            </div>
          </div>
          <p className="text-sm font-serif italic text-neutral-400 mt-4">
            {delta > 0 ? `${delta}% reduction. ` : ""}
            {after.tenureNote}.
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Repayment schedule is unchanged. Installment stays at ₹{installment.toLocaleString()} on the standard due
          date.
        </p>
      )}
    </div>
  );
}
