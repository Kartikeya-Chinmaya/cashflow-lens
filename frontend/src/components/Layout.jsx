export default function Layout({ children }) {
  return (
    <div className="relative min-h-screen" style={{ background: "#09090b" }}>
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: "-12rem",
          left: "50%",
          width: "44rem",
          height: "28rem",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse at center, rgba(245,158,11,0.1), transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-10 w-full">{children}</div>
    </div>
  );
}
