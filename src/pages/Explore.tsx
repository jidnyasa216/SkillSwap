import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Search, Filter, BookOpen, LogOut, User, CheckCircle, Sparkles } from 'lucide-react';
import { useBlockedUsers } from '../hooks/useBlockedUsers';

interface UserMatch {
  id: string;
  full_name: string;
  college: string;
  location: string;
  bio: string;
  avatar_url: string;
  trust_score: number;
  total_swaps: number;
  college_verified: boolean;
  offered_skills: Array<{ skill_id: string; skill_name: string; level: string }>;
  wanted_skills: Array<{ skill_id: string; skill_name: string }>;
  match_type?: 'perfect' | 'partial' | 'none';
}

export default function Explore() {
  const { user, signOut } = useAuth();
  const { blockedUserIds } = useBlockedUsers();
  const [users, setUsers] = useState<UserMatch[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, locationFilter, users, blockedUserIds]);

  const loadData = async () => {
    if (!user) return;

    const { data: myOffered } = await supabase
      .from('user_skills')
      .select('skill_id')
      .eq('user_id', user.id)
      .eq('type', 'offered');

    const { data: myWanted } = await supabase
      .from('user_skills')
      .select('skill_id')
      .eq('user_id', user.id)
      .eq('type', 'wanted');

    const myOfferedIds = myOffered ? myOffered.map(s => s.skill_id) : [];
    const myWantedIds = myWanted ? myWanted.map(s => s.skill_id) : [];

    // removed unused categories state

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id);

    if (profiles) {
      const usersWithSkills = await Promise.all(
        profiles.map(async (profile) => {
          const { data: offered } = await supabase
            .from('user_skills')
            .select('skill_id, level, skills(id, name)')
            .eq('user_id', profile.id)
            .eq('type', 'offered');

          const { data: wanted } = await supabase
            .from('user_skills')
            .select('skill_id, skills(id, name)')
            .eq('user_id', profile.id)
            .eq('type', 'wanted');

          const offeredSkills = offered?.map((s: any) => ({
            skill_id: s.skill_id,
            skill_name: s.skills.name,
            level: s.level,
          })) || [];

          const wantedSkills = wanted?.map((s: any) => ({
            skill_id: s.skill_id,
            skill_name: s.skills.name,
          })) || [];

          let matchType: 'perfect' | 'partial' | 'none' = 'none';

          if (myOfferedIds.length > 0 && myWantedIds.length > 0) {
            const theyOfferWhatIWant = offeredSkills.some((s: any) => myWantedIds.includes(s.skill_id));
            const theyWantWhatIOffer = wantedSkills.some((s: any) => myOfferedIds.includes(s.skill_id));

            if (theyOfferWhatIWant && theyWantWhatIOffer) {
              matchType = 'perfect';
            } else if (theyOfferWhatIWant || theyWantWhatIOffer) {
              matchType = 'partial';
            }
          }

          return {
            ...profile,
            offered_skills: offeredSkills,
            wanted_skills: wantedSkills,
            match_type: matchType,
          };
        })
      );

      usersWithSkills.sort((a: any, b: any) => {
        const matchOrder: Record<'perfect' | 'partial' | 'none', number> = { perfect: 0, partial: 1, none: 2 };
        return matchOrder[(a.match_type as 'perfect' | 'partial' | 'none') || 'none'] - matchOrder[(b.match_type as 'perfect' | 'partial' | 'none') || 'none'];
      });

      setUsers(usersWithSkills);
      setFilteredUsers(usersWithSkills);
    }

    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = users.filter(user => !blockedUserIds.includes(user.id));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(term) ||
          user.college.toLowerCase().includes(term) ||
          user.bio.toLowerCase().includes(term) ||
          user.offered_skills.some(s => s.skill_name.toLowerCase().includes(term)) ||
          user.wanted_skills.some(s => s.skill_name.toLowerCase().includes(term))
      );
    }

    if (locationFilter) {
      filtered = filtered.filter((user) =>
        user.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMatchBadge = (matchType?: 'perfect' | 'partial' | 'none') => {
    if (matchType === 'perfect') {
      return (
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
          <Sparkles className="w-3 h-3" />
          Perfect Match
        </span>
      );
    }
    if (matchType === 'partial') {
      return (
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
          Partial Match
        </span>
      );
    }
    return null;
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
              <Link to="/profile" className="text-gray-700 hover:text-blue-600">
                <User className="w-6 h-6" />
              </Link>
              <button onClick={signOut} className="text-gray-700 hover:text-red-600">
                <LogOut className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Discover Skills</h1>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, skill, or college..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((profile) => (
            <div
              key={profile.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg flex-shrink-0">
                      {getInitials(profile.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{profile.full_name}</h3>
                        {profile.college_verified && (
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{profile.college}</p>
                      <p className="text-xs text-gray-500 truncate">{profile.location}</p>
                    </div>
                  </div>
                </div>

                {getMatchBadge(profile.match_type) && (
                  <div className="mb-3">{getMatchBadge(profile.match_type)}</div>
                )}

                {profile.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{profile.bio}</p>
                )}

                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Offers:</h4>
                  <div className="flex flex-wrap gap-1">
                    {profile.offered_skills.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                        {skill.skill_name}
                      </span>
                    ))}
                    {profile.offered_skills.length > 3 && (
                      <span className="text-xs text-gray-500">+{profile.offered_skills.length - 3}</span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-700 mb-2">Wants:</h4>
                  <div className="flex flex-wrap gap-1">
                    {profile.wanted_skills.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                        {skill.skill_name}
                      </span>
                    ))}
                    {profile.wanted_skills.length > 3 && (
                      <span className="text-xs text-gray-500">+{profile.wanted_skills.length - 3}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">{profile.trust_score || 0}/5</span> Trust Score
                    <span className="mx-2">•</span>
                    <span>{profile.total_swaps || 0} Swaps</span>
                  </div>
                </div>

                <Link
                  to={`/profile/${profile.id}`}
                  className="block w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded-lg font-medium transition-colors"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No users found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
