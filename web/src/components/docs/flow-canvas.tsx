import { ArrowDown, Braces, Fingerprint, LockKeyhole, RotateCcw } from "lucide-react";
import { ApiNode, DeviceNode, MaskNode } from "./flow-nodes";

export function FlowCanvas() {
  return (
    <div className="@container mt-6 overflow-hidden rounded-[24px] border border-line/80 bg-surface shadow-[0_20px_70px_rgba(0,0,0,0.14)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-40 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-lime" />
            </span>
            <p className="text-[10px] font-bold tracking-[0.18em] text-fg uppercase">
              The privacy loop
            </p>
          </div>
          <p className="mt-1 text-xs text-muted">One note. Two journeys. Zero originals sent.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised/70 px-2.5 py-1 text-[10px] font-bold text-muted">
          <LockKeyhole className="size-3 text-lime" />
          Local-first by design
        </span>
      </div>

      <div
        className="relative p-4 sm:p-6"
        style={{
          backgroundImage: "radial-gradient(var(--color-line) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute top-5 right-6 hidden text-lg font-light text-faint @2xl:block"
        >
          +
        </div>
        <div className="relative grid items-stretch gap-5 @2xl:grid-cols-[minmax(0,1.12fr)_3.5rem_minmax(14rem,.88fr)] @2xl:grid-rows-2 @2xl:gap-x-0 @2xl:gap-y-5">
          <DeviceNode />
          <MobileFlowArrow label="Mask it locally" />
          <FlowRail />
          <MaskNode />
          <MobileFlowArrow label="Send tokens only" />
          <ApiNode />
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.12em] text-muted uppercase @2xl:hidden">
            <RotateCcw className="size-3.5 text-lime" />
            Restore the reply on your device
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-line/70 bg-bg/60 px-5 py-4 text-[11px] text-muted sm:grid-cols-3 sm:px-6">
        <span className="flex items-center gap-2">
          <Fingerprint className="size-3.5 shrink-0 text-lime" />
          Originals stay in this browser
        </span>
        <span className="flex items-center gap-2">
          <Braces className="size-3.5 shrink-0 text-lime" />
          Only tokens cross to the API
        </span>
        <span className="flex items-center gap-2">
          <RotateCcw className="size-3.5 shrink-0 text-lime" />
          Replies are restored locally
        </span>
      </div>
    </div>
  );
}

export function FlowRail() {
  return (
    <div
      aria-hidden="true"
      className="relative z-0 hidden @2xl:col-start-2 @2xl:row-start-1 @2xl:row-span-2 @2xl:block"
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 56 100" preserveAspectRatio="none">
        <defs>
          <marker id="flow-arrow-out" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0 0 7 3.5 0 7Z" fill="var(--color-lime)" />
          </marker>
          <marker id="flow-arrow-back" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <path d="M0 0 7 3.5 0 7Z" fill="var(--color-muted)" />
          </marker>
        </defs>
        <path
          d="M0 25H54"
          fill="none"
          stroke="var(--color-lime)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
          markerEnd="url(#flow-arrow-out)"
          className="flow-line"
        />
        <path
          d="M56 75H2"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
          markerEnd="url(#flow-arrow-back)"
          className="flow-line flow-line-back"
        />
      </svg>
      <span className="flow-packet-out absolute top-[25%] left-0 size-2 rounded-full bg-lime shadow-[0_0_12px_var(--color-lime)]" />
      <span className="flow-packet-back absolute top-[75%] right-0 size-2 rounded-full bg-muted" />
      <span className="absolute top-[18%] left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[8px] font-bold tracking-[0.12em] text-lime uppercase">
        Out
      </span>
      <span className="absolute top-[68%] left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[8px] font-bold tracking-[0.12em] text-muted uppercase">
        04 · Back
      </span>
    </div>
  );
}

export function MobileFlowArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-[9px] font-bold tracking-[0.14em] text-faint uppercase @2xl:hidden">
      <span className="h-px w-8 bg-line" />
      <ArrowDown className="size-3.5 text-lime" />
      {label}
      <span className="h-px w-8 bg-line" />
    </div>
  );
}
