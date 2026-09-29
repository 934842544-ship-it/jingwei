import { resolveApiUser } from "@/lib/api/auth";
import { jsonOk, unauthorized } from "@/lib/api/http";
import { getGoalTasks } from "@/lib/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const tasks = await getGoalTasks(user.id, id);
  return jsonOk({ tasks });
}
