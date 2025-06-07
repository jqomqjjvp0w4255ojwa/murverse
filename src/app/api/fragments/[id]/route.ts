// 📄 app/api/fragments/[id]/route.ts - 最終可用版本

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUserId, checkFragmentOwnership } from '@/lib/auth/server-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = performance.now()
  const { id: fragmentId } = await params
  
  try {
    // 驗證用戶身份
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 檢查 fragment 所有權
    if (!await checkFragmentOwnership(fragmentId, userId)) {
      return NextResponse.json({ 
        error: 'Fragment not found or access denied' 
      }, { status: 404 })
    }

    const supabase = createServerSupabaseClient()

    console.log('🗑️ 開始刪除 Fragment:', fragmentId)

    let backupId: string | null = null
    let hasBackup = false
    let backupWarning: string | null = null

    // 1. 嘗試創建備份 (可選，失敗不影響刪除)
    try {
      console.log('💾 嘗試創建手動備份...')
      
      // 手動創建備份 (不依賴 RPC 函數)
      const backupResult = await createManualBackup(supabase, fragmentId, userId)
      
      if (backupResult.success) {
        backupId = backupResult.backupId || null
        hasBackup = true
        console.log('✅ 手動備份創建成功:', backupId)
      } else {
        backupWarning = backupResult.error || null
        console.warn('⚠️ 備份創建失敗，繼續執行刪除:', backupResult.error)
      }
    } catch (backupError) {
      backupWarning = backupError instanceof Error ? backupError.message : '備份創建異常'
      console.warn('⚠️ 備份創建異常，繼續執行刪除:', backupError)
    }

    // 2. 執行刪除操作 (逐步刪除，確保穩定性)
    console.log('🗑️ 執行刪除操作...')
    
    const deletionErrors: string[] = []
    
    // 刪除 notes
    try {
      const { error: notesError } = await supabase
        .from('notes')
        .delete()
        .eq('fragment_id', fragmentId)

      if (notesError) {
        deletionErrors.push(`Notes deletion: ${notesError.message}`)
        console.warn('⚠️ Notes 刪除警告:', notesError.message)
      } else {
        console.log('✅ Notes 刪除成功')
      }
    } catch (error) {
      const errorMsg = `Notes deletion error: ${error}`
      deletionErrors.push(errorMsg)
      console.warn('⚠️', errorMsg)
    }

    // 刪除 tags
    try {
      const { error: tagsError } = await supabase
        .from('fragment_tags')
        .delete()
        .eq('fragment_id', fragmentId)

      if (tagsError) {
        deletionErrors.push(`Tags deletion: ${tagsError.message}`)
        console.warn('⚠️ Tags 刪除警告:', tagsError.message)
      } else {
        console.log('✅ Tags 刪除成功')
      }
    } catch (error) {
      const errorMsg = `Tags deletion error: ${error}`
      deletionErrors.push(errorMsg)
      console.warn('⚠️', errorMsg)
    }

    // 刪除 positions (可能不存在，所以忽略錯誤)
    try {
      const { error: positionsError } = await supabase
        .from('fragment_positions')
        .delete()
        .eq('fragment_id', fragmentId)
        .eq('user_id', userId)

      if (positionsError && positionsError.code !== 'PGRST116') {
        // PGRST116 是 "no rows found" 錯誤，可以忽略
        console.warn('⚠️ Positions 刪除警告:', positionsError.message)
      } else {
        console.log('✅ Positions 刪除成功')
      }
    } catch (error) {
      console.warn('⚠️ Positions deletion error (ignored):', error)
    }

    // 刪除主 fragment (這個必須成功)
    const { error: fragmentError } = await supabase
      .from('fragments')
      .delete()
      .eq('id', fragmentId)
      .eq('user_id', userId)

    if (fragmentError) {
      console.error('❌ 主 Fragment 刪除失敗:', fragmentError)
      return NextResponse.json({ 
        error: `Failed to delete fragment: ${fragmentError.message}`,
        details: {
          fragmentError: fragmentError.message,
          deletionErrors: deletionErrors.length > 0 ? deletionErrors : undefined,
          backupWarning
        }
      }, { status: 500 })
    }

    console.log('✅ Fragment 主記錄刪除成功')

    const endTime = performance.now()
    
    console.log('✅ Fragment 刪除完成:', fragmentId)
    if (hasBackup) {
      console.log('📋 備份 ID:', backupId)
    }
    
    // 構建響應
    const response = {
      success: true,
      message: `Fragment ${fragmentId} deleted successfully`,
      backupId: hasBackup ? backupId : null,
      metrics: {
        totalTime: Math.round(endTime - startTime),
        hasBackup,
        backupExpiresIn: hasBackup ? '30 days' : null,
        deletionErrors: deletionErrors.length > 0 ? deletionErrors : undefined,
        backupWarning: backupWarning || undefined
      }
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ 刪除過程發生嚴重錯誤:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      error: 'Internal server error during deletion',
      details: errorMessage
    }, { status: 500 })
  }
}

