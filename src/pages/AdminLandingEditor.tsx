import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Plus, Trash2 } from "lucide-react";

interface LandingContent {
  [key: string]: string | string[];
}

const fieldLabels: Record<string, string> = {
  hero_title: "Hero — Título",
  hero_subtitle: "Hero — Subtítulo",
  hero_cta: "Hero — Botão CTA",
  pain_title: "Bloco Dor — Título",
  pain_items: "Bloco Dor — Itens",
  pain_conclusion: "Bloco Dor — Conclusão",
  solution_title: "Solução — Título",
  solution_text: "Solução — Texto",
  benefits: "Benefícios — Lista",
  steps_title: "Como Funciona — Título",
  steps: "Como Funciona — Passos",
  plan_title: "Plano — Título",
  plan_price: "Plano — Preço",
  plan_features: "Plano — Features",
  plan_cta: "Plano — Botão",
  final_cta_title: "CTA Final — Título",
  final_cta_button: "CTA Final — Botão",
};

const fieldOrder = [
  "hero_title", "hero_subtitle", "hero_cta",
  "pain_title", "pain_items", "pain_conclusion",
  "solution_title", "solution_text",
  "benefits",
  "steps_title", "steps",
  "plan_title", "plan_price", "plan_features", "plan_cta",
  "final_cta_title", "final_cta_button",
];

export default function AdminLandingEditor() {
  const { session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [content, setContent] = useState<LandingContent | null>(null);
  const [rowId, setRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("landing_page_content")
      .select("id, content")
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          setRowId(data[0].id);
          setContent(data[0].content as unknown as LandingContent);
        }
      });
  }, []);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session || role !== "admin") {
    return <Navigate to="/" replace />;
  }

  if (!content) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const updateField = (key: string, value: string | string[]) => {
    setContent((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!rowId || !content) return;
    setSaving(true);
    const { error } = await supabase
      .from("landing_page_content")
      .update({ content: content as any, updated_at: new Date().toISOString() })
      .eq("id", rowId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Landing page atualizada!");
    }
  };

  const renderField = (key: string) => {
    const value = content[key];
    const label = fieldLabels[key] || key;

    if (Array.isArray(value)) {
      return (
        <div key={key} className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">{label}</label>
          {value.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const arr = [...value];
                  arr[i] = e.target.value;
                  updateField(key, arr);
                }}
                className="bg-secondary/50"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const arr = value.filter((_, idx) => idx !== i);
                  updateField(key, arr);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateField(key, [...value, ""])}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>
      );
    }

    const isLong = typeof value === "string" && (value.includes("\n") || value.length > 80);
    return (
      <div key={key} className="space-y-1">
        <label className="text-sm font-semibold text-muted-foreground">{label}</label>
        {isLong ? (
          <Textarea
            value={value as string}
            onChange={(e) => updateField(key, e.target.value)}
            rows={3}
            className="bg-secondary/50"
          />
        ) : (
          <Input
            value={value as string}
            onChange={(e) => updateField(key, e.target.value)}
            className="bg-secondary/50"
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Editar Landing Page</h1>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
        <div className="space-y-6">
          {fieldOrder.map(renderField)}
        </div>
      </div>
    </div>
  );
}
