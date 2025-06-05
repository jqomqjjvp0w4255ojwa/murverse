import { getSupabaseClient } from '@/lib/supabase/client'
import { AuthHelper } from '@/lib/authHelper'
import { GridPosition } from '@/features/fragments/types/gridTypes'

export async function saveFragmentPositionToSupabase(fragmentId: string, position: GridPosition) {
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

    const { error } = await supabase
      .from('fragment_positions')
      .upsert({
        fragment_id: fragmentId,
        user_id: userId, // 加入用戶 ID
        row: position.row,
        col: position.col,
        updated_at: new Date().toISOString()
      }, { onConflict: 'fragment_id' }) // 暫時使用單一主鍵，直到資料庫更新

    if (error) {
      console.error(`❌ 雲端儲存位置失敗 fragment: ${fragmentId}`, error)
      return { success: false, error: error.message }
    }

    console.log(`✅ 雲端儲存位置成功 fragment: ${fragmentId}`, position)
    return { success: true }

  } catch (error) {
    console.error(`❌ 保存片段位置時發生錯誤:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}

// 新增：載入片段位置
export async function loadFragmentPositionsFromSupabase(): Promise<Record<string, GridPosition>> {
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
      .from('fragment_positions')
      .select('fragment_id, row, col')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to load positions: ${error.message}`)
    }

    // 轉換為 Record<fragmentId, GridPosition> 格式
    const positions: Record<string, GridPosition> = {}
    data?.forEach(item => {
      positions[item.fragment_id] = {
        row: item.row,
        col: item.col
      }
    })

    console.log(`✅ 載入 ${Object.keys(positions).length} 個片段位置`)
    return positions

  } catch (error) {
    console.error('❌ 載入片段位置時發生錯誤:', error)
    return {}
  }
}

// 新增：刪除片段位置
export async function deleteFragmentPositionFromSupabase(fragmentId: string) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const userId = await AuthHelper.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('fragment_positions')
      .delete()
      .eq('fragment_id', fragmentId)
      .eq('user_id', userId)

    if (error) {
      console.error(`❌ 刪除片段位置失敗: ${fragmentId}`, error)
      return { success: false, error: error.message }
    }

    console.log(`✅ 刪除片段位置成功: ${fragmentId}`)
    return { success: true }

  } catch (error) {
    console.error(`❌ 刪除片段位置時發生錯誤:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}