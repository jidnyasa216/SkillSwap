import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  userId: string | undefined;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadUnreadCount = async () => {
    if (!userId) return;

    const { count: pendingRequests } = await supabase
      .from('swap_requests')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', userId)
      .eq('status', 'pending');

    const { count: unreadMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .neq('sender_id', userId)
      .eq('read', false);

    setUnreadCount((pendingRequests || 0) + (unreadMessages || 0));
  };

  return (
    <div className="relative">
      <Bell className="w-6 h-6 text-gray-700 hover:text-blue-600 transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
}
