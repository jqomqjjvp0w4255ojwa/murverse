// constants/metaTags.ts
/**
 * 特殊標籤（Meta Tags）的定義
 * 
 * 📌 用途說明：
 * 集中定義所有特殊標籤，包含ID、名稱與圖示
 * 
 * ✅ 使用場景：
 * - 用於 MetaTagsSelector 顯示可選擇的特殊標籤
 * - 搭配 MetaTagsService 實現標籤篩選邏輯
 */

// 定義 MetaTag 類型
export interface MetaTag {
    id: string;
    name: string;
    icon: string;
  }
  
  // 預設的特殊標籤列表
  export const DEFAULT_META_TAGS: MetaTag[] = [
    { id: 'group', name: '群組', icon: '📚' },
    { id: 'recent', name: '最近', icon: '🕒' },
    { id: 'favorite', name: '收藏', icon: '⭐' },
    { id: 'important', name: '重要', icon: '❗' },
  ];