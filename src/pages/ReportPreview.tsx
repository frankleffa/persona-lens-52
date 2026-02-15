import { useParams } from "react-router-dom";

export default function ReportPreview() {
  const { reportId } = useParams<{ reportId: string }>();

  return (
    <main className="flex-1 overflow-auto p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-2">Preview do Relatório</h1>
      <p className="text-muted-foreground text-sm">ID: {reportId}</p>
      <p className="text-muted-foreground text-sm mt-4">Implementação do preview em breve.</p>
    </main>
  );
}
