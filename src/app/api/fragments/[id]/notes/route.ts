// app/api/fragments/[id]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUserId, checkFragmentOwnership } from '@/lib/auth/server-auth'

// 新增筆記
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const fragmentId = id
    const note = await request.json()
    
    // 驗證必要欄位
    if (!note.title?.trim() && !note.value?.trim()) {
      return NextResponse.json({ 
        error: 'Note must have either title or content' 
      }, { status: 400 })
    }

    // 檢查 fragment 所有權
    if (!await checkFragmentOwnership(fragmentId, userId)) {
      return NextResponse.json({ 
        error: 'Fragment not found or access denied' 
      }, { status: 404 })
    }

    const supabase = createServerSupabaseClient()
    const now = new Date().toISOString()
    const noteId = note.id || crypto.randomUUID()

    const { error } = await supabase.from('notes').insert({
      id: noteId,
      fragment_id: fragmentId,
      title: note.title?.trim() || '',
      value: note.value?.trim() || '',
      color: note.color || null,
      isPinned: !!note.isPinned,
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
        id: noteId,
        fragment_id: fragmentId,
        title: note.title?.trim() || '',
        value: note.value?.trim() || '',
        color: note.color || null,
        isPinned: !!note.isPinned,
        createdAt: note.createdAt || now,
        updatedAt: note.updatedAt || now
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 更新筆記
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const fragmentId = id
    const updates = await request.json()
    const { noteId, ...noteUpdates } = updates

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // 簡化的權限檢查：先檢查筆記是否存在
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('fragment_id')
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // 再檢查 fragment 所有權
    if (!await checkFragmentOwnership(note.fragment_id, userId)) {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 刪除筆記
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { id } = await params
    const url = new URL(request.url)
    const noteId = url.searchParams.get('noteId')

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // 簡化的權限檢查：先檢查筆記是否存在
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('fragment_id')
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // 再檢查 fragment 所有權
    if (!await checkFragmentOwnership(note.fragment_id, userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 刪除筆記
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      console.error('Error deleting note:', error)
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}