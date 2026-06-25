import { Suspense } from "react";
import { ReportEditor } from "@/components/reports/report-editor";

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando editor…</div>}>
      <ReportEditor />
    </Suspense>
  );
}
