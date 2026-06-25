"use client";

import { useEffect, useState } from "react";
import { Bot, Check, FileText, Loader2, MessageCircle, RefreshCw, Smartphone, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/* QR ilustrativo (determinístico) — trocar por base64 da Evolution API */
function QrCode() {
  const N = 21;
  const cells: boolean[] = [];
  const finder = (r: number, c: number) =>
    r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      let dark: boolean;
      if (i < 7 && j < 7) dark = finder(i, j);
      else if (i < 7 && j >= N - 7) dark = finder(i, j - (N - 7));
      else if (i >= N - 7 && j < 7) dark = finder(i - (N - 7), j);
      else dark = (i * j + i * 3 + j * 5) % 7 < 3;
      cells.push(dark);
    }
  }
  return (
    <div className="rounded-lg bg-white p-3">
      <div className="grid aspect-square w-44" style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}>
        {cells.map((d, i) => (
          <div key={i} className={d ? "bg-[#0b1a2e]" : "bg-white"} />
        ))}
      </div>
    </div>
  );
}

type Dest = { id: string; name: string; type: "Grupo" | "Contato"; reports: boolean; ai: boolean };

const seedDests: Dest[] = [
  { id: "1", name: "Diretoria — Bella Estética", type: "Grupo", reports: true, ai: true },
  { id: "2", name: "Equipe Clínica Vitalis", type: "Grupo", reports: true, ai: false },
  { id: "3", name: "Financeiro — Loja Norte", type: "Grupo", reports: false, ai: false },
  { id: "4", name: "Marina Alves", type: "Contato", reports: false, ai: false },
];

export function WhatsAppConnect({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (groups: number) => void;
}) {
  const [step, setStep] = useState<"qr" | "ready">("qr");
  const [dests, setDests] = useState<Dest[]>(seedDests);

  // Simula a leitura do QR (no real: polling em evolution-whatsapp check-status)
  useEffect(() => {
    if (!open || step !== "qr") return;
    const t = setTimeout(() => setStep("ready"), 3500);
    return () => clearTimeout(t);
  }, [open, step]);

  // reseta ao reabrir do zero (quando ainda não conectou)
  useEffect(() => {
    if (open && step === "qr") setStep("qr");
  }, [open]); // eslint-disable-line

  function toggle(id: string, key: "reports" | "ai") {
    setDests((d) => d.map((x) => (x.id === id ? { ...x, [key]: !x[key] } : x)));
  }

  function finish() {
    const active = dests.filter((d) => d.reports || d.ai).length;
    onConnected(active);
    toast.success(`WhatsApp conectado — ${active} destino(s) ativos.`);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Conectar WhatsApp"
      description={step === "qr" ? "Escaneie o QR code com o WhatsApp" : "Ative a IA e os relatórios"}
    >
      {step === "qr" ? (
        <div className="flex flex-col items-center text-center">
          <QrCode />
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Aguardando leitura…
          </div>
          <ol className="mt-5 w-full space-y-2 rounded-lg border border-border bg-surface p-4 text-left text-sm text-muted-foreground">
            <li className="flex gap-2"><Step n={1} />Abra o WhatsApp no celular</li>
            <li className="flex gap-2"><Step n={2} />Toque em <b className="text-foreground">Aparelhos conectados</b></li>
            <li className="flex gap-2"><Step n={3} />Toque em <b className="text-foreground">Conectar aparelho</b> e aponte para o QR</li>
          </ol>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setStep("ready")}>
            Já escaneei
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* aparelho conectado */}
          <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-[color-mix(in_srgb,var(--success)_10%,transparent)] p-3">
            <div className="grid size-9 place-items-center rounded-full bg-success/20 text-success">
              <Smartphone className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Aparelho conectado</p>
              <p className="tnum text-xs text-soft-foreground">+55 11 99812-3344</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <Check className="size-3.5" /> online
            </span>
          </div>

          <div>
            <p className="eyebrow mb-1">Grupos e contatos</p>
            <p className="mb-3 text-xs text-soft-foreground">
              Escolha onde enviar relatórios e onde a IA pode responder perguntas sobre as métricas.
            </p>
            <div className="flex flex-col gap-2">
              {dests.map((d) => (
                <div key={d.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-center gap-2">
                    {d.type === "Grupo" ? <Users className="size-4 text-muted-foreground" /> : <MessageCircle className="size-4 text-success" />}
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{d.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-soft-foreground">{d.type}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Toggle on={d.reports} onClick={() => toggle(d.id, "reports")} icon={<FileText className="size-3.5" />} label="Relatórios" />
                    <Toggle on={d.ai} onClick={() => toggle(d.id, "ai")} icon={<Bot className="size-3.5" />} label="IA responde" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setStep("qr")}>
              <RefreshCw />
              Reconectar
            </Button>
            <Button onClick={finish}>Concluir</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Step({ n }: { n: number }) {
  return <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold text-foreground">{n}</span>;
}

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors",
        on ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-surface text-muted-foreground hover:border-border-strong"
      )}
    >
      <span className="flex items-center gap-1.5">{icon}{label}</span>
      <Switch checked={on} onCheckedChange={onClick} />
    </button>
  );
}
