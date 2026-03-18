import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const cleanEnvVar = (val?: string) => (val || '').replace(/[\u0000-\u001F\u007F-\uFFFF\s]/g, '');

const supabaseUrl = cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseServiceKey = cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: Request) {
  if (!supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno para crear usuarios.' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const body = await request.json();
    const { email, password, full_name, role } = body;

    // 1. Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          full_name,
          role,
          requires_password_change: true
        }
      ]);

    if (profileError) {
      // Rollback if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Falta SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) throw new Error('ID de usuario requerido');

    // Deleting from auth.users will cascade delete from profiles
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  if (!supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Falta SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const body = await request.json();
    const { id, full_name, role, password } = body;

    if (!id) throw new Error('ID de usuario requerido');

    // Update profile
    if (full_name || role) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ full_name, role })
        .eq('id', id);
      if (profileError) throw profileError;
    }

    // Update password if provided
    if (password) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: password
      });
      if (authError) throw authError;
      
      // Force password change on next login
      await supabaseAdmin.from('profiles').update({ requires_password_change: true }).eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
