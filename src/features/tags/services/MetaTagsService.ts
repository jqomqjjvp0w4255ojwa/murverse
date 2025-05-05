// services/MetaTagsService.ts
'use client'

import { Fragment } from '@/features/fragments/types/fragment';
import { MetaTag, DEFAULT_META_TAGS } from '@/features/tags/constants/metaTags';

/**
 * 特殊標籤服務 - 負責特殊標籤（Meta Tags）相關的邏輯
 * 
 * 📌 用途說明：
 * 定義特殊標籤的過濾邏輯，如群組、最近使用、收藏、重要等
 * 
 * 🧩 功能特色：
 * - 獲取預設特殊標籤列表
 * - 根據特殊標籤的 ID 對碎片進行過濾
 * - 支援多個特殊標籤的組合過濾（交集或聯集）
 */
export class MetaTagsService {
  /**
   * 獲取所有特殊標籤
   */
  static getMetaTags(): MetaTag[] {
    return DEFAULT_META_TAGS;
  }
  
  /**
   * 根據特殊標籤 ID 過濾碎片
   */
  static filterFragmentsByMetaTag(fragments: Fragment[], metaTagId: string): Fragment[] {
    switch(metaTagId) {
      case 'group':
        return this.filterFragmentsByGroup(fragments);
      case 'recent':
        return this.filterRecentFragments(fragments);
      case 'favorite':
        return this.filterFavoriteFragments(fragments);
      case 'important':
        return this.filterImportantFragments(fragments);
      default:
        return fragments;
    }
  }
  
  /**
   * 過濾屬於群組的碎片
   */
  static filterFragmentsByGroup(fragments: Fragment[]): Fragment[] {
    // 根據 Fragment 中的關係和類型來判斷群組
    
    // 方法1: 依據 fragment 類型為 'group' 的碎片
    const groupFragments = fragments.filter(f => f.type === 'group');
    
    // 方法2: 依據 childIds 屬性集合所有子碎片
    const childFragments = new Set<string>();
    groupFragments.forEach(groupFragment => {
      if (groupFragment.childIds) {
        groupFragment.childIds.forEach(id => childFragments.add(id));
      }
    });
    
    // 方法3: 依據 parentId 屬性找到所有屬於群組的碎片
    return fragments.filter(fragment => 
      // 碎片本身是群組
      fragment.type === 'group' || 
      // 碎片是某個群組的子項
      childFragments.has(fragment.id) ||
      // 碎片有父項且父項是群組
      (fragment.parentId && groupFragments.some(g => g.id === fragment.parentId))
    );
  }
  
  /**
   * 過濾最近更新的碎片（默認 7 天內）
   */
  static filterRecentFragments(fragments: Fragment[], daysLimit: number = 7): Fragment[] {
    const now = new Date().getTime();
    const timeLimit = now - (daysLimit * 24 * 60 * 60 * 1000); // 7天前的時間戳
    
    return fragments.filter(fragment => {
      if (!fragment.updatedAt) return false;
      
      const fragmentDate = new Date(fragment.updatedAt).getTime();
      return fragmentDate >= timeLimit;
    });
  }
  
  /**
   * 過濾收藏的碎片
   */
  static filterFavoriteFragments(fragments: Fragment[]): Fragment[] {
    return fragments.filter(fragment => 
      // 檢查 meta.isFavorite 屬性
      fragment.meta?.isFavorite === true
    );
  }
  
  /**
   * 過濾重要的碎片
   */
  static filterImportantFragments(fragments: Fragment[]): Fragment[] {
    return fragments.filter(fragment => 
      // 使用 meta.priority 來判斷重要性，假設 priority > 3 為重要
      fragment.meta?.priority !== undefined && fragment.meta.priority >= 4
    );
  }
  
  /**
   * 處理多個特殊標籤的複合過濾
   * @param fragments 要過濾的碎片列表
   * @param metaTags 選中的特殊標籤陣列
   * @param isIntersection 是否使用交集模式（預設為聯集模式）
   */
  static filterFragmentsByMultipleMetaTags(
    fragments: Fragment[], 
    metaTags: MetaTag[], 
    isIntersection: boolean = false
  ): Fragment[] {
    if (!metaTags.length) return fragments;
    
    const metaTagIds = metaTags.map(tag => tag.id);
    
    if (isIntersection) {
      // 交集模式：碎片必須符合所有選中的特殊標籤條件
      return metaTagIds.reduce((filteredFragments, tagId) => {
        return this.filterFragmentsByMetaTag(filteredFragments, tagId);
      }, fragments);
    } else {
      // 聯集模式：碎片符合任一選中的特殊標籤條件即可
      const uniqueFragments = new Set<Fragment>();
      
      metaTagIds.forEach(tagId => {
        const tagFiltered = this.filterFragmentsByMetaTag(fragments, tagId);
        tagFiltered.forEach(fragment => uniqueFragments.add(fragment));
      });
      
      return Array.from(uniqueFragments);
    }
  }
}