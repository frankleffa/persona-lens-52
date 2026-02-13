import { MOCK_CLIENTS } from "@/lib/types";
import ClientDashboard from "@/components/ClientDashboard";

export default function Index() {
  const client = MOCK_CLIENTS[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="ml-64 p-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral de performance — {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </p>
        </div>
        <ClientDashboard clientId={client.id} clientName={client.company} />
      </div>
    </div>
  );
}
