'use client';

import { useLanguage } from '@/lib/i18n';

const COPY = {
  zh: {
    label: '使用场景',
    title: '适合需要长期保存 AI 输出的人',
    testimonials: [
      {
        name: '产品经理',
        role: '需求整理',
        avatar: 'P',
        content: '用 Claude 和 ChatGPT 讨论方案后，可以直接导出成 HTML 或 PDF，发给团队时格式比复制粘贴稳定很多。',
      },
      {
        name: '开发者',
        role: '代码归档',
        avatar: 'D',
        content: '代码块、列表和长回复能一起保存下来。需要写文档时，我会把对话导出成 MD 或 DOCX 再继续整理。',
      },
      {
        name: '研究用户',
        role: '资料保存',
        avatar: 'R',
        content: '不同 AI 平台的对话都能放进同一套导出流程里，尤其是中文平台也支持后，整理资料方便很多。',
      },
    ],
  },
  en: {
    label: 'Use cases',
    title: 'Save AI output for the long term',
    testimonials: [
      {
        name: 'Product manager',
        role: 'Requirements notes',
        avatar: 'P',
        content: 'After discussing plans in Claude and ChatGPT, I can export straight to HTML or PDF and share clean files with the team.',
      },
      {
        name: 'Developer',
        role: 'Code archive',
        avatar: 'D',
        content: 'Code blocks, lists, and long answers stay together. When writing docs, I export chats to MD or DOCX and continue from there.',
      },
      {
        name: 'Research user',
        role: 'Knowledge capture',
        avatar: 'R',
        content: 'Conversations from different AI platforms go through one export flow, including Chinese AI tools, which makes research much easier to organize.',
      },
    ],
  },
};

export default function Testimonials() {
  const { language } = useLanguage();
  const copy = COPY[language];

  return (
    <section id="testimonials" className="py-20 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-3">{copy.label}</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            {copy.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {copy.testimonials.map((t) => (
            <div key={t.name} className="p-6 bg-card border border-border rounded-xl">
              <p className="text-muted text-sm leading-relaxed mb-6">&ldquo;{t.content}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white font-semibold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-foreground text-sm font-medium">{t.name}</p>
                  <p className="text-muted text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
