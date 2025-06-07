// 📄 lib/auth/server-auth.ts - 修復版本

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * 統一的服務器端用戶認證函數
 * 支援 Authorization header 和 cookies 兩種方式
 */
export async function getServerUserId(request: NextRequest): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()
    
    // 方法1: 從 Authorization header 獲取 (API 調用)
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (!error && user) {
        console.log('✅ Auth via header:', user.id)
        return user.id
      }
    }
    
    // 方法2: 從 cookies 獲取 (瀏覽器直接訪問)
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (!error && user) {
        console.log('✅ Auth via cookies:', user.id)
        return user.id
      }
    } catch (cookieError) {
      console.log('Cookies auth failed:', cookieError)
    }
    
    console.log('❌ Authentication failed - no valid session found')
    return null
    
  } catch (error) {
    console.error('❌ Server auth error:', error)
    return null
  }
}

/**
 * 檢查用戶是否擁有特定 fragment 的權限
 */
export async function checkFragmentOwnership(
  fragmentId: string, 
  userId: string
): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('fragments')
      .select('id')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    return !error && !!data
  } catch (error) {
    console.error('❌ Fragment ownership check failed:', error)
    return false
  }
}

/**
 * 檢查管理員權限
 * 根據環境變量檢查用戶是否為管理員
 */
export async function checkAdminPermission(userId: string): Promise<boolean> {
  try {
    // 從環境變數檢查管理員列表
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || []
    const isAdmin = adminUserIds.includes(userId)
    
    console.log(`🔐 Admin check for ${userId}: ${isAdmin}`)
    return isAdmin
  } catch (error) {
    console.error('❌ Error checking admin permission:', error)
    return false
  }
}

/**
 * 檢查筆記所有權
 * 通過 fragment 間接驗證筆記的所有權
 */
export async function checkNoteOwnership(
  noteId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('notes')
      .select(`
        id,
        fragments!inner(user_id)
      `)
      .eq('id', noteId)
      .eq('fragments.user_id', userId)
      .single()
    
    if (error) {
      console.error('❌ Note ownership check failed:', error)
      return false
    }
    
    return !!data
  } catch (error) {
    console.error('❌ Error checking note ownership:', error)
    return false
  }
}

/**
 * 批量檢查 Fragment 所有權
 * 用於批量操作的權限驗證
 */
export async function checkBatchFragmentOwnership(
  fragmentIds: string[],
  userId: string
): Promise<{
  authorized: string[]
  unauthorized: string[]
}> {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('fragments')
      .select('id')
      .in('id', fragmentIds)
      .eq('user_id', userId)
    
    if (error) {
      console.error('❌ Batch ownership check failed:', error)
      return {
        authorized: [],
        unauthorized: fragmentIds
      }
    }
    
    const authorizedIds = data.map(item => item.id)
    const unauthorizedIds = fragmentIds.filter(id => !authorizedIds.includes(id))
    
    return {
      authorized: authorizedIds,
      unauthorized: unauthorizedIds
    }
  } catch (error) {
    console.error('❌ Error in batch ownership check:', error)
    return {
      authorized: [],
      unauthorized: fragmentIds
    }
  }
}

/**
 * 檢查標籤訪問權限
 * 驗證用戶是否有權限訪問/修改特定標籤
 */
export async function checkTagAccess(tagName: string, userId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    
    // 檢查用戶是否有使用此標籤的 fragment
    const { data, error } = await supabase
      .from('fragment_tags')
      .select(`
        tag,
        fragments!inner(user_id)
      `)
      .eq('tag', tagName)
      .eq('fragments.user_id', userId)
      .limit(1)
    
    if (error) {
      console.error('❌ Tag access check failed:', error)
      return false
    }
    
    return data && data.length > 0
  } catch (error) {
    console.error('❌ Error checking tag access:', error)
    return false
  }
}

/**
 * 通用資源訪問權限檢查
 */
