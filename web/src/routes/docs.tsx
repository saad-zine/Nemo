import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { DocsSidebar, MobileNav } from "@/components/docs/docs-nav";
import { useActiveSection } from "@/components/docs/use-active-section";
import { FlowCanvas } from "@/components/docs/flow-canvas";

export const Route = createFileRoute("/docs")({ component: HowItWorks });

const PROCESS = [
  {
    id: "device",
    title: "Your device",
    body: "You write or drop a file into Relay. The original stays here; only the masked copy is ever put into a request.",
  },
  {
    id: "layer",
    title: "Anonymization layer",
    body: "Names, emails, phone numbers, card numbers, dates and street addresses are detected and replaced with stable tokens. The token-to-original map never leaves this browser.",
  },
  {
    id: "api",
    title: "Your model API",
    body: "Your own provider key is attached to the request. The model receives the tokenized transcript, so it never sees the originals.",
  },
  {
    id: "restore",
    title: "Reply restoration",
    body: "The reply comes back with tokens intact. Relay swaps them for the originals locally before showing it to you. Turn restoration off in Settings if you want to read the masked reply.",
  },
];

const SECTIONS = [
  {
    id: "full-access",
    title: "Full access",
    body: "The free workspace covers local anonymization, file passes and chats with your own key. Full access is the paid workspace for heavier use; start it from “Get full access” in the main sidebar.",
  },
  {
    id: "the-key",
    title: "The key",
    body: "Under Settings, paste a credential for any of the providers we support — OpenAI, Anthropic, Google, Groq, xAI, or any OpenAI-compatible endpoint. It is stored locally and attached only to the request you send. Without a key, Relay still anonymizes and then stops.",
  },
];

function HowItWorks() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { active, select } = useActiveSection(scrollRef);
  const [copied, setCopied] = useState(false);

  async function copyPage() {
    const text = [
      "How it works — Relay",
      "A layer between you and your model.",
      "Relay anonymizes your text before it leaves this device and restores tokens in the reply after it comes back.",
      window.location.href,
    ].join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked by the browser */
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-56 shrink-0 border-r border-line/70 lg:block">
        <div className="nice-scroll h-full overflow-y-auto">
          <DocsSidebar active={active} onSelect={select} />
        </div>
      </aside>

      <div ref={scrollRef} className="nice-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
          <MobileNav active={active} onSelect={select} />

          <header id="overview" className="scroll-mt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wide text-lime uppercase">
                  How it works
                </p>
                <h1 className="mt-2 text-3xl tracking-tight text-fg md:text-4xl">
                  A layer between you and your model
                </h1>
                <p className="mt-3 text-base text-muted">
                  Anonymize on the way out. Restore on the way back.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copyPage()}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-line bg-surface/60 px-3 py-2 text-[13px] text-fg transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                {copied ? (
                  <Check className="size-3.5 text-lime" />
                ) : (
                  <Copy className="size-3.5 text-muted" />
                )}
                {copied ? "Copied" : "Copy page"}
              </button>
            </div>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
              Relay sits in the middle. Your text is anonymized before it leaves this device, and
              the reply is restored only after it comes back.
            </p>
          </header>

          <section id="flow" className="scroll-mt-6 pt-12">
            <h2 className="text-xl tracking-tight text-fg">The flow</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Your request crosses the layer masked. The provider’s reply crosses back with its
              tokens swapped for the originals — locally, before you see it.
            </p>

            <FlowCanvas />
          </section>

          <section className="pt-12">
            <h2 className="text-xl tracking-tight text-fg">The process</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Four stops between the text you write and the reply you read.
            </p>
            <div className="mt-4 divide-y divide-line/60 border-y border-line/60">
              {PROCESS.map((step) => (
                <div
                  key={step.id}
                  id={step.id}
                  className="scroll-mt-6 grid gap-2 py-6 sm:grid-cols-[13rem_1fr] sm:gap-6"
                >
                  <h3 className="text-sm font-medium text-fg">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="pt-12">
            <h2 id="access" className="scroll-mt-6 text-xl tracking-tight text-fg">
              Access
            </h2>
            <div className="mt-6">
              {SECTIONS.map((s) => (
                <div key={s.id} id={s.id} className="scroll-mt-6 border-t border-line py-8">
                  <h3 className="text-base text-fg">{s.title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
