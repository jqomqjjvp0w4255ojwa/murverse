// src/shared/hook/useSingleUserTagSync.ts

'use client'

import { useEffect } from 'react'
import { useTagCollectionStore } from '@/features/tags/store/useTagCollectionStore'
import { useTagsStore } from '@/features/tags/store/useTagsStore'
import { useGlobalTagsStore } from '@/features/tags/store/useGlobalTagsStore'

/**
 * 臨時模塊：單用戶模式下同步個人收藏標籤到全域標籤（單向同步）
 * @deprecated 此模塊僅用於單用戶模式過渡期間。在多用戶版本中將移除，請直接使用 useTagCollectionStore。
 */
export function useSingleUserTagSync() {
  const { globalTags, addGlobalTag, removeGlobalTags } = useTagsStore()
  const { collectedTags, addTag, removeTag } = useTagCollectionStore()
  const { addGlobalTag: addToRealGlobalTags } = useGlobalTagsStore()
  
  // 初始同步 - 只將個人收藏標籤同步到舊版全域標籤和真正的全域標籤（單向同步）
  useEffect(() => {
    console.log('🔄 單用戶同步：個人收藏標籤 -> 舊版全域和真正全域標籤（單向同步）');
    
    // 將收藏標籤添加到舊版全域標籤（單向同步）
    const tagsToAddToGlobal = collectedTags
      .filter(name => !globalTags.some(t => t.name === name));
    
    if (tagsToAddToGlobal.length > 0) {
      console.log(`➕ 同步：添加 ${tagsToAddToGlobal.length} 個個人收藏標籤到全域標籤`);
      tagsToAddToGlobal.forEach(tag => {
        // 添加到舊版全域標籤
        addGlobalTag(tag);
        // 同時添加到真正的全域標籤（為未來多用戶模式準備）
        addToRealGlobalTags(tag);
      });
    }
    
    // 不再將全域標籤同步到個人收藏
  }, [collectedTags, globalTags, addGlobalTag, addToRealGlobalTags]);
  
  return {
    // 同步添加標籤（同時添加到個人收藏和全域標籤）
    syncAddTag: (tag: string) => {
      // 添加到個人收藏
      addTag(tag);
      
      // 添加到舊版全域標籤
      addGlobalTag(tag);
      
      // 添加到真正的全域標籤（為未來多用戶模式準備）
      addToRealGlobalTags(tag);
    },
    
    // 同步移除標籤（只從個人收藏移除，不影響全域標籤）
    syncRemoveTags: (tags: string[]) => {
      // 從個人收藏中移除標籤
      tags.forEach(tag => removeTag(tag));
      
      // 不再從舊版全域標籤中移除
      // 也不從真正的全域標籤中移除
    },
    
    // 執行一次性全面同步（可用於診斷工具）
    forceSync: () => {
      const { globalTags } = useTagsStore.getState();
      const { collectedTags } = useTagCollectionStore.getState();
      
      console.log('🔄 執行強制全面同步...');
      
      // 將收藏標籤添加到舊版全域標籤和真正全域標籤
      collectedTags.forEach(tag => {
        // 添加到舊版全域標籤
        if (!globalTags.some(t => t.name === tag)) {
          useTagsStore.getState().addGlobalTag(tag);
        }
        
        // 添加到真正的全域標籤
        useGlobalTagsStore.getState().addGlobalTag(tag);
      });
      
      console.log('✅ 強制同步完成');
    }
  };
}