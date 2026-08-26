import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useBlockedUsers } from '../hooks/useBlockedUsers';

interface Conversation {
  id: string;
  swap_request_id: string;
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  swap_details: {
    requester_skill: string;
    provider_skill: string;
    status: string;
  };
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  file_url: string;
  created_at: string;
  sender: {
    full_name: string;
  };
}

export default function Messages() {
  const { user } = useAuth();
  const { swapId } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSwap, setSelectedSwap] = useState<string | null>(swapId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [swapRequest, setSwapRequest] = useState<any>(null);
  const { isBlocked } = useBlockedUsers();

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedSwap) {
      loadMessages();
      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedSwap]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!user) return;

    const { data: swapRequests } = await supabase
      .from('swap_requests')
      .select(`
        id,
        requester_id,
        provider_id,
        requester:requester_id(id, full_name, avatar_url),
        provider:provider_id(id, full_name, avatar_url),
        requester_skill:requester_skill_id(name),
        provider_skill:provider_skill_id(name),
        status
      `)
      .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (swapRequests) {
      const conversationsList = await Promise.all(
        swapRequests.map(async (swap: any) => {
          const otherUser = swap.requester_id === user.id ? swap.provider : swap.requester;

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('swap_request_id', swap.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('swap_request_id', swap.id)
            .neq('sender_id', user.id)
            .eq('read', false);

          return {
            id: swap.id,
            swap_request_id: swap.id,
            other_user: otherUser,
            swap_details: {
              requester_skill: swap.requester_skill.name,
              provider_skill: swap.provider_skill.name,
              status: swap.status,
            },
            last_message: lastMsg?.content || 'No messages yet',
            last_message_time: lastMsg?.created_at || swap.updated_at,
            unread_count: unreadCount || 0,
          };
        })
      );

      setConversations(conversationsList);
      if (swapId && !selectedSwap) {
        setSelectedSwap(swapId);
      }
    }

    setLoading(false);
  };

  const loadMessages = async () => {
    if (!selectedSwap) return;

    const { data: messagesData } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        content,
        file_url,
        created_at,
        sender:sender_id(full_name)
      `)
      .eq('swap_request_id', selectedSwap)
      .order('created_at', { ascending: true });

    if (messagesData) {
      setMessages(messagesData as any);

      if (user) {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('swap_request_id', selectedSwap)
          .neq('sender_id', user.id);
      }
    }

    const { data: swapData } = await supabase
      .from('swap_requests')
      .select(`
        *,
        requester_skill:requester_skill_id(name),
        provider_skill:provider_skill_id(name),
        requester:requester_id(full_name, avatar_url),
        provider:provider_id(full_name, avatar_url)
      `)
      .eq('id', selectedSwap)
      .single();

    if (swapData) {
      setSwapRequest(swapData);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedSwap || !user) return;

    setSending(true);

    const { error } = await supabase.from('messages').insert({
      swap_request_id: selectedSwap,
      sender_id: user.id,
      content: messageText,
    });

    if (!error) {
      setMessageText('');
      loadMessages();
      loadConversations();
    }

    setSending(false);
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
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4" />;
    if (status === 'rejected') return <AlertCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

      <div className="flex-1 flex overflow-hidden">
        <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No conversations yet</p>
                <Link to="/explore" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
                  Find users to swap with
                </Link>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedSwap(conv.swap_request_id)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    selectedSwap === conv.swap_request_id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                      {getInitials(conv.other_user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conv.other_user.full_name}
                        </h3>
                        {conv.unread_count > 0 && (
                          <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {conv.swap_details.requester_skill} ↔ {conv.swap_details.provider_skill}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col hidden md:flex">
          {selectedSwap && swapRequest ? (
            <>
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {getInitials(
                        swapRequest.requester_id === user?.id
                          ? swapRequest.provider.full_name
                          : swapRequest.requester.full_name
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">
                        {swapRequest.requester_id === user?.id
                          ? swapRequest.provider.full_name
                          : swapRequest.requester.full_name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {swapRequest.requester_skill.name} ↔ {swapRequest.provider_skill.name}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(swapRequest.status)}`}>
                    {getStatusIcon(swapRequest.status)}
                    {swapRequest.status}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.sender_id === user?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === user?.id ? 'text-blue-100' : 'text-gray-600'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-white border-t border-gray-200 p-4">
                {swapRequest?.status === 'pending' || swapRequest?.status === 'rejected' ? (
                  <div className="text-center p-3 bg-yellow-50 text-yellow-800 rounded-lg">
                    You can chat only after the request is accepted
                  </div>
                ) : swapRequest?.status !== 'accepted' && swapRequest?.status !== 'ongoing' && swapRequest?.status !== 'completed' ? (
                   <div className="text-center p-3 bg-gray-50 text-gray-800 rounded-lg">
                    You can chat only after the request is accepted
                  </div>
                ) : isBlocked(swapRequest?.requester_id === user?.id ? swapRequest?.provider_id : swapRequest?.requester_id) ? (
                  <div className="text-center p-3 bg-red-50 text-red-800 rounded-lg flex items-center justify-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    You have blocked this user. Unblock them to send messages.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageText.trim() || sending}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
