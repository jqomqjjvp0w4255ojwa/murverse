// src/features/tags/utils/tagDiagnostics.ts

import { useGlobalTagsStore } from '@/features/tags/store/useGlobalTagsStore'
import { useTagCollectionStore } from '@/features/tags/store/useTagCollectionStore'
import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'
import { useSingleUserTagSync } from '@/shared/hook/useSingleUserTagSync'

/**
 * 標籤診斷工具
 * 用於檢查並修復標籤同步問題
 */
export function runTagDiagnostics() {
  // 獲取各種標籤數據
  const { globalTags } = useGlobalTagsStore.getState()
  const { collectedTags } = useTagCollectionStore.getState()
  const { globalTags: realGlobalTags } = useGlobalTagsStore.getState()
  const { fragments } = useFragmentsStore.getState()
  
  // 🚀 修復：檢查 fragments 是否為 null
  if (!fragments) {
    console.warn('⚠️ fragments 為 null，無法執行診斷')
    return {
      personalTagsCount: collectedTags.length,
      oldGlobalTagsCount: globalTags.length,
      realGlobalTagsCount: realGlobalTags.length,
      fragmentTagsCount: 0,
      notInPersonalTags: [],
      notInOldGlobalTags: [],
      notInRealGlobalTags: [],
      fixSyncIssues: () => {
        console.warn('⚠️ fragments 為 null，無法執行同步修復')
      }
    }
  }
  
  // 收集所有碎片中的標籤
  const fragmentTagsSet = new Set<string>()
  fragments.forEach(fragment => {
    fragment.tags.forEach(tag => fragmentTagsSet.add(tag))
  })
  const fragmentTags = Array.from(fragmentTagsSet)
  
  // 找出不同數據源之間的差異
  const notInPersonalTags = fragmentTags.filter(tag => 
    !collectedTags.some(t => t.toLowerCase() === tag.toLowerCase())
  )
  
  const notInOldGlobalTags = fragmentTags.filter(tag => 
    !globalTags.some(t => t.name.toLowerCase() === tag.toLowerCase())
  )
  
  const notInRealGlobalTags = fragmentTags.filter(tag => 
    !realGlobalTags.some(t => t.name.toLowerCase() === tag.toLowerCase())
  )
  
  // 打印診斷結果
  console.log('===== 標籤診斷結果 =====')
  console.log(`個人收藏標籤數量: ${collectedTags.length}`)
  console.log(`舊版全域標籤數量: ${globalTags.length}`)
  console.log(`真正全域標籤數量: ${realGlobalTags.length}`)
  console.log(`碎片中標籤數量: ${fragmentTags.length}`)
  console.log(`未收藏的標籤: ${notInPersonalTags.length}`, notInPersonalTags)
  console.log(`未在舊版全域的標籤: ${notInOldGlobalTags.length}`, notInOldGlobalTags)
  console.log(`未在真正全域的標籤: ${notInRealGlobalTags.length}`, notInRealGlobalTags)
  
  return {
    // 診斷數據
    personalTagsCount: collectedTags.length,
    oldGlobalTagsCount: globalTags.length,
    realGlobalTagsCount: realGlobalTags.length,
    fragmentTagsCount: fragmentTags.length,
    notInPersonalTags,
    notInOldGlobalTags,
    notInRealGlobalTags,
    
    // 修復函數 - 執行全面標籤同步
    fixSyncIssues: () => {
      const { forceSync } = useSingleUserTagSync()
      forceSync()
      console.log('已執行標籤同步修復')
      
      // 額外修復 - 確保所有碎片標籤都在個人收藏中
      const { addTag } = useTagCollectionStore.getState()
      notInPersonalTags.forEach(tag => {
        console.log(`修復: 添加碎片標籤 "${tag}" 到個人收藏`)
        addTag(tag)
      })
    }
  }
}