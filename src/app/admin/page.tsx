// 📄 app/admin/page.tsx - 管理員頁面入口
import { Metadata } from 'next'
import AdminBackupManagement from './components/AdminBackupManagement'

export const metadata: Metadata = {
  title: 'Fragment 備份管理 - 管理員專用',
  description: '管理員專用的 Fragment 備份恢復系統',
  robots: 'noindex, nofollow' // 防止搜索引擎索引
}

export default function AdminPage() {
  return <AdminBackupManagement />
}