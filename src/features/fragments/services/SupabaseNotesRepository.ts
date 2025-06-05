import { getSupabaseClient } from '@/lib/supabase/client'
import { Note } from '@/features/fragments/types/fragment'
import { AuthHelper } from '@/lib/authHelper'

const TABLE = 'notes'

export async function addNote(fragmentId: string, note: Note): Promise<boolean> {
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
      .from('fragments')
      .select('id')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    if (fragmentError || !fragment) {
      throw new Error('Fragment not found or access denied')
    }

    const { error } = await supabase.from(TABLE).insert({
      id: note.id,
      fragment_id: fragmentId,
      title: note.title,
      value: note.value,
      color: note.color,
      isPinned: note.isPinned,
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: note.updatedAt || new Date().toISOString()
    })

    if (error) {
      throw new Error(`Failed to add note: ${error.message}`)
    }

    console.log(`✅ 成功新增 note: ${note.id}`)
    return true

  } catch (error) {
    console.error('❌ 新增 note 時發生錯誤:', error)
    return false
  }
}

export async function updateNote(noteId: string, updates: Partial<Note>): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // 檢查權限：note 是否屬於用戶的 fragment
    const { data: noteWithFragment, error: noteError } = await supabase
      .from(TABLE)
      .select(`
        id,
        fragment_id,
        fragments!inner(user_id)
      `)
      .eq('id', noteId)
      .eq('fragments.user_id', userId)
      .single()

    if (noteError || !noteWithFragment) {
      throw new Error('Note not found or access denied')
    }

    const { error } = await supabase
      .from(TABLE)
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', noteId)

    if (error) {
      throw new Error(`Failed to update note: ${error.message}`)
    }

    console.log(`✅ 成功更新 note: ${noteId}`)
    return true

  } catch (error) {
    console.error('❌ 更新 note 時發生錯誤:', error)
    return false
  }
}

export async function deleteNote(noteId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // 檢查權限：note 是否屬於用戶的 fragment
    const { data: noteWithFragment, error: noteError } = await supabase
      .from(TABLE)
      .select(`
        id,
        fragment_id,
        fragments!inner(user_id)
      `)
      .eq('id', noteId)
      .eq('fragments.user_id', userId)
      .single()

    if (noteError || !noteWithFragment) {
      throw new Error('Note not found or access denied')
    }

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', noteId)

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`)
    }

    console.log(`✅ 成功刪除 note: ${noteId}`)
    return true

  } catch (error) {
    console.error('❌ 刪除 note 時發生錯誤:', error)
    return false
  }
}

export async function getNotesByFragmentId(fragmentId: string): Promise<Note[]> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    // 這個函數通常在 loadFragments 中被調用，那時已經驗證過用戶權限
    // 但為了安全起見，還是可以加上權限檢查
    const userId = await AuthHelper.getUserId()
    if (!userId) {
      console.warn('User not authenticated')
      return []
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('fragment_id', fragmentId)

    if (error) {
      throw new Error(`Failed to load notes: ${error.message}`)
    }

    return (data as Note[]) || []

  } catch (error) {
    console.error('❌ 載入 notes 時發生錯誤:', error)
    return []
  }
}