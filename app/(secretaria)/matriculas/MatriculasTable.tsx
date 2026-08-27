"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlumnoMatriculaViewRow } from "@/lib/actions/matriculas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_CORTO = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function fmt(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${MESES_CORTO[m - 1]}. ${y}`;
}

function fmtIso(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MESES_CORTO[d.getMonth()]}. ${d.getFullYear()}`;
}

function grupoEstado(fi: string | null, ff: string | null) {
  if (!fi || !ff) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const [sy, sm, sd] = fi.split("-").map(Number);
  const [ey, em, ed] = ff.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end   = new Date(ey, em - 1, ed);
  if (hoy < start) return "proximo";
  if (hoy > end)   return "culminado";
  return "vigente";
}

function getActivas(a: AlumnoMatriculaViewRow) {
  return a.matriculas.filter((m) => {
    if (m.estado !== "activa") return false;
    const ge = grupoEstado(m.horario.fechaInicio, m.horario.fechaFin);
    return ge === "vigente" || ge === "proximo";
  });
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "activos",        label: "Activos"       },
  { id: "sin_matricula",  label: "Sin matrícula" },
  { id: "por_vencer",    label: "Por vencer"    },
  { id: "nuevas",        label: "Nuevas"        },
  { id: "dados_de_baja", label: "Dados de baja" },
  { id: "varios_cursos", label: "Varios cursos" },
] as const;
type TabId = (typeof TABS)[number]["id"];
type Sections = Record<TabId, AlumnoMatriculaViewRow[]>;

// ─── Shared pieces ────────────────────────────────────────────────────────────

function CursoPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0 text-[11px] font-medium text-zinc-600 whitespace-nowrap">
      {label}
    </span>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0", className)}>
      {children}
    </span>
  );
}

// ─── Row renderers ────────────────────────────────────────────────────────────

function RowActivos({ a }: { a: AlumnoMatriculaViewRow }) {
  const activas = getActivas(a);
  return (
    <>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{a.apellido}, {a.nombre}</p>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {activas.map((m) => (
            <CursoPill key={m.id} label={`${m.horario.curso.nombre} G${m.horario.numeroGrupo}`} />
          ))}
        </div>
      </div>
      {activas[0] && (
        <span className="text-xs font-mono text-zinc-400 shrink-0">
          {activas[0].horario.horaInicio}–{activas[0].horario.horaFin}
        </span>
      )}
    </>
  );
}

function RowSinMatricula({ a }: { a: AlumnoMatriculaViewRow }) {
  const last = a.matriculas[0];
  return (
    <>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{a.apellido}, {a.nombre}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {a.dni ? `DNI ${a.dni}` : "Sin DNI"}
          {last
            ? ` · Último: ${last.horario.curso.nombre} G${last.horario.numeroGrupo}`
            : " · Sin historial"}
        </p>
      </div>
      {last?.horario.fechaFin && (
        <span className="text-xs text-zinc-400 shrink-0">{fmt(last.horario.fechaFin)}</span>
      )}
    </>
  );
}

function RowPorVencer({ a }: { a: AlumnoMatriculaViewRow }) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const in30 = new Date(hoy); in30.setDate(hoy.getDate() + 30);

  const proxima = getActivas(a)
    .filter((m) => {
      if (!m.horario.fechaFin) return false;
      const [y, mo, d] = m.horario.fechaFin.split("-").map(Number);
      return new Date(y, mo - 1, d) <= in30;
    })
    .sort((x, y) => (x.horario.fechaFin ?? "").localeCompare(y.horario.fechaFin ?? ""))[0];

  if (!proxima) return null;

  const [y, mo, d] = proxima.horario.fechaFin!.split("-").map(Number);
  const dias = Math.ceil((new Date(y, mo - 1, d).getTime() - hoy.getTime()) / 86400000);

  return (
    <>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{a.apellido}, {a.nombre}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {proxima.horario.curso.nombre} G{proxima.horario.numeroGrupo} · termina {fmt(proxima.horario.fechaFin!)}
        </p>
      </div>
      <Badge className={
        dias <= 7  ? "bg-red-50 text-red-600"
        : dias <= 14 ? "bg-amber-50 text-amber-600"
        : "bg-zinc-100 text-zinc-500"
      }>
        {dias === 0 ? "hoy" : `${dias}d`}
      </Badge>
    </>
  );
}

function RowNuevas({ a }: { a: AlumnoMatriculaViewRow }) {
  const now = new Date();
  const nueva = a.matriculas.find((m) => {
    const ca = new Date(m.createdAt);
    return ca.getFullYear() === now.getFullYear() && ca.getMonth() === now.getMonth();
  });
  if (!nueva) return null;
  return (
    <>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{a.apellido}, {a.nombre}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {nueva.horario.curso.nombre} G{nueva.horario.numeroGrupo} · {fmtIso(nueva.createdAt)}
        </p>
      </div>
      <Badge className="bg-emerald-50 text-emerald-600">nuevo</Badge>
    </>
  );
}

