// src/features/fragments/components/AuthButton.tsx
'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function AuthButton() {
  const [user, setUser] = useState<any>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    if (supabase) {
      // 添加認證狀態監聽
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('認證狀態變化:', event, session);
          
          if (event === 'SIGNED_OUT' || !session) {
            setUser(null);
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setUser(session.user);
          }
        }
      );

      // 初始檢查用戶狀態（在同一個 useEffect 中）
      supabase.auth.getUser()
        .then(({ data, error }) => {
          if (error) {
            console.error('認證錯誤:', error);
            // 如果是 refresh token 錯誤，清除狀態
            if (error.message?.includes('Invalid Refresh Token')) {
              console.log('清除無效認證狀態');
              supabase.auth.signOut();
              setUser(null);
            }
          } else {
            setUser(data.user);
          }
        })
        .catch(error => {
          console.error('獲取用戶信息失敗:', error);
          setUser(null);
        });

      return () => subscription.unsubscribe();
    }
  }, [supabase]);

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