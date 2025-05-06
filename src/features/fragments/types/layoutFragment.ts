export type LayoutFragment = {
    id: string
    content: string
    note?: string
    tags: string[]
    createdAt?: string
  
    direction: 'horizontal' | 'vertical'
    showContent: boolean
    showNote: boolean
    showTags: boolean
    size: 'small' | 'medium' | 'large'
  
    x: number
    y: number
    cx: number
    cy: number
    fontSize: number
    driftOffset: number
  }
  