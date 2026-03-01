import { Menu, Bell, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useWS } from '@/contexts/WSContext';
import { LiveBadge } from '@/components/ui/Badge';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { isConnected, pendingCount } = useWS();
  const qc = useQueryClient();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <LiveBadge connected={isConnected} />

          {pendingCount > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-amber-500" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            </div>
          )}

          <button
            onClick={() => qc.invalidateQueries()}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Refresh all data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
