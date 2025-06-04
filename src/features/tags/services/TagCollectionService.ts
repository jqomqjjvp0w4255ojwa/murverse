// features/tags/services/TagCollectionService.ts
import { getSupabaseClient } from '@/lib/supabase/client'
import { AuthHelper } from '@/lib/authHelper'

export async function loadCollectedTags(): Promise<string[]> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.warn('❌ Supabase client not available')
      return []
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      console.warn('❌ 無法獲取用戶 ID，無法載入收藏標籤')
      return []
    }

    const { data, error } = await supabase
      .from('tag_collections')
      .select('tags')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return [] // 找不到資料時
      console.error('❌ 讀取收藏失敗:', error)
      return []
    }

    const tags = data?.tags || []
    console.log(`✅ 成功載入 ${tags.length} 個收藏標籤`)
    return tags

  } catch (error) {
    console.error('❌ 載入收藏標籤時發生錯誤:', error)
    return []
  }
}

export async function saveCollectedTags(tags: string[]): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.warn('❌ Supabase client not available')
      return false
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      console.warn('❌ 無法獲取用戶 ID，無法儲存收藏標籤')
      return false
    }

    const { error } = await supabase.from('tag_collections').upsert([
      { 
        user_id: userId,
        tags 
      }
    ], { onConflict: 'user_id' })
    
    if (error) {
      console.error('❌ 儲存收藏失敗:', error)
      return false
    } else {
      console.log(`✅ 成功儲存 ${tags.length} 個收藏標籤`)
      return true
    }

  } catch (error) {
    console.error('❌ 儲存收藏標籤時發生錯誤:', error)
    return false
  }
}