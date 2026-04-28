"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { useState, useRef, useEffect } from "react";
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
  Pin,
  PinOff,
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
    ],
  },
  {
    label: "Finanzas",
    items: [{ href: "/pagos", label: "Pagos", icon: CreditCard }],
  },
];

interface SidebarProps {
  isPinned: boolean;
  onTogglePin: () => void;
}

export function Sidebar({ isPinned, onTogglePin }: SidebarProps) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isExpanded = isPinned || isHovered;

  useEffect(() => {
    return () => { if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current); };
  }, []);

  function handleMouseEnter() {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setIsHovered(true);
  }

  function handleMouseLeave() {
    leaveTimerRef.current = setTimeout(() => setIsHovered(false), 200);
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-zinc-950 text-zinc-100 fixed left-0 top-0 z-40",
        "transition-[width] duration-200 ease-out overflow-hidden",
        isExpanded ? "w-56" : "w-14",
        !isPinned && isHovered && "shadow-2xl shadow-black/60",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex h-[60px] shrink-0 items-center gap-2 border-b border-zinc-800 px-3">
        <span
          className={cn(
            "flex-1 whitespace-nowrap overflow-hidden text-lg font-bold tracking-tight text-white",
            "transition-[opacity,max-width] duration-150",
            isExpanded ? "opacity-100 max-w-[160px] ml-1 delay-75" : "opacity-0 max-w-0 delay-0",
          )}
        >
          SisLider
        </span>
        <button
          onClick={onTogglePin}
          title={isPinned ? "Desanclar" : "Anclar"}
          aria-label={isPinned ? "Desanclar sidebar" : "Anclar sidebar"}
          className={cn(
            "shrink-0 rounded-md p-1.5 transition-all duration-150",
            "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800",
            isExpanded ? "opacity-100 delay-75" : "opacity-0 pointer-events-none delay-0",
          )}
        >
          {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div
              className={cn(
                "mb-1 overflow-hidden transition-opacity duration-150",
                isExpanded ? "opacity-100 delay-75" : "opacity-0 delay-0",
              )}
            >
              <p className="px-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {group.label}
              </p>
            </div>

            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                        "transition-colors duration-150",
                        active
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span
                        className={cn(
                          "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-150",
                          isExpanded
                            ? "opacity-100 max-w-[160px] delay-75"
                            : "opacity-0 max-w-0 delay-0",
                        )}
                      >
                        {label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="shrink-0 border-t border-zinc-800 px-2 py-3">
        <form action={logout}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors duration-150",
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-150",
                isExpanded ? "opacity-100 max-w-[160px] delay-75" : "opacity-0 max-w-0 delay-0",
              )}
            >
              Cerrar sesión
            </span>
          </button>
        </form>
      </div>
    </aside>
  );
}
