import { addTaskCommentAction, createTaskAction, updateTaskStatusAction } from "@/features/tasks/actions";
import { listDoctorOptions } from "@/features/appointments/service";
import { listPatientOptions } from "@/features/patients/service";
import { listTasks } from "@/features/tasks/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/security/permissions";
import { formatRelativeTime } from "@/lib/utils";

const taskStatusOptions = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELED"] as const;
const taskPriorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export default async function TasksPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "tasks:read");
  const [tasks, staff, patients] = await Promise.all([
    listTasks(workspace.id),
    listDoctorOptions(workspace.id),
    listPatientOptions(workspace.id)
  ]);
  const createAction = createTaskAction.bind(null, workspaceSlug);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Tasks" title="Operational collaboration" description="Assign work, coordinate follow-ups, and keep comments attached to the task itself." />
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create task</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Title</label>
                <Input name="title" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <Textarea name="description" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Priority</label>
                  <Select name="priority" defaultValue="MEDIUM">
                    {taskPriorityOptions.map((priority) => (
                      <option key={priority} value={priority}>{taskPriorityLabels[priority]}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Due at</label>
                  <Input name="dueAt" type="datetime-local" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Assignee</label>
                  <Select name="assigneeUserId" defaultValue="">
                    <option value="">Unassigned</option>
                    {staff.map((member) => (
                      <option key={member.userId} value={member.userId}>{member.user.profile?.fullName ?? member.user.email}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Linked patient</label>
                  <Select name="patientId" defaultValue="">
                    <option value="">None</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full">Create task</Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-6">
          {tasks.length === 0 ? (
            <EmptyState title="No tasks yet" description="Create the first operational task and start collaborating inside the workspace." />
          ) : (
            tasks.map((task) => {
              const statusAction = updateTaskStatusAction.bind(null, workspaceSlug, task.id);
              const commentAction = addTaskCommentAction.bind(null, workspaceSlug, task.id);
              return (
                <Card key={task.id} className="bg-white/90">
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle>{task.title}</CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">{task.description ?? "No description provided."}</p>
                      </div>
                      <div className="text-sm text-muted-foreground md:text-right">
                        <p>{taskPriorityLabels[task.priority]}</p>
                        <p>{task.assignee?.profile?.fullName ?? task.assignee?.email ?? "Unassigned"}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm text-muted-foreground">Status: {taskStatusLabels[task.status]} {task.dueAt ? `- due ${formatRelativeTime(task.dueAt)}` : ""}</p>
                      <form action={statusAction} className="flex items-center gap-3">
                        <Select name="status" defaultValue={task.status}>
                          {taskStatusOptions.map((status) => (
                            <option key={status} value={status}>{taskStatusLabels[status]}</option>
                          ))}
                        </Select>
                        <Button type="submit" variant="outline">Update</Button>
                      </form>
                    </div>
                    <div className="space-y-3 rounded-2xl border border-border/70 p-4">
                      <p className="text-sm font-medium text-slate-950">Comments</p>
                      {task.comments.length > 0 ? (
                        task.comments.map((comment) => (
                          <div key={comment.id} className="rounded-2xl bg-muted/30 p-3 text-sm">
                            <p className="font-medium text-slate-950">{comment.user.profile?.fullName ?? comment.user.email}</p>
                            <p className="mt-1 text-muted-foreground">{comment.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No comments yet.</p>
                      )}
                      <form action={commentAction} className="space-y-3">
                        <Textarea name="content" placeholder="Add a comment" />
                        <Button type="submit" variant="outline">Post comment</Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

