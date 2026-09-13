export default function ErrorState({ message, onRetry }) {
  return (
    <div
      className="border px-4 py-4"
      style={{ borderColor: "var(--color-oxide)", boxShadow: "0 0 20px var(--color-oxide-wash)" }}
    >
      <p style={{ color: "var(--color-oxide)" }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm mt-3 px-4 py-2 font-medium"
          style={{ background: "var(--color-oxide)", color: "var(--color-paper)" }}
        >
          Reload the ledger
        </button>
      )}
    </div>
  );
}
