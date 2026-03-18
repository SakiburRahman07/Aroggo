import { markPortalNotificationsReadAction } from "@/features/patient-portal/actions";
import { getPatientPortalSnapshot } from "@/features/patient-portal/service";
import { requirePatientPortalContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortalNotificationsPage() {
  const { user } = await requirePatientPortalContext();
  const snapshot = await getPatientPortalSnapshot(user.id);

  if (!snapshot) {
    return null;
  }

  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notifications</CardTitle>
        <form action={markPortalNotificationsReadAction}><Button variant="outline" type="submit">Mark all read</Button></form>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshot.notifications.map((notification) => (
          <div key={notification.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
            <p className="font-medium text-slate-950">{notification.title}</p>
            <p className="text-slate-600">{notification.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
