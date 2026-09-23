// Edge Function: crear-usuario
// Crea la cuenta de acceso (Auth) + otorga el rol, todo desde la página Usuarios.
//
// DESPLIEGUE (una sola vez, en tu PC con Supabase CLI):
//   1. supabase login
//   2. supabase link --project-ref TU_PROJECT_REF
//   3. supabase functions deploy crear-usuario
// No hay que configurar secrets: SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY ya existen dentro del entorno de functions.
// La service_role key NUNCA sale de aquí: el navegador no la ve.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.115.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: 'Falta configuración del servidor' }, 500)
    }

    // Quién llama (con su propio token, sin privilegios)
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()
    if (!caller?.email) {
      return json({ error: 'No autenticado' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    // Solo un administrador puede crear cuentas
    const { data: row } = await admin
      .from('usuarios_autorizados')
      .select('rol')
      .eq('email', caller.email.toLowerCase())
      .maybeSingle()
    if (row?.rol !== 'admin') {
      return json({ error: 'Solo un administrador puede crear cuentas' }, 403)
    }

    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()
    const rol = String(body?.rol ?? '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Escribe un correo válido' }, 400)
    }
    if (rol !== 'admin' && rol !== 'cajero') {
      return json({ error: 'Rol inválido (usa admin o cajero)' }, 400)
    }

    const { data: targetRow } = await admin
      .from('usuarios_autorizados')
      .select('rol')
      .eq('email', email)
      .maybeSingle()
    if (targetRow?.rol === 'admin' && rol !== 'admin') {
      const { count } = await admin
        .from('usuarios_autorizados')
        .select('email', { count: 'exact', head: true })
        .eq('rol', 'admin')
        .neq('email', email)
      if ((count ?? 0) === 0) {
        return json({ error: 'No se puede quitar el rol del último administrador' }, 400)
      }
    }

    // Crea la cuenta de acceso (ya confirmada, con clave temporal aleatoria).
    // La persona define SU clave con "Olvidé mi contraseña" en el login.
    const tempPassword = `${crypto.randomUUID()}Aa1!`
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    let existed = false
    if (createError) {
      if (!/already|exists|registered/i.test(createError.message)) {
        return json({ error: createError.message }, 400)
      }
      existed = true
    }

    // Otorga (o actualiza) el acceso. Idempotente: no duplica.
    const { error: upsertError } = await admin
      .from('usuarios_autorizados')
      .upsert({ email, rol }, { onConflict: 'email' })
    if (upsertError) {
      return json({ error: upsertError.message }, 400)
    }

    return json({ ok: true, existed })
  } catch (cause) {
    return json(
      { error: cause instanceof Error ? cause.message : 'Error interno' },
      500,
    )
  }
})
