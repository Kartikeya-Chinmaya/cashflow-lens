export default function ErrorState({ message, onRetry }) {
  return (
    <div className="border border-rose-900/50 bg-rose-950/20 rounded-xl px-4 py-4">
      <p className="text-sm text-rose-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs mt-3 px-4 py-2 rounded-md font-medium bg-rose-900/60 hover:bg-rose-900 border border-rose-800 text-rose-200 transition-colors"
        >
          Reload the ledger
        </button>
      )}
    </div>
  );
}
