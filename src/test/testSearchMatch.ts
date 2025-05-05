import { matchFragment, MatchMode, SearchToken } from '../features/search/searchHelpers'
import { Fragment } from '../features/fragments/types/fragment'
import type { Note } from '../features/fragments/types/fragment'

// ✅ 測試片段（簡化版）
type TestFragment = {
  content?: string
  tags?: string[]
  notes?: Note[]
}

function testMatchFragment(
  fragment: TestFragment,
  tokens: SearchToken[],
  mode: MatchMode,
  scopes: ('fragment' | 'note' | 'tag')[]
) {
  // ✅ 包裝成正式 Fragment 型別所需的必要欄位
  const fullFragment: Fragment = {
    id: 'test-id',
    type: 'fragment',
    content: fragment.content || '',
    tags: fragment.tags || [],
    notes: fragment.notes || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const result = matchFragment(fullFragment, tokens, mode, scopes)

  console.log(`\n== 測試片段 ==`)
  console.log(`內容: ${fragment.content}`)
  console.log(`標籤: ${fragment.tags?.join(', ')}`)
  console.log(`筆記: ${fragment.notes?.map(n => n.value).join(', ')}`)
  console.log(`搜尋 tokens: ${JSON.stringify(tokens)}`)
  console.log(`範圍: ${scopes.join(', ')}`)
  console.log(`模式: ${mode}`)
  console.log(`結果: ${result ? '✅ 命中' : '❌ 未命中'}`)
}

// 測試資料
const fragment: TestFragment = {
  content: '5',
  tags: ['數字', '範例'],
  notes: [
    {
      id: 'note-1',
      title: '測試筆記',
      value: '一些註解文字'
    }
  ]
}
const token: SearchToken = { type: 'text', value: '5' }

testMatchFragment(fragment, [token], 'substring', ['fragment'])
testMatchFragment(fragment, [token], 'exact', ['fragment'])
testMatchFragment(fragment, [token], 'prefix', ['fragment'])
testMatchFragment(fragment, [token], 'substring', ['tag'])
testMatchFragment(fragment, [token], 'substring', ['note'])