export async function checkResourceAccess(
  resourceType: 'fragment' | 'note' | 'tag',
  resourceId: string,
  userId: string,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<boolean> {
  try {
    switch (resourceType) {
      case 'fragment':
        return await checkFragmentOwnership(resourceId, userId)
      
      case 'note':
        return await checkNoteOwnership(resourceId, userId)
      
      case 'tag':
        return await checkTagAccess(resourceId, userId)
      
      default:
        return false
    }
  } catch (error) {
    console.error(`❌ Error checking ${resourceType} access:`, error)
    return false
  }
}

/**
 * 整合的請求驗證函數
 */
export async function validateRequest(
  request: NextRequest,
  options: {
    resourceType?: 'fragment' | 'note' | 'tag'
    resourceId?: string
    action?: 'read' | 'write' | 'delete'
    requireAdmin?: boolean
  } = {}
): Promise<{
  isValid: boolean
  userId?: string
  error?: string
}> {
  try {
    // 1. 獲取用戶 ID
    const userId = await getServerUserId(request)
    if (!userId) {
      return {
        isValid: false,
        error: 'Unauthorized - No valid user session'
      }
    }
    
    // 2. 檢查管理員權限 (如果需要)
    if (options.requireAdmin) {
      const isAdmin = await checkAdminPermission(userId)
      if (!isAdmin) {
        return {
          isValid: false,
          userId,
          error: 'Admin permission required'
        }
      }
    }
    
    // 3. 檢查資源權限 (如果指定)
    if (options.resourceType && options.resourceId) {
      const hasAccess = await checkResourceAccess(
        options.resourceType,
        options.resourceId,
        userId,
        options.action
      )
      
      if (!hasAccess) {
        return {
          isValid: false,
          userId,
          error: `Access denied to ${options.resourceType}`
        }
      }
    }
    
    return {
      isValid: true,
      userId
    }
  } catch (error) {
    console.error('❌ Request validation failed:', error)
    return {
      isValid: false,
      error: 'Internal validation error'
    }
  }
}

/**
 * API 路由的權限中間件包裝器
 * 簡化 API 路由中的權限檢查
 */
export function withAuth<T extends Record<string, unknown>>(
  handler: (request: NextRequest, context: T & { userId: string }) => Promise<Response>,
  permissions: Parameters<typeof validateRequest>[1] = {}
) {
  return async (request: NextRequest, context: T) => {
    const validation = await validateRequest(request, permissions)
    
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: validation.error?.includes('Unauthorized') ? 401 : 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    return handler(request, { ...context, userId: validation.userId! })
  }
}

/**
 * 驗證用戶並檢查 Fragment 權限的一站式函數
 * 常用於 Fragment 相關的 API 路由
 */
export async function validateFragmentAccess(
  request: NextRequest,
  fragmentId: string,
  action: 'read' | 'write' | 'delete' = 'read'
): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
  const userId = await getServerUserId(request)
  
  if (!userId) {
    return { success: false, error: 'Unauthorized' }
  }
  
  const hasAccess = await checkFragmentOwnership(fragmentId, userId)
  
  if (!hasAccess) {
    return { 
      success: false, 
      userId, 
      error: 'Fragment not found or access denied' 
    }
  }
  
  return { success: true, userId }
}

/**
 * 檢查用戶是否可以執行批量操作
 */
export async function validateBatchOperation(
  request: NextRequest,
  fragmentIds: string[]
): Promise<{
  success: boolean
  userId?: string
  authorized: string[]
  unauthorized: string[]
  error?: string
}> {
  const userId = await getServerUserId(request)
  
  if (!userId) {
    return { 
      success: false, 
      authorized: [], 
      unauthorized: fragmentIds,
      error: 'Unauthorized' 
    }
  }
  
  const ownership = await checkBatchFragmentOwnership(fragmentIds, userId)
  
  return {
    success: ownership.authorized.length > 0,
    userId,
    authorized: ownership.authorized,
    unauthorized: ownership.unauthorized,
    error: ownership.authorized.length === 0 ? 'No authorized fragments found' : undefined
  }
}