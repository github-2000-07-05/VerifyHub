'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  userId: string;
  emailSubject: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    requestLogs: number;
  };
}

interface Verification {
  id: string;
  requestId: string;
  userId: string | null;
  email: string | null;
  code: string;
  expiresAt: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface RequestLog {
  id: string;
  projectId: string;
  email: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

type TabType = 'users' | 'projects' | 'verifications' | 'logs';

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }

    const user = JSON.parse(userData);
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }

    setAdmin(user);
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      if (activeTab === 'users') {
        const response = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) setUsers(data.users);
      } else if (activeTab === 'projects') {
        const response = await fetch('/api/admin/projects', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) setProjects(data.projects);
      } else if (activeTab === 'verifications') {
        const response = await fetch('/api/admin/verifications', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) setVerifications(data.verifications);
      } else if (activeTab === 'logs') {
        const response = await fetch('/api/admin/logs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) setRequestLogs(data.requestLogs);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin');
    router.push('/admin');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'verified': return 'bg-green-500';
      case 'expired': return 'bg-gray-500';
      case 'invalid': return 'bg-red-500';
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待验证';
      case 'verified': return '验证成功';
      case 'expired': return '已过期';
      case 'invalid': return '已作废';
      case 'success': return '成功';
      case 'failed': return '失败';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const tabs = [
    { key: 'users' as TabType, label: '用户管理', count: users.length },
    { key: 'projects' as TabType, label: '项目管理', count: projects.length },
    { key: 'verifications' as TabType, label: '验证码日志', count: verifications.length },
    { key: 'logs' as TabType, label: '请求日志', count: requestLogs.length },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">管理员后台</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">欢迎, {admin?.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-blue-500' : 'bg-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">用户ID</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">姓名</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">邮箱</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">角色</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">创建时间</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">更新时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-300 font-mono text-sm">{user.id}</td>
                        <td className="px-4 py-3 text-gray-300">{user.name}</td>
                        <td className="px-4 py-3 text-gray-300">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                          }`}>
                            {user.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(user.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="text-center py-12 text-gray-500">暂无用户</div>
                )}
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">项目名称</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">描述</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">所属用户</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">API Key</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">请求数</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-300 font-medium">{project.name}</td>
                        <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{project.description || '-'}</td>
                        <td className="px-4 py-3 text-gray-300">{project.user.name} ({project.user.email})</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-sm">{project.apiKey}</td>
                        <td className="px-4 py-3 text-gray-300">{project._count.requestLogs}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(project.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {projects.length === 0 && (
                  <div className="text-center py-12 text-gray-500">暂无项目</div>
                )}
              </div>
            )}

            {activeTab === 'verifications' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">请求ID</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">邮箱</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">所属用户</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">状态</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">尝试次数</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">过期时间</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifications.map((v) => (
                      <tr key={v.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-300 font-mono text-sm">{v.requestId}</td>
                        <td className="px-4 py-3 text-gray-300">{v.email || '-'}</td>
                        <td className="px-4 py-3 text-gray-400">{v.user?.name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(v.status)} text-white`}>
                            {getStatusText(v.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{v.attemptCount}/{v.maxAttempts}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(v.expiresAt)}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(v.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {verifications.length === 0 && (
                  <div className="text-center py-12 text-gray-500">暂无验证码记录</div>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">邮箱</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">所属项目</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">所属用户</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">状态</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">错误信息</th>
                      <th className="px-4 py-3 text-left text-gray-300 font-medium">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestLogs.map((log) => (
                      <tr key={log.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-gray-300">{log.email}</td>
                        <td className="px-4 py-3 text-gray-300 font-medium">{log.project.name}</td>
                        <td className="px-4 py-3 text-gray-400">{log.project.user.name} ({log.project.user.email})</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(log.status)} text-white`}>
                            {getStatusText(log.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm max-w-xs truncate">{log.errorMessage || '-'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {requestLogs.length === 0 && (
                  <div className="text-center py-12 text-gray-500">暂无请求日志</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}