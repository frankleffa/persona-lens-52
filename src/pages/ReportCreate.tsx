import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ArrowUp, ArrowDown, FileText, StickyNote, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionItem {
  key: string;
  label: string;
  enabled: boolean;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  layout_type: string;
  default_sections: Record<string, boolean>;
}

const SECTION_LABELS: Record<string, string> = {
  show_summary: "Resumo",
  show_campaign_table: "Tabela de Campanhas",
  show_comparison: "Comparativo",
  show_top_campaigns: "Top Campanhas",
  show_notes: "Notas Importantes",
  show_recommendations: "Recomendações",
};

export default function ReportCreate() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [periodStart, setPeriodStart] = useState<Date>();
  const [periodEnd, setPeriodEnd] = useState<Date>();
  const [customTitle, setCustomTitle] = useState("");
  const [customSubtitle, setCustomSubtitle] = useState("");
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [notes, setNotes] = useState("");
  const [defaultNotes, setDefaultNotes] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Load templates
  useEffect(() => {
    async function fetchTemplates() {
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .order("name");
      if (!error && data) {
        setTemplates(data as ReportTemplate[]);
      }
      setLoadingTemplates(false);
    }
    fetchTemplates();
  }, []);

  // Load client default notes
  useEffect(() => {
    if (!clientId) return;
    async function fetchSettings() {
      const { data } = await supabase
        .from("client_report_settings")
        .select("default_notes")
        .eq("client_id", clientId!)
        .maybeSingle();
      if (data?.default_notes) {
        setDefaultNotes(data.default_notes);
      }
    }
    fetchSettings();
  }, [clientId]);

  // When template changes, load its sections
  useEffect(() => {
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) {
      setSections([]);
      return;
    }
    const secs = Object.entries(template.default_sections).map(([key, enabled]) => ({
      key,
      label: SECTION_LABELS[key] || key,
      enabled: Boolean(enabled),
    }));
    setSections(secs);
  }, [selectedTemplateId, templates]);

  function moveSection(index: number, direction: "up" | "down") {
    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setSections(newSections);
  }

  function toggleSection(index: number) {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], enabled: !newSections[index].enabled };
    setSections(newSections);
  }

  async function handleGenerate() {
    if (!clientId) {
      toast({ title: "Erro", description: "Cliente não identificado.", variant: "destructive" });
      return;
    }
    if (!periodStart || !periodEnd) {
      toast({ title: "Erro", description: "Selecione o período.", variant: "destructive" });
      return;
    }
    if (periodEnd < periodStart) {
      toast({ title: "Erro", description: "Data final deve ser após a inicial.", variant: "destructive" });
      return;
    }
    if (!selectedTemplateId) {
      toast({ title: "Erro", description: "Selecione um template.", variant: "destructive" });
      return;
    }

    setSaving(true);

    const enabledSections = sections.filter((s) => s.enabled).map((s) => s.key);
    const snapshot = {
      sections: enabledSections,
      order: sections.map((s) => s.key),
      custom_title: customTitle,
      custom_subtitle: customSubtitle,
      template_id: selectedTemplateId,
    };

    const { data, error } = await supabase
      .from("report_instances")
      .insert({
        client_id: clientId,
        period_start: format(periodStart, "yyyy-MM-dd"),
        period_end: format(periodEnd, "yyyy-MM-dd"),
        template_id: selectedTemplateId,
        sections_snapshot: snapshot,
        notes: notes || null,
        sent: false,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao gerar relatório", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Relatório gerado!", description: "Redirecionando para o preview..." });
    navigate(`/reports/${data.id}/preview`);
  }

  if (!clientId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-auto pt-16 lg:pt-6 lg:ml-64 p-4 sm:p-6 lg:px-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Novo Relatório</h1>
        <p className="text-muted-foreground text-sm">Configure e gere um relatório para o cliente.</p>
      </div>

      {/* BLOCO 1 – Configuração Inicial */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Configuração Inicial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Period Start */}
            <div className="space-y-2">
              <Label>Início do Período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodStart && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodStart ? format(periodStart, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={periodStart} onSelect={setPeriodStart} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Period End */}
            <div className="space-y-2">
              <Label>Fim do Período</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodEnd && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodEnd ? format(periodEnd, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={periodEnd} onSelect={setPeriodEnd} locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingTemplates ? "Carregando..." : "Selecione um template"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} — {t.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título personalizado</Label>
              <Input placeholder="Ex: Relatório Mensal - Janeiro" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input placeholder="Ex: Performance de Campanhas" value={customSubtitle} onChange={(e) => setCustomSubtitle(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2 – Editor de Estrutura */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Estrutura do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Selecione um template para configurar as seções.</p>
          ) : (
            <div className="space-y-2">
              {sections.map((section, idx) => (
                <div key={section.key} className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={section.enabled} onCheckedChange={() => toggleSection(idx)} />
                    <span className={cn("text-sm font-medium", !section.enabled && "text-muted-foreground line-through")}>
                      {section.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(idx, "up")} disabled={idx === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(idx, "down")} disabled={idx === sections.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOCO 3 – Notas */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-4 w-4 text-primary" />
            Notas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Escreva notas para incluir no relatório..."
            className="min-h-[120px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {defaultNotes && (
            <Button variant="outline" size="sm" onClick={() => setNotes(defaultNotes)}>
              Usar nota padrão do cliente
            </Button>
          )}
        </CardContent>
      </Card>

      {/* BLOCO 4 – Ações */}
      <div className="flex justify-end pb-8">
        <Button size="lg" onClick={handleGenerate} disabled={saving || !selectedTemplateId || !periodStart || !periodEnd}>
          <Sparkles className="mr-2 h-4 w-4" />
          {saving ? "Gerando..." : "Gerar Relatório"}
        </Button>
      </div>
    </main>
  );
}
