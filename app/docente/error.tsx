"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="rounded-full bg-red-50 p-5">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-zinc-900">Algo salió mal</h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          Ocurrió un error inesperado. Intenta recargar la página o vuelve más tarde.
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-400 font-mono">Código: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset} variant="outline">
        Intentar nuevamente
      </Button>
    </div>
  );
}
