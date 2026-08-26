import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, Star, ArrowLeft } from 'lucide-react';

export default function Review() {
  const { swapId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [swapRequest, setSwapRequest] = useState<any>(null);
  const [reviewee, setReviewee] = useState<any>(null);

  useEffect(() => {
    loadSwapRequest();
  }, [swapId, user]);

  const loadSwapRequest = async () => {
    if (!swapId || !user) return;

    const { data } = await supabase
      .from('swap_requests')
      .select(`
        *,
        requester:requester_id(id, full_name, avatar_url),
        provider:provider_id(id, full_name, avatar_url),
        requester_skill:requester_skill_id(name),
        provider_skill:provider_skill_id(name)
      `)
      .eq('id', swapId)
      .single();

    if (data) {
      if (data.status !== 'completed') {
        navigate('/swap-requests');
        return;
      }

      setSwapRequest(data);

      const revieweeData = data.requester_id === user.id ? data.provider : data.requester;
      setReviewee(revieweeData);

      const { data: existingReview } = await supabase
        .from('reviews')
        .select('*')
        .eq('swap_request_id', swapId)
        .eq('reviewer_id', user.id)
        .maybeSingle();

      if (existingReview) {
        setRating(existingReview.rating);
        setComment(existingReview.comment);
      }
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapId || !user || !reviewee) return;

    setSubmitting(true);

    const revieweeId = reviewee.id;

    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('swap_request_id', swapId)
      .eq('reviewer_id', user.id)
      .maybeSingle();

    if (existingReview) {
      await supabase
        .from('reviews')
        .update({ rating, comment })
        .eq('id', existingReview.id);
    } else {
      await supabase.from('reviews').insert({
        swap_request_id: swapId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating,
        comment,
      });
    }

    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', revieweeId);

    if (allReviews) {
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await supabase
        .from('profiles')
        .update({
          trust_score: Math.round(avgRating * 10) / 10,
        })
        .eq('id', revieweeId);
    }

    setSubmitting(false);
    navigate('/swap-requests');
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

  if (!swapRequest || !reviewee) return null;

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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Leave a Review</h1>

          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                {getInitials(reviewee.full_name)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{reviewee.full_name}</h2>
                <p className="text-gray-600">
                  You exchanged {swapRequest.requester_id === user?.id ? swapRequest.requester_skill.name : swapRequest.provider_skill.name} for{' '}
                  {swapRequest.requester_id === user?.id ? swapRequest.provider_skill.name : swapRequest.requester_skill.name}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-4">
                How would you rate this exchange?
              </label>
              <div className="flex gap-4 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      } cursor-pointer`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-gray-900">{rating}</span>
                <span className="text-gray-600"> / 5</span>
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-semibold text-gray-900 mb-2">
                Share your experience (optional)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Tell others about the swap experience..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Be honest and helpful to the community</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Your review will help build trust in the community. Be honest about your experience and help others make informed decisions.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/swap-requests')}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
