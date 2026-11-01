import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const databaseRole = {
  Student: "student",
  Instructor: "instructor",
  "Teaching Assistant": "teaching_assistant",
} as const

function isSupportedRole(value: unknown): value is keyof typeof databaseRole {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(databaseRole, value)
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
    const { data: callerProfile, error: profileLookupError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle()
    if (profileLookupError) throw new RequestError("Could not verify administrator permissions.", 500)
    if (callerProfile?.role !== "admin") throw new RequestError("Only administrators can create accounts.", 403)

    let input: unknown
    try {
      input = await request.json()
    } catch {
      throw new RequestError("Request body must be valid JSON.", 400)
    }
    if (!input || typeof input !== "object") throw new RequestError("Request body must be a JSON object.", 400)

    const body = input as Record<string, unknown>
    const universityId = typeof body.universityId === "string" ? body.universityId.trim() : ""
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const role = body.role
    if (!universityId || !displayName || !password) {
      throw new RequestError("University ID, display name, and password are required.", 400)
    }
    if (password.length < 6) throw new RequestError("Password must be at least 6 characters.", 400)
    if (!isSupportedRole(role)) {
      throw new RequestError("Role must be Student, Instructor, or Teaching Assistant.", 400)
    }

    const email = `${universityId.toLowerCase()}@quickly.test`
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createUserError || !createdUser.user) {
      const message = createUserError?.message ?? "Could not create the login account."
      const lowerMessage = message.toLowerCase()
      const status = lowerMessage.includes("already") || lowerMessage.includes("duplicate") ? 409 : 400
      throw new RequestError(message, status)
    }

    const { error: insertProfileError } = await adminClient.from("profiles").insert({
      id: createdUser.user.id,
      university_id: universityId,
      display_name: displayName,
      role: databaseRole[role],
    })
    if (insertProfileError) {
      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(createdUser.user.id)
      if (deleteUserError) {
        throw new RequestError(
          `Profile creation failed, and the new login could not be removed: ${deleteUserError.message}`,
          500,
        )
      }
      const lowerMessage = insertProfileError.message.toLowerCase()
      const status = insertProfileError.code === "23505" ? 409 : 400
      throw new RequestError(
        lowerMessage.includes("duplicate") ? "That university ID already exists." : insertProfileError.message,
        status,
      )
    }

    return jsonResponse({ id: createdUser.user.id, email, universityId }, 201)
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, error.status)
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Account creation failed." },
      500,
    )
  }
})
