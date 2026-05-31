'use client';

import { useLanguage } from '@/lib/i18n';
import { useBrowserExtensionInstallUrl } from '@/lib/extension-store';

const COPY = {
  zh: {
    badge: '支持 ChatGPT、Claude、Gemini、DeepSeek、Grok、豆包、Kimi、MiniMax、GLM',
    title: '一键导出 AI 对话',
    subtitle: '多平台、多格式、可同步',
    description: 'ExportAI 是一个 Chrome 扩展，用来保存完整 AI 聊天记录。支持弹窗多选导出、页面浮动导出、图片与附件内容保留，以及账号登录后的设置同步。',
    install: '安装 Chrome 扩展',
    features: '查看功能',
    panelTitle: 'ExportAI 导出面板',
    humanText: '把这次 AI 对话保存成文档，图片和格式也要保留。',
    aiText: '可以导出为 HTML、PDF、DOCX、XLSX、PNG 等格式，并按你的保存设置写入文件。',
    formats: '选择导出格式',
    export: '导出',
  },
  en: {
    badge: 'Supports ChatGPT, Claude, Gemini, DeepSeek, Grok, Doubao, Kimi, MiniMax, GLM',
    title: 'Export AI conversations in one click',
    subtitle: 'Multi-platform, multi-format, synced',
    description: 'ExportAI is a Chrome extension for saving complete AI chat records. It supports multi-format popup export, an in-page floating export panel, image and attachment preservation, and account-based settings sync.',
    install: 'Install Chrome extension',
    features: 'View features',
    panelTitle: 'ExportAI export panel',
    humanText: 'Save this AI conversation as a document, with images and formatting preserved.',
    aiText: 'Export to HTML, PDF, DOCX, XLSX, PNG and more, then save files using your download settings.',
    formats: 'Export formats',
    export: 'Export',
  },
};

export default function Hero() {
  const formats = ['TXT', 'PDF', 'MHT', 'HTML', 'MD', 'DOCX', 'XLSX', 'PNG'];
  const { language } = useLanguage();
  const installUrl = useBrowserExtensionInstallUrl();
  const copy = COPY[language];

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-card border border-border rounded-full text-sm text-muted mb-8">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          {copy.badge}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
          {copy.title}
          <br />
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {copy.subtitle}
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted max-w-3xl mx-auto mb-10">
          {copy.description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={installUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:from-primary-hover hover:to-secondary-hover transition shadow-lg shadow-primary/25"
          >
            {copy.install}
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 px-8 py-3 bg-card border border-border text-foreground font-semibold rounded-xl hover:bg-card-hover transition"
          >
            {copy.features}
          </a>
        </div>

        <div className="mt-16 relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur-xl" />
          <div className="relative bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-2xl">
            <div className="bg-background rounded-xl p-6 sm:p-8 text-left">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-muted">{copy.panelTitle}</span>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold text-primary mb-2">Human</p>
                    <p className="text-sm text-muted">{copy.humanText}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-xs font-semibold text-secondary mb-2">AI</p>
                    <p className="text-sm text-muted">{copy.aiText}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground mb-3">{copy.formats}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {formats.map((fmt) => (
                      <div key={fmt} className="px-3 py-2 bg-background rounded-lg text-xs text-center text-muted border border-border">
                        {fmt}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-center text-sm font-semibold text-white">
                    {copy.export}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
