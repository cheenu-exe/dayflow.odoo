/** STYLE: Signal Ledger — compact operational signals, never decorative badges alone. */
type Tone = "green" | "amber" | "red" | "ink";

const toneMap: Record<Tone, string> = {
  green: "bg-verdant/10 text-verdant ring-verdant/15",
  amber: "bg-ochre/15 text-[#8a5b13] ring-ochre/20",
  red: "bg-persimmon/10 text-persimmon ring-persimmon/15",
  ink: "bg-ink/7 text-ink/70 ring-ink/10",
};

export function StatusTag({ label, tone = "ink", dot = true }: { label: string; tone?: Tone; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.105em] ring-1 ${toneMap[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}
