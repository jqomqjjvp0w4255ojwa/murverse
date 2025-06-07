// 📄 app/admin/layout.tsx - 管理員專用布局 (可選)
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fragment 備份管理 - 管理員專用',
  description: '管理員專用的 Fragment 備份恢復系統',
  robots: 'noindex, nofollow' // 防止搜索引擎索引
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="admin-layout">
      {children}
    </div>
  )
}