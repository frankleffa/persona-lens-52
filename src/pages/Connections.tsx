import { useState } from "react";
import { Plug, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface AdAccount {
  id: string;
  name: string;
  selected: boolean;
}

interface ConnectionBlock {
  id: string;
  label: string;
  icon: string;
  connected: boolean;
  accounts: AdAccount[];
  expanded: boolean;
  mccId?: string;
  propertyId?: string;
}

const INITIAL_CONNECTIONS: ConnectionBlock[] = [
  {
    id: "google_ads",
    label: "Google Ads",
    icon: "G",
    connected: false,
    mccId: "",
    expanded: false,
    accounts: [
      { id: "ga1", name: "Conta Principal – 123-456-7890", selected: false },
      { id: "ga2", name: "E-commerce – 234-567-8901", selected: false },
      { id: "ga3", name: "Branding – 345-678-9012", selected: false },
    ],
  },
  {
    id: "meta_ads",
    label: "Meta Ads",
    icon: "M",
    connected: false,
    expanded: false,
    accounts: [
      { id: "ma1", name: "Ad Account Principal – act_1234567", selected: false },
      { id: "ma2", name: "Ad Account Vendas – act_2345678", selected: false },
    ],
  },
  {
    id: "ga4",
    label: "Google Analytics 4",
    icon: "A",
    connected: false,
    expanded: false,
    propertyId: "",
    accounts: [
      { id: "p1", name: "Propriedade – Website Principal (GA4)", selected: false },
      { id: "p2", name: "Propriedade – App Mobile (GA4)", selected: false },
    ],
  },
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionBlock[]>(INITIAL_CONNECTIONS);

  const handleConnect = (id: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, connected: true, expanded: true, mccId: c.id === "google_ads" ? "MCC-900-100-2000" : c.mccId }
          : c
      )
    );
    toast.success("Conexão OAuth simulada com sucesso!");
  };

  const handleDisconnect = (id: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, connected: false, expanded: false, accounts: c.accounts.map((a) => ({ ...a, selected: false })) }
          : c
      )
    );
    toast("Conexão removida.");
  };

  const toggleExpand = (id: string) => {
    setConnections((prev) => prev.map((c) => (c.id === id ? { ...c, expanded: !c.expanded } : c)));
  };

  const toggleAccount = (connId: string, accId: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connId
          ? { ...c, accounts: c.accounts.map((a) => (a.id === accId ? { ...a, selected: !a.selected } : a)) }
          : c
      )
    );
  };

  const saveAccounts = (id: string) => {
    const conn = connections.find((c) => c.id === id);
    const count = conn?.accounts.filter((a) => a.selected).length ?? 0;
    toast.success(`${count} conta(s) salva(s) para ${conn?.label}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="ml-64 p-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Central de Conexões</h1>
              <p className="text-sm text-muted-foreground">Gerencie suas integrações com plataformas de anúncios e analytics</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {connections.map((conn, i) => (
            <div
              key={conn.id}
              className="card-executive overflow-hidden animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${
                      conn.id === "google_ads"
                        ? "bg-chart-blue/15 text-chart-blue"
                        : conn.id === "meta_ads"
                        ? "bg-chart-purple/15 text-chart-purple"
                        : "bg-chart-amber/15 text-chart-amber"
                    }`}
                  >
                    {conn.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{conn.label}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      {conn.connected ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-chart-positive" />
                          <span className="text-xs font-medium text-chart-positive">Conectado</span>
                          {conn.mccId && (
                            <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                              {conn.mccId}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Não conectado</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {conn.connected && (
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(conn.id)}>
                      {conn.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  )}
                  {conn.connected ? (
                    <Button variant="outline" size="sm" onClick={() => handleDisconnect(conn.id)}>
                      Desconectar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleConnect(conn.id)}>
                      Conectar {conn.label}
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded accounts */}
              {conn.connected && conn.expanded && (
                <div className="border-t border-border bg-muted/30 p-6">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {conn.id === "ga4" ? "Selecione a propriedade" : "Selecione as contas ativas"}
                  </p>
                  <div className="space-y-2">
                    {conn.accounts.map((acc) => (
                      <label
                        key={acc.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={acc.selected}
                          onCheckedChange={() => toggleAccount(conn.id, acc.id)}
                        />
                        <span className="text-sm text-foreground">{acc.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button size="sm" onClick={() => saveAccounts(conn.id)}>
                      Salvar Seleção
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
