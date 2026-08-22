import { redirect } from "next/navigation";

export default function HorariosPage() {
  redirect("/cursos?tab=horarios");
}
