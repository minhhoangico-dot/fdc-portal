import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BAN_DURATION = "876000h";
const TEMP_PASSWORD_LENGTH = 18;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const createTemporaryPassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(TEMP_PASSWORD_LENGTH));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

const findAuthUserByEmail = async (email: string) => {
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  return data.users.find((user) => normalizeEmail(user.email || "") === normalizeEmail(email)) ?? null;
};

const getActor = async (authorizationHeader: string | null) => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Authorization header");
  }

  const jwt = authorizationHeader.replace("Bearer ", "").trim();
  const { data, error } = await adminClient.auth.getUser(jwt);
  if (error || !data.user) {
    throw error || new Error("Unauthorized");
  }

  const { data: actorMapping, error: actorError } = await adminClient
    .from("fdc_user_mapping")
    .select("id, role")
    .eq("supabase_uid", data.user.id)
    .maybeSingle();

  if (actorError) throw actorError;
  if (!actorMapping || actorMapping.role !== "super_admin") {
    throw new Error("Forbidden");
  }

  return actorMapping;
};

const ensureAuthIdentity = async (params: {
  email: string;
  fullName: string;
  allowExisting: boolean;
}) => {
  const email = normalizeEmail(params.email);
  const temporaryPassword = createTemporaryPassword();
  const existingAuthUser = await findAuthUserByEmail(email);

  if (existingAuthUser && !params.allowExisting) {
    throw new Error("User already exists in Supabase Auth");
  }

  if (existingAuthUser) {
    const { data, error } = await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
      email,
      email_confirm: true,
      password: temporaryPassword,
      ban_duration: "none",
      user_metadata: {
        full_name: params.fullName,
      },
    });

    if (error || !data.user) throw error || new Error("Failed to update auth user");
    return { authUser: data.user, temporaryPassword };
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    password: temporaryPassword,
    user_metadata: {
      full_name: params.fullName,
    },
  });

  if (error || !data.user) throw error || new Error("Failed to create auth user");
  return { authUser: data.user, temporaryPassword };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await getActor(req.headers.get("Authorization"));
    const payload = await req.json();
    const action = String(payload?.action || "");

    if (action === "create_user") {
      const name = String(payload?.name || "").trim();
      const email = normalizeEmail(String(payload?.email || ""));
      const role = String(payload?.role || "").trim();
      const department = String(payload?.department || "").trim();
      const hikvisionEmployeeId = String(payload?.hikvisionEmployeeId || "").trim();

      if (!name || !email || !role) {
        return json(400, { error: "Missing required fields for create_user" });
      }

      const { data: existingMapping, error: existingMappingError } = await adminClient
        .from("fdc_user_mapping")
        .select("id, supabase_uid")
        .eq("email", email)
        .maybeSingle();

      if (existingMappingError) throw existingMappingError;
      if (existingMapping?.supabase_uid) {
        return json(409, { error: "User already exists. Use reset password instead." });
      }

      const { authUser, temporaryPassword } = await ensureAuthIdentity({
        email,
        fullName: name,
        allowExisting: Boolean(existingMapping),
      });

      let mappingId = existingMapping?.id as string | undefined;
      if (existingMapping?.id) {
        const { error: updateError } = await adminClient
          .from("fdc_user_mapping")
          .update({
            supabase_uid: authUser.id,
            full_name: name,
            email,
            department_name: department || null,
            role,
            is_active: true,
            hikvision_employee_id: hikvisionEmployeeId || null,
          })
          .eq("id", existingMapping.id);

        if (updateError) throw updateError;
      } else {
        const { data: insertedMapping, error: insertError } = await adminClient
          .from("fdc_user_mapping")
          .insert({
            supabase_uid: authUser.id,
            full_name: name,
            email,
            department_name: department || null,
            role,
            is_active: true,
            hikvision_employee_id: hikvisionEmployeeId || null,
          })
          .select("id")
          .single();

        if (insertError || !insertedMapping) throw insertError || new Error("Failed to create mapping");
        mappingId = insertedMapping.id;
      }

      return json(200, {
        mappingId,
        authUserId: authUser.id,
        temporaryPassword,
      });
    }

    if (action === "reset_password") {
      const userId = String(payload?.userId || "").trim();
      if (!userId) {
        return json(400, { error: "Missing userId" });
      }

      const { data: mapping, error: mappingError } = await adminClient
        .from("fdc_user_mapping")
        .select("id, full_name, email, supabase_uid, is_active")
        .eq("id", userId)
        .maybeSingle();

      if (mappingError) throw mappingError;
      if (!mapping?.email) {
        return json(400, { error: "Target user must have an email address" });
      }

      const { authUser, temporaryPassword } = await ensureAuthIdentity({
        email: mapping.email,
        fullName: mapping.full_name,
        allowExisting: true,
      });

      if (!mapping.supabase_uid || mapping.supabase_uid !== authUser.id) {
        const { error: relinkError } = await adminClient
          .from("fdc_user_mapping")
          .update({ supabase_uid: authUser.id })
          .eq("id", mapping.id);

        if (relinkError) throw relinkError;
      }

      if (mapping.is_active === false) {
        await adminClient.auth.admin.updateUserById(authUser.id, {
          ban_duration: BAN_DURATION,
        });
      }

      return json(200, {
        authUserId: authUser.id,
        temporaryPassword,
      });
    }

    if (action === "set_active") {
      const userId = String(payload?.userId || "").trim();
      const isActive = Boolean(payload?.isActive);
      if (!userId) {
        return json(400, { error: "Missing userId" });
      }

      const { data: mapping, error: mappingError } = await adminClient
        .from("fdc_user_mapping")
        .select("supabase_uid")
        .eq("id", userId)
        .maybeSingle();

      if (mappingError) throw mappingError;

      const { error: updateMappingError } = await adminClient
        .from("fdc_user_mapping")
        .update({ is_active: isActive })
        .eq("id", userId);

      if (updateMappingError) throw updateMappingError;

      if (mapping?.supabase_uid) {
        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(mapping.supabase_uid, {
          ban_duration: isActive ? "none" : BAN_DURATION,
        });

        if (authUpdateError) throw authUpdateError;
      }

      return json(200, { userId, isActive });
    }

    return json(400, { error: "Unsupported action" });
  } catch (error) {
    console.error("admin-user-lifecycle failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Forbidden" ? 403 : message === "Unauthorized" ? 401 : 500;
    return json(status, { error: message });
  }
});
