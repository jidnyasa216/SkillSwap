import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { BookOpen, MessageCircle, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface SwapRequest {
  id: string;
  requester_id: string;
  provider_id: string;
  status: string;
  message: string;
  scheduled_at: string;
  created_at: string;
  requester: {
    id: string;
    full_name: string;
    avatar_url: string;
    college: string;
  };
  provider: {
    id: string;
    full_name: string;
    avatar_url: string;
    college: string;
  };
  requester_skill: {
    name: string;
  };
  provider_skill: {
    name: string;
  };
}

export default function SwapRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing' | 'pending'>('all');
  const [actionStates, setActionStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      loadRequests();
      const interval = setInterval(() => loadRequests(), 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  async function loadRequests() {
    if (!user) return;

    let query = supabase
      .from('swap_requests')
      .select(`
        *,
        requester:requester_id(id, full_name, avatar_url, college),
        provider:provider_id(id, full_name, avatar_url, college),
        requester_skill:requester_skill_id(name),
        provider_skill:provider_skill_id(name)
      `);

    if (filter === 'incoming') {
      query = query.eq('provider_id', user.id);
    } else if (filter === 'outgoing') {
      query = query.eq('requester_id', user.id);
    } else if (filter === 'pending') {
      query = query.eq('provider_id', user.id).eq('status', 'pending');
    } else {
      query = query.or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`);
    }

    const { data } = await query.order('created_at', { ascending: false });

    if (data) {
      setRequests(data as any);
    }
    setLoading(false);
  };

  const updateRequestStatus = async (requestId: string, status: 'accepted' | 'rejected' | 'ongoing' | 'completed') => {
    setActionStates(prev => ({ ...prev, [requestId]: true }));
    const { error } = await supabase
      .from('swap_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (!error) {
      loadRequests();
    }
    setActionStates(prev => ({ ...prev, [requestId]: false }));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      ongoing: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4" />;
    if (status === 'rejected' || status === 'cancelled') return <XCircle className="w-4 h-4" />;
    if (status === 'pending') return <Clock className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Skill Swap</span>
            </Link>
            <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Swap Requests</h1>

          <div className="flex gap-2 border-b border-gray-200 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                filter === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              All Requests
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors relative ${
                filter === 'pending'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending
              {requests.filter(r => r.status === 'pending' && r.provider_id === user?.id).length > 0 && (
                <span className="ml-2 inline-block bg-red-500 text-white text-xs rounded-full w-5 h-5 leading-5 text-center">
                  {requests.filter(r => r.status === 'pending' && r.provider_id === user?.id).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('incoming')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                filter === 'incoming'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Incoming
            </button>
            <button
              onClick={() => setFilter('outgoing')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                filter === 'outgoing'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Outgoing
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-4">No requests found</p>
              <Link
                to="/explore"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse users and make a request
              </Link>
            </div>
          ) : (
            requests.map((request) => {
              const isRequester = request.requester_id === user?.id;
              const otherUser = isRequester ? request.provider : request.requester;
              const mySkill = isRequester ? request.requester_skill.name : request.provider_skill.name;
              const theirSkill = isRequester ? request.provider_skill.name : request.requester_skill.name;
              const canRespond = !isRequester && request.status === 'pending';
              const isCompleted = request.status === 'completed';
              const isRejected = request.status === 'rejected' || request.status === 'cancelled';

              return (
                <div key={request.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg flex-shrink-0">
                          {getInitials(otherUser.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 truncate">
                            {otherUser.full_name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">{otherUser.college}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {isRequester ? 'Requested from' : 'Requested by'} {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">I teach:</span>
                          <span className="text-blue-600">{mySkill}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">I learn:</span>
                          <span className="text-green-600">{theirSkill}</span>
                        </div>
                      </div>

                      {request.message && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                          <p className="text-sm text-gray-700">{request.message}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Status</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status}
                          </span>
                        </div>

                        {request.scheduled_at && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                            <Calendar className="w-4 h-4" />
                            Scheduled: {new Date(request.scheduled_at).toLocaleDateString()} at{' '}
                            {new Date(request.scheduled_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-col md:flex-row">
                        <Link
                          to={`/messages/${request.id}`}
                          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex-1"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Message
                        </Link>

                        {canRespond && (
                          <>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'accepted')}
                              disabled={actionStates[request.id]}
                              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {actionStates[request.id] ? 'Accepting...' : 'Accept'}
                            </button>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'rejected')}
                              disabled={actionStates[request.id]}
                              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <XCircle className="w-4 h-4" />
                              {actionStates[request.id] ? 'Declining...' : 'Decline'}
                            </button>
                          </>
                        )}

                        {request.status === 'accepted' && (
                          <>
                            <button
                              onClick={() => updateRequestStatus(request.id, 'ongoing')}
                              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex-1"
                            >
                              <Clock className="w-4 h-4" />
                              Start Session
                            </button>
                          </>
                        )}

                        {request.status === 'ongoing' && (
                          <button
                            onClick={() => updateRequestStatus(request.id, 'completed')}
                            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Complete
                          </button>
                        )}

                        {isCompleted && (
                          <Link
                            to={`/review/${request.id}`}
                            className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex-1"
                          >
                            Leave Review
                          </Link>
                        )}
                      </div>

                      {isRejected && (
                        <p className="text-sm text-gray-500 text-center">This request is closed</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
