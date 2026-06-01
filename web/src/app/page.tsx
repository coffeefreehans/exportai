'use client';

import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Pricing from '@/components/Pricing';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import { useLanguage } from '@/lib/i18n';
import { useBrowserExtensionInstallTarget } from '@/lib/extension-store';

const COPY = {
  zh: {
    title: '开始导出你的 AI 对话',
    description: '安装浏览器扩展，登录账号后即可使用弹窗手动导出。需要页面内浮动导出框时，可以开通会员。',
    installChrome: '安装 Chrome 插件',
    installEdge: '安装 Edge 插件',
    pricing: '查看会员',
  },
  en: {
    title: 'Start exporting your AI conversations',
    description: 'Install the browser extension and log in to use manual popup export. Upgrade when you need the in-page floating export panel.',
    installChrome: 'Install Chrome extension',
    installEdge: 'Install Edge Add-on',
    pricing: 'View pricing',
  },
};

export default function HomePage() {
  const { language } = useLanguage();
  const installTarget = useBrowserExtensionInstallTarget();
  const copy = COPY[language];
  const installText = installTarget.browser === 'edge' ? copy.installEdge : copy.installChrome;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <FAQ />

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-3xl blur-xl" />
            <div className="relative bg-card border border-border rounded-2xl p-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                {copy.title}
              </h2>
              <p className="text-muted text-lg mb-8 max-w-xl mx-auto">
                {copy.description}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={installTarget.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:from-primary-hover hover:to-secondary-hover transition shadow-lg shadow-primary/25"
                >
                  {installText}
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 px-8 py-3.5 border border-border text-foreground font-semibold rounded-xl hover:bg-muted/10 transition"
                >
                  {copy.pricing}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
