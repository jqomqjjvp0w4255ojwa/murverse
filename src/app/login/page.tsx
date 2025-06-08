'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = getSupabaseClient()

  return (
    <div className="flex justify-center items-center h-screen">
      {supabase && (
        <Auth 
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          theme="dark"
          redirectTo="/"
        />
      )}
    </div>
  )
}
