import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, X, MessageCircle } from 'lucide-react';

interface RequestNotificationProps {
  id: string;
  requester: {
    id: string;
    full_name: string;
    college: string;
    avatar_url: string;
  };
  requester_skill: {
    name: string;
  };
  provider_skill: {
    name: string;
  };
  message: string;
  onDismiss: () => void;
  onAction: () => void;
}

export default function RequestNotification({
  id,
  requester,
  requester_skill,
  provider_skill,
  message,
  onDismiss,
  onAction,
}: RequestNotificationProps) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    await supabase
      .from('swap_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id);
    onAction();
    onDismiss();
  };

  const handleDecline = async () => {
    setDeclining(true);
    await supabase
      .from('swap_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id);
    onAction();
    onDismiss();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-md w-full bg-white rounded-lg shadow-xl border border-blue-200 overflow-hidden z-40 animate-slide-up">
      <div className="bg-blue-600 px-6 py-4 text-white flex items-center justify-between">
        <h3 className="font-bold text-lg">New Swap Request!</h3>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-blue-700 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">
            {getInitials(requester.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-gray-900 truncate">{requester.full_name}</h4>
            <p className="text-sm text-gray-600 truncate">{requester.college}</p>
          </div>
        </div>

        <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">They teach:</span>
            <span className="text-blue-600 font-semibold">{requester_skill.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">You teach:</span>
            <span className="text-green-600 font-semibold">{provider_skill.name}</span>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-700 italic">"{message}"</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDecline}
            disabled={declining || accepting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="w-4 h-4" />
            {declining ? 'Declining...' : 'Decline'}
          </button>
          <button
            onClick={handleAccept}
            disabled={accepting || declining}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            {accepting ? 'Accepting...' : 'Accept'}
          </button>
        </div>

        <button
          onClick={onDismiss}
          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Message First
        </button>
      </div>
    </div>
  );
}
