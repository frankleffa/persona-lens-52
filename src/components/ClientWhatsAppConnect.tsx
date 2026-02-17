import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Smartphone, CheckCircle2, XCircle, Unplug } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Props {
  clientId: string;
  clientLabel: string;
}

export default function ClientWhatsAppConnect({ clientId, clientLabel }: Props) {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const callEvolution = useCallback(async (action: string, extra?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");
    const res = await fetch(`${SUPABASE_URL}/functions/v1/evolution-whatsapp`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, client_id: clientId, ...extra }),
    });
    return res.json();
  }, [clientId]);

  const checkStatus = useCallback(async () => {
    try {
      const data = await callEvolution("check-status");
      setStatus(data.connected ? "connected" : "disconnected");
      return data.connected;
    } catch {
      setStatus("disconnected");
      return false;
    }
  }, [callEvolution]);

  useEffect(() => {
    checkStatus();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [checkStatus]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      const connected = await checkStatus();
      if (connected) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        setQrModalOpen(false);
        setQrCode(null);
        toast.success(`WhatsApp de ${clientLabel} conectado!`);
      }
    }, 3000);
  }, [checkStatus, clientLabel]);

  const handleConnect = async () => {
    setQrLoading(true);
    setQrModalOpen(true);
    try {
      const data = await callEvolution("create-instance");
      if (data.already_connected) {
        setQrModalOpen(false);
        setStatus("connected");
        toast.success("WhatsApp já está conectado!");
        return;
      }
      if (data.qrcode) {
        setQrCode(data.qrcode);
        startPolling();
      } else {
        const qrData = await callEvolution("get-qrcode");
        if (qrData.qrcode) {
          setQrCode(qrData.qrcode);
          startPolling();
        } else {
          toast.error("Não foi possível gerar o QR Code.");
          setQrModalOpen(false);
        }
      }
    } catch {
      toast.error("Erro ao conectar WhatsApp");
      setQrModalOpen(false);
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await callEvolution("disconnect");
      setStatus("disconnected");
      toast.success("WhatsApp desconectado");
    } catch {
      toast.error("Erro ao desconectar");
    }
  };

  if (status === "loading") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  }

  return (
    <>
      {status === "connected" ? (
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Desconectar WhatsApp"
            onClick={handleDisconnect}
          >
            <Unplug className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-green-500"
          title="Conectar WhatsApp"
          onClick={handleConnect}
        >
          <Smartphone className="h-3.5 w-3.5" />
        </Button>
      )}

      <Dialog open={qrModalOpen} onOpenChange={(open) => {
        if (!open) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setQrModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-500" />
              WhatsApp — {clientLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrLoading && !qrCode ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : qrCode ? (
              <>
                <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 rounded-lg border" />
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Peça ao cliente para escanear este QR Code com o WhatsApp do celular dele.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Erro ao gerar QR Code</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
