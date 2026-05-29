'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AuthFormProps {
  mode: 'login' | 'register' | 'forgot-password' | 'reset-password';
}

/**
 * Unified authentication form component for login, register, forgot-password, and reset-password.
 */
export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function resolveReturnPath() {
    const params = new URLSearchParams(window.location.search);
    const candidate = params.get('return') || '/account';
    return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/account';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const api = await import('@/lib/api');

      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          setLoading(false);
          return;
        }
        const result = await api.register(email, password);
        if (result.data) {
          await api.getMembership().catch(() => null);
          router.push(resolveReturnPath());
        } else {
          setError(result.message);
        }
      } else if (mode === 'login') {
        const result = await api.login(email, password);
        if (result.data) {
          await api.getMembership().catch(() => null);
          router.push(resolveReturnPath());
        } else {
          setError(result.message);
        }
      } else if (mode === 'forgot-password') {
        const result = await api.forgotPassword(email);
        if (result.code === 200) {
          setSuccess('如果该邮箱已注册，重置链接已发送到您的邮箱');
        } else {
          setError(result.message);
        }
      } else if (mode === 'reset-password') {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          setLoading(false);
          return;
        }
        const result = await api.resetPassword(token, password);
        if (result.code === 200) {
          setSuccess('密码重置成功，请登录');
          setTimeout(() => router.push('/login'), 2000);
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // For reset-password mode, read token from URL via useEffect (not during render)
  useEffect(() => {
    if (mode === 'reset-password' && !token) {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) setToken(urlToken);
    }
  }, [mode, token]);

  const getTitle = () => {
    switch (mode) {
      case 'login': return '登录';
      case 'register': return '注册';
      case 'forgot-password': return '忘记密码';
      case 'reset-password': return '重置密码';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return '登录您的 ExportAI 账号';
      case 'register': return '创建您的 ExportAI 账号';
      case 'forgot-password': return '输入您的邮箱，我们将发送重置链接';
      case 'reset-password': return '请输入您的新密码';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ExportAI
            </h1>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">{getTitle()}</h2>
          <p className="text-muted text-sm mb-6">{getSubtitle()}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            {mode !== 'reset-password' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted mb-1.5">
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="your@email.com"
                />
              </div>
            )}

            {/* Token field for reset-password */}
            {mode === 'reset-password' && !token && (
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-muted mb-1.5">
                  重置令牌
                </label>
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="输入重置令牌"
                />
              </div>
            )}

            {/* Password field */}
            {mode !== 'forgot-password' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-muted mb-1.5">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="至少 8 位"
                />
              </div>
            )}

            {/* Confirm password field */}
            {(mode === 'register' || mode === 'reset-password') && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted mb-1.5">
                  确认密码
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
                  placeholder="再次输入密码"
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            {/* Success message */}
            {success && (
              <div className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-2">
                {success}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:from-primary-hover hover:to-secondary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : getTitle()}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 text-center text-sm text-muted">
            {mode === 'login' && (
              <>
                <Link href="/forgot-password" className="text-primary hover:text-primary-hover transition">
                  忘记密码？
                </Link>
                <span className="mx-2">·</span>
                <Link href="/register" className="text-primary hover:text-primary-hover transition">
                  注册账号
                </Link>
              </>
            )}
            {mode === 'register' && (
              <Link href="/login" className="text-primary hover:text-primary-hover transition">
                已有账号？去登录
              </Link>
            )}
            {(mode === 'forgot-password' || mode === 'reset-password') && (
              <Link href="/login" className="text-primary hover:text-primary-hover transition">
                返回登录
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
