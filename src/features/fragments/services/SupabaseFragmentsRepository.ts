import { getSupabaseClient } from '@/lib/supabase/client'
import { Fragment } from '@/features/fragments/types/fragment'
import { AuthHelper } from '@/lib/authHelper'
import { getNotesByFragmentId } from './SupabaseNotesRepository'
import { getTagsByFragmentId } from './SupabaseTagsRepository'

const TABLE_NAME = 'fragments'

export async function loadFragments(): Promise<Fragment[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
    return []
  }

  const userId = await AuthHelper.getUserId()
  if (!userId) {
    console.warn('無法獲取用戶 ID，無法載入雲端 fragments')
    return []
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('updatedAt', { ascending: false })

  if (error) {
    console.error('載入 fragments 失敗:', error.message)
    return []
  }

  if (!data || data.length === 0) {
    console.log('沒有找到任何 fragments')
    return []
  }

  // 為每個 fragment 載入相關的 notes 和 tags
  const fragmentsWithRelations = await Promise.all(
    data.map(async (fragmentData: any) => {
      const [notes, tags] = await Promise.all([
        getNotesByFragmentId(fragmentData.id),
        getTagsByFragmentId(fragmentData.id)
      ])

      return {
        ...fragmentData,
        notes,
        tags
      } as Fragment
    })
  )

  console.log(`✅ 成功載入 ${fragmentsWithRelations.length} 個 fragments`)
  return fragmentsWithRelations
}

export async function saveFragments(fragments: Fragment[]): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
    return
  }

  const userId = await AuthHelper.getUserId()
  if (!userId) {
    console.warn('無法獲取用戶 ID，無法儲存 fragments 到雲端')
    return
  }

  if (fragments.length === 0) {
    console.log('⚠️ 沒有 fragments 需要儲存')
    return
  }

  // 分離 fragments 基本資料和關聯資料
  const fragmentsBasicData = fragments.map(fragment => {
    // 移除 notes 和 tags，這些會分別儲存
    const { notes, tags, ...basicData } = fragment
    return {
      ...basicData,
      user_id: userId
    }
  })

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(fragmentsBasicData, { onConflict: 'id' })
    
  if (error) {
    console.error('儲存 fragments 失敗:', error.message)
  } else {
    console.log(`✅ 成功儲存 ${fragments.length} 個 fragments 到雲端`)
  }
}

// 新增單個 fragment
export async function saveFragment(fragment: Fragment): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
    return false
  }

  const userId = await AuthHelper.getUserId()
  if (!userId) {
    console.warn('無法獲取用戶 ID，無法儲存 fragment')
    return false
  }

  // 分離基本資料和關聯資料
  const { notes, tags, ...basicData } = fragment
  
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert([{
      ...basicData,
      user_id: userId
    }], { onConflict: 'id' })

  if (error) {
    console.error('儲存單個 fragment 失敗:', error.message)
    return false
  }

  console.log(`✅ 成功儲存 fragment: ${fragment.id}`)
  return true
}

// 完整儲存 fragment（包含 notes 和 tags）
export async function saveFragmentComplete(fragment: Fragment): Promise<boolean> {
  const userId = await AuthHelper.getUserId()
  if (!userId) {
    console.warn('無法獲取用戶 ID，無法儲存 fragment')
    return false
  }

  try {
    // 1. 儲存基本 fragment 資料
    const success = await saveFragment(fragment)
    if (!success) return false

    // 2. 儲存 tags（如果有）
    if (fragment.tags && fragment.tags.length > 0) {
      const { addTagToFragment } = await import('./SupabaseTagsRepository')
      
      for (const tag of fragment.tags) {
        await addTagToFragment(fragment.id, tag)
      }
    }

    // 3. 儲存 notes（如果有）
    if (fragment.notes && fragment.notes.length > 0) {
      const { addNote } = await import('./SupabaseNotesRepository')
      
      for (const note of fragment.notes) {
        await addNote(fragment.id, note)
      }
    }

    console.log(`✅ 完整儲存 fragment 成功: ${fragment.id}`)
    return true
    
  } catch (error) {
    console.error('完整儲存 fragment 失敗:', error)
    return false
  }
}

// 刪除 fragment
export async function deleteFragment(fragmentId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
    return false
  }

  const userId = await AuthHelper.getUserId()
  if (!userId) {
    console.warn('無法獲取用戶 ID，無法刪除 fragment')
    return false
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', fragmentId)
    .eq('user_id', userId)

  if (error) {
    console.error('刪除 fragment 失敗:', error.message)
    return false
  }

  console.log(`✅ 成功刪除 fragment: ${fragmentId}`)
  return true
}