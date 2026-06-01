'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

const COPY = {
  zh: {
    description: '一个用于导出 AI 对话的浏览器扩展，支持多平台、多格式、图片内容保留和账号设置同步。',
    product: '产品',
    features: '功能',
    pricing: '会员',
    account: '账号',
    login: '登录',
    register: '注册',
    myAccount: '我的账号',
    privacy: '隐私政策',
    terms: '服务条款',
  },
  en: {
    description: 'A browser extension for exporting AI conversations across platforms, formats, images, and account-synced settings.',
    product: 'Product',
    features: 'Features',
    pricing: 'Pricing',
    account: 'Account',
    login: 'Log in',
    register: 'Sign up',
    myAccount: 'My account',
    privacy: 'Privacy policy',
    terms: 'Terms of service',
  },
};

export default function Footer() {
  const { language } = useLanguage();
  const copy = COPY[language];

  return (
    <footer className="border-t border-border bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="inline-block">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                ExportAI
              </h2>
            </Link>
            <p className="text-muted text-sm mt-2 max-w-md">
              {copy.description}
            </p>
          </div>

          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4">{copy.product}</h3>
            <ul className="space-y-2">
              <li><a href="#features" className="text-muted hover:text-foreground text-sm transition">{copy.features}</a></li>
              <li><a href="#pricing" className="text-muted hover:text-foreground text-sm transition">{copy.pricing}</a></li>
              <li><a href="#faq" className="text-muted hover:text-foreground text-sm transition">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-foreground font-semibold text-sm mb-4">{copy.account}</h3>
            <ul className="space-y-2">
              <li><Link href="/login" className="text-muted hover:text-foreground text-sm transition">{copy.login}</Link></li>
              <li><Link href="/register" className="text-muted hover:text-foreground text-sm transition">{copy.register}</Link></li>
              <li><Link href="/account" className="text-muted hover:text-foreground text-sm transition">{copy.myAccount}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted text-xs">
            &copy; {new Date().getFullYear()} ExportAI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-muted hover:text-foreground text-xs transition">{copy.privacy}</Link>
            <a href="#" className="text-muted hover:text-foreground text-xs transition">{copy.terms}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
