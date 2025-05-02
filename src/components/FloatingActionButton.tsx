'use client'

import { useFragmentsStore } from '@/stores/useFragmentsStore'

export default function FloatingActionButton() {
  const { mode, setMode } = useFragmentsStore()

  const toggleMode = () => {
    setMode(mode === 'float' ? 'list' : 'float')
  }

  return (
    <button
      onClick={toggleMode}
      className="fixed bottom-6 right-6 p-4 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 z-50"
    >
      {mode === 'float' ? '切到清單' : '切到漂浮'}
    </button>
  )
}
