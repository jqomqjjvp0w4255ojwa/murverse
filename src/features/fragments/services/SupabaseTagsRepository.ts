import { getSupabaseClient } from '@/lib/supabase/supabaseClient'

const TABLE = 'fragment_tags'

export async function getTagsByFragmentId(fragmentId: string): Promise<string[]> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
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

  return data.map(d => d.tag)
}

export async function addTagToFragment(fragmentId: string, tag: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
    return
  }

  const { error } = await supabase
    .from(TABLE)
    .upsert([{ fragment_id: fragmentId, tag }])
  if (error) console.error('❌ 新增 tag 失敗:', error.message)
}

export async function removeTagFromFragment(fragmentId: string, tag: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
    return
  }

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('fragment_id', fragmentId)
    .eq('tag', tag)
  if (error) console.error('❌ 刪除 tag 失敗:', error.message)
}