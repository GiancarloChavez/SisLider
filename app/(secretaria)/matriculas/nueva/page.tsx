import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getMatriculaFormData } from "@/lib/actions/matriculas";
import { NuevaMatriculaForm } from "./NuevaMatriculaForm";

export default async function NuevaMatriculaPage() {
  const { horarios, descuentos } = await getMatriculaFormData();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/matriculas"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 mb-3 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a matrículas
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Nueva matrícula</h1>
        <p className="text-sm text-zinc-500">Busca el alumno, elige el horario y confirma.</p>
      </div>

      <NuevaMatriculaForm horarios={horarios} descuentos={descuentos} />
    </div>
  );
}
