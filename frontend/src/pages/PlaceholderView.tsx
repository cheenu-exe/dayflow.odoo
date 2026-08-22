/** STYLE: Signal Ledger — intentional future workflow placeholders with clear exits and no fake data. */
import { Link } from "wouter";
import { ArrowLeft, Blocks } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export default function PlaceholderView({ role, title, detail }: { role: "employee" | "admin"; title: string; detail: string }) {
  const back = role === "admin" ? "/admin" : "/";
  return <AppShell role={role}><section className="grid min-h-[55vh] place-items-center"><div className="max-w-lg text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-verdant/10 text-verdant"><Blocks className="h-6 w-6" /></div><p className="signal-label mt-6">Connected workflow</p><h1 className="mt-3 font-display text-4xl tracking-[-0.055em]">{title}</h1><p className="mt-4 text-sm leading-6 text-ink/58">{detail}</p><Link href={back} className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white"><ArrowLeft className="h-3.5 w-3.5" /> Return to dashboard</Link></div></section></AppShell>;
}
