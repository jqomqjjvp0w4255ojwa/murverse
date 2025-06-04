// lib/mockAuthService.ts
'use client'

// 開發模式的固定用戶 ID
const DEV_USER_ID = 'dev-user-12345'

export interface MockUser {
  id: string
  email: string
  name: string
}

/**
 * 模擬登入服務 - 僅用於開發階段
 * 之後實作真正的登入系統時，只需要替換這個檔案即可
 */
export class MockAuthService {
  private static mockUser: MockUser = {
    id: DEV_USER_ID,
    email: 'dev@murverse.app',
    name: '開發者'
  }

  /**
   * 獲取當前用戶（模擬）
   */
  static async getCurrentUser(): Promise<MockUser | null> {
    // 模擬網路延遲
    await new Promise(resolve => setTimeout(resolve, 50))
    return this.mockUser
  }

  /**
   * 檢查是否已登入（永遠返回 true）
   */
  static async isAuthenticated(): Promise<boolean> {
    return true
  }

  /**
   * 模擬登入
   */
  static async login(email: string, password: string): Promise<MockUser> {
    console.log('🔧 [DEV] 模擬登入:', { email })
    return this.mockUser
  }

  /**
   * 模擬登出
   */
  static async logout(): Promise<void> {
    console.log('🔧 [DEV] 模擬登出')
  }

  /**
   * 設置開發模式標記
   */
  static isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  /**
   * 獲取固定的開發用戶 ID
   */
  static getDevUserId(): string {
    return DEV_USER_ID
  }
}