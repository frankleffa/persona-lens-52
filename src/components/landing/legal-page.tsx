import { PublicHeader, PublicFooter } from "./public-chrome";

export type LegalSection = { h: string; p: string };

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <p className="eyebrow">Legal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-soft-foreground">Última atualização: {updated}</p>

        <div className="mt-10 flex flex-col gap-8">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-medium text-foreground">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
