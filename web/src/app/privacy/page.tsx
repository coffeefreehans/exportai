'use client';

import Link from 'next/link';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/lib/i18n';

const COPY = {
  zh: {
    title: '隐私政策',
    updated: '最后更新：2026 年 6 月 1 日',
    intro:
      'ExportAI 是一个用于导出 AI 对话的浏览器扩展。我们只在提供导出、账号登录、会员状态和设置同步功能所必需的范围内处理数据。',
    back: '返回首页',
    sections: [
      {
        title: '我们收集的数据',
        items: [
          '账号信息：登录邮箱、账号 ID、会员状态和订阅类型。',
          '用户设置：导出格式、主题、语言、下载偏好、页面浮动导出按钮位置等设置。',
          '当前页面内容：当用户主动导出时，扩展会读取当前受支持 AI 聊天页面中的对话文本、图片、链接和附件引用，用于生成导出文件。',
          '基础技术信息：为登录、会员校验和错误排查所需的请求时间、接口状态和浏览器扩展版本。',
        ],
      },
      {
        title: '我们如何使用数据',
        items: [
          '生成用户选择的导出文件，例如 TXT、PDF、HTML、MHT、MD、DOCX、XLSX 和 PNG。',
          '同步账号设置，让同一账号在不同浏览器环境中使用一致的导出偏好。',
          '校验免费或付费会员权限，并启用对应功能。',
          '维护产品安全、排查错误和改进兼容性。',
        ],
      },
      {
        title: '我们不会收集的数据',
        items: [
          '不收集健康信息、精确位置、浏览历史、密码、PIN、安全问题答案或身份证件信息。',
          '不读取用户未打开或未主动导出的网页内容。',
          '不出售用户数据，不将用户聊天内容用于广告定向。',
        ],
      },
      {
        title: '数据共享',
        items: [
          '支付由 Stripe 处理。ExportAI 不保存完整银行卡号或支付凭据。',
          '除提供账号、会员、同步和支付服务所需的服务商外，我们不会向第三方共享用户数据。',
          '如果法律要求，我们可能在必要范围内披露相关数据。',
        ],
      },
      {
        title: '数据保存与删除',
        items: [
          '导出文件保存在用户选择的本地下载位置，ExportAI 不会把导出的完整文件上传到服务器保存。',
          '账号设置会保存在服务器和本地浏览器存储中，用于同步和缓存。',
          '用户可以联系我们请求删除账号数据。',
        ],
      },
      {
        title: '联系方式',
        items: ['如需隐私相关支持，请联系：support@followaigc.com'],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: June 1, 2026',
    intro:
      'ExportAI is a browser extension for exporting AI conversations. We process data only as needed to provide export, account login, membership status, and settings sync features.',
    back: 'Back to home',
    sections: [
      {
        title: 'Data we collect',
        items: [
          'Account information: login email, account ID, membership status, and subscription type.',
          'User settings: selected export formats, theme, language, download preferences, floating export button position, and related preferences.',
          'Current page content: when the user starts an export, the extension reads the current supported AI chat page, including conversation text, images, links, and attachment references, to generate the export file.',
          'Basic technical information: request time, API status, and extension version needed for login, membership checks, and troubleshooting.',
        ],
      },
      {
        title: 'How we use data',
        items: [
          'Generate export files selected by the user, such as TXT, PDF, HTML, MHT, MD, DOCX, XLSX, and PNG.',
          'Sync account settings so the same account can use consistent export preferences across browser environments.',
          'Verify free or paid membership access and enable the corresponding features.',
          'Maintain product security, troubleshoot errors, and improve compatibility.',
        ],
      },
      {
        title: 'Data we do not collect',
        items: [
          'We do not collect health information, precise location, browsing history, passwords, PINs, security question answers, or government ID information.',
          'We do not read pages that the user has not opened or has not chosen to export.',
          'We do not sell user data or use chat content for advertising targeting.',
        ],
      },
      {
        title: 'Data sharing',
        items: [
          'Payments are processed by Stripe. ExportAI does not store full card numbers or payment credentials.',
          'We do not share user data with third parties except service providers required for account, membership, sync, and payment services.',
          'We may disclose data when required by law and only to the necessary extent.',
        ],
      },
      {
        title: 'Data retention and deletion',
        items: [
          'Exported files are saved to the local download location chosen by the user. ExportAI does not upload and store complete exported files on our server.',
          'Account settings are stored on the server and in local browser storage for sync and caching.',
          'Users may contact us to request deletion of account data.',
        ],
      },
      {
        title: 'Contact',
        items: ['For privacy support, contact: support@followaigc.com'],
      },
    ],
  },
};

export default function PrivacyPage() {
  const { language } = useLanguage();
  const copy = COPY[language];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/" className="text-sm text-primary hover:text-secondary transition">
          {copy.back}
        </Link>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-10">
          <p className="text-sm text-muted">{copy.updated}</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{copy.title}</h1>
          <p className="mt-5 text-base leading-8 text-muted">{copy.intro}</p>

          <div className="mt-10 space-y-8">
            {copy.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-muted">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
