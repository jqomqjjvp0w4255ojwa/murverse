// 📄 app/api/admin/check/route.ts - 檢查管理員權限
import { NextRequest, NextResponse } from 'next/server'
import { getServerUserId, checkAdminPermission } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await checkAdminPermission(userId)
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    return NextResponse.json({ 
      success: true, 
      isAdmin: true,
      userId 
    })
    
  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}