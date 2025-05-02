import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

import { isTooFarFromGroup, isRectOverlap } from '@/utils/groupUtils'

export interface FloatingWindow {
  id: string
  x: number
  y: number
  width: number
  height: number
  groupId?: string
}

function layoutGroupMembersVertically(
  groupId: string,
  windows: FloatingWindow[],
  set: (fn: (state: { windows: FloatingWindow[] }) => Partial<GroupsStore>) => void,
  get: () => GroupsStore
) {
  const group = get().groups.find(g => g.id === groupId);
  if (!group) return;

  const members = group.memberIds
    .map(id => windows.find(w => w.id === id))
    .filter((w): w is FloatingWindow => !!w);

  let currentY = group.y + 40;
  const margin = 12;

  const updated = members.map(w => {
    const newW = { ...w, x: group.x + 20, y: currentY };
    currentY += w.height + margin;
    return newW;
  });

  set(state => ({
    windows: state.windows.map(w => {
      const updatedOne = updated.find(u => u.id === w.id);
      return updatedOne || w;
    })
  }));
}

export interface Group {
  id: string
  memberIds: string[]
  x: number
  y: number
  width: number
  height: number
}

// 添加重叠检测接口
interface OverlappingWindow {
  window: FloatingWindow;
  rect: DOMRect;
}

interface GroupsStore {
  windows: FloatingWindow[]
  groups: Group[]
  updateWindow: (id: string, data: Partial<FloatingWindow>) => void
  addWindow: (window: FloatingWindow) => void
  createGroup: (windowIds: string[]) => void
  removeWindowFromGroup: (windowId: string) => void
  removeWindowFromGroupWith: (id: string, targetId: string) => void
  moveGroup: (groupId: string, dx: number, dy: number) => void
  checkAndRemoveFromGroup: (windowId: string) => void
  alreadyGrouped: (windowIds: string[]) => boolean
  isInAnyGroup: (windowId: string) => boolean
  layoutGroupMembersVertically: (groupId: string) => void
  // 新增的功能
  adjustWindowPosition: (windowId: string, overlappingWindows: OverlappingWindow[]) => void
  checkAndResolveOverlaps: () => void
}

