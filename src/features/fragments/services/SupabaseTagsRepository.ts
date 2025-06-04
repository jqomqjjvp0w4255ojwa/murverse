import { getSupabaseClient } from '@/lib/supabase/client'

const TABLE = 'fragment_tags'

export async function getTagsByFragmentId(fragmentId: string): Promise<string[]> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.warn('❌ Supabase client not available')
      return []
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('tag')
      .eq('fragment_id', fragmentId)

    if (error) {
      console.error('❌ 載入 tags 失敗:', error.message)
      return []
    }

    const tags = data?.map((d: { tag: string }) => d.tag) || []
    console.log(`✅ 載入 ${tags.length} 個 tags for fragment: ${fragmentId}`)
    return tags

  } catch (error) {
    console.error('❌ 載入 tags 時發生錯誤:', error)
    return []
  }
}

export async function addTagToFragment(fragmentId: string, tag: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.warn('❌ Supabase client not available')
      return false
    }

    const { error } = await supabase
      .from(TABLE)
      .upsert([{ fragment_id: fragmentId, tag }])

    if (error) {
      console.error('❌ 新增 tag 失敗:', error.message)
      return false
    }

    console.log(`✅ 成功新增 tag "${tag}" to fragment: ${fragmentId}`)
    return true

  } catch (error) {
    console.error('❌ 新增 tag 時發生錯誤:', error)
    return false
  }
}

export async function removeTagFromFragment(fragmentId: string, tag: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.warn('❌ Supabase client not available')
      return false
    }

    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('fragment_id', fragmentId)
      .eq('tag', tag)

    if (error) {
      console.error('❌ 刪除 tag 失敗:', error.message)
      return false
    }

    console.log(`✅ 成功刪除 tag "${tag}" from fragment: ${fragmentId}`)
    return true

  } catch (error) {
    console.error('❌ 刪除 tag 時發生錯誤:', error)
    return false
  }
}