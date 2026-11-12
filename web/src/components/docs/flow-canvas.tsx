import { Bot, FileCheck2, Files, ScanFace, ShieldCheck, type LucideIcon } from "lucide-react";

export function FlowCanvas() {
  return (
    <div className="mt-10 md:grid md:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)_6rem_minmax(0,1.15fr)] md:items-center">
      <FlowNode icon={Files} title="Your content" detail="Text, documents & photos" />
      <FlowConnector />
      <FlowNode icon={ShieldCheck} title="Kryptos" detail="Protected on your device" emphasis />
      <FlowConnector />

      <div className="grid gap-2.5" aria-label="Protected outputs">
        <OutputNode icon={FileCheck2} label="Anonymized documents" />
        <OutputNode icon={ScanFace} label="Blurred photos" />
        <OutputNode icon={Bot} label="Private AI chat · BYOK" />
      </div>
    </div>
  );
}

function FlowNode({
  icon: Icon,
  title,
  detail,
  emphasis = false,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span
        className={`flex size-14 items-center justify-center rounded-full ${
          emphasis ? "bg-lime text-ink shadow-[0_0_36px_rgba(200,255,0,0.12)]" : "bg-raised text-fg"
        }`}
      >
        <Icon className="size-6" strokeWidth={1.6} aria-hidden />
      </span>
      <h3 className="mt-4 text-sm font-medium text-fg">{title}</h3>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </div>
  );
}

function OutputNode({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface/60 px-4 py-3">
      <Icon className="size-4 shrink-0 text-lime" strokeWidth={1.7} aria-hidden />
      <span className="text-[13px] text-fg">{label}</span>
    </div>
  );
}

function FlowConnector() {
  return (
    <div aria-hidden="true" className="flex items-center justify-center py-4 md:py-0">
      <svg viewBox="0 0 96 24" className="hidden h-6 w-24 md:block">
        <path
          d="M2 12H88"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          className="flow-line"
        />
        <path d="m82 6 6 6-6 6" fill="none" stroke="var(--color-muted)" strokeWidth="1.5" />
        <circle cx="2" cy="12" r="3" fill="var(--color-lime)" className="flow-packet">
          <animate attributeName="cx" values="2;82" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </svg>
      <svg viewBox="0 0 24 48" className="h-12 w-6 md:hidden">
        <path
          d="M12 2V42"
          fill="none"
          stroke="var(--color-line)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          className="flow-line"
        />
        <path d="m6 36 6 6 6-6" fill="none" stroke="var(--color-muted)" strokeWidth="1.5" />
        <circle cx="12" cy="2" r="3" fill="var(--color-lime)" className="flow-packet">
          <animate attributeName="cy" values="2;36" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
