import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className="lg:pl-60">
        <AppTopbar />
        <main className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
