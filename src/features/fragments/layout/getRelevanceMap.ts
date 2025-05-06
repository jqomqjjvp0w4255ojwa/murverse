// features/fragments/layout/getRelevanceMap.ts

export function getRelevanceMap(
    fragments: { id: string; tags: string[] }[],
    selectedTags: string[]
  ): Record<string, number> {
    const tagSet = new Set(selectedTags)
    const map: Record<string, number> = {}
  
    for (const f of fragments) {
      const hitCount = f.tags.filter(t => tagSet.has(t)).length
      if (hitCount > 0) {
        map[f.id] = hitCount / f.tags.length // 符合越多，值越高（0 ~ 1）
      }
    }
  
    return map
  }
  