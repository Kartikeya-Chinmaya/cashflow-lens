import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBorrowers } from "../api";
import StampBadge from "../components/StampBadge";
import ShapeTag from "../components/ShapeTag";
import Layout from "../components/Layout";
import ErrorState from "../components/ErrorState";

const GRID_COLS = "3.5rem minmax(0,1fr) 16rem 4rem 9.5rem";
const BUCKETS = ["Low", "Medium", "High"];
const BUCKET_TEXT = {
  Low: "text-emerald-400",
  Medium: "text-amber-400",
  High: "text-rose-400",
};

export default function Dashboard() {
  const [borrowers, setBorrowers] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [bucketFilter, setBucketFilter] = useState(null);
  const [sort, setSort] = useState({ key: null, dir: "asc" });

  const load = () => {
    setError(null);
    setBorrowers(null);
    getBorrowers()
      .then(setBorrowers)
      .catch(() =>
        setError("Could not reach the CashFlow Lens API. Start the backend with uvicorn on port 8000 and reload this page.")
      );
  };

  useEffect(load, []);

  const counts = useMemo(() => {
    const c = { Low: 0, Medium: 0, High: 0 };
    (borrowers || []).forEach((b) => {
      c[b.bucket] = (c[b.bucket] || 0) + 1;
    });
    return c;
  }, [borrowers]);

  const visible = useMemo(() => {
    if (!borrowers) return null;
    const q = query.trim().toLowerCase();
    let rows = borrowers
      .map((b, i) => ({ ...b, entry: i + 1 }))
      .filter((b) => !bucketFilter || b.bucket === bucketFilter)
      .filter((b) => !q || b.name.toLowerCase().includes(q) || b.archetype.toLowerCase().includes(q));

    if (sort.key === "name") {
      rows = [...rows].sort((a, b) => a.name.localeCompare(b.name) * (sort.dir === "asc" ? 1 : -1));
    } else if (sort.key === "score") {
      rows = [...rows].sort((a, b) => (a.stress_score - b.stress_score) * (sort.dir === "asc" ? 1 : -1));
    }
    return rows;
  }, [borrowers, query, bucketFilter, sort]);

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "score" ? "desc" : "asc" }
    );
  };

  const hasFilters = query.trim() !== "" || bucketFilter !== null;
  const clearFilters = () => {
    setQuery("");
    setBucketFilter(null);
  };

  return (
    <Layout>
      <header className="mb-8">
        <div className="flex items-baseline justify-between flex-wrap gap-x-6 gap-y-1">
          <Link to="/" className="no-underline">
            <h1 className="text-3xl font-serif font-medium text-white tracking-tight">CashFlow Lens</h1>
          </Link>
          <span className="text-xs font-mono text-neutral-400">Ledger no. CFL-2026</span>
        </div>
        <p className="font-serif italic text-neutral-300 mt-3">Repayment affordability review</p>
        <p className="text-sm text-neutral-500 mt-1">
          {error
            ? "Account list unavailable"
            : borrowers
              ? `${borrowers.length} active accounts, reviewed automatically on each visit`
              : "Loading account list…"}
        </p>
      </header>

      {error && <ErrorState message={error} onRetry={load} />}

      {!error && !borrowers && <DashboardSkeleton />}

      {!error && borrowers && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="inline-flex items-center gap-1 bg-neutral-900/60 border border-neutral-800 p-1 rounded-lg">
              <Segment active={bucketFilter === null} onClick={() => setBucketFilter(null)}>
                All <span className="text-neutral-500">({borrowers.length})</span>
              </Segment>
              {BUCKETS.map((bucket) => (
                <Segment
                  key={bucket}
                  active={bucketFilter === bucket}
                  onClick={() => setBucketFilter(bucketFilter === bucket ? null : bucket)}
                  colorClass={BUCKET_TEXT[bucket]}
                >
                  {bucket} <span className="text-neutral-500">({counts[bucket] || 0})</span>
                </Segment>
              ))}
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or archetype"
              className="bg-neutral-900/40 border border-neutral-800 focus:border-neutral-600 rounded-md px-3 py-1.5 text-sm font-mono text-white placeholder:text-neutral-500 focus:outline-none"
              style={{ width: "16rem" }}
            />
          </div>

          {visible.length === 0 ? (
            <div className="py-14 text-center border border-neutral-800/80 rounded-xl bg-neutral-900/20">
              <p className="text-sm text-neutral-500">No accounts match this search or filter.</p>
              <button
                onClick={clearFilters}
                className="text-xs mt-4 px-4 py-2 rounded-md font-medium bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 transition-colors"
              >
                Clear search and filters
              </button>
            </div>
          ) : (
            <div className="border border-neutral-800/80 rounded-xl overflow-hidden bg-neutral-900/20 backdrop-blur-sm">
              <div
                className="grid text-[11px] font-mono uppercase text-neutral-400 py-3 px-4 border-b border-neutral-800"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <span>Entry</span>
                <SortableHeader active={sort.key === "name"} dir={sort.dir} onClick={() => toggleSort("name")}>
                  Borrower
                </SortableHeader>
                <span>Cash-flow shape</span>
                <SortableHeader
                  align="right"
                  active={sort.key === "score"}
                  dir={sort.dir}
                  onClick={() => toggleSort("score")}
                >
                  Score
                </SortableHeader>
                <span>Risk bucket</span>
              </div>

              {visible.map((b) => (
                <Link
                  key={b.id}
                  to={`/borrowers/${b.id}`}
                  className="grid items-center no-underline px-4 border-b border-neutral-800/40 last:border-b-0 hover:bg-neutral-800/30 transition-colors cursor-pointer"
                  style={{ gridTemplateColumns: GRID_COLS, height: "3.5rem" }}
                >
                  <span className="text-xs font-mono text-neutral-600">No. {String(b.entry).padStart(3, "0")}</span>
                  <div>
                    <div className="font-serif font-medium text-white text-base leading-tight">{b.name}</div>
                    <div className="text-xs text-neutral-400">{b.archetype}</div>
                  </div>
                  <ShapeTag shape={b.latest_shape} provisional={b.provisional} />
                  <span className="font-mono text-sm text-neutral-300 text-right pr-3">{b.stress_score}</span>
                  <StampBadge bucket={b.bucket} />
                </Link>
              ))}
            </div>
          )}

          <div className="pt-4 text-xs text-center text-neutral-600">End of ledger</div>
        </>
      )}
    </Layout>
  );
}

