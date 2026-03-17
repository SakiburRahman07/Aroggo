import { redirect } from "next/navigation";
import { requireUser, resolveAuthenticatedHomeRoute } from "@/lib/auth/session";

export default async function AppEntryPage() {
  await requireUser();
  redirect(await resolveAuthenticatedHomeRoute());
}