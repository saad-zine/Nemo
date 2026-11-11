import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PROVIDERS, providerInfo } from "@/lib/models";
import { relayModels } from "@/lib/relay";
import { useVault } from "@/lib/store";

export function ModelPicker() {
  const [modelOpen, setModelOpen] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelState, setModelState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [modelError, setModelError] = useState("");
  const modelListRef = useRef<HTMLDivElement>(null);
  const model = useVault((s) => s.model);
  const provider = useVault((s) => s.provider);
  const apiKey = useVault((s) => s.apiKey);
  const baseUrl = useVault((s) => s.baseUrl);
  const providerKeys = useVault((s) => s.providerKeys);
  const activateProvider = useVault((s) => s.activateProvider);
  const setModel = useVault((s) => s.setModel);
  const hasKey = apiKey.trim().length > 8;
  const navigate = useNavigate();

  useEffect(() => {
    if (!modelOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (modelListRef.current && !modelListRef.current.contains(event.target as Node)) {
        setModelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [modelOpen]);

  useEffect(() => {
    if (!modelOpen || !hasKey) return;
    let active = true;
    setModelState("loading");
    setModelError("");
    void relayModels({
      data: { provider, apiKey: apiKey.trim(), baseUrl },
    }).then((result) => {
      if (!active) return;
      if (result.ok) {
        setModels(result.models);
        setModelState("ready");
      } else {
        setModels([]);
        setModelError(result.error);
        setModelState("error");
      }
    });
    return () => {
      active = false;
    };
  }, [modelOpen, provider, apiKey, baseUrl, hasKey]);

  const label = hasKey ? model : "No key";
  const who = providerInfo(provider).label;

  return (
    <div className="relative" ref={modelListRef}>
      <button
        type="button"
        onClick={() => setModelOpen((open) => !open)}
        aria-expanded={modelOpen}
        aria-haspopup="listbox"
        className="rounded-full px-2 py-1 text-[12px] text-muted transition-colors hover:bg-bg hover:text-fg"
      >
        {who} · {label}
      </button>
      <AnimatePresence>
        {modelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full z-30 mb-2 w-80 rounded-xl border border-line bg-surface p-2 shadow-2xl"
          >
            <div className="mb-2 border-b border-line pb-2">
              <div className="px-3 pt-1 pb-1.5 text-[10px] tracking-wide text-faint uppercase">
                Providers
              </div>
              <div className="grid grid-cols-3 gap-1 px-1">
                {PROVIDERS.map((p) => {
                  const isCur = p.id === provider;
                  const hasK = Boolean(providerKeys[p.id]?.apiKey?.trim() || (isCur && hasKey));
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (p.id !== provider) {
                          activateProvider(p.id);
                        }
                      }}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                        isCur ? "bg-lime/20 font-bold text-lime" : "text-muted hover:bg-raised hover:text-fg"
                      }`}
                    >
                      <span className="truncate">{p.label}</span>
                      {hasK && (
                        <span className="size-1.5 shrink-0 rounded-full bg-lime" title="API key saved" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void navigate({ to: "/settings" })}
              className="w-full rounded-lg border-b border-line px-3 py-2 text-left text-xs text-muted hover:bg-raised hover:text-fg"
            >
              Configure {who} API key & settings
            </button>
            <div className="px-3 pt-2 pb-1 text-[10px] tracking-wide text-faint uppercase">
              Available models
            </div>
            {!hasKey ? (
              <p className="px-3 py-2 text-xs text-muted">Add an API key to load models.</p>
            ) : modelState === "loading" ? (
              <p className="px-3 py-2 text-xs text-muted">Loading models…</p>
            ) : modelState === "error" ? (
              <p className="px-3 py-2 text-xs text-danger">{modelError}</p>
            ) : (
              <div className="nice-scroll max-h-36 overflow-y-auto pr-1" role="listbox" aria-label="Available models">
                {models.map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={id === model}
                    onClick={() => {
                      setModel(id);
                      setModelOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                      id === model ? "bg-raised text-fg" : "text-muted hover:bg-raised hover:text-fg"
                    }`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
