// 📄 app/api/admin/backups/[id]/restore/route.ts - 恢復備份 API
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUserId, checkAdminPermission } from '@/lib/auth/server-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await checkAdminPermission(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: backupId } = await params
    const { adminNotes } = await request.json()

    const supabase = createServerSupabaseClient()

    // 獲取備份數據
    const { data: backup, error: backupError } = await supabase
      .from('fragment_backups')
      .select('*')
      .eq('id', backupId)
      .single()

    if (backupError || !backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    // 檢查是否過期
    if (new Date(backup.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Backup has expired' }, { status: 410 })
    }

    // 從備份數據中提取原始信息
    const fragmentData = backup.fragment_data || {}
    const originalFragmentId = fragmentData.original_id || backup.original_fragment_id
    const originalUserId = fragmentData.original_user_id || backup.user_id

    // 檢查原 fragment 是否已存在
    const { data: existingFragment } = await supabase
      .from('fragments')
      .select('id')
      .eq('id', originalFragmentId)
      .single()

    if (existingFragment) {
      return NextResponse.json({ 
        error: 'Fragment already exists, cannot restore' 
      }, { status: 409 })
    }

    console.log('🔄 開始恢復備份:', backupId)

    // 恢復 fragment
    const { error: fragmentError } = await supabase
      .from('fragments')
      .insert({
        id: originalFragmentId,
        user_id: originalUserId,
        content: fragmentData.content,
        type: fragmentData.type || 'fragment',
        createdAt: fragmentData.createdAt,
        updatedAt: new Date().toISOString(), // 更新時間戳
        meta: fragmentData.meta,
        parentId: fragmentData.parentId,
        childIds: fragmentData.childIds,
        version: fragmentData.version || 1,
        creator: fragmentData.creator,
        lastEditor: fragmentData.lastEditor,
        status: fragmentData.status || 'published',
        direction: fragmentData.direction || 'horizontal',
        showContent: fragmentData.showContent !== false,
        showNote: fragmentData.showNote !== false,
        showTags: fragmentData.showTags !== false,
        sortOrder: fragmentData.sortOrder,
        relations: fragmentData.relations
      })

    if (fragmentError) {
      console.error('恢復 fragment 失敗:', fragmentError)
      return NextResponse.json({ error: 'Failed to restore fragment' }, { status: 500 })
    }

    // 恢復 notes
    if (backup.related_notes && Array.isArray(backup.related_notes) && backup.related_notes.length > 0) {
      const notesToInsert = backup.related_notes.map((note: any) => ({
        id: note.id,
        fragment_id: originalFragmentId,
        title: note.title || '',
        value: note.value || '',
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        color: note.color,
        isPinned: note.isPinned || false
      }))

      const { error: notesError } = await supabase
        .from('notes')
        .insert(notesToInsert)

      if (notesError) {
        console.warn('恢復 notes 時有警告:', notesError)
      }
    }

    // 恢復 tags
    if (backup.related_tags && backup.related_tags.length > 0) {
      const tagInserts = backup.related_tags.map((tag: string) => ({
        fragment_id: originalFragmentId,
        tag: tag
      }))

      const { error: tagsError } = await supabase
        .from('fragment_tags')
        .insert(tagInserts)

      if (tagsError) {
        console.warn('恢復 tags 時有警告:', tagsError)
      }
    }

    // 更新備份記錄
    const { error: updateError } = await supabase
      .from('fragment_backups')
      .update({
        restore_count: backup.restore_count + 1,
        notes: adminNotes ? `${backup.notes || ''}\n[${new Date().toISOString()}] Admin restore: ${adminNotes}` : backup.notes
      })
      .eq('id', backupId)

    if (updateError) {
      console.warn('更新備份記錄失敗:', updateError)
    }

    console.log('✅ 備份恢復成功:', originalFragmentId)

    return NextResponse.json({
      success: true,
      message: 'Fragment restored successfully',
      fragmentId: originalFragmentId,
      restoredAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('恢復備份時發生錯誤:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}