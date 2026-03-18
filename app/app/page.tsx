import { redirect } from "next/navigation";
import { resolveAuthenticatedHomeRoute } from "@/lib/auth/session";

export default async function AppEntryPage() {
  redirect(await resolveAuthenticatedHomeRoute());
}
