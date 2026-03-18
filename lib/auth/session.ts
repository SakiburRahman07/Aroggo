import { redirect } from "next/navigation";
import { db } from "@/lib/db/prisma";
import { getAnyAuthSession, getPortalAuthSession, getStaffAuthSession } from "@/lib/auth/options";
import { getDefaultDashboardRoute } from "@/lib/security/navigation";
import { hasRequestedPermission, type PermissionRequest } from "@/lib/security/permissions";

export async function requireUser() {
  const session = await getStaffAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user;
}

export async function requirePortalUser() {
  const session = await getPortalAuthSession();

  if (!session?.user?.id) {
    redirect("/portal/login");
  }

  return session.user;
}

export async function getUserWorkspaces() {
  const session = await getStaffAuthSession();

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
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });
}

export async function resolveAuthenticatedHomeRoute() {
  const authSession = await getAnyAuthSession();

  if (!authSession?.session.user?.id) {
    return "/login";
  }

  const userId = authSession.session.user.id;

  if (authSession.surface === "staff") {
    const memberships = await db.membership.findMany({
      where: {
        userId,
        status: "ACTIVE"
      },
      include: {
        workspace: true
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    });

    if (memberships.length > 0) {
      const preferredMembership = memberships.find((membership) => membership.role === "SUPER_ADMIN") ?? memberships[0];
      return getDefaultDashboardRoute(preferredMembership.role, preferredMembership.workspace.slug);
    }
  }

  const portalAccount = await db.patientPortalAccount.findFirst({
    where: {
      userId,
      portalEnabled: true
    }
  });

  if (portalAccount) {
    return "/portal";
  }

  return authSession.surface === "portal" ? "/portal/login" : "/login";
}

export async function requirePlatformAdmin() {
  const user = await requireUser();
  const membership = await db.membership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: "SUPER_ADMIN"
    },
    include: {
      workspace: true,
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!membership) {
    redirect(await resolveAuthenticatedHomeRoute());
  }

  return {
    user,
    membership
  };
}

export async function requireWorkspaceContext(workspaceSlug: string, permission?: PermissionRequest) {
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
    redirect(await resolveAuthenticatedHomeRoute());
  }

  if (permission && !hasRequestedPermission(membership.role, permission)) {
    redirect(getDefaultDashboardRoute(membership.role, workspaceSlug));
  }

  return {
    user,
    workspace: membership.workspace,
    membership,
    viewer: {
      role: membership.role,
      userId: membership.userId
    }
  };
}

export async function requirePatientPortalContext() {
  const user = await requirePortalUser();
  const portalAccount = await db.patientPortalAccount.findFirst({
    where: {
      userId: user.id,
      portalEnabled: true
    },
    include: {
      workspace: true,
      patient: true,
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!portalAccount) {
    redirect("/portal/login?error=account");
  }

  await db.patientPortalAccount.update({
    where: { id: portalAccount.id },
    data: {
      lastLoginAt: new Date()
    }
  });

  return {
    user,
    workspace: portalAccount.workspace,
    patient: portalAccount.patient,
    portalAccount
  };
}
