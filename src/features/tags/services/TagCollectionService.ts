// features/tags/services/TagCollectionService.ts
import { supabase } from '@/lib/supabase/supabaseClient'
import { AuthHelper } from '@/lib/authHelper'

export async function loadCollectedTags(): Promise<string[]> {
  const userId = await AuthHelper.getUserId()
  if (!userId) {
    console.warn('無法獲取用戶 ID，無法載入收藏標籤')
    return []
  }

  const { data, error } = await supabase
    .from('tag_collections')
    .select('tags')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return [] // 找不到資料時
    console.error('讀取收藏失敗:', error)
    return []
  }

  console.log(`✅ 成功載入 ${data?.tags?.length || 0} 個收藏標籤`)
  return data.tags || []
}

export async function saveCollectedTags(tags: string[]): Promise<void> {
  const userId = await AuthHelper.getUserId()
  if (!userId) {
    console.warn('無法獲取用戶 ID，無法儲存收藏標籤')
    return
  }

  const { error } = await supabase.from('tag_collections').upsert([
    { 
      user_id: userId,
      tags 
    }
  ], { onConflict: 'user_id' })
  
  if (error) {
    console.error('儲存收藏失敗:', error)
  } else {
    console.log(`✅ 成功儲存 ${tags.length} 個收藏標籤`)
  }
}