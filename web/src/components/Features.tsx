'use client';

import { useLanguage } from '@/lib/i18n';

const COPY = {
  zh: {
    label: '产品定位',
    title: '把 AI 聊天记录变成可保存、可分享、可整理的文件',
    description: '不再一段段复制粘贴，也不再丢失图片、代码和排版。ExportAI 直接在当前聊天页读取内容，并按你选择的格式导出。',
    painPoints: [
      '长对话手动复制容易漏内容',
      '复制到文档后格式经常乱掉',
      '图片、附件和代码块需要一起保存',
    ],
    featureLabel: '核心功能',
    featureTitle: '为真实导出流程设计',
    cards: [
      {
        title: '覆盖常用 AI 平台',
        description: '支持 ChatGPT、Claude、Gemini、DeepSeek、Grok，以及豆包、Kimi、MiniMax、GLM 等中文 AI 平台。',
      },
      {
        title: '8 种导出格式',
        description: '支持 TXT、PDF、MHT、HTML、MD、DOCX、XLSX、PNG。免费账号可用 TXT/PDF，会员可用全部格式。',
      },
      {
        title: '保留图片与富文本',
        description: 'HTML、PDF、MHT、DOCX、PNG 等格式会尽量保留对话中的图片、代码块、列表、引用和排版内容。',
      },
      {
        title: '账号同步设置',
        description: '登录后自动同步导出偏好、主题、语言、保存方式和浮动导出框设置。Chrome 本地存储只作为缓存。',
      },
    ],
  },
  en: {
    label: 'Product focus',
    title: 'Turn AI conversations into files you can save, share, and organize',
    description: 'Stop copying long chats by hand and losing images, code, or formatting. ExportAI reads the current chat page and exports it in the formats you choose.',
    painPoints: [
      'Manual copying misses parts of long conversations',
      'Formatting often breaks after pasting into documents',
      'Images, attachments, and code blocks need to stay together',
    ],
    featureLabel: 'Core features',
    featureTitle: 'Built for real export workflows',
    cards: [
      {
        title: 'Works across popular AI platforms',
        description: 'Supports ChatGPT, Claude, Gemini, DeepSeek, Grok, plus Chinese AI platforms including Doubao, Kimi, MiniMax, and GLM.',
      },
      {
        title: '8 export formats',
        description: 'Export to TXT, PDF, MHT, HTML, MD, DOCX, XLSX, and PNG. Free accounts can use TXT/PDF, while members can use every format.',
      },
      {
        title: 'Preserve images and rich text',
        description: 'HTML, PDF, MHT, DOCX, and PNG exports preserve conversation images, code blocks, lists, quotes, and layout as much as possible.',
      },
      {
        title: 'Account-synced settings',
        description: 'After login, export preferences, theme, language, download behavior, and floating export panel settings sync to your account.',
      },
    ],
  },
};

export default function Features() {
  const { language } = useLanguage();
  const copy = COPY[language];

  return (
    <section id="features" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-3">{copy.label}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {copy.title}
          </h2>
          <p className="text-muted max-w-2xl mx-auto">
            {copy.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {copy.painPoints.map((text) => (
            <div key={text} className="p-6 bg-card border border-border rounded-xl hover:border-primary/30 transition">
              <p className="text-muted text-sm">{text}</p>
            </div>
          ))}
        </div>

        <div className="text-center mb-12">
          <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-3">{copy.featureLabel}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            {copy.featureTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {copy.cards.map((feature, i) => (
            <div
              key={feature.title}
              className="group p-6 bg-card border border-border rounded-xl hover:border-primary/30 transition"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:from-primary/30 group-hover:to-secondary/30 transition">
                <span className="text-sm font-bold">{i + 1}</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
