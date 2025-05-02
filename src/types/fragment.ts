// src/types/fragment.ts

/**
 * 筆記結構定義
 */
export interface Note {
  id: string;
  title: string;
  value: string;
  createdAt?: string;  // 可選的創建時間
  updatedAt?: string;  // 可選的更新時間
  color?: string;      // 可選的顏色標記
  isPinned?: boolean;  // 可選的置頂狀態
}

/**
 * 片段元數據類型
 */
export interface FragmentMeta {
  isArchived?: boolean;    // 是否已存檔
  isPinned?: boolean;      // 是否已置頂
  isFavorite?: boolean;    // 是否已收藏
  viewCount?: number;      // 查看次數
  editCount?: number;      // 編輯次數
  priority?: number;       // 優先級 (1-5)
  color?: string;          // 顏色標記
  customFields?: Record<string, any>; // 自定義欄位
}

/**
 * 關聯類型定義
 */
export type RelationType = 
  | 'meta'            // 元數據關聯
  | 'co_tagged_with'  // 共同標籤
  | 'reference'       // 引用關係
  | 'parent_child'    // 父子關係
  | 'sequence'        // 序列關係
  | 'similarity'      // 相似性關係
  | 'custom';         // 自定義關係

/**
 * 關聯結構定義
 */
export interface Relation {
  targetId: string;               // 目標片段ID
  type: RelationType;             // 關聯類型
  weight?: number;                // 關聯權重 (0-1)
  bidirectional?: boolean;        // 是否雙向關聯
  createdAt?: string;             // 創建時間
  description?: string;           // 關聯描述
  customData?: Record<string, any>; // 自定義關聯數據
}

/**
 * 片段類型定義
 */
export type FragmentType = 
  | 'fragment'   // 普通片段
  | 'tag'        // 標籤
  | 'meta'       // 元數據
  | 'system'     // 系統
  | 'group'      // 群組
  | 'template'   // 模板
  | 'collection'; // 集合

/**
 * 片段搜尋選項
 */
export interface FragmentSearchOptions {
  tags?: string[];          // 標籤過濾
  type?: FragmentType[];    // 類型過濾
  dateRange?: {             // 日期範圍
    from?: string;
    to?: string;
  };
  text?: string;            // 文本搜尋
  sortBy?: 'createdAt' | 'updatedAt' | 'order'; // 排序方式
  sortOrder?: 'asc' | 'desc'; // 排序順序
  limit?: number;           // 限制數量
  offset?: number;          // 偏移量
}

/**
 * 片段主結構定義
 */
export interface Fragment {
  id: string;                   // 唯一識別碼
  content: string;              // 內容
  type: FragmentType;           // 類型
  tags: string[];               // 標籤列表
  notes: Note[];                // 筆記列表
  relations?: Relation[];       // 關聯列表
  order?: number;               // 排序
  createdAt: string;            // 創建時間
  updatedAt: string;            // 更新時間
  meta?: FragmentMeta;          // 元數據
  parentId?: string;            // 父片段ID
  childIds?: string[];          // 子片段ID列表
  version?: number;             // 版本號
  creator?: string;             // 創建者
  lastEditor?: string;          // 最後編輯者
  status?: 'draft' | 'published' | 'archived'; // 狀態
}

/**
 * 片段變更歷史記錄
 */
export interface FragmentHistoryEntry {
  id: string;                // 歷史記錄ID
  fragmentId: string;        // 對應的片段ID
  timestamp: string;         // 時間戳
  changes: Partial<Fragment>; // 變更內容
  previousState: Fragment;   // 變更前狀態
  editor?: string;           // 編輯者
  reason?: string;           // 變更原因
}

/**
 * 片段批次操作結果
 */
export interface FragmentBatchResult {
  success: boolean;          // 操作是否成功
  count: number;             // 影響的片段數量
  errors?: {                 // 錯誤信息
    fragmentId: string;
    error: string;
  }[];
}

/**
 * 創建新片段的參數
 */
export type CreateFragmentParams = Omit<Fragment, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;               // 可選指定ID
};

/**
 * 更新片段的參數
 */
export type UpdateFragmentParams = Partial<Omit<Fragment, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * 標籤統計信息
 */
export interface TagStats {
  name: string;              // 標籤名稱
  count: number;             // 使用數量
  lastUsed?: string;         // 最後使用時間
  relatedTags?: {            // 相關標籤
    name: string;
    cooccurrence: number;    // 共現次數
  }[];
}

/**
 * 片段視圖模式
 */
export type FragmentViewMode = 
  | 'list'      // 列表視圖
  | 'grid'      // 網格視圖
  | 'kanban'    // 看板視圖
  | 'graph'     // 圖表視圖
  | 'calendar'  // 日曆視圖
  | 'timeline'; // 時間線視圖