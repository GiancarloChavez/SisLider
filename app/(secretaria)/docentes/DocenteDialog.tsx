"use client";

import { useEffect, useActionState, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createDocente, updateDocente,
  type DocenteFormState, type DocenteSerialized,
} from "@/lib/actions/docentes";

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copiar"
      className="ml-2 p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Credentials panel (shown after create) ───────────────────────────────────

function CredencialesPanel({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
        <KeyRound className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Docente creado exitosamente</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Entrega estas credenciales al docente. La contraseña no se mostrará nuevamente.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500 uppercase tracking-wide">Correo de acceso</Label>
          <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
            <span className="font-mono text-sm text-zinc-800 flex-1 select-all">{email}</span>
            <CopyButton value={email} />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-zinc-500 uppercase tracking-wide">Contraseña</Label>
          <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
            <span className="font-mono text-sm font-semibold text-zinc-800 flex-1 select-all tracking-widest">
              {password}
            </span>
            <CopyButton value={password} />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Entendido</Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

type DniStatus = 'idle' | 'loading' | 'found' | 'not_found';

type Props = {
  open: boolean;
  onClose: () => void;
  docente?: DocenteSerialized | null;
};

const initialState: DocenteFormState = {};

export function DocenteDialog({ open, onClose, docente }: Props) {
  const action = docente ? updateDocente.bind(null, docente.id) : createDocente;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [handled, setHandled] = useState(false);

  // DNI lookup state (only for new docente)
  const [dniVal,      setDniVal]      = useState("");
  const [nombreVal,   setNombreVal]   = useState(docente?.nombre  ?? "");
  const [apellidoVal, setApellidoVal] = useState(docente?.apellido ?? "");
  const [dniStatus,   setDniStatus]   = useState<DniStatus>('idle');

  // Reset on open
  useEffect(() => {
    if (!open) return;
    if (!docente) {
      setDniVal(""); setNombreVal(""); setApellidoVal("");
      setDniStatus('idle');
    } else {
      setNombreVal(docente.nombre);
      setApellidoVal(docente.apellido);
    }
    setHandled(false);
  }, [open, docente]);

  // RENIEC lookup
  useEffect(() => {
    if (!/^\d{8}$/.test(dniVal)) { setDniStatus('idle'); return; }
    let cancelled = false;
    setDniStatus('loading');

    fetch(`/api/dni/${dniVal}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.ok) {
          const data = await r.json();
          if (!cancelled) {
            if (data?.nombre) {
              setNombreVal(data.nombre);
              setApellidoVal(data.apellido);
              setDniStatus('found');
            } else {
              setDniStatus('not_found');
            }
          }
        } else if (!cancelled) {
          setDniStatus('not_found');
        }
      })
      .catch(() => { if (!cancelled) setDniStatus('not_found'); });

    return () => { cancelled = true; };
  }, [dniVal]);

  // Close on update success
  useEffect(() => {
    if (state.message === "ok" && !handled) {
      setHandled(true);
      toast.success("Docente actualizado");
      onClose();
    }
  }, [state.message, handled, onClose]);

  const e = state.errors ?? {};

  // nombre/apellido son readonly cuando es nuevo docente y el DNI no falló en RENIEC
  const camposReadOnly = !docente && dniStatus !== 'not_found';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state.message === "credentials"
              ? "Credenciales de acceso"
              : docente ? "Editar docente" : "Nuevo docente"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Credentials panel after creation ── */}
        {state.message === "credentials" && state.credentials ? (
          <CredencialesPanel
            email={state.credentials.email}
            password={state.credentials.password}
            onClose={onClose}
          />
        ) : (
          <form action={formAction} className="space-y-4">

            {/* DNI — only for new docente */}
            {!docente && (
              <div className="space-y-1">
                <Label htmlFor="dni">DNI *</Label>
                <div className="relative">
                  <Input
                    id="dni"
                    name="dni"
                    value={dniVal}
                    onChange={(ev) => {
                      setDniVal(ev.target.value);
                      setDniStatus('idle');
                      setNombreVal("");
                      setApellidoVal("");
                    }}
                    placeholder="12345678"
                    maxLength={8}
                    inputMode="numeric"
                  />
                  {dniStatus === 'loading' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 animate-pulse">
                      buscando...
                    </span>
                  )}
                  {dniStatus === 'found' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-semibold">
                      ✓ RENIEC
                    </span>
                  )}
                  {dniStatus === 'not_found' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-red-500 font-semibold">
                      ✗
                    </span>
                  )}
                </div>
                {dniStatus === 'not_found' && (
                  <p className="text-xs text-amber-600">
                    No encontrado en RENIEC. Ingresa el nombre manualmente.
                  </p>
                )}
                {e.dni && <p className="text-xs text-destructive">{e.dni[0]}</p>}
              </div>
            )}

            {/* DNI read-only badge when editing */}
            {docente?.dni && (
              <div className="flex items-center gap-2 rounded-md bg-zinc-50 border border-zinc-200 px-3 py-2">
                <span className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">DNI</span>
                <span className="font-mono text-sm text-zinc-700">{docente.dni}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={nombreVal}
                  onChange={(ev) => setNombreVal(ev.target.value)}
                  readOnly={camposReadOnly}
                  className={cn(camposReadOnly && "bg-zinc-50 text-zinc-600 cursor-default")}
                  placeholder="Carlos"
                />
                {e.nombre && <p className="text-xs text-destructive">{e.nombre[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input
                  id="apellido"
                  name="apellido"
                  value={apellidoVal}
                  onChange={(ev) => setApellidoVal(ev.target.value)}
                  readOnly={camposReadOnly}
                  className={cn(camposReadOnly && "bg-zinc-50 text-zinc-600 cursor-default")}
                  placeholder="García"
                />
                {e.apellido && <p className="text-xs text-destructive">{e.apellido[0]}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                name="celular"
                defaultValue={docente?.celular ?? ""}
                placeholder="987654321"
              />
              {e.celular && <p className="text-xs text-destructive">{e.celular[0]}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
