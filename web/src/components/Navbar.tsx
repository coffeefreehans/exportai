'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStoredUser, logout, isLoggedIn } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isChinese, toggleLanguage } = useLanguage();

  const text = isChinese
    ? {
        features: '功能',
        pricing: '会员',
        scenarios: '场景',
        account: '账号',
        logout: '退出',
        login: '登录',
        register: '免费注册',
        language: 'EN',
      }
    : {
        features: 'Features',
        pricing: 'Pricing',
        scenarios: 'Use cases',
        account: 'Account',
        logout: 'Logout',
        login: 'Log in',
        register: 'Sign up',
        language: '中文',
      };

  useEffect(() => {
    const refreshAuthState = () => {
      setLoggedIn(isLoggedIn());
      setUser(getStoredUser());
    };
    refreshAuthState();
    window.addEventListener('exportai-auth-sync', refreshAuthState);
    window.addEventListener('storage', refreshAuthState);
    return () => {
      window.removeEventListener('exportai-auth-sync', refreshAuthState);
      window.removeEventListener('storage', refreshAuthState);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setLoggedIn(false);
    setUser(null);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ExportAI
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="/#features" className="text-muted hover:text-foreground transition text-sm">{text.features}</a>
            <a href="/#pricing" className="text-muted hover:text-foreground transition text-sm">{text.pricing}</a>
            <a href="/#testimonials" className="text-muted hover:text-foreground transition text-sm">{text.scenarios}</a>
            <a href="/#faq" className="text-muted hover:text-foreground transition text-sm">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-card-hover transition"
              type="button"
            >
              {text.language}
            </button>

            {loggedIn && user ? (
              <div className="flex items-center gap-3">
                <Link href="/account" className="text-sm text-muted hover:text-foreground transition">
                  {text.account}
                </Link>
                <span className="text-sm text-muted">{user.email}</span>
                <button onClick={handleLogout} className="text-sm text-muted hover:text-foreground transition" type="button">
                  {text.logout}
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm text-muted hover:text-foreground transition">
                  {text.login}
                </Link>
                <Link
                  href="/register"
                  className="text-sm px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:from-primary-hover hover:to-secondary-hover transition"
                >
                  {text.register}
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-muted hover:text-foreground transition"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-3">
              <button
                onClick={toggleLanguage}
                className="w-fit rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground hover:bg-card-hover transition"
                type="button"
              >
                {text.language}
              </button>
              <a href="/#features" className="text-muted hover:text-foreground transition text-sm py-1">{text.features}</a>
              <a href="/#pricing" className="text-muted hover:text-foreground transition text-sm py-1">{text.pricing}</a>
              <a href="/#testimonials" className="text-muted hover:text-foreground transition text-sm py-1">{text.scenarios}</a>
              <a href="/#faq" className="text-muted hover:text-foreground transition text-sm py-1">FAQ</a>
              <div className="flex gap-3 mt-2">
                {loggedIn ? (
                  <div className="flex gap-3 items-center">
                    <Link href="/account" className="text-sm text-muted hover:text-foreground transition">{text.account}</Link>
                    <button onClick={handleLogout} className="text-sm text-muted hover:text-foreground transition" type="button">{text.logout}</button>
                  </div>
                ) : (
                  <>
                    <Link href="/login" className="text-sm text-muted hover:text-foreground transition">{text.login}</Link>
                    <Link href="/register" className="text-sm text-primary hover:text-primary-hover transition">{text.register}</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
