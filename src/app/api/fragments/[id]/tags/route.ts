// app/api/fragments/[id]/tags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getServerUserId, checkFragmentOwnership } from '@/lib/auth/server-auth'

// 新增標籤到 fragment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const fragmentId = params.id
    const { tag } = await request.json()
    
    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      return NextResponse.json({ error: 'Valid tag is required' }, { status: 400 })
    }

    const trimmedTag = tag.trim()

    // 檢查 fragment 所有權
    if (!await checkFragmentOwnership(fragmentId, userId)) {
      return NextResponse.json({ 
        error: 'Fragment not found or access denied' 
      }, { status: 404 })
    }

    const supabase = createServerSupabaseClient()

    // 檢查標籤是否已存在
    const { data: existingTag } = await supabase
      .from('fragment_tags')
      .select('tag')
      .eq('fragment_id', fragmentId)
      .eq('tag', trimmedTag)
      .single()

    if (existingTag) {
      return NextResponse.json({ 
        error: 'Tag already exists on this fragment' 
      }, { status: 409 })
    }

    // 新增標籤
    const { error } = await supabase
      .from('fragment_tags')
      .insert({
        fragment_id: fragmentId,
        tag: trimmedTag
      })

    if (error) {
      console.error('Error adding tag:', error)
      return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      tag: trimmedTag
    }, { status: 201 })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 刪除標籤
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getServerUserId(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const fragmentId = params.id
    const url = new URL(request.url)
    const tag = url.searchParams.get('tag')
    
    if (!tag) {
      return NextResponse.json({ error: 'Tag parameter is required' }, { status: 400 })
    }

    const decodedTag = decodeURIComponent(tag)

    // 檢查 fragment 所有權
    if (!await checkFragmentOwnership(fragmentId, userId)) {
      return NextResponse.json({ 
        error: 'Fragment not found or access denied' 
      }, { status: 404 })
    }

    const supabase = createServerSupabaseClient()

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}