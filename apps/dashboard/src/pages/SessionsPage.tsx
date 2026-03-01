import { MessageSquare, Clock, User } from 'lucide-react';
import { useSessions } from '@/hooks/useQueries';
import { formatDateTime } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import type { ConversationSession } from '@/types';

function SessionCard({ session }: { session: ConversationSession }) {
  const isActive = session.status === 'active';
  const duration = (() => {
    const ms = new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  })();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isActive ? 'bg-emerald-100' : 'bg-gray-100'
          }`}>
            <MessageSquare className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <p className="text-sm font-mono font-medium text-gray-900">
              {session.id.slice(0, 8)}…
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Started {formatDateTime(session.createdAt)}
            </p>
          </div>
        </div>
        <Badge variant={isActive ? 'green' : 'gray'} dot>
          {session.status}
        </Badge>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        {session.customer && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>{session.customer.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{duration}</span>
        </div>
      </div>
    </Card>
  );
}

export function SessionsPage() {
  const { data: sessions = [], isLoading } = useSessions(30);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{sessions.length} session{sessions.length !== 1 ? 's' : ''} found</p>
        <Badge variant={sessions.some((s) => s.status === 'active') ? 'green' : 'gray'} dot>
          {sessions.filter((s) => s.status === 'active').length} active
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No voice sessions yet</p>
            <p className="text-gray-400 text-sm mt-1">Start a voice session from the Voice page</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
