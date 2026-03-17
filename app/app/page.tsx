import { redirect } from "next/navigation";
import { getUserWorkspaces, requireUser } from "@/lib/auth/session";

export default async function AppEntryPage() {
  await requireUser();
  const memberships = await getUserWorkspaces();

  if (memberships.length === 0) {
    redirect("/login");
  }

  redirect(`/app/${memberships[0].workspace.slug}`);
}

