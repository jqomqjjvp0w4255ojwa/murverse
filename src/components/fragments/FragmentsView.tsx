'use client'

import { useState } from 'react'
import FragmentsList from './FragmentsList'
import FragmentsTable from './FragmentsTable'

export default function FragmentsView() {
  const [view, setView] = useState<'list' | 'table'>('list')

  return (
    <div className="p-4">
      <div className="mb-4 space-x-2">
        <button
          onClick={() => setView('list')}
          className={`btn ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          列表視圖
        </button>
        <button
          onClick={() => setView('table')}
          className={`btn ${view === 'table' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          表格視圖
        </button>
      </div>

      {view === 'list' ? <FragmentsList /> : <FragmentsTable />}
    </div>
  )
}
