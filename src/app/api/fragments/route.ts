import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// 取得用戶 ID (暫時使用開發模式的固定 ID)
function getUserId(): string {
  return 'dev-user-12345'
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId()
    const supabase = createServerSupabaseClient()
    
    const { data: fragments, error } = await supabase
      .from('fragments')
      .select('*')
      .eq('user_id', userId)
      .order('updatedAt', { ascending: false })

    if (error) {
      console.error('Error loading fragments:', error)
      return NextResponse.json({ error: 'Failed to load fragments' }, { status: 500 })
    }

    // 為每個 fragment 載入 notes 和 tags
    const fragmentsWithRelations = await Promise.all(
      (fragments || []).map(async (fragment) => {
        const [notesRes, tagsRes] = await Promise.all([
          supabase.from('notes').select('*').eq('fragment_id', fragment.id),
          supabase.from('fragment_tags').select('tag').eq('fragment_id', fragment.id)
        ])

        return {
          ...fragment,
          notes: notesRes.data || [],
          tags: (tagsRes.data || []).map(t => t.tag)
        }
      })
    )

    return NextResponse.json({ fragments: fragmentsWithRelations })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId()
    const { content, tags, notes, type = 'fragment' } = await request.json()
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const now = new Date().toISOString()
    const fragmentId = crypto.randomUUID()

    // 1. 建立 fragment
    const { error: fragmentError } = await supabase
      .from('fragments')
      .insert({
        id: fragmentId,
        content,
        type,
        user_id: userId,
        createdAt: now,
        updatedAt: now
      })

    if (fragmentError) {
      console.error('Error creating fragment:', fragmentError)
      return NextResponse.json({ error: 'Failed to create fragment' }, { status: 500 })
    }

    // 2. 建立 tags (如果有)
    if (tags && tags.length > 0) {
      const tagInserts = tags.map((tag: string) => ({
        fragment_id: fragmentId,
        tag
      }))
      
      await supabase.from('fragment_tags').insert(tagInserts)
    }

    // 3. 建立 notes (如果有)
    if (notes && notes.length > 0) {
      const noteInserts = notes.map((note: any) => ({
        id: note.id || crypto.randomUUID(),
        fragment_id: fragmentId,
        title: note.title || '',
        value: note.value || '',
        color: note.color,
        isPinned: note.isPinned || false,
        createdAt: note.createdAt || now,
        updatedAt: note.updatedAt || now
      }))
      
      await supabase.from('notes').insert(noteInserts)
    }

    return NextResponse.json({ 
      success: true, 
      fragment: {
        id: fragmentId,
        content,
        type,
        tags: tags || [],
        notes: notes || [],
        createdAt: now,
        updatedAt: now
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}