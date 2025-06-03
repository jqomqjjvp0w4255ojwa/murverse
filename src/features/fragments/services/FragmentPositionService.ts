import { getSupabaseClient } from '@/lib/supabase/client'
import { GridPosition } from '@/features/fragments/types/gridTypes'

export async function saveFragmentPositionToSupabase(fragmentId: string, position: GridPosition) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.warn('Supabase client not available')
    return
  }

  const { error } = await supabase
    .from('fragment_positions')
    .upsert({
      fragment_id: fragmentId,
      row: position.row,
      col: position.col,
      updated_at: new Date().toISOString()
    }, { onConflict: 'fragment_id' })

  if (error) {
    console.error(`❌ 雲端儲存位置失敗 fragment: ${fragmentId}`, error)
  } else {
    console.log(`✅ 雲端儲存位置成功 fragment: ${fragmentId}`, position)
  }
}