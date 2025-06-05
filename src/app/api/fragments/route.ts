// app/api/fragments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUserId } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createServerSupabaseClient()
    
    console.log('🔍 Fetching fragments for user:', userId)
    
    const { data: fragments, error } = await supabase
      .from('fragments')
      .select('*')
      .eq('user_id', userId)
      .order('updatedAt', { ascending: false })

    if (error) {
      console.error('Error loading fragments:', error)
      return NextResponse.json({ error: 'Failed to load fragments' }, { status: 500 })
    }

    console.log('📊 Found fragments:', fragments?.length || 0)

    // 為每個 fragment 載入關聯的 notes 和 tags
    const fragmentsWithRelations = await Promise.all(
      (fragments || []).map(async (fragment) => {
        const [notesRes, tagsRes] = await Promise.all([
          supabase
            .from('notes')
            .select('*')
            .eq('fragment_id', fragment.id)
            .order('createdAt', { ascending: true }),
          supabase
            .from('fragment_tags')
            .select('tag')
            .eq('fragment_id', fragment.id)
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { content, tags, notes, type = 'fragment' } = await request.json()
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const now = new Date().toISOString()
    const fragmentId = crypto.randomUUID()

    console.log('💾 Creating fragment for user:', userId)

    // 使用事務來確保資料一致性
    const { error: fragmentError } = await supabase
      .from('fragments')
      .insert({
        id: fragmentId,
        content: content.trim(),
        type,
        user_id: userId,
        createdAt: now,
        updatedAt: now
      })

    if (fragmentError) {
      console.error('Error creating fragment:', fragmentError)
      return NextResponse.json({ error: 'Failed to create fragment' }, { status: 500 })
    }

    // 新增 tags (如果有)
    if (tags && tags.length > 0) {
      const validTags = tags.filter((tag: string) => tag?.trim())
      if (validTags.length > 0) {
        const tagInserts = validTags.map((tag: string) => ({
          fragment_id: fragmentId,
          tag: tag.trim()
        }))
        
        const { error: tagsError } = await supabase
          .from('fragment_tags')
          .insert(tagInserts)
        
        if (tagsError) {
          console.error('Error creating tags:', tagsError)
          // 不中斷流程，但記錄錯誤
        }
      }
    }

    // 新增 notes (如果有)
    if (notes && notes.length > 0) {
      const validNotes = notes.filter((note: any) => note?.title?.trim() || note?.value?.trim())
      if (validNotes.length > 0) {
        const noteInserts = validNotes.map((note: any) => ({
          id: note.id || crypto.randomUUID(),
          fragment_id: fragmentId,
          title: note.title?.trim() || '',
          value: note.value?.trim() || '',
          color: note.color,
          isPinned: !!note.isPinned,
          createdAt: note.createdAt || now,
          updatedAt: note.updatedAt || now
        }))
        
        const { error: notesError } = await supabase
          .from('notes')
          .insert(noteInserts)
        
        if (notesError) {
          console.error('Error creating notes:', notesError)
          // 不中斷流程，但記錄錯誤
        }
      }
    }

    console.log('✅ Fragment created successfully:', fragmentId)

    return NextResponse.json({ 
      success: true, 
      fragment: {
        id: fragmentId,
        content: content.trim(),
        type,
        tags: tags || [],
        notes: notes || [],
        createdAt: now,
        updatedAt: now
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}