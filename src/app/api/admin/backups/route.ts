// 📄 app/api/admin/backups/route.ts - 備份列表 API
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUserId, checkAdminPermission } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await checkAdminPermission(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const url = new URL(request.url)
    const searchUserId = url.searchParams.get('userId')
    const searchText = url.searchParams.get('search')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const supabase = createServerSupabaseClient()

    // 構建查詢
    let query = supabase
      .from('fragment_backups')
      .select(`
        id,
        original_fragment_id,
        user_id,
        fragment_data,
        related_notes,
        related_tags,
        deleted_at,
        deleted_by,
        expires_at,
        restore_count,
        notes
      `)
      .order('deleted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 按用戶過濾
    if (searchUserId) {
      // 處理 UUID 和原始 ID 兩種情況
      query = query.or(`user_id.eq.${searchUserId},fragment_data->>original_user_id.eq.${searchUserId}`)
    }

    // 文本搜索 (在 fragment_data 中搜索)
    if (searchText) {
      query = query.ilike('fragment_data->>content', `%${searchText}%`)
    }

    const { data: backups, error } = await query

    if (error) {
      console.error('查詢備份失敗:', error)
      return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
    }

    // 獲取總數
    let countQuery = supabase
      .from('fragment_backups')
      .select('*', { count: 'exact', head: true })

    if (searchUserId) {
      countQuery = countQuery.or(`user_id.eq.${searchUserId},fragment_data->>original_user_id.eq.${searchUserId}`)
    }

    if (searchText) {
      countQuery = countQuery.ilike('fragment_data->>content', `%${searchText}%`)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('統計備份數量失敗:', countError)
    }

    // 處理備份數據
    const processedBackups = (backups || []).map(backup => {
      const fragmentData = backup.fragment_data || {}
      const originalUserId = fragmentData.original_user_id || backup.user_id
      const originalFragmentId = fragmentData.original_id || backup.original_fragment_id
      
      return {
        id: backup.id,
        originalFragmentId: originalFragmentId,
        userId: originalUserId,
        content: fragmentData.content || '',
        tags: backup.related_tags || [],
        notesCount: Array.isArray(backup.related_notes) ? backup.related_notes.length : 0,
        deletedAt: backup.deleted_at,
        deletedBy: backup.deleted_by,
        expiresAt: backup.expires_at,
        restoreCount: backup.restore_count || 0,
        adminNotes: backup.notes
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        backups: processedBackups,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    })

  } catch (error) {
    console.error('管理員備份 API 錯誤:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}