'use client'

import { Fragment } from '@/features/fragments/types/fragment'

export default function FragmentsFlowView({ 
  fragments,
  relevanceMap = {} 
}: { 
  fragments: Fragment[],
  relevanceMap?: Record<string, number>  
}) {
  return (
    <div className="px-4 max-w-2xl mx-auto">
      <p className="text-center text-gray-400 my-20">💬 Flow 模式尚未實作，敬請期待</p>
      {/* TODO: 將 fragments.map(...) 做列表渲染 */}
    </div>
  )
}