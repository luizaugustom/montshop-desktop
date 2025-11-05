import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/store/ui-store';
import { useAuth } from '@/contexts/AuthContext';
import { TrialConversionModal } from '../trial/trial-conversion-modal';
import { PlanType } from '@/types';
import { useState, useEffect } from 'react';

interface MainLayoutProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
}

export function MainLayout({ currentRoute, onNavigate, children }: MainLayoutProps) {
  const { sidebarCollapsed } = useUIStore();
  const { logout, user } = useAuth();
  const [showTrialModal, setShowTrialModal] = useState(false);

  useEffect(() => {
    if (user && user.role === 'empresa' && (user as any).plan && (user as any).plan === PlanType.TRIAL_7_DAYS) {
      const hideUntil = localStorage.getItem('trialModalHideUntil');
      if (hideUntil) {
        const hideUntilDate = new Date(hideUntil);
        const now = new Date();
        if (hideUntilDate > now) {
          return;
        }
      }
      const timer = setTimeout(() => {
        setShowTrialModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <Sidebar currentRoute={currentRoute} onNavigate={onNavigate} />
      <div
        className="flex flex-1 flex-col overflow-hidden lg:ml-0"
        style={{
          marginLeft: '0',
          paddingLeft: sidebarCollapsed ? '4rem' : '16rem',
          transition: 'padding-left 0.3s ease-in-out',
        }}
      >
        <Header onLogout={logout} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      
      {/* Modal de Conversão do Plano TRIAL */}
      {(user as any)?.plan && (user as any).plan === PlanType.TRIAL_7_DAYS && (
        <TrialConversionModal
          open={showTrialModal}
          onOpenChange={setShowTrialModal}
          plan={(user as any).plan}
        />
      )}
    </div>
  );
}

