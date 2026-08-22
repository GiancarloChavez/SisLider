"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Check, RefreshCw } from "lucide-react";
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
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    startTransition(async () => {
      const result = await regenerarPasswordDocente(docente.id);
      if ("password" in result) {
        setNewPassword(result.password);
        toast.success("Contraseña regenerada");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleClose() {
    setNewPassword(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Credenciales — {docente.apellido}, {docente.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500 uppercase tracking-wide">Correo de acceso</Label>
            <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
              <span className="font-mono text-sm text-zinc-800 flex-1 select-all break-all">
                {docente.email ?? "Sin cuenta"}
              </span>
              {docente.email && <CopyButton value={docente.email} />}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zinc-500 uppercase tracking-wide">Contraseña</Label>
            {newPassword ? (
              <div className="flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                <span className="font-mono text-sm font-semibold text-emerald-800 flex-1 select-all tracking-widest">
                  {newPassword}
                </span>
                <CopyButton value={newPassword} />
              </div>
            ) : (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                <span className="text-sm text-zinc-400 italic">
                  Contraseña oculta — regenera para obtener una nueva
                </span>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleReset}
            disabled={isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Regenerando..." : "Regenerar contraseña"}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
