'use client'

import { useState, useEffect } from 'react';

interface UserInfo {
  user?: any;
  userId?: string;
  hasToken: boolean;
  tokenPreview?: string;
  error?: string;
}

interface DetailedApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  json?: any;
}

export default function EnhancedDebugFragments() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [apiResponse, setApiResponse] = useState<DetailedApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);

  // 檢查用戶狀態
  const checkUserStatus = async () => {
    try {
      const { AuthHelper } = await import('@/lib/authHelper');
      const user = await AuthHelper.getCurrentUser();
      const userId = await AuthHelper.getUserId();
      const token = await AuthHelper.getSessionToken();
      
      setUserInfo({
        user,
        userId: userId || undefined,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : undefined
      });
    } catch (error: unknown) {
      console.error('檢查用戶狀態失敗:', error);
      setUserInfo({ 
        hasToken: false,
        error: error instanceof Error ? error.message : '未知錯誤' 
      });
    }
  };

  // 詳細的 API 測試
  const detailedApiTest = async () => {
    setLoading(true);
    setApiResponse(null);
    
    try {
      const { AuthHelper } = await import('@/lib/authHelper');
      const token = await AuthHelper.getSessionToken();
      
      if (!token) {
        throw new Error('沒有認證 token');
      }

      console.log('🔍 開始詳細 API 測試...');
      console.log('Token:', token.substring(0, 50) + '...');
      
      const response = await fetch('/api/fragments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // 收集詳細資訊
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const body = await response.text();
      console.log('API 原始響應:', body);

      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        console.error('JSON 解析失敗:', e);
      }

      const detailedResponse: DetailedApiResponse = {
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        json
      };

      setApiResponse(detailedResponse);
      console.log('詳細響應:', detailedResponse);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      console.error('❌ API 調用失敗:', error);
      setApiResponse({
        status: 0,
        statusText: 'ERROR',
        headers: {},
        body: `錯誤: ${errorMessage}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // 檢查 Store 狀態
  const checkStoreInfo = async () => {
    try {
      const { useFragmentsStore } = await import('@/features/fragments/store/useFragmentsStore');
      const state = useFragmentsStore.getState();
      
      const info = {
        fragmentsCount: state.fragments?.length || 0,
        fragments: state.fragments || [],
        isLoading: state.isLoading,
        error: state.error,
        mode: state.mode
      };
      
      setStoreInfo(info);
      console.log('🏪 Store 詳細狀態:', info);
    } catch (error: unknown) {
      console.error('檢查 Store 狀態失敗:', error);
      setStoreInfo({ error: error instanceof Error ? error.message : '未知錯誤' });
    }
  };

  // 強制重新載入 fragments
  const forceReload = async () => {
    try {
      const { useFragmentsStore } = await import('@/features/fragments/store/useFragmentsStore');
      setLoading(true);
      console.log('🔄 強制重新載入 fragments...');
      await useFragmentsStore.getState().load();
      await checkStoreInfo();
      console.log('✅ 強制重新載入完成');
    } catch (error) {
      console.error('❌ 強制重新載入失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserStatus();
    checkStoreInfo();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-6">增強診斷工具</h1>
      
      {/* 用戶狀態 */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-lg font-semibold mb-3">用戶狀態</h2>
        {userInfo ? (
          <div className="space-y-2 text-sm">
            {userInfo.error ? (
              <div className="text-red-600">錯誤: {userInfo.error}</div>
            ) : (
              <>
                <div><strong>用戶 ID:</strong> <code className="bg-gray-100 px-1 rounded">{userInfo.userId || '未獲取到'}</code></div>
                <div><strong>Email:</strong> {userInfo.user?.email || '未知'}</div>
                <div><strong>有 Token:</strong> {userInfo.hasToken ? '✅ 是' : '❌ 否'}</div>
                {userInfo.tokenPreview && (
                  <div><strong>Token 預覽:</strong> <code className="bg-gray-100 px-1 rounded text-xs">{userInfo.tokenPreview}</code></div>
                )}
              </>
            )}
          </div>
        ) : (
          <div>載入中...</div>
        )}
      </div>

      {/* Store 狀態 */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-lg font-semibold mb-3">Store 狀態</h2>
        {storeInfo ? (
          <div className="space-y-2 text-sm">
            <div><strong>Fragments 數量:</strong> {storeInfo.fragmentsCount}</div>
            <div><strong>載入狀態:</strong> {storeInfo.isLoading ? '載入中' : '已完成'}</div>
            <div><strong>錯誤:</strong> {storeInfo.error || '無'}</div>
            <div><strong>模式:</strong> {storeInfo.mode}</div>
            {storeInfo.fragments.length > 0 && (
              <div>
                <strong>Fragments 預覽:</strong>
                <pre className="bg-gray-100 p-2 rounded text-xs mt-1 overflow-auto max-h-32">
                  {JSON.stringify(storeInfo.fragments, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div>載入中...</div>
        )}
      </div>

      {/* API 詳細測試 */}
      <div className="mb-6 p-4 border rounded">
        <h2 className="text-lg font-semibold mb-3">API 詳細測試</h2>
        
        <div className="space-x-2 mb-4">
          <button
            onClick={detailedApiTest}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '測試中...' : '詳細 API 測試'}
          </button>
          
          <button
            onClick={forceReload}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '載入中...' : '強制重新載入'}
          </button>
        </div>

        {apiResponse && (
          <div className="space-y-2">
            <div><strong>狀態碼:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-white text-sm ${
                apiResponse.status === 200 ? 'bg-green-500' : 
                apiResponse.status >= 400 ? 'bg-red-500' : 'bg-yellow-500'
              }`}>
                {apiResponse.status} {apiResponse.statusText}
              </span>
            </div>
            
            <div><strong>響應 Headers:</strong></div>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(apiResponse.headers, null, 2)}
            </pre>
            
            <div><strong>響應內容:</strong></div>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
              {apiResponse.body}
            </pre>
            
            {apiResponse.json && (
              <>
                <div><strong>解析後的 JSON:</strong></div>
                <pre className="bg-green-50 p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(apiResponse.json, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </div>

      {/* 快速操作 */}
      <div className="p-4 border rounded">
        <h2 className="text-lg font-semibold mb-3">快速操作</h2>
        
        <div className="space-x-2">
          <button
            onClick={checkUserStatus}
            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
          >
            重新檢查用戶
          </button>
          
          <button
            onClick={checkStoreInfo}
            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
          >
            檢查 Store
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
          >
            重新整理頁面
          </button>
        </div>
      </div>
    </div>
  );
}