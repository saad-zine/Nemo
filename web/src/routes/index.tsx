import { createFileRoute, Link } from "@tanstack/react-router";
import { Composer } from "@/components/composer";
import { KryptosEmpty } from "@/components/chat/kryptos-empty";
import { useVault } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const documents = useVault((s) => s.documents);
  const entities = useVault((s) => s.entities);
  const messagesRouted = useVault((s) => s.messagesRouted);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center px-6 pb-10">
        <div className="min-h-0 w-full flex-1">
          <KryptosEmpty incognito={false} />
        </div>
        <p className="mt-6 text-center text-xs text-faint">
          {documents} documents · {entities} entities held · {messagesRouted} messages
        </p>
        <Link to="/dashboard" className="mt-3 text-xs text-muted underline-offset-4 hover:underline">
          Open dashboard
        </Link>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <Composer />
      </div>
    </div>
  );
}
