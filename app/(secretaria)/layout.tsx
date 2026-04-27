import { Sidebar } from "@/components/sislider/Sidebar";
import { Toaster } from "@/components/ui/sonner";

export default function SecretariaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-100">
      <Sidebar />
      <main className="ml-56 flex-1 p-6">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
