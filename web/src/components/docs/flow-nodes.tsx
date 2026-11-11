import { ArrowDown, Braces, LockKeyhole, Server, ShieldCheck, UserRound } from "lucide-react";
import { DocumentInspector } from "./document-inspector";

export function DeviceNode() {
  return (
    <section
      aria-labelledby="device-node-title"
      className="relative z-10 flex h-full flex-col rounded-[20px] border border-line/90 bg-bg/95 p-4 shadow-sm @2xl:col-start-1 @2xl:row-start-1 @2xl:row-span-2"
    >
      <header className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-[10px] font-bold text-fg">
          01
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="device-node-title" className="text-sm font-bold text-fg">
            Your device
          </h3>
          <p className="text-[9px] font-bold tracking-[0.14em] text-faint uppercase">
            Private original
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-1 text-[9px] font-bold text-muted uppercase">
          <UserRound className="size-3" />
          You
        </span>
      </header>

      <DocumentInspector />

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-line/60 pt-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <LockKeyhole className="size-3 text-lime" />
          Original never uploaded
        </span>
        <span className="font-mono text-[9px] text-faint">SAFE HERE</span>
      </footer>
    </section>
  );
}

export function MaskNode() {
  return (
    <article className="relative z-10 flex h-full flex-col rounded-[20px] border border-lime/30 bg-bg/95 p-4 shadow-sm @2xl:col-start-3 @2xl:row-start-1">
      <header className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-lime/30 bg-lime/10 text-[10px] font-bold text-lime">
          02
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-fg">Anonymization layer</h3>
          <p className="text-[9px] font-bold tracking-[0.14em] text-faint uppercase">Mask &amp; remember</p>
        </div>
        <ShieldCheck className="size-4 shrink-0 text-lime" />
      </header>

      <MaskIllustration />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Names", "Addresses", "Cities", "Workplaces"].map((item) => (
          <span key={item} className="rounded-full border border-line bg-raised/60 px-2 py-0.5 text-[9px] text-muted">
            {item}
          </span>
        ))}
      </div>
      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-3 text-[10px] text-muted">
        <span>4 details protected</span>
        <span className="font-bold text-lime">0 originals sent</span>
      </footer>
      <span className="absolute -bottom-[22px] left-1/2 z-30 hidden size-5 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface text-lime @2xl:flex">
        <ArrowDown className="size-3" />
      </span>
    </article>
  );
}

export function MaskIllustration() {
  return (
    <div className="relative mt-4 h-[104px] overflow-hidden rounded-[14px] border-2 border-[#273026] bg-[#d7ff70]">
      <svg aria-hidden="true" viewBox="0 0 280 110" className="h-full w-full">
        <g transform="rotate(-6 50 55)">
          <rect x="18" y="18" width="64" height="76" rx="5" fill="#fffdf4" stroke="#273026" strokeWidth="2.5" />
          <path d="M29 33h25M29 44h39M29 55h31" stroke="#ff9b7b" strokeWidth="5" strokeLinecap="round" />
          <path d="M29 70h37M29 80h25" stroke="#b9b9a9" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="M91 57c20-14 37-14 58 0" fill="none" stroke="#273026" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
        <path d="m143 49 9 8-10 6" fill="none" stroke="#273026" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="103" y="40" fill="#273026" fontSize="9" fontWeight="800" letterSpacing="1">MASK</text>
        <path d="M180 92v10m52-10v10" stroke="#273026" strokeWidth="3" strokeLinecap="round" />
        <rect x="163" y="13" width="94" height="84" rx="17" fill="#fffdf4" stroke="#273026" strokeWidth="3" />
        <circle cx="192" cy="40" r="3.5" fill="#273026" />
        <circle cx="227" cy="40" r="3.5" fill="#273026" />
        <path d="M201 48c5 5 12 5 17 0" fill="none" stroke="#273026" strokeWidth="2" strokeLinecap="round" />
        <path d="M199 66v-5c0-14 23-14 23 0v5" fill="none" stroke="#273026" strokeWidth="3" />
        <rect x="192" y="65" width="37" height="24" rx="6" fill="#91dce8" stroke="#273026" strokeWidth="2.5" />
        <circle cx="210.5" cy="75" r="3" fill="#273026" />
        <path d="M210.5 78v5" stroke="#273026" strokeWidth="2" />
        <path d="m148 17 2-7m-7 3 6 4m112-8 7-4m-2 11 7 1" stroke="#273026" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="absolute top-1.5 right-2 rotate-6 rounded border border-[#273026] bg-[#ff9b7b] px-1.5 py-0.5 text-[7px] font-black tracking-[0.1em] text-[#273026] uppercase">
        Local!
      </span>
    </div>
  );
}

export function ApiNode() {
  return (
    <article className="relative z-10 flex h-full flex-col rounded-[20px] border border-line/90 bg-bg/95 p-4 shadow-sm @2xl:col-start-3 @2xl:row-start-2">
      <header className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-[10px] font-bold text-fg">
          03
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-fg">Your model API</h3>
          <p className="text-[9px] font-bold tracking-[0.14em] text-faint uppercase">Outside the vault</p>
        </div>
        <Server className="size-4 shrink-0 text-muted" />
      </header>

      <div className="mt-4 flex items-center gap-2.5">
        <BotDoodle />
        <div className="relative min-w-0 flex-1 rounded-xl rounded-bl-[3px] border-2 border-[#273026] bg-[#fffdf4] px-3 py-2.5 text-[10px] leading-relaxed font-medium text-[#273026] shadow-[2px_3px_0_#273026]">
          <span className="absolute bottom-[13px] -left-[7px] size-3 rotate-45 border-b-2 border-l-2 border-[#273026] bg-[#fffdf4]" />
          Noted <code className="rounded bg-[#ffe0d4] px-1 font-mono text-[9px]">[[PERSON_1]]</code>.
          See you at <code className="rounded bg-[#ffe0d4] px-1 font-mono text-[9px]">[[ADDRESS_1]]</code>.
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-dashed border-line bg-raised/40 px-3 py-2 text-[10px] leading-relaxed text-muted">
        The model can answer without knowing who the note is about.
      </div>
      <footer className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <Braces className="size-3 text-lime" />
          Tokens in. Tokens out.
        </span>
        <span className="font-mono text-[9px] text-faint">BYO KEY</span>
      </footer>
    </article>
  );
}

export function BotDoodle() {
  return (
    <svg aria-hidden="true" viewBox="0 0 82 100" className="w-[62px] shrink-0 -rotate-2">
      <path d="M41 19V9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="41" cy="7" r="5" fill="#d7ff70" stroke="#273026" strokeWidth="2" />
      <rect x="7" y="39" width="10" height="23" rx="5" fill="#ff9b7b" stroke="#273026" strokeWidth="2.5" />
      <rect x="65" y="39" width="10" height="23" rx="5" fill="#ff9b7b" stroke="#273026" strokeWidth="2.5" />
      <rect x="13" y="18" width="56" height="61" rx="17" fill="#91dce8" stroke="#273026" strokeWidth="3" />
      <rect x="21" y="29" width="40" height="29" rx="10" fill="#fffdf4" stroke="#273026" strokeWidth="2" />
      <circle cx="32" cy="42" r="3" fill="#273026" />
      <circle cx="50" cy="42" r="3" fill="#273026" />
      <path d="M34 50c4 4 10 4 14 0" fill="none" stroke="#273026" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 68h26" stroke="#273026" strokeWidth="3" strokeLinecap="round" />
      <path d="M25 79v10m32-10v10M18 91h14m18 0h14" stroke="#273026" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
