// src/features/fragments/components/AuthButton.tsx
'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function AuthButton() {
  const [user, setUser] = useState<any>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }
  }, [supabase])

  const handleLogin = () => {
    window.location.href = '/login'
  }

  const handleLogout = () => {
    supabase?.auth.signOut().then(() => {
      setUser(null)
      location.reload()
    })
  }

  return (
  <div className="fixed top-4 right-4 z-50 font-serif">
    {user ? (
      <div className="flex items-center gap-3 bg-[#f5f0e6] border border-[#d5c8b2] shadow-sm rounded-full px-4 py-1 backdrop-blur-sm">
        <span className="text-sm text-[#5b4c3d] hidden md:inline">
          {user.email}
        </span>
        <button
          onClick={handleLogout}
          className="text-sm text-[#7a5c3f] hover:text-[#a04d2d] transition"
        >
          登出
        </button>
      </div>
    ) : (
      <button
        onClick={handleLogin}
        className="bg-[#e7d6ba] hover:bg-[#d8c4a3] text-[#5b4c3d] text-sm font-medium px-4 py-2 rounded-full shadow-sm transition border border-[#cbbca2]"
      >
        登入
      </button>
    )}
  </div>
)


}
