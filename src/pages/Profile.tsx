import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, CheckCircle, Star, MapPin, GraduationCap, ArrowLeft, MessageCircle, Ban } from 'lucide-react';
import { useBlockedUsers } from '../hooks/useBlockedUsers';

interface ProfileData {
  id: string;
  full_name: string;
  bio: string;
  college: string;
  location: string;
  avatar_url: string;
  trust_score: number;
  total_swaps: number;
  email_verified: boolean;
  phone_verified: boolean;
  college_verified: boolean;
  response_time_hours: number;
  offered_skills: Array<{ skill_id: string; skill_name: string; level: string; verified: boolean }>;
  wanted_skills: Array<{ skill_id: string; skill_name: string }>;
  reviews: Array<{ rating: number; comment: string; reviewer_name: string; created_at: string }>;
}

export default function Profile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMySkill, setSelectedMySkill] = useState('');
  const [selectedTheirSkill, setSelectedTheirSkill] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [myOfferedSkills, setMyOfferedSkills] = useState<Array<{ skill_id: string; skill_name: string }>>([]);
  const { isBlocked, toggleBlock } = useBlockedUsers();

  const isOwnProfile = !userId || userId === user?.id;
  const isProfileBlocked = profile ? isBlocked(profile.id) : false;

  useEffect(() => {
    loadProfile();
    if (user && !isOwnProfile) {
      loadMySkills();
    }
  }, [userId, user]);

  const loadProfile = async () => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();

    if (!profileData) {
      navigate('/dashboard');
      return;
    }

    const { data: offered } = await supabase
      .from('user_skills')
      .select('skill_id, level, verified, skills(name)')
      .eq('user_id', targetUserId)
      .eq('type', 'offered');

    const { data: wanted } = await supabase
      .from('user_skills')
      .select('skill_id, skills(name)')
      .eq('user_id', targetUserId)
      .eq('type', 'wanted');

    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating, comment, created_at, reviewer:reviewer_id(full_name)')
      .eq('reviewee_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(10);

    const offeredSkills = offered?.map((s: any) => ({
      skill_id: s.skill_id,
      skill_name: s.skills.name,
      level: s.level,
      verified: s.verified,
    })) || [];

    const wantedSkills = wanted?.map((s: any) => ({
      skill_id: s.skill_id,
      skill_name: s.skills.name,
    })) || [];

    const reviewsData = reviews?.map((r: any) => ({
      rating: r.rating,
      comment: r.comment,
      reviewer_name: r.reviewer.full_name,
      created_at: r.created_at,
    })) || [];

    setProfile({
      ...profileData,
      offered_skills: offeredSkills,
      wanted_skills: wantedSkills,
      reviews: reviewsData,
    });

    setLoading(false);
  };

  const loadMySkills = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_skills')
      .select('skill_id, skills(name)')
      .eq('user_id', user.id)
      .eq('type', 'offered');

    if (data) {
      setMyOfferedSkills(data.map((s: any) => ({
        skill_id: s.skill_id,
        skill_name: s.skills.name,
      })));
    }
  };

  const handleSendRequest = async () => {
    if (!user || !profile || !selectedMySkill || !selectedTheirSkill) return;

    const { error } = await supabase.from('swap_requests').insert({
      requester_id: user.id,
      provider_id: profile.id,
      requester_skill_id: selectedMySkill,
      provider_skill_id: selectedTheirSkill,
      message: requestMessage,
      status: 'pending',
    });

    if (!error) {
      setShowRequestModal(false);
      alert('Request sent successfully!');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Skill Swap</span>
            </Link>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-32"></div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-16 mb-6">
              <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-4xl border-4 border-white shadow-lg">
                {getInitials(profile.full_name)}
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900">{profile.full_name}</h1>
                      {profile.college_verified && (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-gray-600">
                      {profile.college && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-4 h-4" />
                          {profile.college}
                        </span>
                      )}
                      {profile.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {profile.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isOwnProfile && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleBlock(profile.id)}
                        className={`px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                          isProfileBlocked 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Ban className="w-5 h-5" />
                        {isProfileBlocked ? 'Unblock User' : 'Block User'}
                      </button>

                      {!isProfileBlocked && (
                        <button
                          onClick={() => setShowRequestModal(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                        >
                          <MessageCircle className="w-5 h-5" />
                          Request Swap
                        </button>
                      )}
                    </div>
                  )}

                  {isOwnProfile && (
                    <Link
                      to="/edit-profile"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Edit Profile
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="text-2xl font-bold text-gray-900">{profile.trust_score || 0}</span>
                  <span className="text-gray-500">/5</span>
                </div>
                <p className="text-sm text-gray-600">Trust Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 mb-1">{profile.total_swaps || 0}</p>
                <p className="text-sm text-gray-600">Completed Swaps</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 mb-1">{profile.reviews.length}</p>
                <p className="text-sm text-gray-600">Reviews</p>
              </div>
            </div>

            {profile.bio && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Skills Offered</h2>
                <div className="space-y-2">
                  {profile.offered_skills.map((skill) => (
                    <div key={skill.skill_id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <span className="font-medium text-blue-900">{skill.skill_name}</span>
                        <span className="text-sm text-blue-600 ml-2">({skill.level})</span>
                      </div>
                      {skill.verified && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Skills Wanted</h2>
                <div className="space-y-2">
                  {profile.wanted_skills.map((skill) => (
                    <div key={skill.skill_id} className="p-3 bg-green-50 rounded-lg">
                      <span className="font-medium text-green-900">{skill.skill_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {profile.reviews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews</h2>
                <div className="space-y-4">
                  {profile.reviews.map((review, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{review.reviewer_name}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-gray-700">{review.comment}</p>}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Send Swap Request</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I will teach:
                </label>
                <select
                  value={selectedMySkill}
                  onChange={(e) => setSelectedMySkill(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select your skill...</option>
                  {myOfferedSkills.map((skill) => (
                    <option key={skill.skill_id} value={skill.skill_id}>
                      {skill.skill_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I want to learn:
                </label>
                <select
                  value={selectedTheirSkill}
                  onChange={(e) => setSelectedTheirSkill(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select their skill...</option>
                  {profile.offered_skills.map((skill) => (
                    <option key={skill.skill_id} value={skill.skill_id}>
                      {skill.skill_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (optional):
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Introduce yourself and explain why you'd like to swap skills..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                disabled={!selectedMySkill || !selectedTheirSkill}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
