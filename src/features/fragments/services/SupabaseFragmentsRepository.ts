import { getSupabaseClient } from '@/lib/supabase/client'
import { Fragment, DbFragment, dbFragmentToFragment, fragmentToDbFragment } from '@/features/fragments/types/fragment'
import { AuthHelper } from '@/lib/authHelper'
// 靜態導入，避免循環導入問題
import { getNotesByFragmentId, addNote } from './SupabaseNotesRepository'
import { getTagsByFragmentId, addTagToFragment } from './SupabaseTagsRepository'

const TABLE_NAME = 'fragments'

export async function loadFragments(): Promise<Fragment[]> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    console.log('🔍 Loading fragments for user:', userId)

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('updatedAt', { ascending: false })

    if (error) {
      console.error('❌ Failed to load fragments:', error)
      return [] // 統一錯誤處理方式
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ 沒有找到任何 fragments')
      return []
    }

    // 為每個 fragment 載入相關的 notes 和 tags
    const fragmentsWithRelations = await Promise.all(
      data.map(async (fragmentData: DbFragment) => {
        try {
          const [notes, tags] = await Promise.all([
            getNotesByFragmentId(fragmentData.id),
            getTagsByFragmentId(fragmentData.id)
          ])

          return dbFragmentToFragment(fragmentData, notes, tags)
        } catch (error) {
          console.error(`❌ 載入 fragment ${fragmentData.id} 關聯資料失敗:`, error)
          // 如果關聯資料載入失敗，至少返回基本的 fragment 資料
          return dbFragmentToFragment(fragmentData, [], [])
        }
      })
    )

    console.log(`✅ 成功載入 ${fragmentsWithRelations.length} 個 fragments`)
    return fragmentsWithRelations

  } catch (error) {
    console.error('❌ 載入 fragments 時發生錯誤:', error)
    return [] // 統一錯誤處理
  }
}

export async function saveFragments(fragments: Fragment[]): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    if (fragments.length === 0) {
      console.log('⚠️ 沒有 fragments 需要儲存')
      return true
    }

    // 轉換為資料庫格式
    const fragmentsBasicData = fragments.map(fragment => 
      fragmentToDbFragment(fragment, userId)
    )

    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(fragmentsBasicData, { onConflict: 'id' })
      
    if (error) {
      console.error('❌ Failed to save fragments:', error)
      return false
    }

    console.log(`✅ 成功儲存 ${fragments.length} 個 fragments 到雲端`)
    return true

  } catch (error) {
    console.error('❌ 儲存 fragments 時發生錯誤:', error)
    return false
  }
}

// 新增單個 fragment
export async function saveFragment(fragment: Fragment): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // 轉換為資料庫格式
    const dbFragment = fragmentToDbFragment(fragment, userId)
    
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert([dbFragment], { onConflict: 'id' })

    if (error) {
      console.error('❌ Failed to save fragment:', error)
      return false
    }

    console.log(`✅ 成功儲存 fragment: ${fragment.id}`)
    return true

  } catch (error) {
    console.error('❌ 儲存單個 fragment 時發生錯誤:', error)
    return false
  }
}

// 改善的完整儲存 fragment（包含 notes 和 tags）
export async function saveFragmentComplete(fragment: Fragment): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.error('Supabase client not available')
    return false
  }

  const userId = await AuthHelper.getUserId()
  if (!userId) {
    console.error('User not authenticated')
    return false
  }

  console.log(`🔄 開始完整儲存 fragment: ${fragment.id}`)

  try {
    // 使用單一事務來確保資料一致性
    const { error: txError } = await supabase.rpc('save_fragment_complete', {
      fragment_data: fragmentToDbFragment(fragment, userId),
      tags_data: fragment.tags || [],
      notes_data: fragment.notes || []
    })

    if (txError) {
      // 如果資料庫不支援 RPC，則回退到逐步儲存
      console.log('RPC 不可用，使用逐步儲存方式')
      return await saveFragmentStepByStep(fragment)
    }

    console.log(`✅ 完整儲存 fragment 成功: ${fragment.id}`)
    return true
    
  } catch (error) {
    console.error('❌ 完整儲存 fragment 失敗，嘗試逐步儲存:', error)
    return await saveFragmentStepByStep(fragment)
  }
}

// 逐步儲存的後備方案
async function saveFragmentStepByStep(fragment: Fragment): Promise<boolean> {
  try {
    // 1. 儲存基本 fragment 資料
    const success = await saveFragment(fragment)
    if (!success) {
      throw new Error('Failed to save basic fragment data')
    }

    // 2. 儲存 tags（如果有）
    if (fragment.tags && fragment.tags.length > 0) {
      for (const tag of fragment.tags) {
        const tagSuccess = await addTagToFragment(fragment.id, tag)
        if (!tagSuccess) {
          console.warn(`警告: 無法儲存標籤 "${tag}" 到 fragment ${fragment.id}`)
        }
      }
    }

    // 3. 儲存 notes（如果有）
    if (fragment.notes && fragment.notes.length > 0) {
      for (const note of fragment.notes) {
        const noteSuccess = await addNote(fragment.id, note)
        if (!noteSuccess) {
          console.warn(`警告: 無法儲存筆記 "${note.title}" 到 fragment ${fragment.id}`)
        }
      }
    }

    console.log(`✅ 逐步儲存 fragment 成功: ${fragment.id}`)
    return true
    
  } catch (error) {
    console.error('❌ 逐步儲存 fragment 失敗:', error)
    return false
  }
}

// 刪除 fragment
export async function deleteFragment(fragmentId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // 檢查 fragment 是否屬於當前用戶
    const { data: fragment, error: fragmentError } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    if (fragmentError || !fragment) {
      console.error('Fragment not found or access denied')
      return false
    }

    // 刪除 fragment（關聯的 notes 和 tags 應該透過 CASCADE 自動刪除）
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', fragmentId)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Failed to delete fragment:', error)
      return false
    }

    console.log(`✅ 成功刪除 fragment: ${fragmentId}`)
    return true

  } catch (error) {
    console.error('❌ 刪除 fragment 時發生錯誤:', error)
    return false
  }
}

// 更新 fragment
export async function updateFragment(fragmentId: string, updates: Partial<Fragment>): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // 檢查 fragment 是否屬於當前用戶
    const { data: fragment, error: fragmentError } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    if (fragmentError || !fragment) {
      console.error('Fragment not found or access denied')
      return false
    }

    // 移除關聯資料和不可更新的欄位
    const { notes, tags, relations, id, createdAt, creator, lastEditor, childIds, ...basicUpdates } = updates

    const { error } = await supabase
      .from(TABLE_NAME)
      .update({
        ...basicUpdates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', fragmentId)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Failed to update fragment:', error)
      return false
    }

    console.log(`✅ 成功更新 fragment: ${fragmentId}`)
    return true

  } catch (error) {
    console.error('❌ 更新 fragment 時發生錯誤:', error)
    return false
  }
}

// 根據 ID 獲取單個 fragment
export async function getFragmentById(fragmentId: string): Promise<Fragment | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 沒有找到記錄
        return null
      }
      console.error('❌ Failed to get fragment:', error)
      return null
    }

    // 載入關聯資料
    const [notes, tags] = await Promise.all([
      getNotesByFragmentId(fragmentId),
      getTagsByFragmentId(fragmentId)
    ])

    return dbFragmentToFragment(data, notes, tags)

  } catch (error) {
    console.error('❌ 獲取 fragment 時發生錯誤:', error)
    return null
  }
}