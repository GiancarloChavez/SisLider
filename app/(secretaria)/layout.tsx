import { SidebarLayout } from "@/components/sislider/SidebarLayout";
import { PageTransition } from "@/components/sislider/PageTransition";
import { Toaster } from "@/components/ui/sonner";

export default function SecretariaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SidebarLayout>
        <PageTransition>{children}</PageTransition>
      </SidebarLayout>
      <Toaster richColors position="top-right" />
    </>
  );
}
