// 📄 app/api/admin/backups/cleanup/route.ts - 清理過期備份 API
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUserId, checkAdminPermission } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await checkAdminPermission(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = createServerSupabaseClient()

    // 刪除過期的備份
    const { error, count } = await supabase
      .from('fragment_backups')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('清理過期備份失敗:', error)
      return NextResponse.json({ error: 'Failed to cleanup expired backups' }, { status: 500 })
    }

    console.log(`🧹 清理了 ${count || 0} 個過期備份`)

    return NextResponse.json({
      success: true,
      deletedCount: count || 0,
      message: `Successfully cleaned up ${count || 0} expired backups`
    })

  } catch (error) {
    console.error('清理備份時發生錯誤:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}