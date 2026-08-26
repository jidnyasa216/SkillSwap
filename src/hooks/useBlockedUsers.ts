import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useBlockedUsers() {
  const { user } = useAuth();
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`blocked_users_${user.id}`);
      if (stored) {
        try {
          setBlockedUserIds(JSON.parse(stored));
        } catch (e) {
          setBlockedUserIds([]);
        }
      } else {
        setBlockedUserIds([]);
      }
    }
  }, [user]);

  const toggleBlock = (targetUserId: string) => {
    if (!user) return;
    setBlockedUserIds(prev => {
      const newBlocked = prev.includes(targetUserId)
        ? prev.filter(id => id !== targetUserId)
        : [...prev, targetUserId];

      localStorage.setItem(`blocked_users_${user.id}`, JSON.stringify(newBlocked));
      return newBlocked;
    });
  };

  const isBlocked = (targetUserId: string) => {
    return blockedUserIds.includes(targetUserId);
  };

  return { blockedUserIds, toggleBlock, isBlocked };
}
