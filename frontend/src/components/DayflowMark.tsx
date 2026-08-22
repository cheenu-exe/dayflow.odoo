/** STYLE: Signal Ledger — sleek vector mark with verdant highlights. */
type DayflowMarkProps = { className?: string; label?: boolean };

export function DayflowMark({ className = "", label = true }: DayflowMarkProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#0b6b57] text-white shadow-[0_6px_16px_rgba(11,107,87,0.25)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" className="opacity-40" />
          <path d="M12 7v5l3 3" />
          <path d="M8 3.5a10 10 0 0 1 8 0" className="text-[#a8e6d5]" strokeWidth="2.6" />
        </svg>
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a8e6d5] opacity-75"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#34d399]"></span>
        </span>
      </div>
      {label && (
        <div className="leading-none">
          <div className="font-display text-[1.28rem] font-bold tracking-[-0.06em] text-ink">
            dayflow<span className="text-verdant">.</span>
          </div>
          <div className="mt-1 text-[8.5px] font-extrabold uppercase tracking-[0.2em] text-verdant">
            workforce operations
          </div>
        </div>
      )}
    </div>
  );
}
