import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.object({
  eventId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData, error: authError } =
    await supabase.auth.getClaims();
  const userId = authData?.claims.sub;

  if (authError || !userId) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: z.infer<typeof requestSchema>;

  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return Response.json({ error: "INVALID_CALLBACK_REQUEST" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("crisis_events")
    .update({ urgent_callback_requested_at: new Date().toISOString() })
    .eq("id", body.eventId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not record the urgent callback request", error);
    return Response.json({ error: "CALLBACK_REQUEST_FAILED" }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: "CRISIS_EVENT_NOT_FOUND" }, { status: 404 });
  }

  return Response.json({ requested: true });
}
