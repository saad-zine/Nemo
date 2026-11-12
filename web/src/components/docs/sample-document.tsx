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
        <PatientPortrait revealed={revealed} />
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

function PatientPortrait({ revealed }: { revealed: boolean }) {
  return (
    <div className="relative h-[58px] w-[52px] shrink-0 -rotate-2 overflow-hidden rounded-[5px] border-2 border-[#273026] bg-[#91dce8]">
      <svg
        aria-hidden="true"
        viewBox="0 0 64 72"
        className={`h-full w-full ${revealed ? "" : "blur-[3px] grayscale"}`}
      >
        <rect width="64" height="72" fill="#91dce8" />
        <circle cx="51" cy="13" r="11" fill="#f5ffe0" opacity="0.65" />
        <path
          d="M6 72c1-18 12-26 26-26s25 8 26 26"
          fill="#ff9b7b"
          stroke="#273026"
          strokeWidth="2"
        />
        <path d="M26 40h12v13H26z" fill="#bd805f" stroke="#273026" strokeWidth="1.8" />
        <ellipse
          cx="32"
          cy="28"
          rx="15"
          ry="19"
          fill="#d99b74"
          stroke="#273026"
          strokeWidth="2"
        />
        <path
          d="M17 28C14 8 25 4 34 5c13 0 18 10 14 25l-5-12c-8 3-15 0-20-3Z"
          fill="#273026"
        />
        <path d="M25 29h3m8 0h3" stroke="#273026" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M29 37c2 2 5 2 7 0" fill="none" stroke="#273026" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M20 58h24" stroke="#273026" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!revealed && (
        <span className="absolute inset-x-1 bottom-1 rounded-sm bg-[#fffdf4]/90 px-1 py-0.5 text-center font-mono text-[6px] font-bold text-[#273026]">
          FACE_1
        </span>
      )}
    </div>
  );
}

function DocumentField({
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
