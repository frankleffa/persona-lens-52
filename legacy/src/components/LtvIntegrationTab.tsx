import { useRef, useState } from "react";
import { Copy, Check, Send, Loader2, Code, Link, KeyRound, Download, Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface LtvIntegrationTabProps {
  clientId: string;
  clientLabel: string;
}

const WEBHOOK_URL = `https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/ltv-webhook`;

function CopyBlock({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-muted/50 border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground break-all">
          {value}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 p-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          title="Copiar"
        >
          {copied ? <Check className="h-4 w-4 text-chart-positive" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}

const CODE_SNIPPET = (clientId: string) => `// Enviar evento de compra para o LTV
await fetch("${WEBHOOK_URL}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-webhook-secret": "SUA_CHAVE_SECRETA"
  },
  body: JSON.stringify({
    client_id: "${clientId}",
    event_name: "Purchase",
    email: usuario.email,
    name: usuario.nome,
    phone: usuario.telefone,
    value: valorCompra,
    utm_source: params.utm_source,
    utm_medium: params.utm_medium,
    utm_campaign: params.utm_campaign,
    utm_content: params.utm_content,
    fbclid: params.fbclid
  })
});`;

export default function LtvIntegrationTab({ clientId, clientLabel }: LtvIntegrationTabProps) {
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ processed: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/customer-template-xlsx`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token || ANON_KEY}`,
          "apikey": ANON_KEY,
        },
      });

      if (!response.ok) throw new Error(await response.text() || response.statusText);

      const blob = new Blob([await response.arrayBuffer()], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo_importacao_clientes.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Modelo baixado!", description: "Preencha o arquivo e importe de volta aqui." });
    } catch (e: any) {
      toast({ title: "Erro ao baixar modelo", description: e.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sessão expirada. Faça login novamente.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("client_id", clientId);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/import-customers-xlsx`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": ANON_KEY,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || response.statusText);

      setImportResult({ processed: result.processed, skipped: result.skipped, errors: result.errors ?? [] });
      toast({
        title: "Importação concluída",
        description: `${result.processed} evento(s) importado(s)${result.skipped > 0 ? `, ${result.skipped} ignorado(s)` : ""}.`,
      });
    } catch (e: any) {
      toast({ title: "Erro na importação", description: e.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopySnippet = async () => {
    await navigator.clipboard.writeText(CODE_SNIPPET(clientId));
    setSnippetCopied(true);
    setTimeout(() => setSnippetCopied(false), 2000);
  };

  const handleTestEvent = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ltv-test-event", {
        body: { client_id: clientId },
      });

      if (error) throw error;

      toast({
        title: "Evento de teste enviado!",
        description: `Um evento de compra fictício (R$ 1,00) foi registrado para ${clientLabel}. Acesse a aba Dashboard para verificar.`,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao enviar evento de teste",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instruções */}
      <div className="card-executive p-6 space-y-2">
        <h2 className="text-base font-semibold text-foreground">Como funciona</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Para calcular o LTV dos seus leads, o sistema do cliente precisa enviar um <strong>POST</strong> para o webhook 
          sempre que uma compra acontecer. Os dados de UTM e fbclid permitem atribuir a compra à campanha correta.
        </p>
      </div>

      {/* Webhook URL + Client ID */}
      <div className="card-executive p-6 space-y-5">
        <h2 className="text-base font-semibold text-foreground">Credenciais</h2>
        <CopyBlock
          label="Webhook URL"
          value={WEBHOOK_URL}
          icon={<Link className="h-4 w-4 text-muted-foreground" />}
        />
        <CopyBlock
          label="Client ID"
          value={clientId}
          icon={<KeyRound className="h-4 w-4 text-muted-foreground" />}
        />
        <p className="text-xs text-muted-foreground">
          O <code className="bg-muted px-1 rounded">x-webhook-secret</code> deve ser configurado pelo administrador e compartilhado com a equipe técnica do cliente de forma segura.
        </p>
      </div>

      {/* Snippet de código */}
      <div className="card-executive p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Snippet de Integração</h2>
          </div>
          <button
            onClick={handleCopySnippet}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          >
            {snippetCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-chart-positive" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </>
            )}
          </button>
        </div>
        <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre leading-relaxed">
          {CODE_SNIPPET(clientId)}
        </pre>
      </div>

      {/* Botão de teste */}
      <div className="card-executive p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Testar Integração</h2>
        <p className="text-sm text-muted-foreground">
          Envie um evento de compra fictício (R$ 1,00) para verificar se o webhook está funcionando corretamente para <strong>{clientLabel}</strong>.
        </p>
        <button
          onClick={handleTestEvent}
          disabled={testing}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Enviar Evento de Teste
            </>
          )}
        </button>
      </div>

      {/* Importar via Planilha */}
      <div className="card-executive p-6 space-y-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Importar via Planilha</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Baixe o modelo, preencha com os dados dos clientes e importe de volta. O formato da planilha é exatamente o mesmo gerado pelo sistema.
        </p>

        {/* Download template */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloadingTemplate}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
          >
            {downloadingTemplate ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloadingTemplate ? "Baixando..." : "Baixar Modelo (.xlsx)"}
          </button>

          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importing ? "Importando..." : "Importar Planilha"}
          </button>
        </div>

        {/* Columns reference */}
        <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Colunas esperadas</p>
          <div className="flex flex-wrap gap-1.5">
            {["email*", "name", "phone", "event_name*", "value*", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].map((col) => (
              <code key={col} className="text-xs bg-background border border-border rounded px-2 py-0.5 text-foreground">
                {col}
              </code>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">* obrigatório — <code className="bg-background border border-border rounded px-1">event_name</code> aceita: Purchase, FTD, Sale, Order</p>
        </div>

        {/* Import result */}
        {importResult && (
          <div className="rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-chart-positive font-semibold">{importResult.processed} importado(s)</span>
              {importResult.skipped > 0 && (
                <span className="text-muted-foreground">{importResult.skipped} ignorado(s)</span>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="space-y-1">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