export const useGroupsStore = create<GroupsStore>((set, get) => ({
  windows: [],
  groups: [],

  updateWindow: (id, data) => {
    set(state => ({
      windows: state.windows.map(w => (w.id === id ? { ...w, ...data } : w))
    }))
  },

  addWindow: (window) => {
    const existing = get().windows.find(w => w.id === window.id)
    if (!existing) {
      set(state => ({
        windows: [...state.windows, window]
      }))
      console.log(`✅ 加入 window: ${window.id}`)
    } else {
      console.log(`⚠️ 重複忽略: ${window.id}`)
    }
  },

  createGroup: (windowIds) => {
    console.log('📦 createGroup 被呼叫！', windowIds)
  
    // 避免重複建立
    if (get().alreadyGrouped(windowIds)) return
  
    // ✅ 過濾掉已經在其他群組中的視窗
    const groupedIds = new Set(get().groups.flatMap(g => g.memberIds))
    const uniqueIds = windowIds.filter(id => !groupedIds.has(id))
  
    // ✅ 防止建立只有一人的群組
    if (uniqueIds.length < 2) {
      console.warn('⚠️ createGroup 中止：有效視窗數量不足', uniqueIds)
      return
    }
  
    const id = uuidv4()
    const windows = get().windows.filter(w => uniqueIds.includes(w.id))
    if (windows.length === 0) return
  
    const x = Math.min(...windows.map(w => w.x))
    const y = Math.min(...windows.map(w => w.y))
    const right = Math.max(...windows.map(w => w.x + w.width))
    const bottom = Math.max(...windows.map(w => w.y + w.height))
  
    const width = right - x
    const height = bottom - y
  
    const newGroup: Group = { id, memberIds: uniqueIds, x, y, width, height }
  
    set(state => ({
      groups: [...state.groups, newGroup],
      windows: state.windows.map(w =>
        uniqueIds.includes(w.id) ? { ...w, groupId: id } : w
      )
    }))
  
    setTimeout(() => {
      layoutGroupMembersVertically(id, get().windows, set, get)
    }, 0)
  },

  removeWindowFromGroup: (windowId) => {
    set(state => {
      const newGroups = state.groups
          .map(g => {
            if (!g.memberIds.includes(windowId)) return g
            const newMembers = g.memberIds.filter(id => id !== windowId)
            // ❗ 這裡只保留成員 >= 2 的群組
            return newMembers.length >= 2 ? { ...g, memberIds: newMembers } : null
          })
  .filter((g): g is Group => g !== null)
      return {
        groups: newGroups,
        windows: state.windows.map(w =>
          w.id === windowId ? { ...w, groupId: undefined } : w
        )
      }
    })
  },

  removeWindowFromGroupWith: (id: string, targetId: string) => {
    set(state => {
      const newGroups = state.groups.map(g => {
        if (g.memberIds.includes(id) && g.memberIds.includes(targetId)) {
          const newMembers = g.memberIds.filter(mid => mid !== id)
          return newMembers.length > 1 ? { ...g, memberIds: newMembers } : null
        }
        return g
      }).filter((g): g is Group => g !== null)
  
      const updatedWindows = state.windows.map(w =>
        w.id === id ? { ...w, groupId: undefined } : w
      )
  
      return {
        groups: newGroups,
        windows: updatedWindows,
      }
    })
  },

  moveGroup: (groupId, dx, dy) => {
    set(state => ({
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, x: g.x + dx, y: g.y + dy } : g
      ),
      windows: state.windows.map(w =>
        w.groupId === groupId ? { ...w, x: w.x + dx, y: w.y + dy } : w
      )
    }))
  },

  checkAndRemoveFromGroup: (windowId) => {
    const { windows, groups, removeWindowFromGroup } = get()
    const thisWindow = windows.find(w => w.id === windowId)
    if (!thisWindow || !thisWindow.groupId) return
  
    const group = groups.find(g => g.id === thisWindow.groupId)
    if (!group) return
  
    const myEl = document.getElementById(windowId)
    if (!myEl) return
    const myRect = myEl.getBoundingClientRect()
  
    const otherRects = group.memberIds
      .filter(id => id !== windowId)
      .map(id => {
        const el = document.getElementById(id)
        return el?.getBoundingClientRect()
      })
      .filter((r): r is DOMRect => !!r)
  
    if (otherRects.length === 0) return
  
    // ✅ 用統一工具判斷
    if (isTooFarFromGroup(myRect, otherRects)) {
      console.log(`🧨 ${windowId} 離群組，因為距離太遠！`)
      removeWindowFromGroup(windowId)
    }
  },

  alreadyGrouped: (windowIds) => {
    const groups = get().groups
    return groups.some(group =>
      windowIds.every(id => group.memberIds.includes(id))
    )
  },
  
  isInAnyGroup: (windowId) => {
    return get().groups.some(group => group.memberIds.includes(windowId))
  },

  layoutGroupMembersVertically: (groupId: string) => {
    const windows = get().windows;
    layoutGroupMembersVertically(groupId, windows, set, get);
  },

  // 新增：調整窗口位置避免重疊
  adjustWindowPosition: (windowId: string, overlappingWindows: OverlappingWindow[]) => {
    const { windows } = get();
    const myWindow = windows.find(w => w.id === windowId);
    if (!myWindow) return;

    const myEl = document.getElementById(windowId);
    if (!myEl) return;
    
    const myRect = myEl.getBoundingClientRect();
    
    // 获取重叠最大的窗口
    const mainOverlap = overlappingWindows[0];
    
    // 计算新位置
    let newX = myWindow.x;
    let newY = myWindow.y;
    
    // 计算水平和垂直方向的重叠程度
    const overlapX = Math.min(myRect.right, mainOverlap.rect.right) - Math.max(myRect.left, mainOverlap.rect.left);
    const overlapY = Math.min(myRect.bottom, mainOverlap.rect.bottom) - Math.max(myRect.top, mainOverlap.rect.top);
    
    // 根据重叠方向调整位置
    if (overlapX < overlapY) {
      // 水平方向重叠更小，左右调整
      if (myRect.left < mainOverlap.rect.left) {
        newX = mainOverlap.rect.left - myRect.width - 10;
      } else {
        newX = mainOverlap.rect.right + 10;
      }
    } else {
      // 垂直方向重叠更小，上下调整
      if (myRect.top < mainOverlap.rect.top) {
        newY = mainOverlap.rect.top - myRect.height - 10;
      } else {
        newY = mainOverlap.rect.bottom + 10;
      }
    }
    
    // 确保窗口不会超出视口
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    if (newX < 0) newX = 10;
    if (newY < 0) newY = 10;
    if (newX + myRect.width > viewport.width) newX = viewport.width - myRect.width - 10;
    if (newY + myRect.height > viewport.height) newY = viewport.height - myRect.height - 10;
    
    // 更新窗口位置
    set(state => ({
      windows: state.windows.map(w => 
        w.id === windowId ? { ...w, x: newX, y: newY } : w
      )
    }));
    
    // 更新DOM位置
    myEl.style.left = `${newX}px`;
    myEl.style.top = `${newY}px`;
    
    console.log(`🔄 調整窗口 ${windowId} 的位置以避免重疊`, { newX, newY });
  },

  // 全局检查并解决所有窗口重叠
  checkAndResolveOverlaps: () => {
    const { windows, adjustWindowPosition } = get();
    
    windows.forEach(window => {
      const el = document.getElementById(window.id);
      if (!el) return;
      
      const rect = el.getBoundingClientRect();
      
      // 查找与当前窗口重叠的其他窗口
      const overlappingWindows = windows
        .filter(w => w.id !== window.id)
        .map(w => {
          const otherEl = document.getElementById(w.id);
          if (!otherEl) return null;
          
          const otherRect = otherEl.getBoundingClientRect();
          if (isRectOverlap(rect, otherRect)) {
            return { window: w, rect: otherRect };
          }
          return null;
        })
        .filter((item): item is OverlappingWindow => item !== null);
      
      // 如果有重叠窗口，调整位置
      if (overlappingWindows.length > 0) {
        adjustWindowPosition(window.id, overlappingWindows);
      }
    });
  }
}));