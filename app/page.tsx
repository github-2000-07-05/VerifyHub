'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  emailSubject: string;
  emailContent: string;
  createdAt: string;
}

interface RequestLog {
  id: string;
  email: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

type Page = 'login' | 'register' | 'dashboard' | 'verify';

export default function Home() {
  const [page, setPage] = useState<Page>('login');
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [countdown, setCountdown] = useState(0);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectLogs, setProjectLogs] = useState<RequestLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [registerPhase, setRegisterPhase] = useState<'info' | 'verify'>('info');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    code: '',
    projectName: '',
    projectDescription: '',
    emailSubject: '',
    emailContent: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setProjects(data.projects);
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            setUser(userData);
            setPage('dashboard');
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        });
    }
  }, []);

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setMessage('请填写完整信息');
      setMessageType('error');
      return;
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      }),
    });

    const data = await response.json();
    if (data.success) {
      setMessage('验证码已发送到您的邮箱，请查收并完成验证');
      setMessageType('success');
      setRegisterPhase('verify');
    } else {
      setMessage(data.message);
      setMessageType('error');
    }
  };

  const handleVerifyRegistration = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.code) {
      setMessage('请填写完整信息');
      setMessageType('error');
      return;
    }

    const response = await fetch('/api/auth/register', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        code: formData.code,
        name: formData.name,
        password: formData.password,
      }),
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setMessage('注册成功');
      setMessageType('success');
      
      if (data.user.role === 'admin') {
        setTimeout(() => {
          window.location.href = '/admin/dashboard';
        }, 1500);
      } else {
        setTimeout(() => {
          setPage('dashboard');
          fetchProjects();
        }, 1500);
      }
    } else {
      setMessage(data.message);
      setMessageType('error');
    }
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setMessage('请填写邮箱和密码');
      setMessageType('error');
      return;
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
      }),
    });

    const data = await response.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      
      if (data.user.role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else {
        fetchProjects();
        setPage('dashboard');
      }
    } else {
      setMessage(data.message);
      setMessageType('error');
    }
  };

  const fetchProjects = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch('/api/projects', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (data.success) {
      setProjects(data.projects);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProjects([]);
    setPage('login');
  };

  const handleCreateProject = async () => {
    if (!formData.projectName) {
      setMessage('请输入项目名称');
      setMessageType('error');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: formData.projectName,
        description: formData.projectDescription,
        emailSubject: formData.emailSubject || '验证码验证',
        emailContent: formData.emailContent || '您的验证码是：{{code}}',
      }),
    });

    const data = await response.json();
    if (data.success) {
      setMessage('项目创建成功');
      setMessageType('success');
      fetchProjects();
      setFormData((prev) => ({ ...prev, projectName: '', projectDescription: '', emailSubject: '', emailContent: '' }));
    } else {
      setMessage(data.message);
      setMessageType('error');
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    if (!formData.projectName) {
      setMessage('请输入项目名称');
      setMessageType('error');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: formData.projectName,
        description: formData.projectDescription,
        emailSubject: formData.emailSubject,
        emailContent: formData.emailContent,
      }),
    });

    const data = await response.json();
    if (data.success) {
      setMessage('项目更新成功');
      setMessageType('success');
      fetchProjects();
      setEditingProject(null);
      setFormData((prev) => ({ ...prev, projectName: '', projectDescription: '', emailSubject: '', emailContent: '' }));
    } else {
      setMessage(data.message);
      setMessageType('error');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('确定要删除这个项目吗？')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (data.success) {
      setMessage('删除成功');
      setMessageType('success');
      fetchProjects();
    } else {
      setMessage(data.message);
      setMessageType('error');
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setFormData({
      ...formData,
      projectName: project.name,
      projectDescription: project.description || '',
      emailSubject: project.emailSubject,
      emailContent: project.emailContent,
    });
  };

  const fetchProjectLogs = async (projectId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`/api/projects/${projectId}/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (data.success) {
      setProjectLogs(data.logs);
    }
  };

  const handleViewLogs = async (project: Project) => {
    setSelectedProject(project);
    await fetchProjectLogs(project.id);
    setShowLogs(true);
  };

  const handleSendCode = async () => {
    if (!formData.email) {
      setMessage('请输入邮箱地址');
      setMessageType('error');
      return;
    }

    const response = await fetch('/api/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email }),
    });

    const data = await response.json();
    if (data.success) {
      setMessage(data.message);
      setMessageType('success');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setMessage(data.message);
      setMessageType('error');
    }
  };

  const handleVerifyCode = async () => {
    if (!formData.email || !formData.code) {
      setMessage('请输入邮箱和验证码');
      setMessageType('error');
      return;
    }

    const response = await fetch('/api/send-code', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, code: formData.code }),
    });

    const data = await response.json();
    if (data.success) {
      setMessage(data.message);
      setMessageType('success');
      setTimeout(() => setPage('login'), 2000);
    } else {
      setMessage(data.message);
      setMessageType('error');
    }
  };

  const resetRegisterForm = () => {
    setFormData((prev) => ({ ...prev, name: '', email: '', password: '', code: '' }));
    setRegisterPhase('info');
    setPage('login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800">
      {page === 'dashboard' && (
        <nav className="bg-white shadow-sm text-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-indigo-600">邮箱验证码服务</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">欢迎, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </nav>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg text-center ${
              messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {message}
          </div>
        )}

        {page === 'login' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-gray-800">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">登录</h1>
                <p className="text-gray-500 mt-2">欢迎回来</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">邮箱地址</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                    placeholder="请输入邮箱"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">密码</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                    placeholder="请输入密码"
                  />
                </div>

                <button
                  onClick={handleLogin}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  登录
                </button>

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => {
                      setPage('verify');
                      setFormData((prev) => ({ ...prev, code: '' }));
                    }}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    忘记密码？
                  </button>
                  <button
                    onClick={() => setPage('register')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    注册新账户
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === 'register' && registerPhase === 'info' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-gray-800">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">注册新账户</h1>
                <p className="text-gray-500 mt-2">请填写信息，我们将向您发送验证码</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">姓名</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                    placeholder="请输入姓名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">邮箱地址</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                    placeholder="请输入邮箱"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">密码</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                    placeholder="请输入密码"
                  />
                </div>

                <button
                  onClick={handleRegister}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  发送验证码
                </button>

                <button
                  onClick={() => setPage('login')}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm"
                >
                  返回登录
                </button>
              </div>
            </div>
          </div>
        )}

        {page === 'register' && registerPhase === 'verify' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-gray-800">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">完成注册验证</h1>
                <p className="text-gray-500 mt-2">请查收邮箱并输入验证码</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">验证码</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                    placeholder="请输入6位验证码"
                  />
                </div>

                <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                  📧 已向 <strong>{formData.email}</strong> 发送验证码
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleVerifyRegistration}
                    className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    完成注册
                  </button>
                  <button
                    onClick={() => setRegisterPhase('info')}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    重新发送
                  </button>
                </div>

                <button
                  onClick={resetRegisterForm}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm"
                >
                  取消注册
                </button>
              </div>
            </div>
          </div>
        )}

        {page === 'verify' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-gray-800">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800">验证码验证</h1>
                <p className="text-gray-500 mt-2">通过邮箱接收验证码</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">邮箱地址</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                    placeholder="请输入邮箱"
                  />
                </div>

                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 ? `重新发送 (${countdown}s)` : '发送验证码'}
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">验证码</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 bg-white"
                    placeholder="请输入6位验证码"
                  />
                </div>

                <button
                  onClick={handleVerifyCode}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  验证
                </button>

                <button
                  onClick={() => {
                    setPage('login');
                    setFormData((prev) => ({ ...prev, code: '' }));
                  }}
                  className="w-full text-gray-600 hover:text-gray-800 text-sm"
                >
                  返回登录
                </button>
              </div>
            </div>
          </div>
        )}

        {page === 'dashboard' && (
          <div>
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 text-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                {editingProject ? '编辑项目' : '创建新项目'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, projectName: e.target.value }))}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                  placeholder="项目名称"
                />
                <input
                  type="text"
                  value={formData.projectDescription}
                  onChange={(e) => setFormData((prev) => ({ ...prev, projectDescription: e.target.value }))}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                  placeholder="项目描述（可选）"
                />
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">邮件标题</label>
                <input
                  type="text"
                  value={formData.emailSubject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, emailSubject: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                  placeholder="验证码验证"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-gray-800">邮件内容</label>
                <textarea
                  value={formData.emailContent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, emailContent: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800 resize-none"
                  placeholder="您的验证码是：{{code}}"
                />
                <p className="text-xs text-gray-400 mt-2">
                  可用占位符：{'{'}{'{'}code{'}'}{'}'} - 验证码, {'{'}{'{'}email{'}'}{'}'} - 用户邮箱, {'{'}{'{'}expireMinutes{'}'}{'}'} - 有效期(分钟)
                </p>
              </div>

              <div className="mt-4 flex gap-4">
                {editingProject ? (
                  <>
                    <button
                      onClick={handleUpdateProject}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      更新项目
                    </button>
                    <button
                      onClick={() => {
                        setEditingProject(null);
                        setFormData((prev) => ({ ...prev, projectName: '', projectDescription: '', emailSubject: '', emailContent: '' }));
                      }}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCreateProject}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    创建项目
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 text-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">我的项目</h2>
              {projects.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无项目，请创建一个新项目</p>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-800">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                          )}
                          <p className="text-sm text-gray-400 mt-2">
                            创建于 {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewLogs(project)}
                            className="text-green-500 hover:text-green-600 p-2"
                            title="查看请求日志"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditProject(project)}
                            className="text-blue-500 hover:text-blue-600 p-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-red-500 hover:text-red-600 p-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-500">API Key:</span>
                        <code className="block mt-1 font-mono text-sm text-indigo-600 break-all">
                          {project.apiKey}
                        </code>
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-500">邮件标题:</span>
                          <span className="text-sm text-blue-700">{project.emailSubject}</span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">邮件内容:</span>
                          <p className="text-sm text-blue-700 mt-1 whitespace-pre-wrap">{project.emailContent}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 bg-white rounded-2xl shadow-xl p-6 text-gray-800">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">API 使用说明</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700">发送验证码（使用默认模板）</h3>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-sm font-mono overflow-x-auto">
                    <code>{`POST /api/send-code
Content-Type: application/json

{
  "email": "user@example.com"
}`}</code>
                  </pre>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">发送验证码（使用项目模板）</h3>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-sm font-mono overflow-x-auto">
                    <code>{`POST /api/send-code
Content-Type: application/json

{
  "email": "user@example.com",
  "apiKey": "your-project-api-key"
}`}</code>
                  </pre>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700">验证验证码</h3>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-sm font-mono overflow-x-auto">
                    <code>{`PUT /api/send-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456"
}`}</code>
                  </pre>
                </div>
              </div>
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                <h4 className="font-medium text-indigo-800 mb-2">邮件模板占位符</h4>
                <ul className="text-sm text-indigo-600 space-y-1">
                  <li><code>{'{'}{'{'}code{'}'}{'}'}</code> - 替换为验证码</li>
                  <li><code>{'{'}{'{'}email{'}'}{'}'}</code> - 替换为用户邮箱</li>
                  <li><code>{'{'}{'{'}expireMinutes{'}'}{'}'}</code> - 替换为有效期（5分钟）</li>
                </ul>
                <p className="mt-3 text-sm text-indigo-600">
                  示例：<code>{'"'}欢迎访问我的应用，您的验证码是：{'{'}{'{'}code{'}'}{'}'}{'"'}</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {showLogs && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden text-gray-800">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-800">
                  项目「{selectedProject.name}」的请求日志
                </h2>
                <button
                  onClick={() => {
                    setShowLogs(false);
                    setSelectedProject(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {projectLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">暂无请求日志</p>
                ) : (
                  <div className="space-y-3">
                    {projectLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-4 rounded-lg border ${
                          log.status === 'success'
                            ? 'border-green-200 bg-green-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                log.status === 'success'
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                              }`}>
                                {log.status === 'success' ? '成功' : '失败'}
                              </span>
                              <span className="text-sm text-gray-600">{log.email}</span>
                            </div>
                            {log.errorMessage && (
                              <p className="text-sm text-red-600 mt-2">
                                错误信息: {log.errorMessage}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}