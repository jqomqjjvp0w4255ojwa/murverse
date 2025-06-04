// app/api/fragments/[id]/notes/route.ts
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

// 新增筆記
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
    const note = await request.json()
    
    if (!note.id || !note.title || !note.value) {
      return NextResponse.json({ error: 'Missing required note fields' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const now = new Date().toISOString()

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

    // 新增筆記
    const { error } = await supabase.from('notes').insert({
      id: note.id,
      fragment_id: fragmentId,
      title: note.title,
      value: note.value,
      color: note.color,
      isPinned: note.isPinned || false,
      createdAt: note.createdAt || now,
      updatedAt: note.updatedAt || now
    })

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      note: {
        id: note.id,
        fragment_id: fragmentId,
        title: note.title,
        value: note.value,
        color: note.color,
        isPinned: note.isPinned || false,
        createdAt: note.createdAt || now,
        updatedAt: note.updatedAt || now
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// 更新筆記
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const fragmentId = params.id
    const updates = await request.json()
    const { noteId, ...noteUpdates } = updates

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // 檢查權限：筆記是否屬於用戶的 fragment
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('fragment_id')
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const { data: fragment, error: fragmentError } = await supabase
      .from('fragments')
      .select('id')
      .eq('id', note.fragment_id)
      .eq('user_id', userId)
      .single()

    if (fragmentError || !fragment) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 更新筆記
    const { error } = await supabase
      .from('notes')
      .update({
        ...noteUpdates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', noteId)

    if (error) {
      console.error('Error updating note:', error)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}