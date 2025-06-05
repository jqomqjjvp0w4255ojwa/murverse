import { getSupabaseClient } from '@/lib/supabase/client'
import { AuthHelper } from '@/lib/authHelper'

const TABLE = 'fragment_tags'

// 導出所有函數，確保其他模組可以正確引用

export async function getTagsByFragmentId(fragmentId: string): Promise<string[]> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    // 這個函數通常在 loadFragments 中被調用，那時已經驗證過用戶權限
    // 但為了安全起見，還是可以加上基本檢查
    const userId = await AuthHelper.getUserId()
    if (!userId) {
      console.warn('User not authenticated')
      return []
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('tag')
      .eq('fragment_id', fragmentId)

    if (error) {
      throw new Error(`Failed to load tags: ${error.message}`)
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

    // 檢查標籤是否已存在（避免重複）
    const { data: existingTag } = await supabase
      .from(TABLE)
      .select('tag')
      .eq('fragment_id', fragmentId)
      .eq('tag', tag.trim())
      .single()

    if (existingTag) {
      console.log(`ℹ️ Tag "${tag}" already exists on fragment: ${fragmentId}`)
      return true // 已存在視為成功
    }

    // 新增標籤
    const { error } = await supabase
      .from(TABLE)
      .insert({
        fragment_id: fragmentId,
        tag: tag.trim()
      })

    if (error) {
      throw new Error(`Failed to add tag: ${error.message}`)
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

    // 刪除標籤
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('fragment_id', fragmentId)
      .eq('tag', tag.trim())

    if (error) {
      throw new Error(`Failed to remove tag: ${error.message}`)
    }

    console.log(`✅ 成功刪除 tag "${tag}" from fragment: ${fragmentId}`)
    return true

  } catch (error) {
    console.error('❌ 刪除 tag 時發生錯誤:', error)
    return false
  }
}

// 新增：獲取用戶的所有標籤統計
export async function getUserTagStats(): Promise<Array<{name: string, count: number}>> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // 使用 JOIN 查詢獲取用戶的所有標籤及使用次數
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        tag,
        fragments!inner(user_id)
      `)
      .eq('fragments.user_id', userId)

    if (error) {
      throw new Error(`Failed to load tag stats: ${error.message}`)
    }

    // 統計每個標籤的使用次數
    const tagCounts: Record<string, number> = {}
    data?.forEach(item => {
      tagCounts[item.tag] = (tagCounts[item.tag] || 0) + 1
    })

    // 轉換為陣列並排序
    const tagStats = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    console.log(`✅ 載入 ${tagStats.length} 個用戶標籤統計`)
    return tagStats

  } catch (error) {
    console.error('❌ 載入標籤統計時發生錯誤:', error)
    return []
  }
}