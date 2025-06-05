import { getSupabaseClient } from '@/lib/supabase/client'
import { Fragment, DbFragment, dbFragmentToFragment, fragmentToDbFragment } from '@/features/fragments/types/fragment'
import { AuthHelper } from '@/lib/authHelper'
import { getNotesByFragmentId } from './SupabaseNotesRepository'
import { getTagsByFragmentId } from './SupabaseTagsRepository'

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
      throw new Error(`Failed to load fragments: ${error.message}`)
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
    throw error // 重新拋出錯誤，讓調用方處理
  }
}

export async function saveFragments(fragments: Fragment[]): Promise<void> {
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
      return
    }

    // 轉換為資料庫格式
    const fragmentsBasicData = fragments.map(fragment => 
      fragmentToDbFragment(fragment, userId)
    )

    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert(fragmentsBasicData, { onConflict: 'id' })
      
    if (error) {
      throw new Error(`Failed to save fragments: ${error.message}`)
    }

    console.log(`✅ 成功儲存 ${fragments.length} 個 fragments 到雲端`)

  } catch (error) {
    console.error('❌ 儲存 fragments 時發生錯誤:', error)
    throw error
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
      throw new Error(`Failed to save fragment: ${error.message}`)
    }

    console.log(`✅ 成功儲存 fragment: ${fragment.id}`)
    return true

  } catch (error) {
    console.error('❌ 儲存單個 fragment 時發生錯誤:', error)
    return false
  }
}

// 完整儲存 fragment（包含 notes 和 tags）
export async function saveFragmentComplete(fragment: Fragment): Promise<boolean> {
  try {
    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    console.log(`🔄 開始完整儲存 fragment: ${fragment.id}`)

    // 1. 儲存基本 fragment 資料
    const success = await saveFragment(fragment)
    if (!success) {
      throw new Error('Failed to save basic fragment data')
    }

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
    console.error('❌ 完整儲存 fragment 失敗:', error)
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
      throw new Error('Fragment not found or access denied')
    }

    // 刪除 fragment（關聯的 notes 和 tags 應該透過 CASCADE 自動刪除）
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', fragmentId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to delete fragment: ${error.message}`)
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
      throw new Error('Fragment not found or access denied')
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
      throw new Error(`Failed to update fragment: ${error.message}`)
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
      throw new Error(`Failed to get fragment: ${error.message}`)
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