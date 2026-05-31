'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMembership, syncCheckoutSession, createPortalSession, isLoggedIn } from '@/lib/api';
import Navbar from '@/components/Navbar';
import MembershipStatus from '@/components/MembershipStatus';

interface MembershipData {
  id: string | null;
  planType: string | null;
  status: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  isMember: boolean;
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Redirect to login if not logged in
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }

    // Check for payment success
    if (searchParams.get('payment') === 'success') {
      setShowSuccess(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleAuthSync = () => {
      if (!isLoggedIn()) {
        router.push('/login');
      }
    };
    window.addEventListener('exportai-auth-sync', handleAuthSync);
    window.addEventListener('storage', handleAuthSync);
    return () => {
      window.removeEventListener('exportai-auth-sync', handleAuthSync);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, [router]);

  useEffect(() => {
    if (!isLoggedIn()) return;
    const sessionId = searchParams.get('payment') === 'success'
      ? searchParams.get('session_id')
      : null;
    fetchMembership(sessionId);
  }, [searchParams]);

  const fetchMembership = async (sessionId?: string | null) => {
    setLoading(true);
    try {
      const result = sessionId
        ? await syncCheckoutSession(sessionId)
        : await getMembership();
      if (result.data) {
        setMembership(result.data);
      }
    } catch {
      try {
        const fallback = await getMembership();
        if (fallback.data) {
          setMembership(fallback.data);
        }
      } catch {
        // Silently handle error
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const result = await createPortalSession();
      if (result.data?.url) {
        window.location.href = result.data.url;
      }
    } catch {
      // Error handled
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0f]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-[#a1a1aa]">加载中...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-28 pb-20">
        <h1 className="text-3xl font-bold text-white mb-8">我的账号</h1>

        {/* Payment success banner */}
        {showSuccess && (
          <div
            className="mb-6 p-4 rounded-xl bg-[#1a2e1a] border border-[#4ade80]/30 flex items-center justify-between"
            style={{
              animation: 'fadeInSlide 0.4s ease-out',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🎉</span>
              <div>
                <p className="text-[#4ade80] text-sm font-semibold">支付成功！</p>
                <p className="text-[#86efac] text-xs mt-0.5">您的会员已激活，感谢您的支持！</p>
              </div>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="text-[#86efac] text-xs hover:text-white transition"
            >
              ✕
            </button>
          </div>
        )}

        {/* Membership status */}
        <MembershipStatus
          membership={membership}
          onManageSubscription={handleManageSubscription}
          portalLoading={portalLoading}
        />
      </div>

      <style jsx>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0a0f]">
          <Navbar />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-[#a1a1aa]">加载中...</div>
          </div>
        </main>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
