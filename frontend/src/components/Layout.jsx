export default function Layout({ children }) {
  return (
    <div className="paper-grain min-h-screen" style={{ background: "var(--color-paper)" }}>
      <div className="relative flex">
        {/* Bound spine — a book edge, not a flat color bar */}
        <div
          className="hidden md:block w-9 shrink-0 min-h-screen relative"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.35), rgba(0,0,0,0.05) 60%)",
            borderRight: "1px solid var(--color-ruled)",
          }}
        >
          <div
            className="absolute inset-y-0 left-1/2 w-px"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, var(--color-ruled) 0, var(--color-ruled) 5px, transparent 5px, transparent 15px)",
              opacity: 0.8,
            }}
          />
        </div>

        <div className="ledger-ruled relative flex-1">
          <div className="ledger-margin-rule hidden md:block" />
          <div className="relative px-6 md:pl-16 md:pr-12 py-10 max-w-5xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
