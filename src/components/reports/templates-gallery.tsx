import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { templates } from "./data";

const thumbBars = [50, 70, 60, 85, 75];

export function TemplatesGallery() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((t) => (
        <Card key={t.id} className="flex flex-col overflow-hidden">
          {/* thumbnail estilizado */}
          <div className="border-b border-border bg-surface-2/40 p-4">
            <div className="rounded-md border border-border bg-surface p-3">
              <div className="mb-2 h-1.5 w-16 rounded-full bg-primary/70" />
              <div className="grid grid-cols-3 gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded bg-surface-2 py-1.5" />
                ))}
              </div>
              <div className="mt-2 flex h-10 items-end gap-1">
                {thumbBars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-primary" style={{ height: `${h}%`, opacity: 0.5 + h / 200 }} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <p className="font-medium text-foreground">{t.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {t.sections.slice(0, 3).map((s) => (
                <Badge key={s} variant="neutral">{s.replace(/ \(.*\)/, "")}</Badge>
              ))}
              {t.sections.length > 3 && <Badge variant="neutral">+{t.sections.length - 3}</Badge>}
            </div>
            <Link
              href={`/relatorios/editor?template=${t.id}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Usar modelo
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      ))}
    </section>
  );
}
