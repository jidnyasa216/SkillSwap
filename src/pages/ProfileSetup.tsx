import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Plus, X } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: string;
}

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [college, setCollege] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [offeredSkills, setOfferedSkills] = useState<{ skillId: string; level: string }[]>([]);
  const [wantedSkills, setWantedSkills] = useState<string[]>([]);
  const [selectedOfferedSkill, setSelectedOfferedSkill] = useState('');
  const [selectedOfferedLevel, setSelectedOfferedLevel] = useState('intermediate');
  const [selectedWantedSkill, setSelectedWantedSkill] = useState('');

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    const { data } = await supabase.from('skills').select('*').order('category', { ascending: true });
    if (data) setAllSkills(data);
  };

  const addOfferedSkill = () => {
    if (selectedOfferedSkill && !offeredSkills.find(s => s.skillId === selectedOfferedSkill)) {
      setOfferedSkills([...offeredSkills, { skillId: selectedOfferedSkill, level: selectedOfferedLevel }]);
      setSelectedOfferedSkill('');
    }
  };

  const removeOfferedSkill = (skillId: string) => {
    setOfferedSkills(offeredSkills.filter(s => s.skillId !== skillId));
  };

  const addWantedSkill = () => {
    if (selectedWantedSkill && !wantedSkills.includes(selectedWantedSkill)) {
      setWantedSkills([...wantedSkills, selectedWantedSkill]);
      setSelectedWantedSkill('');
    }
  };

  const removeWantedSkill = (skillId: string) => {
    setWantedSkills(wantedSkills.filter(s => s !== skillId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    await supabase
      .from('profiles')
      .update({
        college,
        location,
        bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    for (const skill of offeredSkills) {
      await supabase.from('user_skills').insert({
        user_id: user.id,
        skill_id: skill.skillId,
        type: 'offered',
        level: skill.level,
      });
    }

    for (const skillId of wantedSkills) {
      await supabase.from('user_skills').insert({
        user_id: user.id,
        skill_id: skillId,
        type: 'wanted',
      });
    }

    navigate('/dashboard');
  };

  const getSkillName = (skillId: string) => {
    return allSkills.find(s => s.id === skillId)?.name || '';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600 mb-8">Tell us about yourself and the skills you want to exchange</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                College / Institution
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., MIT, Stanford University"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Boston, MA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell us about yourself, your interests, and your learning goals..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills I Can Teach
              </label>
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedOfferedSkill}
                  onChange={(e) => setSelectedOfferedSkill(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a skill...</option>
                  {allSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.category})
                    </option>
                  ))}
                </select>
                <select
                  value={selectedOfferedLevel}
                  onChange={(e) => setSelectedOfferedLevel(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
                <button
                  type="button"
                  onClick={addOfferedSkill}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {offeredSkills.map((skill) => (
                  <span
                    key={skill.skillId}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {getSkillName(skill.skillId)} ({skill.level})
                    <button type="button" onClick={() => removeOfferedSkill(skill.skillId)}>
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills I Want to Learn
              </label>
              <div className="flex gap-2 mb-3">
                <select
                  value={selectedWantedSkill}
                  onChange={(e) => setSelectedWantedSkill(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a skill...</option>
                  {allSkills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.category})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addWantedSkill}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {wantedSkills.map((skillId) => (
                  <span
                    key={skillId}
                    className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {getSkillName(skillId)}
                    <button type="button" onClick={() => removeWantedSkill(skillId)}>
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || offeredSkills.length === 0 || wantedSkills.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
