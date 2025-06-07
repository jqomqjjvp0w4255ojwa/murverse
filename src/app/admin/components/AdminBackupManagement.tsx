// 📄 app/admin/components/AdminBackupManagement.tsx - 修復認證問題
'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Trash2, RotateCcw, Search, Eye, Calendar, User, FileText, Tag } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

interface BackupItem {
  id: string
  originalFragmentId: string
  userId: string
  content: string
  tags: string[]
  notesCount: number
  deletedAt: string
  expiresAt: string
  restoreCount: number
  adminNotes?: string
}

interface BackupStats {
  totalBackups: number
  activeBackups: number
  expiredBackups: number
  restoredBackups: number
}

export default function AdminBackupManagement() {
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [stats, setStats] = useState<BackupStats>({
    totalBackups: 0,
    activeBackups: 0,
    expiredBackups: 0,
    restoredBackups: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchUserId, setSearchUserId] = useState('')
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // 獲取認證 headers
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const supabase = getSupabaseClient()
      if (!supabase) {
        return {
          'Content-Type': 'application/json'
        }
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.access_token) {
        return {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
      
      return {
        'Content-Type': 'application/json'
      }
    } catch (error) {
      console.error('獲取認證 headers 失敗:', error)
      return {
        'Content-Type': 'application/json'
      }
    }
  }

  // 檢查管理員權限
  const checkAdminAccess = async () => {
    try {
      console.log('🔍 檢查管理員權限...')
      
      const headers = await getAuthHeaders()
      console.log('📋 Request headers:', headers)
      
      const response = await fetch('/api/admin/check', {
        credentials: 'include',
        headers
      })
      
      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ 管理員權限檢查成功:', data)
        setIsAdmin(true)
      } else {
        const errorData = await response.json()
        console.error('❌ 管理員權限檢查失敗:', errorData)
        setIsAdmin(false)
        alert(`❌ 管理員權限不足 (${response.status})\n${errorData.error || '未知錯誤'}`)
      }
    } catch (error) {
      console.error('權限檢查異常:', error)
      setIsAdmin(false)
      alert('❌ 權限檢查失敗，請檢查網路連接')
    }
  }

  // 載入備份列表
  const loadBackups = async () => {
    if (!isAdmin) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      })
      
      if (searchUserId) params.append('userId', searchUserId)
      if (searchText) params.append('search', searchText)

      const headers = await getAuthHeaders()
      
      const response = await fetch(`/api/admin/backups?${params}`, {
        credentials: 'include',
        headers
      })
      
      if (!response.ok) {
        throw new Error(`載入備份失敗 (${response.status})`)
      }
      
      const data = await response.json()

      if (data.success) {
        setBackups(data.data.backups)
        setTotalPages(data.data.pagination.totalPages)
        
        // 計算統計信息
        const total = data.data.backups.length
        const active = data.data.backups.filter((b: BackupItem) => !isExpired(b.expiresAt)).length
        const expired = data.data.backups.filter((b: BackupItem) => isExpired(b.expiresAt)).length
        const restored = data.data.backups.filter((b: BackupItem) => b.restoreCount > 0).length
        
        setStats({
          totalBackups: total,
          activeBackups: active,
          expiredBackups: expired,
          restoredBackups: restored
        })
      }
    } catch (error) {
      console.error('載入備份失敗:', error)
      alert('載入備份失敗，請檢查網路連接')
    } finally {
      setLoading(false)
    }
  }

  // 恢復備份
  const restoreBackup = async (backupId: string, adminNotes: string) => {
    setRestoring(backupId)
    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch(`/api/admin/backups/${backupId}/restore`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ adminNotes })
      })

      const data = await response.json()

      if (data.success) {
        alert('✅ 恢復成功！Fragment 已重新創建')
        loadBackups() // 重新載入列表
      } else {
        alert(`❌ 恢復失敗: ${data.error}`)
      }
    } catch (error) {
      console.error('恢復備份失敗:', error)
      alert('❌ 恢復失敗，請檢查網路連接')
    } finally {
      setRestoring(null)
    }
  }

  // 刪除過期備份
  const cleanupExpiredBackups = async () => {
    if (!confirm('確定要清理所有過期備份嗎？此操作不可撤銷。')) {
      return
    }

    try {
      const headers = await getAuthHeaders()
      
      const response = await fetch('/api/admin/backups/cleanup', {
        method: 'POST',
        credentials: 'include',
        headers
      })

      const data = await response.json()
      if (data.success) {
        alert(`✅ 清理完成，删除了 ${data.deletedCount} 個過期備份`)
        loadBackups()
      }
    } catch (error) {
      console.error('清理失敗:', error)
      alert('❌ 清理失敗')
    }
  }

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadBackups()
    }
  }, [isAdmin, currentPage, searchUserId, searchText])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  // 如果不是管理員，顯示權限不足頁面
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-700 mb-2">訪問受限</h1>
          <p className="text-gray-600 mb-4">此頁面僅限管理員訪問</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              返回首頁
            </button>
            <button 
              onClick={checkAdminAccess}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              重新檢查權限
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Fragment 備份管理系統</h1>
              <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">管理員專用</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={cleanupExpiredBackups}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
                <span>清理過期備份</span>
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                返回首頁
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">總備份數</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalBackups}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <RotateCcw className="w-8 h-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">可恢復</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeBackups}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">已過期</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.expiredBackups}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-purple-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">已恢復</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.restoredBackups}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 搜索區域 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                用戶 ID
              </label>
              <input
                type="text"
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                placeholder="搜索特定用戶的備份"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                內容搜索
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索 fragment 內容"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setCurrentPage(1)
                  loadBackups()
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                <Search className="w-4 h-4" />
                <span>搜索</span>
              </button>
            </div>
          </div>
        </div>

        {/* 備份列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-500">載入中...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p>沒有找到備份記錄</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">內容預覽</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用戶</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">標籤</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">刪除時間</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">過期狀態</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backups.map((backup) => {
                    const expired = isExpired(backup.expiresAt)
                    const daysLeft = getDaysUntilExpiry(backup.expiresAt)
                    
                    return (
                      <tr key={backup.id} className={expired ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {backup.content.substring(0, 60)}...
                            </div>
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <FileText className="w-3 h-3 mr-1" />
                              {backup.notesCount} 個筆記
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-mono text-gray-900">
                            {backup.userId.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {backup.tags.slice(0, 2).map((tag, index) => (
                              <span 
                                key={index}
                                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                            {backup.tags.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{backup.tags.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(backup.deletedAt)}
                        </td>
                        <td className="px-6 py-4">
                          {expired ? (
                            <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                              已過期
                            </span>
                          ) : backup.restoreCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              已恢復 {backup.restoreCount} 次
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              {daysLeft > 0 ? `${daysLeft}天後過期` : '今日過期'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedBackup(backup)}
                              className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                            >
                              <Eye className="w-3 h-3" />
                              <span>查看</span>
                            </button>
                            {!expired && (
                              <button
                                onClick={() => {
                                  const notes = prompt('管理員備註 (可選):')
                                  if (notes !== null) {
                                    restoreBackup(backup.id, notes)
                                  }
                                }}
                                disabled={restoring === backup.id}
                                className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                              >
                                {restoring === backup.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                ) : (
                                  <RotateCcw className="w-3 h-3" />
                                )}
                                <span>恢復</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 備份詳情模態框 */}
      {selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium">備份詳情</h3>
              <button
                onClick={() => setSelectedBackup(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">備份 ID</label>
                  <p className="font-mono text-sm">{selectedBackup.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">原始 Fragment ID</label>
                  <p className="font-mono text-sm">{selectedBackup.originalFragmentId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">用戶 ID</label>
                  <p className="font-mono text-sm">{selectedBackup.userId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">刪除時間</label>
                  <p className="text-sm">{formatDate(selectedBackup.deletedAt)}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">Fragment 內容</label>
                <div className="mt-1 p-3 bg-gray-50 rounded border text-sm">
                  {selectedBackup.content}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-500">標籤 ({selectedBackup.tags.length})</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedBackup.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">筆記數量</label>
                <p className="text-sm">{selectedBackup.notesCount} 個筆記</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}