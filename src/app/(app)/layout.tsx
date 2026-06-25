import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#conteudo"
        className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]"
      >
        Pular para o conteúdo
      </a>
      <AppSidebar />
      <div className="lg:pl-60">
        <AppTopbar />
        <main id="conteudo" className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
