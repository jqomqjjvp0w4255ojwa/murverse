import { getSupabaseClient } from '@/lib/supabase/client'

export async function loadCollectedTags(): Promise<string[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
    return []
  }

  // TODO: 實作用戶認證後啟用
  // const userId = await AuthHelper.getUserId()
  // if (!userId) {
  //   console.warn('無法獲取用戶 ID，無法載入收藏標籤')
  //   return []
  // }

  try {
    // 暫時使用 localStorage 作為備用
    const stored = localStorage.getItem('collected_tags')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('載入收藏標籤失敗:', error)
    return []
  }
}

export async function saveCollectedTags(tags: string[]): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
    return
  }

  try {
    // 暫時使用 localStorage 作為備用
    localStorage.setItem('collected_tags', JSON.stringify(tags))
    console.log('收藏標籤已儲存到本地')
  } catch (error) {
    console.error('儲存收藏標籤失敗:', error)
  }
}