import { useSearchParams } from "react-router-dom";
import { MOCK_CLIENTS } from "@/lib/types";
import ClientDashboard from "@/components/ClientDashboard";

export default function PreviewPage() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("client") || MOCK_CLIENTS[0].id;
  const client = MOCK_CLIENTS.find((c) => c.id === clientId) || MOCK_CLIENTS[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-16 lg:pt-6 lg:ml-64 p-4 sm:p-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3 animate-fade-in">
          <div className="rounded-lg bg-accent/10 px-3 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">Modo Preview</span>
          </div>
          <p className="text-sm text-muted-foreground">Visualizando como: <strong className="text-foreground">{client.name}</strong></p>
        </div>
        <ClientDashboard clientId={clientId} clientName={client.company} />
      </div>
    </div>
  );
}
