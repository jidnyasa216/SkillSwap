import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { BookOpen, LogOut, Search, MessageSquare, User, Shield, CheckCircle } from 'lucide-react';
import RequestNotification from '../components/RequestNotification';
import NotificationBell from '../components/NotificationBell';

interface Match {
  id: string;
  full_name: string;
  college: string;
  avatar_url: string;
  trust_score: number;
  matched_skill: string;
  college_verified: boolean;
}

interface SwapRequest {
  id: string;
  requester: { full_name: string; avatar_url: string };
  provider: { full_name: string; avatar_url: string };
  requester_skill: { name: string };
  provider_skill: { name: string };
  status: string;
  created_at: string;
}

interface PendingRequest {
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
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [pendingNotifications, setPendingNotifications] = useState<PendingRequest[]>([]);
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadDashboardData();
      const interval = setInterval(() => loadDashboardData(), 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(profileData);

    const { data: userOffered } = await supabase
      .from('user_skills')
      .select('skill_id')
      .eq('user_id', user.id)
      .eq('type', 'offered');

    const { data: userWanted } = await supabase
      .from('user_skills')
      .select('skill_id')
      .eq('user_id', user.id)
      .eq('type', 'wanted');

    if (userOffered && userWanted) {
      const wantedIds = userWanted.map(s => s.skill_id);

      const { data: potentialMatches } = await supabase
        .from('user_skills')
        .select('user_id, skill_id, skills(name), profiles(id, full_name, college, avatar_url, trust_score, college_verified)')
        .in('skill_id', wantedIds)
        .eq('type', 'offered')
        .neq('user_id', user.id)
        .limit(6);

      if (potentialMatches) {
        const matchesMap = new Map();
        potentialMatches.forEach((match: any) => {
          if (match.profiles) {
            const key = match.profiles.id;
            if (!matchesMap.has(key)) {
              matchesMap.set(key, {
                id: match.profiles.id,
                full_name: match.profiles.full_name,
                college: match.profiles.college,
                avatar_url: match.profiles.avatar_url,
                trust_score: match.profiles.trust_score,
                college_verified: match.profiles.college_verified,
                matched_skill: match.skills.name,
              });
            }
          }
        });
        setMatches(Array.from(matchesMap.values()));
      }
    }

    const { data: requestsData } = await supabase
      .from('swap_requests')
      .select(`
        id,
        status,
        created_at,
        requester:requester_id(full_name, avatar_url),
        provider:provider_id(full_name, avatar_url),
        requester_skill:requester_skill_id(name),
        provider_skill:provider_skill_id(name)
      `)
      .or(`requester_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (requestsData) {
      setRequests(requestsData as any);

      const pendingRequests = requestsData.filter((r: any) => r.status === 'pending' && r.provider_id === user.id);
      const newPending = pendingRequests.filter((r: any) => !shownNotifications.has(r.id));
      setPendingNotifications(newPending as any);
    }

    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Skill Swap</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/explore" className="text-gray-700 hover:text-blue-600" title="Find Skills">
                <Search className="w-6 h-6" />
              </Link>
              <Link to="/messages" className="text-gray-700 hover:text-blue-600 relative" title="Messages">
                <MessageSquare className="w-6 h-6" />
              </Link>
              <Link to="/swap-requests" className="text-gray-700 hover:text-blue-600" title="Swap Requests">
                <NotificationBell userId={user?.id} />
              </Link>
              <Link to="/profile" className="text-gray-700 hover:text-blue-600" title="Profile">
                <User className="w-6 h-6" />
              </Link>
              <button
                onClick={signOut}
                className="text-gray-700 hover:text-red-600"
                title="Sign Out"
              >
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {profile?.full_name}!</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span>Trust Score: {profile?.trust_score || 0}/5</span>
            <span>Total Swaps: {profile?.total_swaps || 0}</span>
            {profile?.college_verified && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-4 h-4" />
                Verified Student
              </span>
            )}
          </div>
        </div>

        {!profile?.college_verified && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Complete Your Verification</h3>
              <p className="text-sm text-yellow-800 mb-2">
                Get verified to build trust and access more features
              </p>
              <Link
                to="/verification"
                className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg inline-block"
              >
                Start Verification
              </Link>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Recommended Matches</h2>
                <Link to="/explore" className="text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </Link>
              </div>
              {matches.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No matches found yet. Try adding more skills to your profile!
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {matches.map((match) => (
                    <Link
                      key={match.id}
                      to={`/profile/${match.id}`}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          {getInitials(match.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">{match.full_name}</h3>
                            {match.college_verified && (
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">{match.college}</p>
                          <p className="text-sm text-blue-600 mt-1">Offers: {match.matched_skill}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="text-xs text-gray-500">
                              Trust Score: {match.trust_score || 0}/5
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Requests</h2>
              {requests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No requests yet</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">
                            Exchange {request.requester_skill?.name} for {request.provider_skill?.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to="/explore"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-lg font-medium transition-colors"
                >
                  Find Skills
                </Link>
                <Link
                  to="/swap-requests"
                  className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-3 rounded-lg font-medium transition-colors"
                >
                  Swap Requests
                </Link>
                <Link
                  to="/messages"
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white text-center py-3 rounded-lg font-medium transition-colors"
                >
                  Messages
                </Link>
                <Link
                  to="/profile"
                  className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 text-center py-3 rounded-lg font-medium transition-colors"
                >
                  Edit Profile
                </Link>
                <Link
                  to="/verification"
                  className="block w-full bg-green-100 hover:bg-green-200 text-green-900 text-center py-3 rounded-lg font-medium transition-colors"
                >
                  Get Verified
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md p-6 text-white">
              <h3 className="text-lg font-bold mb-2">Invite Friends</h3>
              <p className="text-sm text-blue-100 mb-4">
                Share Skill Swap with your friends and grow the community
              </p>
              <button className="w-full bg-white text-blue-600 hover:bg-blue-50 py-2 rounded-lg font-medium transition-colors">
                Share Invite Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {pendingNotifications.map((notification) => (
        <RequestNotification
          key={notification.id}
          id={notification.id}
          requester={notification.requester}
          requester_skill={notification.requester_skill}
          provider_skill={notification.provider_skill}
          message={notification.message}
          onDismiss={() => {
            setShownNotifications(prev => new Set([...prev, notification.id]));
            setPendingNotifications(prev => prev.filter(n => n.id !== notification.id));
          }}
          onAction={() => {
            loadDashboardData();
          }}
        />
      ))}
    </div>
  );
}
