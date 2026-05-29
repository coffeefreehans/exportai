'use client';

import { useEffect, useState } from 'react';
import { createCheckout, getMembership, isLoggedIn } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';

type PlanType = 'FREE' | 'MONTHLY' | 'YEARLY' | 'LIFETIME';
type PaidPlanType = Exclude<PlanType, 'FREE'>;

interface MembershipData {
  id: string | null;
  planType: string | null;
  status: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  isMember: boolean;
}

const PLAN_TYPES: PlanType[] = ['FREE', 'MONTHLY', 'YEARLY', 'LIFETIME'];

const COPY = {
  zh: {
    title: '选择会员方案',
    subtitle: '免费账号可使用弹窗手动导出 TXT/PDF。会员可解锁全部格式、页面内浮动导出框和账号级集成设置。',
    alreadyActive: '你已经是有效会员，订阅按钮已禁用。',
    redirecting: '跳转中...',
    subscribe: '订阅',
    available: '当前可用',
    active: '已开通',
    save: '省 44%',
    names: {
      FREE: '免费',
      MONTHLY: '月付',
      YEARLY: '年付',
      LIFETIME: '永久',
    },
    periods: {
      FREE: '',
      MONTHLY: '/月',
      YEARLY: '/年',
      LIFETIME: '一次性',
    },
    features: {
      FREE: ['弹窗手动导出 TXT/PDF', '账号设置同步', '基础平台支持'],
      MONTHLY: ['页面浮动导出框', '账号设置同步', '多格式导出', '优先适配反馈'],
      YEARLY: ['页面浮动导出框', '账号设置同步', '多格式导出', '优先适配反馈', '更适合长期使用'],
      LIFETIME: ['页面浮动导出框', '账号设置同步', '多格式导出', '优先适配反馈', '永久会员'],
    },
  },
  en: {
    title: 'Choose your plan',
    subtitle: 'Free accounts can manually export TXT and PDF from the popup. Members unlock every format, the in-page floating export panel, and account-level integration settings.',
    alreadyActive: 'You already have an active membership. Subscription buttons are disabled.',
    redirecting: 'Redirecting...',
    subscribe: 'Subscribe',
    available: 'Available now',
    active: 'Active',
    save: 'Save 44%',
    names: {
      FREE: 'Free',
      MONTHLY: 'Monthly',
      YEARLY: 'Yearly',
      LIFETIME: 'Lifetime',
    },
    periods: {
      FREE: '',
      MONTHLY: '/month',
      YEARLY: '/year',
      LIFETIME: 'one time',
    },
    features: {
      FREE: ['Popup manual export for TXT and PDF', 'Account settings sync', 'Core platform support'],
      MONTHLY: ['Floating export panel', 'Account settings sync', 'Multi-format export', 'Priority compatibility feedback'],
      YEARLY: ['Floating export panel', 'Account settings sync', 'Multi-format export', 'Priority compatibility feedback', 'Best for long-term use'],
      LIFETIME: ['Floating export panel', 'Account settings sync', 'Multi-format export', 'Priority compatibility feedback', 'Lifetime access'],
    },
  },
};

const PRICES: Record<PlanType, string> = {
  FREE: '$0',
  MONTHLY: '$3',
  YEARLY: '$20',
  LIFETIME: '$50',
};

function isPaidPlan(planType: PlanType): planType is PaidPlanType {
  return planType !== 'FREE';
}

function planLabel(planType: string | null | undefined, copy: typeof COPY.zh) {
  if (planType === 'LIFETIME') return copy.names.LIFETIME;
  if (planType === 'YEARLY') return copy.names.YEARLY;
  if (planType === 'MONTHLY') return copy.names.MONTHLY;
  return copy.active;
}

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();
  const copy = COPY[language];
  const isActiveMember = Boolean(membership?.isMember);

  useEffect(() => {
    if (!isLoggedIn()) return;
    getMembership()
      .then((result) => {
        if (result.data) setMembership(result.data);
      })
      .catch(() => null);
  }, []);

  const handleCheckout = async (planType: PlanType) => {
    if (!isPaidPlan(planType) || isActiveMember) return;
    setError(null);
    if (!isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    setLoading(planType);
    try {
      const result = await createCheckout(planType);
      if (result.data?.url) {
        window.location.href = result.data.url;
        return;
      }
      setError(result.message || 'Unable to start Stripe checkout.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Stripe checkout.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-4">
          {copy.title}
        </h2>
        <p className="text-muted text-lg text-center mb-12 max-w-xl mx-auto">
          {copy.subtitle}
        </p>

        {isActiveMember && (
          <div className="mb-8 rounded-xl border border-[#22c55e]/30 bg-[#052e1a] px-5 py-4 text-center">
            <p className="text-sm font-semibold text-[#86efac]">
              {copy.alreadyActive} {planLabel(membership?.planType, copy)}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-8 rounded-xl border border-[#f97316]/30 bg-[#431407] px-5 py-4 text-center">
            <p className="text-sm font-semibold text-[#fdba74]">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {PLAN_TYPES.map((planType) => {
            const featured = planType === 'YEARLY';
            const paidPlan = isPaidPlan(planType);
            const disabled = !paidPlan || isActiveMember || loading === planType;
            return (
              <div
                key={planType}
                className={`relative rounded-2xl border p-8 flex flex-col ${
                  featured
                    ? 'border-[#6366f1] bg-[#12121a] scale-[1.03] shadow-lg shadow-[#6366f1]/20'
                    : 'border-[#1e1e2e] bg-[#12121a]'
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white rounded-full">
                    {copy.save}
                  </span>
                )}

                <h3 className="text-xl font-semibold text-white mb-2">{copy.names[planType]}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{PRICES[planType]}</span>
                  <span className="text-[#a1a1aa] text-sm">{copy.periods[planType]}</span>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {copy.features[planType].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-[#d4d4d8]">
                      <svg className="w-4 h-4 text-[#6366f1] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(planType)}
                  disabled={disabled}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition ${
                    featured
                      ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white hover:opacity-90'
                      : 'bg-[#1e1e2e] text-white hover:bg-[#2a2a3e]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  type="button"
                >
                  {!paidPlan
                    ? copy.available
                    : isActiveMember
                      ? copy.active
                      : loading === planType
                        ? copy.redirecting
                        : copy.subscribe}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
