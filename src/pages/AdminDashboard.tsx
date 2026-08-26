import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, XCircle, Users, TrendingUp, Shield } from 'lucide-react';

interface VerificationRequest {
  id: string;
  user_id: string;
  type: string;
  document_url: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    college: string;
  };
}

interface Stats {
  totalUsers: number;
  totalSwaps: number;
  pendingVerifications: number;
  completedSwapsToday: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSwaps: 0,
    pendingVerifications: 0,
    completedSwapsToday: 0,
  });

  useEffect(() => {
    checkAdminAndLoadData();
  }, [user]);

  const checkAdminAndLoadData = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    await loadData();
  };

  const loadData = async () => {
    const { count: usersCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { data: swaps } = await supabase
      .from('swap_requests')
      .select('status, created_at');

    const { data: requests } = await supabase
      .from('verification_requests')
      .select(`
        *,
        profiles:user_id(full_name, college)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedToday = swaps?.filter(
      s => s.status === 'completed' && new Date(s.created_at) >= today
    ).length || 0;

    setStats({
      totalUsers: usersCount || 0,
      totalSwaps: swaps?.filter(s => s.status === 'completed').length || 0,
      pendingVerifications: requests?.length || 0,
      completedSwapsToday: completedToday,
    });

    if (requests) {
      setVerificationRequests(requests as any);
    }

    setLoading(false);
  };

  const handleVerification = async (requestId: string, status: 'approved' | 'rejected', adminNotes: string = '') => {
    const request = verificationRequests.find(r => r.id === requestId);
    if (!request) return;

    await supabase
      .from('verification_requests')
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (status === 'approved' && request.type === 'college') {
      await supabase
        .from('profiles')
        .update({ college_verified: true })
        .eq('id', request.user_id);
    }

    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Skill Swap Admin</span>
            </Link>
            <Link
              to="/dashboard"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage verification requests and monitor platform activity</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.totalUsers}</span>
            </div>
            <p className="text-gray-600 font-medium">Total Users</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.totalSwaps}</span>
            </div>
            <p className="text-gray-600 font-medium">Completed Swaps</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-8 h-8 text-yellow-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.pendingVerifications}</span>
            </div>
            <p className="text-gray-600 font-medium">Pending Verifications</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-indigo-600" />
              <span className="text-3xl font-bold text-gray-900">{stats.completedSwapsToday}</span>
            </div>
            <p className="text-gray-600 font-medium">Swaps Today</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Pending Verification Requests</h2>

          {verificationRequests.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No pending verification requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {verificationRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.profiles.full_name}
                        </h3>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                          {request.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        College: {request.profiles.college}
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        Submitted: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        Document: {request.document_url}
                      </p>
                    </div>

                    <div className="flex md:flex-col gap-2">
                      <button
                        onClick={() => handleVerification(request.id, 'approved', 'Verification approved')}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleVerification(request.id, 'rejected', 'Please submit a clearer document')}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
