import { redirect } from "next/navigation";

export default async function ClasesPage({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string; horario?: string }>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams({ tab: "clases" });
  if (params.curso) qs.set("curso", params.curso);
  if (params.horario) qs.set("horario", params.horario);
  redirect(`/dashboard?${qs.toString()}`);
}
