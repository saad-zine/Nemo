export function PatientDocument({ revealed }: { revealed: boolean }) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-[3px] px-5 pt-5 pb-4 ${
        revealed ? "bg-[#f5ffe0]" : "bg-[#fffdf4]"
      }`}
    >
      <div className="flex items-center justify-between border-b-2 border-[#273026] pb-3">
        <div>
          <p className="text-[8px] font-black tracking-[0.18em] uppercase">Community care / 084</p>
          <h4 className="mt-0.5 text-[22px] font-bold tracking-[-0.045em]">Patient note</h4>
        </div>
        <svg aria-hidden="true" viewBox="0 0 48 48" className="size-10 -rotate-6">
          <path
            d="M24 40S7 30 7 18c0-9 12-11 17-3 5-8 17-6 17 3 0 12-17 22-17 22Z"
            fill="#ff9b7b"
            stroke="#273026"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M24 19v10M19 24h10" stroke="#273026" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>

      <div className="mt-4 space-y-3">
        <DocumentField
          label="Patient"
          token="[[PERSON_1]]"
          original="Yasmine Benali"
          revealed={revealed}
        />
        <DocumentField
          label="Lives at"
          token="[[ADDRESS_1]] · [[CITY_1]]"
          original="14 Rue des Orangers · Casablanca"
          revealed={revealed}
        />
        <DocumentField
          label="Works at"
          token="[[COMPANY_1]]"
          original="Attijariwafa Bank"
          revealed={revealed}
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-dashed border-[#273026]/45 pt-3">
        <div>
          <p className="text-[8px] font-black tracking-[0.16em] uppercase">Next visit</p>
          <p className="mt-1 text-[11px] font-bold">Tuesday, 24 June · 10:30</p>
        </div>
        <svg aria-hidden="true" viewBox="0 0 64 30" className="w-14 -rotate-6">
          <path
            d="M3 21c9-20 8 11 17-7 4-8-2 16 8 3 5-7 2 9 11 2 7-6 12-4 21-7"
            fill="none"
            stroke="#273026"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="absolute right-5 bottom-3 -rotate-3 text-[9px] font-bold text-[#68705f] italic">
        for the care team only
      </p>
    </div>
  );
}

export function DocumentField({
  label,
  token,
  original,
  revealed,
}: {
  label: string;
  token: string;
  original: string;
  revealed: boolean;
}) {
  return (
    <div className="min-h-[43px]">
      <p className="text-[8px] font-black tracking-[0.16em] text-[#68705f] uppercase">{label}</p>
      <span
        className={`mt-1 inline-block rounded-[4px] border px-1.5 py-0.5 font-mono text-[10px] leading-relaxed font-bold ${
          revealed
            ? "border-[#9aba52] bg-[#ddf79a] text-[#273026]"
            : "border-[#efb39f] bg-[#ffe0d4] text-[#6f493e]"
        }`}
      >
        {revealed ? original : token}
      </span>
    </div>
  );
}
