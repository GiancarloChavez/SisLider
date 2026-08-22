import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/lib/actions/auth";
import { Toaster } from "@/components/ui/sonner";

export default async function DocenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.rol !== "docente") {
    redirect("/login");
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-50">
        {/* Top navigation bar */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-950 h-14 flex items-center px-6 gap-6 shadow-md">
          <span className="font-bold text-white text-base tracking-tight">SisLider</span>
          <span className="text-zinc-700 select-none">·</span>
          <nav className="flex gap-1">
            <Link
              href="/docente/perfil"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Mi perfil
            </Link>
            <Link
              href="/docente/asistencia"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Asistencias
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-zinc-400 hidden sm:block">
              {session.user.name}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-zinc-800"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        <main className="pt-14 px-6 py-8 max-w-5xl mx-auto">
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </>
  );
}
