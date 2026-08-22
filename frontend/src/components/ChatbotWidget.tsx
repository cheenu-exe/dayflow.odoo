import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  MessageSquare,
  Minus,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { dayflowApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "What is my leave balance?",
  "How do I apply for leave?",
  "How is payroll prorated?",
  "What are the shift rules?",
];

function FormattedText({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Header 3 / 2
        if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
          const headerText = trimmed.replace(/^#+\s*/, "");
          return (
            <h4 key={idx} className="font-display text-xs font-bold text-[#0b6b57] dark:text-[#34d399] pt-1">
              {renderInlineStyles(headerText)}
            </h4>
          );
        }

        // Bullet point list item
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const bulletText = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0b6b57] dark:bg-[#34d399]" />
              <div className="flex-1">{renderInlineStyles(bulletText)}</div>
            </div>
          );
        }

        // Numbered list item
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          const num = numberedMatch[1];
          const itemText = numberedMatch[2];
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5">
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#0b6b57]/10 text-[8.5px] font-bold text-[#0b6b57] dark:bg-[#34d399]/20 dark:text-[#34d399]">
                {num}
              </span>
              <div className="flex-1">{renderInlineStyles(itemText)}</div>
            </div>
          );
        }

        // Standard paragraph
        return <p key={idx}>{renderInlineStyles(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInlineStyles(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-ink dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded-md bg-ink/8 dark:bg-white/15 px-1 py-0.5 font-mono text-[10px] font-semibold text-[#0b6b57] dark:text-[#34d399]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function ChatbotWidget() {
  const { user, profile, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `👋 Hi **${profile?.full_name || "there"}**! I am **Dayflow AI**.\n\nHow can I help you with your attendance, leave entitlements, or payroll today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function handleSend(text?: string) {
    const query = text || input;
    if (!query.trim() || loading) return;

    const newMsgs: Message[] = [...messages, { role: "user", content: query }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await dayflowApi.chat(
        newMsgs.map((m) => ({ role: m.role, content: m.content }))
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I am ready to assist with Dayflow operations. What would you like to check?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Launcher Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0b6b57] text-white shadow-[0_8px_24px_rgba(11,107,87,0.35)] transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Bot className="h-6 w-6 transition group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a8e6d5] opacity-75"></span>
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-[#34d399]"></span>
          </span>
        </button>
      )}

      {/* Expanded Chat Window */}
      {open && (
        <div className="flex h-[520px] w-[360px] sm:w-[400px] flex-col overflow-hidden rounded-[26px] border border-ink/15 dark:border-white/15 bg-white dark:bg-[#1c1d1a] shadow-2xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink/10 dark:border-white/10 bg-[#20211f] dark:bg-[#121312] px-5 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0b6b57] text-[#a8e6d5]">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-sm font-bold">Dayflow AI</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.2 text-[8.5px] font-bold text-emerald-300">
                    <span className="h-1 w-1 rounded-full bg-emerald-400" />
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-white/50 truncate max-w-[200px]">
                  {profile?.full_name || user.email} · {isAdmin ? "HR Admin" : profile?.team?.name || "Employee"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-[#f7f5ef]/40 dark:bg-[#121312]">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#0b6b57] text-[#a8e6d5] text-[9.5px] font-bold">
                    DF
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#20211f] dark:bg-[#2e302c] text-white rounded-br-xs"
                      : "bg-white dark:bg-[#1c1d1a] border border-ink/10 dark:border-white/10 text-ink dark:text-[#e4e4e0] rounded-tl-xs"
                  }`}
                >
                  <FormattedText content={m.content} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs font-bold text-[#0b6b57] dark:text-[#34d399] animate-pulse pl-8">
                <Sparkles className="h-3 w-3 text-[#0b6b57] dark:text-[#34d399]" /> Checking Dayflow records...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          {messages.length < 3 && (
            <div className="flex gap-1.5 overflow-x-auto border-t border-ink/8 dark:border-white/10 bg-white dark:bg-[#1c1d1a] p-2 scrollbar-none">
              {SUGGESTIONS.map((sugg, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sugg)}
                  className="shrink-0 rounded-full border border-ink/12 dark:border-white/10 bg-[#f7f5ef] dark:bg-[#262724] px-2.5 py-1 text-[10px] font-medium text-ink/75 dark:text-white/80 hover:border-verdant hover:text-verdant"
                >
                  {sugg}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-ink/10 dark:border-white/10 bg-white dark:bg-[#1c1d1a] p-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Dayflow AI..."
              className="flex-1 rounded-xl border border-ink/15 dark:border-white/15 bg-[#f7f5ef] dark:bg-[#242522] px-3 py-2 text-xs text-ink dark:text-white placeholder:text-ink/35 dark:placeholder:text-white/35 focus:border-[#0b6b57] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0b6b57] text-white transition hover:bg-[#084d3e] disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
