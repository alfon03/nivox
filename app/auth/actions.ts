"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  normalizeUsername,
  validateEmail,
  validatePublicText,
  validateUsername,
} from "@/lib/validation";

function messageUrl(path: string, key: "error" | "message", value: string) {
  return `${path}?${key}=${encodeURIComponent(value)}`;
}

export async function login(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect(messageUrl("/auth/login", "error", "Primero configura Supabase en .env.local."));
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/mi-nivox");

  const emailError = validateEmail(email);
  if (emailError || !password) {
    redirect(messageUrl("/auth/login", "error", emailError ?? "Escribe tu contraseña."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(messageUrl("/auth/login", "error", "No se pudo iniciar sesión. Comprueba tus datos y que el email esté confirmado."));
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/mi-nivox");
}

export async function signup(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirect(messageUrl("/auth/registro", "error", "Primero configura Supabase en .env.local."));
  }

  const rawUsername = String(formData.get("username") ?? "").trim();
  const username = normalizeUsername(rawUsername);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const usernameError = validateUsername(rawUsername);
  if (usernameError) redirect(messageUrl("/auth/registro", "error", usernameError));

  const emailError = validateEmail(email);
  if (emailError) redirect(messageUrl("/auth/registro", "error", emailError));

  if (password.length < 8) {
    redirect(messageUrl("/auth/registro", "error", "La contraseña debe tener al menos 8 caracteres."));
  }

  const supabase = await createClient();

  const { data: existingUsername, error: usernameLookupError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .limit(1)
    .maybeSingle();

  if (usernameLookupError) {
    redirect(messageUrl("/auth/registro", "error", "No se pudo comprobar el nombre de usuario. Inténtalo de nuevo."));
  }

  if (existingUsername) {
    redirect(messageUrl("/auth/registro", "error", "Ese nombre de usuario ya está en uso."));
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    const lowerMessage = error.message.toLowerCase();
    const friendly = lowerMessage.includes("already registered")
      ? "Ese correo ya tiene una cuenta. Prueba a iniciar sesión o recuperar la contraseña."
      : lowerMessage.includes("rate limit")
        ? "Se han hecho demasiados intentos. Espera un poco antes de volver a probar."
        : "No se pudo crear la cuenta. Si ya tienes una, inicia sesión o recupera la contraseña.";
    redirect(messageUrl("/auth/registro", "error", friendly));
  }

  // Con Confirm Email activado, Supabase puede ocultar deliberadamente que un email ya existe.
  // Un usuario sin identidades indica que no se ha creado una identidad nueva.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    redirect(messageUrl("/auth/registro", "error", "No se pudo crear una cuenta nueva con esos datos. Si ya tienes cuenta, inicia sesión o recupera la contraseña."));
  }

  revalidatePath("/", "layout");
  if (data.session) redirect("/mi-nivox");
  redirect("/auth/check-email");
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/auth/login");

  const rawUsername = String(formData.get("username") ?? "").trim();
  const username = normalizeUsername(rawUsername);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const usernameError = validateUsername(rawUsername);
  if (usernameError) redirect(messageUrl("/perfil/editar", "error", usernameError));

  const fullNameError = validatePublicText(fullName, "El nombre visible", 80);
  if (fullNameError) redirect(messageUrl("/perfil/editar", "error", fullNameError));

  const bioError = validatePublicText(bio, "La bio", 280);
  if (bioError) redirect(messageUrl("/perfil/editar", "error", bioError));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: currentProfile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  const { data: usernameOwner, error: usernameLookupError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", user.id)
    .limit(1)
    .maybeSingle();

  if (usernameLookupError) {
    redirect(messageUrl("/perfil/editar", "error", "No se pudo comprobar el nombre de usuario."));
  }
  if (usernameOwner) {
    redirect(messageUrl("/perfil/editar", "error", "Ese nombre de usuario ya está en uso."));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username, full_name: fullName || null, bio: bio || null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    const friendly = error.code === "23505" ? "Ese nombre de usuario ya está en uso." : "No se pudo guardar el perfil.";
    redirect(messageUrl("/perfil/editar", "error", friendly));
  }

  revalidatePath("/", "layout");
  revalidatePath("/mi-nivox");
  if (currentProfile?.username) revalidatePath(`/usuarios/${currentProfile.username}`);
  revalidatePath(`/usuarios/${username}`);
  redirect(messageUrl("/perfil/editar", "message", "Perfil guardado."));
}

export async function requestPasswordReset(formData: FormData) {
  if (!isSupabaseConfigured()) redirect(messageUrl("/auth/recuperar", "error", "Primero configura Supabase."));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const emailError = validateEmail(email);
  if (emailError) redirect(messageUrl("/auth/recuperar", "error", emailError));
  const supabase = await createClient();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/update-password`,
  });
  if (error && !error.message.toLowerCase().includes("rate")) {
    redirect(messageUrl("/auth/recuperar", "error", "No se pudo enviar el correo de recuperación."));
  }
  redirect(messageUrl("/auth/recuperar", "message", "Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña."));
}

export async function updatePassword(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/auth/login");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  if (password.length < 8) redirect(messageUrl("/auth/update-password", "error", "La contraseña debe tener al menos 8 caracteres."));
  if (password !== confirmPassword) redirect(messageUrl("/auth/update-password", "error", "Las contraseñas no coinciden."));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(messageUrl("/auth/recuperar", "error", "El enlace ha caducado o no es válido. Solicita uno nuevo."));
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(messageUrl("/auth/update-password", "error", "No se pudo cambiar la contraseña."));
  redirect(messageUrl("/auth/login", "message", "Contraseña actualizada. Ya puedes iniciar sesión."));
}