function RowDadosDeBaja({ a }: { a: AlumnoMatriculaViewRow }) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hace30 = new Date(hoy); hace30.setDate(hoy.getDate() - 30);

  const baja = a.matriculas.find((m) => {
    if (m.estado !== "inactiva" || !m.fechaFin) return false;
    const [y, mo, d] = m.fechaFin.split("-").map(Number);
    return new Date(y, mo - 1, d) >= hace30;
  });
  if (!baja) return null;
  return (
    <>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{a.apellido}, {a.nombre}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {baja.horario.curso.nombre} G{baja.horario.numeroGrupo}
          {baja.fechaFin ? ` · baja ${fmt(baja.fechaFin)}` : ""}
        </p>
      </div>
      <Badge className="bg-red-50 text-red-500">baja</Badge>
    </>
  );
}

function RowVariosCursos({ a }: { a: AlumnoMatriculaViewRow }) {
  const activas = getActivas(a);
  const total = activas.reduce((s, m) => s + m.precioFinalMensual, 0);
  return (
    <>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-800">{a.apellido}, {a.nombre}</p>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {activas.map((m) => (
            <CursoPill key={m.id} label={`${m.horario.curso.nombre} G${m.horario.numeroGrupo}`} />
          ))}
        </div>
      </div>
      <span className="text-xs font-mono font-semibold text-zinc-700 shrink-0">
        S/{total.toFixed(2)}/mes
      </span>
    </>
  );
}

function AlumnoRow({ a, tab, onClick }: { a: AlumnoMatriculaViewRow; tab: TabId; onClick: () => void }) {
  const content = (() => {
    switch (tab) {
      case "activos":        return <RowActivos a={a} />;
      case "sin_matricula":  return <RowSinMatricula a={a} />;
      case "por_vencer":    return <RowPorVencer a={a} />;
      case "nuevas":        return <RowNuevas a={a} />;
      case "dados_de_baja": return <RowDadosDeBaja a={a} />;
      case "varios_cursos": return <RowVariosCursos a={a} />;
    }
  })();

  if (!content) return null;

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 border-b border-zinc-100 last:border-0 cursor-pointer hover:bg-zinc-50/70 transition-colors"
      onClick={onClick}
    >
      {content}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MatriculasTable({ alumnos }: { alumnos: AlumnoMatriculaViewRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("activos");
  const [search, setSearch] = useState("");

  const sections = useMemo((): Sections => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const in30 = new Date(hoy); in30.setDate(hoy.getDate() + 30);
    const hace30 = new Date(hoy); hace30.setDate(hoy.getDate() - 30);
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();

    const activos = alumnos.filter((a) => getActivas(a).length > 0);

    return {
      activos,
      sin_matricula: alumnos.filter((a) => getActivas(a).length === 0),
      por_vencer: activos.filter((a) =>
        getActivas(a).some((m) => {
          if (!m.horario.fechaFin) return false;
          const [y, mo, d] = m.horario.fechaFin.split("-").map(Number);
          return new Date(y, mo - 1, d) <= in30;
        })
      ),
      nuevas: alumnos.filter((a) =>
        a.matriculas.some((m) => {
          const ca = new Date(m.createdAt);
          return ca.getFullYear() === thisYear && ca.getMonth() === thisMonth;
        })
      ),
      dados_de_baja: alumnos.filter((a) =>
        a.matriculas.some((m) => {
          if (m.estado !== "inactiva" || !m.fechaFin) return false;
          const [y, mo, d] = m.fechaFin.split("-").map(Number);
          return new Date(y, mo - 1, d) >= hace30;
        })
      ),
      varios_cursos: activos.filter((a) => getActivas(a).length >= 2),
    };
  }, [alumnos]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, sections[t.id].length])) as Record<TabId, number>,
    [sections]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sections[tab];
    if (!q) return list;
    return list.filter(
      (a) =>
        `${a.apellido} ${a.nombre}`.toLowerCase().includes(q) ||
        (a.dni ?? "").includes(q)
    );
  }, [sections, tab, search]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Matrículas</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {counts.activos} alumno{counts.activos !== 1 ? "s" : ""} con matrícula activa
          </p>
        </div>
        <Button onClick={() => router.push("/matriculas/nueva")} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nueva matrícula
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-zinc-100 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setSearch(""); }}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0",
                tab === t.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-700"
              )}
            >
              {t.label}
              {counts[t.id] > 0 && (
                <span className={cn(
                  "text-[11px] font-semibold rounded-full px-1.5 min-w-[18px] text-center",
                  tab === t.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"
                )}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 border-b border-zinc-100">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            <Input
              placeholder="Buscar nombre o DNI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-zinc-50 border-zinc-200"
            />
          </div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <Users className="h-6 w-6 text-zinc-300" />
            <p className="text-sm text-zinc-400">
              {search ? "Sin resultados" : "No hay alumnos en esta categoría"}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((a) => (
              <AlumnoRow
                key={a.id}
                a={a}
                tab={tab}
                onClick={() => router.push(`/alumnos/${a.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
