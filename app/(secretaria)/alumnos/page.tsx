import { redirect } from "next/navigation";

export default async function AlumnosPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const params = await searchParams;
  const query = params.nuevo === "true" ? "?tab=alumnos&nuevo=true" : "?tab=alumnos";
  redirect(`/matriculas${query}`);
}
