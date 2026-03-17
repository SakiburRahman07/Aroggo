import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { getAuthSession } from "@/lib/auth/options";
import { hasPermission, type Permission } from "@/lib/security/permissions";

export async function requireUser() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}

export async function getUserWorkspaces() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return [];
  }

  return db.membership.findMany({
    where: {
      userId: session.user.id,
      status: "ACTIVE"
    },
    include: {
      workspace: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

export async function requireWorkspaceContext(workspaceSlug: string, permission?: Permission) {
  const user = await requireUser();
  const membership = await db.membership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      workspace: {
        slug: workspaceSlug
      }
    },
    include: {
      workspace: true,
      department: true,
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!membership) {
    const memberships = await getUserWorkspaces();

    if (memberships.length > 0) {
      redirect(`/app/${memberships[0].workspace.slug}`);
    }

    redirect("/login");
  }

  if (permission && !hasPermission(membership.role, permission)) {
    redirect(`/app/${workspaceSlug}`);
  }

  return {
    user,
    workspace: membership.workspace,
    membership
  };
}

