// app/api/fragments/[id]/tags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// 統一的用戶 ID 獲取邏輯 - 移除開發模式
async function getUserId(request: NextRequest): Promise<string | null> {
  // 始終使用真實認證
  try {
    const supabase = createServerSupabaseClient()
    
    // 從 Authorization header 獲取 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header')
      return null
    }

    const token = authHeader.substring(7) // 移除 'Bearer ' 前綴
    
    // 使用 token 獲取用戶
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.error('❌ Authentication failed:', error?.message)
      return null
    }
    
    return user.id
  } catch (error) {
    console.error('❌ Auth error:', error)
    return null
  }
}

// 獲取 Supabase client
function getSupabaseClient() {
  return createServerSupabaseClient()
}

// 新增標籤到 fragment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const fragmentId = params.id
    const { tag } = await request.json()
    
    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      return NextResponse.json({ error: 'Valid tag is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // 先檢查 fragment 是否存在且屬於當前用戶
    const { data: fragment, error: fragmentError } = await supabase
      .from('fragments')
      .select('id')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    if (fragmentError || !fragment) {
      return NextResponse.json({ error: 'Fragment not found or access denied' }, { status: 404 })
    }

    // 檢查標籤是否已存在
    const { data: existingTag } = await supabase
      .from('fragment_tags')
      .select('tag')
      .eq('fragment_id', fragmentId)
      .eq('tag', tag.trim())
      .single()

    if (existingTag) {
      return NextResponse.json({ error: 'Tag already exists on this fragment' }, { status: 409 })
    }

    // 新增標籤
    const { error } = await supabase
      .from('fragment_tags')
      .insert({
        fragment_id: fragmentId,
        tag: tag.trim()
      })

    if (error) {
      console.error('Error adding tag:', error)
      return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      tag: tag.trim()
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// 刪除標籤
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const fragmentId = params.id
    const url = new URL(request.url)
    const tag = url.pathname.split('/').pop() // 從 URL 路徑中獲取標籤
    
    if (!tag) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
    }

    const decodedTag = decodeURIComponent(tag)
    const supabase = getSupabaseClient()

    // 檢查 fragment 是否屬於當前用戶
    const { data: fragment, error: fragmentError } = await supabase
      .from('fragments')
      .select('id')
      .eq('id', fragmentId)
      .eq('user_id', userId)
      .single()

    if (fragmentError || !fragment) {
      return NextResponse.json({ error: 'Fragment not found or access denied' }, { status: 404 })
    }

    // 刪除標籤
    const { error } = await supabase
      .from('fragment_tags')
      .delete()
      .eq('fragment_id', fragmentId)
      .eq('tag', decodedTag)

    if (error) {
      console.error('Error removing tag:', error)
      return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}