"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CheckSquare,
  BookOpen,
  GraduationCap,
  CreditCard,
  LogOut,
  CalendarDays,
  UserCheck,
  DoorOpen,
} from "lucide-react";

const navGroups = [
  {
    label: "Académico",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/alumnos", label: "Alumnos", icon: Users },
      { href: "/docentes", label: "Docentes", icon: UserCheck },
      { href: "/cursos", label: "Cursos", icon: GraduationCap },
      { href: "/aulas", label: "Aulas", icon: DoorOpen },
      { href: "/horarios", label: "Horarios", icon: CalendarDays },
      { href: "/matriculas", label: "Matrículas", icon: ClipboardList },
      { href: "/asistencias", label: "Asistencias", icon: CheckSquare },
      { href: "/clases", label: "Clases", icon: BookOpen },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/pagos", label: "Pagos", icon: CreditCard },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col bg-zinc-950 text-zinc-100 fixed left-0 top-0 z-40">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-800">
        <span className="text-lg font-bold tracking-tight text-white">SisLider</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-800 px-3 py-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
