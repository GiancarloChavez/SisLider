import {
  getAusenciasSinRecuperacion,
  getRecuperaciones,
  getHorariosParaRecuperacion,
} from "@/lib/actions/recuperaciones";
import { RecuperacionesView } from "./RecuperacionesView";

export const dynamic = "force-dynamic";

export default async function RecuperacionesPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;

  const [ausencias, recuperaciones, horarios] = await Promise.all([
    getAusenciasSinRecuperacion(),
    getRecuperaciones(),
    getHorariosParaRecuperacion(),
  ]);

  return (
    <RecuperacionesView
      ausencias={ausencias}
      recuperaciones={recuperaciones}
      horarios={horarios}
    />
  );
}
