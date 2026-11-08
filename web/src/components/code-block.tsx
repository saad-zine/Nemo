import { useState } from "react";

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative mb-2 overflow-x-auto rounded-xl border border-line bg-surface p-3 text-[12px] font-mono text-fg">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 text-[10px] text-faint hover:text-fg bg-raised/40 px-2 py-0.5 rounded border border-line/60 transition-colors"
        title={copied ? "Copied!" : "Copy code"}
      >
        {copied ? "Copied!" : "Copy code"}
      </button>
      <pre className="block whitespace-pre m-0">{code}</pre>
    </div>
  );
}
