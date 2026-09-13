import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getBorrowers } from "../api";
import StampBadge from "../components/StampBadge";
import ShapeTag from "../components/ShapeTag";
import Layout from "../components/Layout";
import ErrorState from "../components/ErrorState";

const GRID_COLS = "3.5rem minmax(0,1fr) 16rem 4rem 9.5rem";
const BUCKETS = ["Low", "Medium", "High"];

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
          <div className="relative" style={{ isolation: "isolate" }}>
            <div
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                top: "-2.5rem",
                left: "-2rem",
                width: "16rem",
                height: "7rem",
                background: "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-caution) 55%, transparent), transparent 70%)",
                filter: "blur(20px)",
                zIndex: 0,
              }}
            />
            <Link to="/" className="no-underline relative" style={{ zIndex: 1 }}>
              <h1
                className="text-4xl"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                  background: "linear-gradient(to bottom, var(--color-ink), color-mix(in srgb, var(--color-ink) 60%, var(--color-paper)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                CashFlow Lens
              </h1>
            </Link>
          </div>
          <span
            className="text-sm"
            style={{ fontFamily: "var(--font-mono)", color: "var(--color-ink)", opacity: 0.55 }}
          >
            Ledger no. CFL-2026
          </span>
        </div>
        <div className="rule-double mt-3 mb-3" />
        <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--color-ink)", opacity: 0.85 }}>
          Repayment affordability review
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--color-ink)", opacity: 0.6 }}>
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
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div className="flex items-end gap-2 flex-wrap">
              <FilterChip
                label="All accounts"
                count={borrowers.length}
                active={bucketFilter === null}
                onClick={() => setBucketFilter(null)}
              />
              {BUCKETS.map((bucket) => (
                <button
                  key={bucket}
                  onClick={() => setBucketFilter(bucketFilter === bucket ? null : bucket)}
                  className="p-0 border-0 bg-transparent"
                  style={{ opacity: bucketFilter && bucketFilter !== bucket ? 0.4 : 1 }}
                >
                  <StampBadge bucket={bucket} suffix={` (${counts[bucket] || 0})`} />
                </button>
              ))}
            </div>

            <label className="flex items-baseline gap-2">
              <span className="text-sm" style={{ color: "var(--color-ink)", opacity: 0.6 }}>
                Search
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or archetype"
                className="bg-transparent text-sm py-1 focus:outline-none"
                style={{
                  borderBottom: "1px solid var(--color-ruled)",
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-sans)",
                  width: "12rem",
                }}
              />
            </label>
          </div>

          {visible.length === 0 ? (
            <div className="py-10 text-center">
              <p style={{ color: "var(--color-ink)", opacity: 0.6 }}>No accounts match this search or filter.</p>
              <button
                onClick={clearFilters}
                className="text-sm mt-3 px-4 py-2 font-medium"
                style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
              >
                Clear search and filters
              </button>
            </div>
          ) : (
            <div>
              <div
                className="grid text-sm pb-2"
                style={{ gridTemplateColumns: GRID_COLS, color: "var(--color-ink)", opacity: 0.55 }}
              >
                <HeaderCell>Entry</HeaderCell>
                <HeaderCell sortable active={sort.key === "name"} dir={sort.dir} onClick={() => toggleSort("name")}>
                  Borrower
                </HeaderCell>
                <HeaderCell>Cash-flow shape</HeaderCell>
                <HeaderCell align="right" sortable active={sort.key === "score"} dir={sort.dir} onClick={() => toggleSort("score")}>
                  Score
                </HeaderCell>
                <HeaderCell last>Risk bucket</HeaderCell>
              </div>
              <div className="rule-double mb-1" />

              {visible.map((b) => (
                <Link
                  key={b.id}
                  to={`/borrowers/${b.id}`}
                  className="grid items-center no-underline py-4"
                  style={{
                    gridTemplateColumns: GRID_COLS,
                    borderBottom: "1px solid var(--color-ruled)",
                    color: "var(--color-ink)",
                  }}
                >
                  <Cell>
                    <span style={{ fontFamily: "var(--font-mono)", opacity: 0.45, fontSize: "0.85rem" }}>
                      No. {String(b.entry).padStart(3, "0")}
                    </span>
                  </Cell>
                  <Cell>
                    <div className="text-lg leading-tight" style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}>
                      {b.name}
                    </div>
                    <div className="text-sm" style={{ opacity: 0.6 }}>
                      {b.archetype}
                    </div>
                  </Cell>
                  <Cell>
                    <ShapeTag shape={b.latest_shape} provisional={b.provisional} />
                  </Cell>
                  <Cell align="right">
                    <span style={{ fontFamily: "var(--font-mono)" }}>{b.stress_score}</span>
                  </Cell>
                  <Cell last>
                    <StampBadge bucket={b.bucket} />
                  </Cell>
                </Link>
              ))}

              <div className="pt-4 text-sm text-center" style={{ color: "var(--color-ink)", opacity: 0.4 }}>
                End of ledger
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-sm border px-3 py-1.5"
      style={{
        borderColor: active ? "var(--color-caution)" : "var(--color-ruled)",
        color: "var(--color-ink)",
        background: active ? "var(--color-caution-wash)" : "transparent",
        boxShadow: active ? "0 0 14px var(--color-caution-wash)" : "none",
        fontFamily: "var(--font-sans)",
      }}
    >
      {label} <span style={{ fontFamily: "var(--font-mono)", opacity: 0.6 }}>({count})</span>
    </button>
  );
}

function HeaderCell({ children, align = "left", last = false, sortable = false, active = false, dir, onClick }) {
  const content = (
    <div
      className="px-3"
      style={{
        textAlign: align,
        borderRight: last ? "none" : "1px solid var(--color-ruled)",
        opacity: sortable && active ? 1 : undefined,
        color: sortable && active ? "var(--color-ink)" : undefined,
        cursor: sortable ? "pointer" : undefined,
      }}
      onClick={onClick}
    >
      {children}
      {sortable && active && <span className="ml-1">{dir === "asc" ? "▲" : "▼"}</span>}
    </div>
  );
  return content;
}

function Cell({ children, align = "left", last = false }) {
  return (
    <div
      className="px-3"
      style={{
        textAlign: align,
        borderRight: last ? "none" : "1px solid var(--color-ruled)",
      }}
    >
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="flex gap-3 mb-6">
        <Bar w="7rem" h="2rem" />
        <Bar w="7rem" h="2rem" />
        <Bar w="7rem" h="2rem" />
        <Bar w="7rem" h="2rem" />
      </div>
      <div className="rule-double mb-3" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="grid items-center py-4"
          style={{ gridTemplateColumns: GRID_COLS, borderBottom: "1px solid var(--color-ruled)" }}
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
  return (
    <div
      style={{
        width: w,
        height: h,
        background: "var(--color-ruled-faint)",
        ...style,
      }}
    />
  );
}
