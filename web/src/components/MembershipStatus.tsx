'use client';

interface MembershipData {
  id: string | null;
  planType: string | null;
  status: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  isMember: boolean;
}

interface PricingCardProps {
  membership: MembershipData | null;
  onManageSubscription: () => void;
  portalLoading: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  MONTHLY: '月付会员',
  YEARLY: '年付会员',
  LIFETIME: '永久会员',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  NONE: { label: '未订阅', color: '#a1a1aa', icon: '*' },
  ACTIVE: { label: '已开通', color: '#4ade80', icon: '+' },
  LIFETIME: { label: '永久', color: '#fbbf24', icon: '*' },
  CANCELLED_ACTIVE: { label: '已取消，当前周期仍有效', color: '#fbbf24', icon: '!' },
  EXPIRED: { label: '已过期', color: '#f87171', icon: '!' },
  CANCELLED: { label: '已取消', color: '#f87171', icon: '!' },
};

function getStatusKey(membership: MembershipData | null): string {
  if (!membership || !membership.id) return 'NONE';
  if (membership.planType === 'LIFETIME' && membership.isMember) return 'LIFETIME';
  if (membership.isMember && membership.status === 'CANCELLED') return 'CANCELLED_ACTIVE';
  if (membership.isMember) return 'ACTIVE';
  if (membership.status === 'CANCELLED') return 'CANCELLED';
  return 'EXPIRED';
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function MembershipStatus({
  membership,
  onManageSubscription,
  portalLoading,
}: PricingCardProps) {
  const statusKey = getStatusKey(membership);
  const config = STATUS_CONFIG[statusKey];

  return (
    <div className="rounded-2xl border border-[#1e1e2e] bg-[#12121a] p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e1e2e] text-sm font-bold" style={{ color: config.color }}>
          {config.icon}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">
            {membership?.planType ? PLAN_LABELS[membership.planType] || config.label : config.label}
          </h2>
          <p className="text-sm" style={{ color: config.color }}>
            {config.label}
          </p>
        </div>
      </div>

      {statusKey === 'NONE' && (
        <div className="rounded-xl bg-gradient-to-r from-[#6366f1]/10 to-[#8b5cf6]/10 border border-[#6366f1]/20 p-5">
          <p className="text-sm text-[#d4d4d8] mb-3">
            升级会员，解锁页面浮动导出框、账号级集成设置和优先适配反馈。
          </p>
          <a
            href="/#pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
          >
            升级会员
          </a>
        </div>
      )}

      {(statusKey === 'ACTIVE' || statusKey === 'LIFETIME' || statusKey === 'CANCELLED_ACTIVE') && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#a1a1aa] mb-1">方案</p>
              <p className="text-sm text-white">
                {membership?.planType ? PLAN_LABELS[membership.planType] : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#a1a1aa] mb-1">
                {membership?.planType === 'LIFETIME' ? '有效期' : '到期时间'}
              </p>
              <p className="text-sm text-white">
                {membership?.planType === 'LIFETIME' ? '永久' : formatDate(membership?.expiresAt)}
              </p>
            </div>
          </div>

          {membership?.planType !== 'LIFETIME' && (
            <button
              onClick={onManageSubscription}
              disabled={portalLoading}
              className="px-5 py-2.5 bg-[#1e1e2e] text-white text-sm font-semibold rounded-lg hover:bg-[#2a2a3e] transition disabled:opacity-50"
            >
              {portalLoading ? '加载中...' : '管理订阅'}
            </button>
          )}
        </div>
      )}

      {(statusKey === 'EXPIRED' || statusKey === 'CANCELLED') && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#a1a1aa] mb-1">方案</p>
              <p className="text-sm text-white">
                {membership?.planType ? PLAN_LABELS[membership.planType] : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#a1a1aa] mb-1">过期时间</p>
              <p className="text-sm text-white">{formatDate(membership?.expiresAt)}</p>
            </div>
          </div>

          <a
            href="/#pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition"
          >
            重新订阅
          </a>
        </div>
      )}
    </div>
  );
}
