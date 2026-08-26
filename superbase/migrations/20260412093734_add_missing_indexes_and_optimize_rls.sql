/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Added Missing Indexes for Foreign Keys
  - messages.sender_id - for efficient message filtering by sender
  - reviews.reviewer_id - for efficient review queries by reviewer
  - swap_requests.requester_skill_id and provider_skill_id - for skill-based queries
  - verification_requests.user_id and skill_id - for verification lookups

  ### 2. Optimized RLS Policies
  - Replace auth.uid() calls with (select auth.uid()) in RLS policies
  - This prevents re-evaluation for each row and improves performance at scale
  - Applied to all affected tables: profiles, skills, user_skills, verification_requests, swap_requests, messages, reviews

  ### 3. Performance Benefits
  - Reduced query execution time for filtered operations
  - Better index utilization by Postgres query planner
  - Subquery auth functions prevent repeated evaluation
*/

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_skill ON swap_requests(requester_skill_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_provider_skill ON swap_requests(provider_skill_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_skill ON verification_requests(skill_id);

-- Optimize RLS policies to use subqueries for auth functions

-- profiles table
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- skills table
DROP POLICY IF EXISTS "Only admins can insert skills" ON skills;
CREATE POLICY "Only admins can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- user_skills table
DROP POLICY IF EXISTS "Users can insert own skills" ON user_skills;
CREATE POLICY "Users can insert own skills"
  ON user_skills FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own skills" ON user_skills;
CREATE POLICY "Users can update own skills"
  ON user_skills FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own skills" ON user_skills;
CREATE POLICY "Users can delete own skills"
  ON user_skills FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- verification_requests table
DROP POLICY IF EXISTS "Users can view own verification requests" ON verification_requests;
CREATE POLICY "Users can view own verification requests"
  ON verification_requests FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.is_admin = true
  ));

DROP POLICY IF EXISTS "Users can create verification requests" ON verification_requests;
CREATE POLICY "Users can create verification requests"
  ON verification_requests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can update verification requests" ON verification_requests;
CREATE POLICY "Admins can update verification requests"
  ON verification_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- swap_requests table
DROP POLICY IF EXISTS "Users can view own swap requests" ON swap_requests;
CREATE POLICY "Users can view own swap requests"
  ON swap_requests FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = requester_id OR (select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Users can create swap requests" ON swap_requests;
CREATE POLICY "Users can create swap requests"
  ON swap_requests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = requester_id);

DROP POLICY IF EXISTS "Users can update relevant swap requests" ON swap_requests;
CREATE POLICY "Users can update relevant swap requests"
  ON swap_requests FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = requester_id OR (select auth.uid()) = provider_id)
  WITH CHECK ((select auth.uid()) = requester_id OR (select auth.uid()) = provider_id);

-- messages table
DROP POLICY IF EXISTS "Users can view messages from their swaps" ON messages;
CREATE POLICY "Users can view messages from their swaps"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = messages.swap_request_id
      AND ((select auth.uid()) = swap_requests.requester_id OR (select auth.uid()) = swap_requests.provider_id)
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their swaps" ON messages;
CREATE POLICY "Users can send messages to their swaps"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = messages.swap_request_id
      AND ((select auth.uid()) = swap_requests.requester_id OR (select auth.uid()) = swap_requests.provider_id)
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = messages.swap_request_id
      AND ((select auth.uid()) = swap_requests.requester_id OR (select auth.uid()) = swap_requests.provider_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = messages.swap_request_id
      AND ((select auth.uid()) = swap_requests.requester_id OR (select auth.uid()) = swap_requests.provider_id)
    )
  );

-- reviews table
DROP POLICY IF EXISTS "Users can create reviews for completed swaps" ON reviews;
CREATE POLICY "Users can create reviews for completed swaps"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = reviewer_id
    AND EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = reviews.swap_request_id
      AND swap_requests.status = 'completed'
      AND ((select auth.uid()) = swap_requests.requester_id OR (select auth.uid()) = swap_requests.provider_id)
    )
  );