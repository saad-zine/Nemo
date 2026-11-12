import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Bot, FileScan, Gauge, ScanFace } from "lucide-react";
import { KryptosEmpty } from "@/components/chat/kryptos-empty";
import { useVault } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

const SHORTCUTS = [
  {
    to: "/anonymize",
    title: "Anonymize texts & documents",
    description: "Replace private details with placeholder tokens in seconds.",
    command: "protect --document",
    icon: FileScan,
  },
  {
    to: "/blur",
    title: "Blur faces quickly",
    description: "Hide identities in photos before you share them.",
    command: "blur --faces",
    icon: ScanFace,
  },
  {
    to: "/chat",
    title: "Start an anonymized AI chat",
    description: "Talk to your favorite AI with your own key · BYOK.",
    command: "chat --byok",
    icon: Bot,
  },
  {
    to: "/dashboard",
    title: "Open your privacy dashboard",
    description: "Review local activity, protected documents and your entity ledger.",
    command: "vault --activity",
    icon: Gauge,
  },
] as const;

function Home() {
  const documents = useVault((s) => s.documents);
  const entities = useVault((s) => s.entities);
  const messagesRouted = useVault((s) => s.messagesRouted);

  return (
    <div className="nice-scroll h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center px-5 py-8 sm:px-8">
        <KryptosEmpty incognito={false} compact />

        <nav aria-label="Kryptos tools" className="mt-7 grid gap-3 sm:grid-cols-2">
          {SHORTCUTS.map(({ to, title, description, command, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="kryptos-shortcut group relative rounded-xl border border-line/80 bg-surface/45 p-4 transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-lime/60 hover:bg-surface focus-visible:-translate-y-1 focus-visible:border-lime/60 focus-visible:outline-none sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <Icon className="size-5 text-lime" strokeWidth={1.6} aria-hidden />
                <ArrowUpRight
                  className="size-4 text-faint transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-lime"
                  aria-hidden
                />
              </div>
              <h2 className="mt-4 text-[15px] font-medium tracking-tight text-fg">{title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{description}</p>
              <span className="mt-4 block font-mono text-[10px] text-faint">
                <span className="mr-1.5 text-lime">&gt;</span>
                {command}
              </span>
            </Link>
          ))}
        </nav>

        <p className="mt-6 text-center text-xs text-faint">
          {documents} documents · {entities} entities held · {messagesRouted} messages
        </p>
      </div>
    </div>
  );
}