function Segment({ children, active, onClick, colorClass }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-neutral-800 text-white" : `text-neutral-500 hover:text-white ${colorClass || ""}`
      } ${active && colorClass ? colorClass : ""}`}
    >
      {children}
    </button>
  );
}

function SortableHeader({ children, align = "left", active, dir, onClick }) {
  return (
    <span
      onClick={onClick}
      className={`cursor-pointer select-none ${align === "right" ? "text-right pr-3" : ""} ${active ? "text-neutral-200" : ""}`}
    >
      {children}
      {active && <span className="ml-1">{dir === "asc" ? "▲" : "▼"}</span>}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="border border-neutral-800/80 rounded-xl overflow-hidden bg-neutral-900/20">
      <div className="flex gap-2 p-4 border-b border-neutral-800">
        <Bar w="6rem" h="2rem" />
        <Bar w="5rem" h="2rem" />
        <Bar w="6rem" h="2rem" />
        <Bar w="5rem" h="2rem" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="grid items-center px-4 border-b border-neutral-800/40 last:border-b-0"
          style={{ gridTemplateColumns: GRID_COLS, height: "3.5rem" }}
        >
          <Bar w="2.5rem" h="0.8rem" />
          <div>
            <Bar w="60%" h="1.1rem" />
            <Bar w="40%" h="0.8rem" style={{ marginTop: 6 }} />
          </div>
          <Bar w="70%" h="1rem" />
          <Bar w="1.5rem" h="1rem" style={{ marginLeft: "auto" }} />
          <Bar w="6rem" h="1.6rem" />
        </div>
      ))}
    </div>
  );
}

function Bar({ w, h, style }) {
  return <div className="bg-neutral-800/60 rounded" style={{ width: w, height: h, ...style }} />;
}
