import { getSupabaseClient } from '@/lib/supabase/client'
import { Note } from '@/features/fragments/types/fragment'

const TABLE = 'notes'

export async function addNote(fragmentId: string, note: Note): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.warn('❌ Supabase client not available')
      return false
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
      console.error('❌ 新增 note 失敗:', error.message)
      return false
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
      console.warn('❌ Supabase client not available')
      return false
    }

    const { error } = await supabase
      .from(TABLE)
      .update({
        ...updates,
        updatedAt: new Date().toISOString() // 更新時間戳
      })
      .eq('id', noteId)

    if (error) {
      console.error('❌ 更新 note 失敗:', error.message)
      return false
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
      console.warn('❌ Supabase client not available')
      return false
    }

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', noteId)

    if (error) {
      console.error('❌ 刪除 note 失敗:', error.message)
      return false
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
      console.warn('❌ Supabase client not available')
      return []
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('fragment_id', fragmentId)

    if (error) {
      console.error('❌ 載入 note 失敗:', error.message)
      return []
    }

    // 資料已經是駝峰式格式，直接返回
    return (data as Note[]) || []

  } catch (error) {
    console.error('❌ 載入 notes 時發生錯誤:', error)
    return []
  }
}