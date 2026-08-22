import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDocentePerfil } from "@/lib/actions/docentes";
import { PerfilDocenteView } from "./PerfilDocenteView";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await auth();
  const docenteId = session?.user?.docenteId;

  if (!docenteId) redirect("/login");

  const perfil = await getDocentePerfil(docenteId);
  if (!perfil) redirect("/login");

  return <PerfilDocenteView perfil={perfil} />;
}
