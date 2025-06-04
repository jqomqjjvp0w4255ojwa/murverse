// app/api/fragments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createDevServerSupabaseClient } from '@/lib/supabase/server'

// 統一的用戶 ID 獲取邏輯
async function getUserId(request: NextRequest): Promise<string | null> {
  // 開發模式：使用固定 ID
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 [DEV MODE] Using fixed user ID for API')
    return 'dev-user-12345'
  }

  // 生產模式：真實認證
  try {
    const supabase = createServerSupabaseClient()
    
    // 嘗試從 cookies 獲取 session
    const { data: { user }, error } = await supabase.auth.getUser()
    
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

// 獲取適當的 Supabase client
function getSupabaseClient() {
  return process.env.NODE_ENV === 'development' 
    ? createDevServerSupabaseClient()
    : createServerSupabaseClient()
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json({ 
        error: process.env.NODE_ENV === 'development' 
          ? 'Development mode auth failed' 
          : 'Unauthorized' 
      }, { status: 401 })
    }
    
    const supabase = getSupabaseClient()
    
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
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json({ 
        error: process.env.NODE_ENV === 'development' 
          ? 'Development mode auth failed' 
          : 'Unauthorized' 
      }, { status: 401 })
    }
    
    const { content, tags, notes, type = 'fragment' } = await request.json()
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
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

