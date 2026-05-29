'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';

const COPY = {
  zh: {
    title: '常见问题',
    faqs: [
      {
        q: 'ExportAI 支持哪些 AI 平台？',
        a: '当前支持 ChatGPT、Claude、Gemini、DeepSeek、Grok、豆包、Kimi、MiniMax 和 GLM。不同平台页面结构会变化，我们会持续适配新的聊天页。',
      },
      {
        q: '支持哪些导出格式？',
        a: '支持 PDF、MHT、HTML、TXT、MD、DOCX、XLSX、PNG。可以在弹窗或页面浮动框中多选格式，然后点击一次导出。',
      },
      {
        q: '免费账号可以用什么功能？',
        a: '登录后可以使用弹窗里的手动导出功能，免费账号仅支持 TXT 和 PDF。会员功能包含全部导出格式、页面内可拖动浮动导出框和相关集成设置。',
      },
      {
        q: '导出的图片会保留吗？',
        a: '会尽量保留。HTML、PDF、MHT、DOCX、PNG 这类可以承载图片的格式会处理对话里的图片内容，纯文本格式会以文本内容为主。',
      },
      {
        q: '设置会同步吗？',
        a: '会。登录后设置会同步到账号，包括主题、语言、导出偏好、保存方式和页面浮动导出框设置。',
      },
      {
        q: '对话数据会上传到服务器吗？',
        a: '导出处理在浏览器扩展中完成。账号服务器用于登录、会员状态和设置同步，不用于保存你的聊天正文。',
      },
    ],
  },
  en: {
    title: 'Frequently asked questions',
    faqs: [
      {
        q: 'Which AI platforms does ExportAI support?',
        a: 'ExportAI currently supports ChatGPT, Claude, Gemini, DeepSeek, Grok, Doubao, Kimi, MiniMax, and GLM. AI websites change often, so we keep adapting provider detection over time.',
      },
      {
        q: 'Which export formats are supported?',
        a: 'You can export to PDF, MHT, HTML, TXT, MD, DOCX, XLSX, and PNG. Select multiple formats in the popup or floating panel, then export once.',
      },
      {
        q: 'What can free accounts use?',
        a: 'After login, free accounts can manually export TXT and PDF from the extension popup. Membership unlocks every export format, the draggable in-page floating export panel, and integration settings.',
      },
      {
        q: 'Will exported images be preserved?',
        a: 'Yes, as much as possible. Image-capable formats such as HTML, PDF, MHT, DOCX, and PNG process images from the conversation. Plain text formats focus on text content.',
      },
      {
        q: 'Do settings sync across devices?',
        a: 'Yes. After login, theme, language, export preferences, download behavior, and floating export panel settings sync to your account.',
      },
      {
        q: 'Are chat contents uploaded to the server?',
        a: 'Export processing happens inside the browser extension. The account server is used for login, membership status, and settings sync, not for storing your chat body.',
      },
    ],
  },
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { language } = useLanguage();
  const copy = COPY[language];

  return (
    <section id="faq" className="py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            {copy.title}
          </h2>
        </div>

        <div className="space-y-3">
          {copy.faqs.map((faq, i) => (
            <div key={faq.q} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-card-hover transition"
              >
                <span className="text-foreground font-medium text-sm pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-muted flex-shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-4">
                  <p className="text-muted text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
