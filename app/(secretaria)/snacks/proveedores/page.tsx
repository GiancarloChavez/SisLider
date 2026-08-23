import { getProveedores } from "@/lib/actions/snack-proveedores";
import { ProveedoresTable } from "./ProveedoresTable";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  const proveedores = await getProveedores();
  return <ProveedoresTable proveedores={proveedores} />;
}
