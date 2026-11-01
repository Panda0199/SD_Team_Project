import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405)
  }

  try {
    const authorization = request.headers.get("Authorization")
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) throw new RequestError("Authentication is required.", 401)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")
    const publishableKey = publishableKeys !== null
      ? JSON.parse(publishableKeys).default
      : Deno.env.get("SUPABASE_ANON_KEY")
    const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS")
    const secretKey = secretKeys !== null
      ? JSON.parse(secretKeys).default
      : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !publishableKey || !secretKey) {
      throw new RequestError("Supabase function configuration is incomplete.", 500)
    }

    const publicClient = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: userData, error: userError } = await publicClient.auth.getUser(token)
    if (userError || !userData.user) throw new RequestError("Authentication is invalid or expired.", 401)

    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle()
    if (callerProfileError) throw new RequestError("Could not verify administrator permissions.", 500)
    if (callerProfile?.role !== "admin") throw new RequestError("Only administrators can delete accounts.", 403)

    let input: unknown
    try {
      input = await request.json()
    } catch {
      throw new RequestError("Request body must be valid JSON.", 400)
    }
    if (!input || typeof input !== "object") throw new RequestError("Request body must be a JSON object.", 400)

    const rawUserId = (input as Record<string, unknown>).userId
    if (typeof rawUserId !== "string" || !rawUserId.trim()) {
      throw new RequestError("User ID is required.", 400)
    }
    const userId = rawUserId.trim()
    if (userId === userData.user.id) throw new RequestError("You cannot delete your own account.", 400)

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
    if (targetProfileError) throw new RequestError("Could not look up the target account.", 500)
    if (!targetProfile) throw new RequestError("Account not found.", 404)
    if (targetProfile.role === "admin") throw new RequestError("Admin accounts cannot be deleted here.", 400)

    if (targetProfile.role === "instructor") {
      const { data: assignedCourses, error: coursesError } = await adminClient
        .from("courses")
        .select("id")
        .eq("instructor_id", userId)
        .limit(1)
      if (coursesError) throw new RequestError("Could not verify the instructor's course assignments.", 500)
      if (assignedCourses?.length) {
        throw new RequestError("Reassign this instructor's courses before deleting the account.", 409)
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) throw new RequestError(deleteError.message, 409)

    return jsonResponse({ success: true, userId }, 200)
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, error.status)
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Account deletion failed." },
      500,
    )
  }
})
