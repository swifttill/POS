"use client";

export function PrintButton() {
  return (
    <div className="no-print mt-4 flex gap-2">
      <button
        onClick={() => window.print()}
        className="btn-primary flex-1 py-2 text-sm"
      >
        Print Bill
      </button>
      <button
        onClick={() => window.close()}
        className="btn-secondary flex-1 py-2 text-sm"
      >
        Close
      </button>
    </div>
  );
}
