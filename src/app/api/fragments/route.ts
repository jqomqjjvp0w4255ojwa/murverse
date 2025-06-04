// app/api/fragments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// 簡化的用戶 ID 獲取邏輯
async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()
    
    // 方法1: 嘗試從 Authorization header 獲取
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (!error && user) {
        console.log('✅ 從 Header 獲取用戶:', user.id)
        return user.id
      }
    }
    
    // 方法2: 嘗試從 cookies 獲取（瀏覽器直接訪問）
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (!error && user) {
        console.log('✅ 從 Cookies 獲取用戶:', user.id)
        return user.id
      }
    } catch (cookieError) {
      console.log('Cookies 方式失敗:', cookieError)
    }
    
    console.error('❌ 所有認證方式都失敗')
    return null
    
  } catch (error) {
    console.error('❌ Auth error:', error)
    return null
  }
}

// 獲取 Supabase client
function getSupabaseClient() {
  return createServerSupabaseClient()
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = getSupabaseClient()
    
    console.log('🔍 查詢用戶 ID:', userId, '的碎片')
    
    const { data: fragments, error } = await supabase
      .from('fragments')
      .select('*')
      .eq('user_id', userId)
      .order('updatedAt', { ascending: false })

    if (error) {
      console.error('Error loading fragments:', error)
      return NextResponse.json({ error: 'Failed to load fragments' }, { status: 500 })
    }

    console.log('📊 找到', fragments?.length || 0, '個碎片')

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { content, tags, notes, type = 'fragment' } = await request.json()
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const now = new Date().toISOString()
    const fragmentId = crypto.randomUUID()

    console.log('💾 新增碎片，用戶 ID:', userId)

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

    console.log('✅ 碎片新增成功:', fragmentId)

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