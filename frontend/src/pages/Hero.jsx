import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <div className="paper-grain min-h-screen" style={{ background: "var(--color-paper)", color: "var(--color-ink)" }}>
      <header className="relative z-10 border-b" style={{ borderColor: "var(--color-ruled)" }}>
        <nav className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl" style={{ fontFamily: "var(--font-serif)", fontWeight: 600 }}>
            CashFlow Lens
          </span>
          <Link
            to="/dashboard"
            className="text-sm border px-4 py-2 no-underline"
            style={{ borderColor: "var(--color-ruled)", color: "var(--color-ink)" }}
          >
            Open the ledger
          </Link>
        </nav>
      </header>

      <section className="relative px-6 pt-10 pb-12">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <span
            className="mb-5 inline-flex items-center gap-2 px-4 py-2 border text-xs"
            style={{ borderColor: "var(--color-ruled)", color: "var(--color-ink)", opacity: 0.75 }}
          >
            Hackathon prototype, built on synthetic borrower data
          </span>

          <h1
            className="text-4xl md:text-5xl leading-tight mb-4"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              background: "linear-gradient(to bottom, var(--color-ink), color-mix(in srgb, var(--color-ink) 55%, var(--color-paper)))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Know who's at risk,
            <br />
            before the missed payment.
          </h1>

          <p className="text-base md:text-lg max-w-xl mb-6" style={{ opacity: 0.75 }}>
            CashFlow Lens turns raw income and repayment history into a stress score, a
            plain-English explanation, and a concrete repayment plan for every borrower.
          </p>

          <Link
            to="/dashboard"
            className="no-underline px-7 py-3 text-base font-medium"
            style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
          >
            Open the ledger
          </Link>

          <p className="text-sm mt-3" style={{ opacity: 0.5 }}>
            8 borrowers analyzed automatically. No sign-in required.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto mt-8">
          <div
            aria-hidden="true"
            className="absolute left-1/2 pointer-events-none"
            style={{
              top: "-14%",
              width: "80%",
              height: "320px",
              transform: "translateX(-50%)",
              background: "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-caution) 55%, transparent), transparent 70%)",
              filter: "blur(30px)",
            }}
          />
          <div className="relative border" style={{ borderColor: "var(--color-ruled)" }}>
            <img
              src="/dashboard-preview.png"
              alt="CashFlow Lens ledger dashboard, showing borrower risk buckets and stress scores"
              className="w-full h-auto block"
              loading="eager"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
