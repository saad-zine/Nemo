import { createFileRoute } from "@tanstack/react-router";
import { DocumentInspector } from "@/components/docs/document-inspector";
import { FlowCanvas } from "@/components/docs/flow-canvas";
import { PatientDocument } from "@/components/docs/sample-document";

export const Route = createFileRoute("/docs")({ component: HowItWorks });

function HowItWorks() {
  return (
    <div className="nice-scroll h-full min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
        <section id="overview">
          <header>
            <p className="text-[11px] font-medium tracking-wide text-lime uppercase">How it works</p>
            <h1 className="mt-2 max-w-2xl text-3xl tracking-tight text-fg md:text-4xl">
              Keep the context. Protect the details.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted">
              Personal notes, documents and photos carry details that other people and AI services
              rarely need. Kryptos helps you share the useful part without exposing the rest:
              anonymize text and files, blur faces, or chat with your own model while identifying
              details are replaced and restored on your device.
            </p>
          </header>

          <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-10">
            <figure>
              <figcaption className="mb-3 flex items-baseline gap-2 text-xs">
                <span className="font-medium text-fg">Before</span>
                <span className="text-faint">Original note</span>
              </figcaption>
              <div className="relative h-[370px] rounded-[5px] border-2 border-[#252b23] bg-[#fffdf4] text-[#273026] shadow-[4px_5px_0_#252b23]">
                <PatientDocument revealed />
              </div>
            </figure>

            <figure>
              <figcaption className="mb-3 flex items-baseline gap-2 text-xs">
                <span className="font-medium text-fg">After</span>
                <span className="text-faint">Anonymized note · hover or tap to compare</span>
              </figcaption>
              <DocumentInspector />
            </figure>
          </div>
        </section>

        <section id="flow" className="pt-16">
          <h2 className="text-xl tracking-tight text-fg">The flow</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Start with any kind of content, protect it locally, then choose where it goes next.
          </p>
          <FlowCanvas />
        </section>
      </div>
    </div>
  );
}
