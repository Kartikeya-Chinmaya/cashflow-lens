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
        <Link to="/dashboard" className="text-xs font-mono text-neutral-400 hover:text-white transition-colors">
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
      <Link to="/dashboard" className="text-xs font-mono text-neutral-400 hover:text-white transition-colors">
        ← Back to ledger
      </Link>

      <header className="mt-4 mb-8 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-serif font-medium text-white">{name}</h1>
          <p className="font-serif italic text-neutral-400 mt-1">{archetype}</p>
        </div>
        <span className="text-xs font-mono text-neutral-500">Account no. {String(borrowerId).padStart(3, "0")}</span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-serif font-medium text-white mb-4">Net cash flow vs. baseline</h2>
            <CashFlowChart months={months} flaggedShape={latest.shape} />
          </div>

          <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-serif font-medium text-white mb-4">Evidence for this assessment</h2>
            <div className="space-y-3">
              <EvidenceRow label="Deviation this month" value={`${latest.deviation_pct}%`} />
              <EvidenceRow label="Cash-flow shape" value={latest.shape.replace(/_/g, " ").toLowerCase()} />
              <EvidenceRow label="Missed payments, trailing 3 months" value={score_breakdown.missed_payments} />
              <EvidenceRow label="Partial payments, trailing 3 months" value={score_breakdown.partial_payments} />
              <EvidenceRow label="Stress score" value={`${score_breakdown.score} / 100`} strong />
            </div>
          </div>

          <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-6">
            <RecommendationPanel
              bucket={score_breakdown.bucket}
              shape={latest.shape}
              recommendation={recommendation}
              installment={current_installment}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-8 self-start">
          <div className="bg-neutral-900/50 border border-neutral-800 border-t-2 border-t-amber-500/60 rounded-xl p-6 space-y-6">
            <div className="flex flex-col items-start gap-3">
              <StampBadge bucket={score_breakdown.bucket} animate={isHighRisk} size="lg" />
              <ShapeTag shape={latest.shape} provisional={latest.provisional} />
            </div>

            <div>
              <h3 className="text-sm font-serif italic text-neutral-300 mb-2">Officer's remarks</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{ai_explanation}</p>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-xs mt-4 px-4 py-2 rounded-md font-medium bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 transition-all disabled:opacity-60"
              >
                {refreshing ? "Regenerating…" : "Regenerate remarks"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </Layout>
  );
}

function EvidenceRow({ label, value, strong = false }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs text-neutral-400 shrink-0">{label}</span>
      <span className="flex-1 border-b border-dotted border-neutral-700 translate-y-[-3px]" />
      <span className={`font-mono ${strong ? "text-base text-amber-400 font-semibold" : "text-sm text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function Bar({ w, h, style }) {
  return <div className="bg-neutral-800/60 rounded" style={{ width: w, height: h, ...style }} />;
}

function Card({ children }) {
  return <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-6">{children}</div>;
}

function DetailSkeleton() {
  return (
    <div>
      <Bar w="8rem" h="0.9rem" />
      <div className="mt-4 mb-8">
        <Bar w="14rem" h="2.25rem" />
        <Bar w="9rem" h="1rem" style={{ marginTop: 10 }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-6">
          <Card>
            <Bar w="12rem" h="1.2rem" style={{ marginBottom: "1rem" }} />
            <Bar w="100%" h="300px" />
          </Card>
          <Card>
            <Bar w="14rem" h="1.2rem" style={{ marginBottom: "1rem" }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between py-2">
                <Bar w="12rem" h="0.9rem" />
                <Bar w="3rem" h="0.9rem" />
              </div>
            ))}
          </Card>
        </div>
        <Card>
          <Bar w="8rem" h="2rem" style={{ marginBottom: "0.75rem" }} />
          <Bar w="6rem" h="1rem" />
        </Card>
      </div>
    </div>
  );
}
