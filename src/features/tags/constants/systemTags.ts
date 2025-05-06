// src/features/tags/constants/systemTags.ts
/**
 * 系統保留標籤 (不可手動新增 / 只能系統自動加)
 * ※ 兩種語系＋簡單英文別名都列進來，之後如果要再新增只改這裡
 */
/**
 * ✅ 顯示在 UI 的系統標籤（中文）
 */
export const SYSTEM_TAG_MAP: Record<string, string[]> = {
    '今日': ['今天', 'today'],
    '本週': ['本周', 'week'],
    '本月': ['month'],
    '熱門': [],
    '無標籤': [],
  }
  
  /** 所有系統標籤（含所有別名） */
  export const SYSTEM_TAGS = Object.entries(SYSTEM_TAG_MAP).flatMap(([main, aliases]) => [main, ...aliases])
  
  /** 判斷某字串是否為系統標籤（任何語言版本都算） */
  export const isSystemTag = (tag: string) =>
    SYSTEM_TAGS.includes(tag.replace(/^#/, ''))
  
  /** 判斷是否為主標籤（中文名稱，要顯示在 UI 的） */
  export const isDisplaySystemTag = (tag: string) =>
    Object.keys(SYSTEM_TAG_MAP).includes(tag.replace(/^#/, ''))
  
  /**
   * 根據別名（任一語言）找回對應的主系統標籤
   * e.g. getMainSystemTag('today') → '今日'
   */
  export const getMainSystemTag = (input: string): string | null => {
    const tag = input.replace(/^#/, '')
    for (const [main, aliases] of Object.entries(SYSTEM_TAG_MAP)) {
      if (main === tag || aliases.includes(tag)) return main
    }
    return null
  }