/**
 * 手動創建備份 (不依賴 RPC 函數)
 */
async function createManualBackup(
  supabase: any,
  fragmentId: string,
  userId: string
): Promise<{
  success: boolean
  backupId?: string | null
  error?: string | null
}> {
  try {
    // 檢查 fragment_backups 表是否存在
    const { error: tableCheckError } = await supabase
      .from('fragment_backups')
      .select('id')
      .limit(1)

    if (tableCheckError) {
      return {
        success: false,
        error: `Backup table not available: ${tableCheckError.message}`
      }
    }

    // 獲取 fragment 數據
    const { data: fragment, error: fragmentError } = await supabase
      .from('fragments')
      .select('*')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    if (fragmentError || !fragment) {
      return {
        success: false,
        error: 'Fragment not found for backup'
      }
    }

    // 獲取關聯的 notes
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('fragment_id', fragmentId)

    // 獲取關聯的 tags
    const { data: tagRelations } = await supabase
      .from('fragment_tags')
      .select('tag')
      .eq('fragment_id', fragmentId)

    const tags = (tagRelations || []).map((t: any) => t.tag)

    // 生成備份 ID 和時間
    const backupId = crypto.randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30天後過期

    // 處理 UUID 轉換問題
    let fragmentUuid: string
    let userUuid: string
    
    try {
      // 檢查是否為有效的 UUID 格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      
      if (uuidRegex.test(fragmentId)) {
        fragmentUuid = fragmentId
      } else {
        // 如果不是 UUID，創建一個基於原始 ID 的 UUID
        const hash = fragmentId.replace(/[^a-f0-9]/gi, '').padEnd(32, '0').substring(0, 32)
        fragmentUuid = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`
      }
      
      if (uuidRegex.test(userId)) {
        userUuid = userId
      } else {
        // 如果不是 UUID，創建一個基於原始 ID 的 UUID
        const hash = userId.replace(/[^a-f0-9]/gi, '').padEnd(32, '0').substring(0, 32)
        userUuid = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`
      }
    } catch {
      // 如果轉換失敗，生成隨機 UUID
      fragmentUuid = crypto.randomUUID()
      userUuid = crypto.randomUUID()
    }

    // 創建備份記錄
    const { error: backupError } = await supabase
      .from('fragment_backups')
      .insert({
        id: backupId,
        original_fragment_id: fragmentUuid,
        user_id: userUuid,
        fragment_data: {
          ...fragment,
          original_id: fragmentId,  // 保存原始 ID
          original_user_id: userId  // 保存原始 user ID
        },
        related_notes: notes || [],
        related_tags: tags,
        deleted_at: now.toISOString(),
        deleted_by: userUuid,
        expires_at: expiresAt.toISOString(),
        restore_count: 0,
        notes: `Manual backup created during deletion at ${now.toISOString()}`
      })

    if (backupError) {
      return {
        success: false,
        error: `Backup creation failed: ${backupError.message}`
      }
    }

    return {
      success: true,
      backupId
    }

  } catch (error) {
    return {
      success: false,
      error: `Backup creation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// 其他方法保持不變...
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fragmentId } = await params
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await checkFragmentOwnership(fragmentId, userId)) {
      return NextResponse.json({ 
        error: 'Fragment not found or access denied' 
      }, { status: 404 })
    }

    const supabase = createServerSupabaseClient()

    // 獲取 fragment 及其關聯數據
    const { data: fragment, error: fragmentError } = await supabase
      .from('fragments')
      .select('*')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    if (fragmentError || !fragment) {
      return NextResponse.json({ 
        error: 'Fragment not found' 
      }, { status: 404 })
    }

    // 獲取關聯的 notes 和 tags
    const [notesRes, tagsRes] = await Promise.all([
      supabase
        .from('notes')
        .select('*')
        .eq('fragment_id', fragmentId)
        .order('createdAt', { ascending: true }),
      supabase
        .from('fragment_tags')
        .select('tag')
        .eq('fragment_id', fragmentId)
    ])

    const fragmentWithRelations = {
      ...fragment,
      notes: notesRes.data || [],
      tags: (tagsRes.data || []).map(t => t.tag)
    }

    return NextResponse.json({ fragment: fragmentWithRelations })
    
  } catch (error) {
    console.error('Get fragment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fragmentId } = await params
    const updateData = await request.json()
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!await checkFragmentOwnership(fragmentId, userId)) {
      return NextResponse.json({ 
        error: 'Fragment not found or access denied' 
      }, { status: 404 })
    }

    const supabase = createServerSupabaseClient()

    // 更新 fragment
    const { data: updatedFragment, error } = await supabase
      .from('fragments')
      .update({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Update fragment error:', error)
      return NextResponse.json({ 
        error: 'Failed to update fragment' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      fragment: updatedFragment 
    })
    
  } catch (error) {
    console.error('Update fragment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}