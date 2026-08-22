"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Check, RefreshCw, UserPlus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { regenerarPasswordDocente, type DocenteSerialized } from "@/lib/actions/docentes";

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

type Props = {
  open: boolean;
  onClose: () => void;
  docente: DocenteSerialized;
};

export function CredencialesDialog({ open, onClose, docente }: Props) {
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasAccount = !!docente.email;

  function handleAction() {
    startTransition(async () => {
      const res = await regenerarPasswordDocente(docente.id);
      if ("password" in res) {
        setResult(res);
        toast.success(hasAccount ? "Contraseña regenerada" : "Cuenta creada exitosamente");
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleClose() {
    setResult(null);
    onClose();
  }

  const displayEmail = result?.email ?? docente.email;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {hasAccount ? "Credenciales" : "Crear cuenta"} — {docente.apellido}, {docente.nombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* No account warning */}
          {!hasAccount && !result && (
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <KeyRound className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Este docente aún no tiene cuenta de acceso. Crea una para que pueda iniciar sesión.
              </p>
            </div>
          )}

          {/* Success banner after action */}
          {result && (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <KeyRound className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 font-medium">
                {hasAccount ? "Contraseña actualizada." : "Cuenta creada."}{" "}
                Entrega estas credenciales al docente.
              </p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500 uppercase tracking-wide">Correo de acceso</Label>
            <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
              {displayEmail ? (
                <>
                  <span className="font-mono text-sm text-zinc-800 flex-1 select-all break-all">
                    {displayEmail}
                  </span>
                  <CopyButton value={displayEmail} />
                </>
              ) : (
                <span className="text-sm text-zinc-400 italic">Sin cuenta asignada</span>
              )}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500 uppercase tracking-wide">Contraseña</Label>
            {result?.password ? (
              <div className="flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                <span className="font-mono text-sm font-semibold text-emerald-800 flex-1 select-all tracking-widest">
                  {result.password}
                </span>
                <CopyButton value={result.password} />
              </div>
            ) : (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                <span className="text-sm text-zinc-400 italic">
                  {hasAccount
                    ? "Contraseña oculta — regenera para obtener una nueva"
                    : "Se generará al crear la cuenta"}
                </span>
              </div>
            )}
          </div>

          {/* Action button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleAction}
            disabled={isPending}
          >
            {hasAccount ? (
              <>
                <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                {isPending ? "Regenerando..." : "Regenerar contraseña"}
              </>
            ) : (
              <>
                <UserPlus className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                {isPending ? "Creando cuenta..." : "Crear cuenta de acceso"}
              </>
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
