'use client'

/* 👉 作用： 畫面右下角的**「切換模式按鈕」**
🔁 功能： 用來在「漂浮模式（float）」與「清單模式（list）」之間切換主畫面顯示。
按一下就切換 mode 狀態（用 useFragmentsStore 控制）。
在 UI 上會顯示「切到清單」或「切到漂浮」兩種狀態。 */


import { useFragmentsStore } from '@/features/fragments/store/useFragmentsStore'

export default function FloatingActionButton() {
  const { mode, setMode } = useFragmentsStore()

  const toggleMode = () => {
    setMode(mode === 'grid' ? 'flow' : 'grid')
  }
}
