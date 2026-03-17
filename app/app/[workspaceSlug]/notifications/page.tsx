import { markAllNotificationsReadAction } from "@/features/notifications/actions";
import { listNotifications } from "@/features/notifications/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatRelativeTime } from "@/lib/utils";

export default async function NotificationsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "notifications:read");
  const notifications = await listNotifications(workspace.id, membership.userId);
  const markAllRead = markAllNotificationsReadAction.bind(null, workspaceSlug);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Notifications"
        title="Signals that need attention"
        description="Keep staff informed about tasks, documents, and appointment activity."
        actions={
          <form action={markAllRead}>
            <Button variant="outline" type="submit">Mark all as read</Button>
          </form>
        }
      />
      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="Task assignments, document processing updates, and operational alerts will appear here." />
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card key={notification.id} className={notification.readAt ? "bg-white/70" : "bg-white/95"}>
              <CardHeader>
                <CardTitle className="text-base">{notification.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <p>{notification.body}</p>
                <p>{formatRelativeTime(notification.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
