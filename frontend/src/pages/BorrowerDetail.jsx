import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getBorrowerDetail, refreshExplanation } from "../api";
import StampBadge from "../components/StampBadge";
import ShapeTag from "../components/ShapeTag";
import CashFlowChart from "../components/CashFlowChart";
import RecommendationPanel from "../components/RecommendationPanel";
import Layout from "../components/Layout";
import ErrorState from "../components/ErrorState";

export default function BorrowerDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setDetail(null);
    setError(null);
    getBorrowerDetail(id)
      .then(setDetail)
      .catch(() =>
        setError("Could not load this borrower. Confirm the backend is running and the borrower ID exists.")
      );
  };

  useEffect(load, [id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { ai_explanation } = await refreshExplanation(id);
      setDetail((prev) => ({ ...prev, ai_explanation }));
    } finally {
      setRefreshing(false);
    }
  };

  if (error) {
    return (
      <Layout>
        <Link to="/dashboard" style={{ color: "var(--color-ink)" }}>
          ← Back to ledger
        </Link>
        <div className="mt-4">
          <ErrorState message={error} onRetry={load} />
        </div>
      </Layout>
    );
  }

  if (!detail) {
    return (
      <Layout>
        <DetailSkeleton />
      </Layout>
    );
  }

  const { id: borrowerId, name, archetype, months, score_breakdown, recommendation, ai_explanation, current_installment } = detail;
  const latest = months[months.length - 1];
  const isHighRisk = score_breakdown.bucket === "High";

  return (
    <Layout>
      <Link to="/dashboard" className="text-sm" style={{ color: "var(--color-ink)", opacity: 0.7 }}>
        ← Back to ledger
      </Link>

      <header className="mt-4 mb-2 flex items-baseline justify-between gap-4 flex-wrap">
        <div className="relative" style={{ isolation: "isolate" }}>
          <div
            aria-hidden="true"
            className="absolute pointer-events-none"
            style={{
              top: "-2.5rem",
              left: "-2rem",
              width: "18rem",
              height: "7rem",
              background: "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-caution) 55%, transparent), transparent 70%)",
              filter: "blur(20px)",
              zIndex: 0,
            }}
          />
          <h1
            className="text-4xl relative"
            style={{ zIndex: 1,
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              background: "linear-gradient(to bottom, var(--color-ink), color-mix(in srgb, var(--color-ink) 60%, var(--color-paper)))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {name}
          </h1>
        </div>
        <span
          className="text-sm"
          style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)", opacity: 0.5 }}
        >
          Account no. {String(borrowerId).padStart(3, "0")}
        </span>
      </header>
      <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--color-ink)", opacity: 0.8 }}>
        {archetype}
      </p>
      <div className="rule-double mt-3 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10">
        {/* Main ledger column */}
        <div>
          <section className="mb-10">
            <h2 className="text-xl mb-3" style={{ fontFamily: "var(--font-serif)" }}>
              Net cash flow vs. baseline
            </h2>
            <CashFlowChart months={months} flaggedShape={latest.shape} />
          </section>

          <section className="mb-10">
            <h2 className="text-xl mb-3" style={{ fontFamily: "var(--font-serif)" }}>
              Evidence for this assessment
            </h2>
            <div style={{ border: "1px solid var(--color-ruled)" }} className="divide-y" >
              <EvidenceRow label="Deviation this month" value={`${latest.deviation_pct}%`} />
              <EvidenceRow label="Cash-flow shape" value={latest.shape.replace(/_/g, " ").toLowerCase()} />
              <EvidenceRow label="Missed payments, trailing 3 months" value={score_breakdown.missed_payments} />
              <EvidenceRow label="Partial payments, trailing 3 months" value={score_breakdown.partial_payments} />
              <EvidenceRow label="Stress score" value={`${score_breakdown.score} / 100`} strong />
            </div>
          </section>

          <section>
            <RecommendationPanel
              bucket={score_breakdown.bucket}
              shape={latest.shape}
              recommendation={recommendation}
              installment={current_installment}
            />
          </section>
        </div>

        {/* Remarks margin column */}
        <aside className="lg:pt-1">
          <div className="flex flex-col items-start gap-3 mb-6">
            <StampBadge bucket={score_breakdown.bucket} animate={isHighRisk} size="lg" />
            <ShapeTag shape={latest.shape} provisional={latest.provisional} />
          </div>

          <div style={{ borderTop: "1px solid var(--color-ruled)" }} className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", opacity: 0.8 }}>
                Officer's remarks
              </h3>
            </div>
            <p className="text-sm" style={{ color: "var(--color-ink)", lineHeight: 1.65 }}>
              {ai_explanation}
            </p>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs mt-3 px-3 py-1.5 font-medium"
              style={{
                background: "var(--color-ink)",
                color: "var(--color-paper)",
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? "Regenerating…" : "Regenerate remarks"}
            </button>
          </div>
        </aside>
      </div>
    </Layout>
  );
}

function EvidenceRow({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline px-4 py-3" style={{ borderColor: "var(--color-ruled)" }}>
      <span style={{ color: "var(--color-ink)", opacity: 0.75 }}>{label}</span>
      <span className="leader" />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: strong ? 600 : 400,
          fontSize: strong ? "1.1rem" : "1rem",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Bar({ w, h, style }) {
  return <div style={{ width: w, height: h, background: "var(--color-ruled-faint)", ...style }} />;
}

function DetailSkeleton() {
  return (
    <div>
      <Bar w="8rem" h="0.9rem" />
      <div className="mt-4 mb-2">
        <Bar w="14rem" h="2.5rem" />
      </div>
      <Bar w="9rem" h="1rem" />
      <div className="rule-double mt-3 mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10">
        <div>
          <Bar w="12rem" h="1.3rem" style={{ marginBottom: "0.75rem" }} />
          <Bar w="100%" h="340px" />
          <div className="mt-10">
            <Bar w="14rem" h="1.3rem" style={{ marginBottom: "0.75rem" }} />
            <div style={{ border: "1px solid var(--color-ruled)" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between px-4 py-3" style={{ borderBottom: i < 4 ? "1px solid var(--color-ruled)" : "none" }}>
                  <Bar w="12rem" h="1rem" />
                  <Bar w="3rem" h="1rem" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <Bar w="8rem" h="2.5rem" style={{ marginBottom: "0.75rem" }} />
          <Bar w="6rem" h="1.1rem" />
        </div>
      </div>
    </div>
  );
}
