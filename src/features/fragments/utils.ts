// src/features/fragments/utils.ts
// 共享工具函數

/**
 * 截短文字（超出長度加上省略號）
 */
export function truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "......";
  }
  
  /**
   * 根據內容決定展示方向
   * @param content 主要內容
   * @param note 筆記內容
   * @param useRandom 是否使用隨機性（UI顯示時使用，存儲時不使用）
   */
  export function decideDirection(
    content: string, 
    note?: string, 
    useRandom: boolean = false
  ): 'horizontal' | 'vertical' {
    const full = `${content} ${note ?? ''}`
    const hasEnglish = /[a-zA-Z]/.test(full)
    const isOnlyCJK = /^[\u4e00-\u9fa5\u3040-\u30ff\s]+$/.test(full)
  
    // 如果含有英文、數字或特殊符號，一律橫排
    if (hasEnglish || /\d/.test(full) || /[{}[\]()=;:]/.test(full)) return 'horizontal'
    
    // 純中文或日文
    if (isOnlyCJK) {
      // 存儲時使用確定性邏輯，UI顯示時可以加入隨機因素
      return useRandom && Math.random() < 0.3 ? 'vertical' : 'horizontal'
    }
    
    return 'horizontal'
  }
  
  /**
   * 格式化日期
   */
  export function formatDate(dateString?: string): string {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }
  
  /**
   * 檢查日期是否在指定範圍內
   */
  export function isDateInRange(
    dateStr: string, 
    timeRange: string, 
    customStart?: Date, 
    customEnd?: Date
  ): boolean {
    const date = new Date(dateStr)
    const now = new Date()
    
    // 重置當前時間為當天開始（00:00:00）
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    switch(timeRange) {
      case 'today':
        return date >= today
      case 'yesterday': {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return date >= yesterday && date < today
      }
      case 'week': {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay()) // 設為本週日（一週的開始）
        return date >= weekStart
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        return date >= monthStart
      }
      case 'custom':
        return (
          (!customStart || date >= customStart) && 
          (!customEnd || date <= customEnd)
        )
      case 'all':
      default:
        return true
    }
  }