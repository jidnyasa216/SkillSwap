import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { BookOpen, Upload, CheckCircle, Clock, XCircle, Shield } from 'lucide-react';

interface VerificationRequest {
  id: string;
  type: string;
  skill_id: string | null;
  document_url: string;
  status: string;
  admin_notes: string;
  created_at: string;
}

export default function Verification() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [collegeDocument, setCollegeDocument] = useState<File | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(profileData);

    const { data: requestsData } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (requestsData) {
      setRequests(requestsData);
    }
  };

  const handleCollegeVerification = async () => {
    if (!user || !collegeDocument) return;

    setLoading(true);

    const fileExt = collegeDocument.name.split('.').pop();
    const fileName = `${user.id}-college-${Date.now()}.${fileExt}`;
    const filePath = `verification/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, collegeDocument);

    if (!uploadError) {
      await supabase.from('verification_requests').insert({
        user_id: user.id,
        type: 'college',
        document_url: filePath,
        status: 'pending',
      });

      alert('College verification request submitted!');
      setCollegeDocument(null);
      loadData();
    } else {
      alert('Failed to upload document. Please use a mock URL for demo purposes.');
      await supabase.from('verification_requests').insert({
        user_id: user.id,
        type: 'college',
        document_url: 'demo-upload.pdf',
        status: 'pending',
      });
      loadData();
    }

    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-red-600" />;
    return <Clock className="w-5 h-5 text-yellow-600" />;
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Skill Swap</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verification Center</h1>
          <p className="text-gray-600">Build trust by verifying your identity and credentials</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              profile?.email_verified ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <CheckCircle className={`w-8 h-8 ${profile?.email_verified ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
            <p className="text-sm text-gray-600">
              {profile?.email_verified ? 'Verified' : 'Not Verified'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              profile?.college_verified ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Shield className={`w-8 h-8 ${profile?.college_verified ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">College ID</h3>
            <p className="text-sm text-gray-600">
              {profile?.college_verified ? 'Verified' : 'Not Verified'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              profile?.phone_verified ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <CheckCircle className={`w-8 h-8 ${profile?.phone_verified ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
            <p className="text-sm text-gray-600">
              {profile?.phone_verified ? 'Verified' : 'Not Verified'}
            </p>
          </div>
        </div>

        {!profile?.college_verified && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">College ID Verification</h2>
            <p className="text-gray-600 mb-6">
              Upload a clear photo of your student ID to get verified. This helps build trust in the community.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setCollegeDocument(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Choose file
                </span>
                <span className="text-gray-600"> or drag and drop</span>
              </label>
              {collegeDocument && (
                <p className="mt-2 text-sm text-gray-600">{collegeDocument.name}</p>
              )}
            </div>

            <button
              onClick={handleCollegeVerification}
              disabled={!collegeDocument || loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Verification History</h2>

          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No verification requests yet</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {request.type} Verification
                        </h3>
                        <p className="text-sm text-gray-600">
                          Submitted {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        {request.admin_notes && (
                          <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                            Admin Note: {request.admin_notes}
                          </p>
                        )}
                      </div>
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

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Why Get Verified?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>Build trust with other users and increase your swap success rate</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>Get priority in search results and recommendations</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>Access advanced features and exclusive opportunities</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
