"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Store, Receipt, ShoppingBag, Package, Truck } from "lucide-react";

const tabs = [
  { href: "/snacks",             label: "Caja diaria",  icon: Store       },
  { href: "/snacks/ventas",      label: "Ventas",       icon: Receipt     },
  { href: "/snacks/compras",     label: "Compras",      icon: ShoppingBag },
  { href: "/snacks/almacen",     label: "Almacén",      icon: Package     },
  { href: "/snacks/proveedores", label: "Proveedores",  icon: Truck       },
];

export default function SnacksLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-0 h-full">
      <nav className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 px-4 pt-4 pb-0 bg-white dark:bg-zinc-950">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/snacks" ? pathname === "/snacks" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-md border-b-2 transition-colors duration-150 whitespace-nowrap",
                active
                  ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
