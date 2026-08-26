/*
  # Skill Swap Platform Schema

  ## Overview
  Complete database schema for a peer-to-peer skill exchange platform where users can teach and learn skills from each other.

  ## Tables Created

  ### 1. profiles
  Extends auth.users with additional user information
  - `id` (uuid, FK to auth.users)
  - `full_name` (text)
  - `bio` (text)
  - `college` (text)
  - `location` (text)
  - `avatar_url` (text)
  - `phone_number` (text)
  - `email_verified` (boolean)
  - `phone_verified` (boolean)
  - `college_verified` (boolean)
  - `trust_score` (numeric)
  - `total_swaps` (integer)
  - `response_time_hours` (numeric)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. skills
  Master list of available skills
  - `id` (uuid)
  - `name` (text, unique)
  - `category` (text)
  - `description` (text)
  - `icon` (text)
  - `created_at` (timestamptz)

  ### 3. user_skills
  Skills offered or wanted by users
  - `id` (uuid)
  - `user_id` (uuid, FK to profiles)
  - `skill_id` (uuid, FK to skills)
  - `type` (text: 'offered' or 'wanted')
  - `level` (text: 'beginner', 'intermediate', 'expert')
  - `verified` (boolean)
  - `created_at` (timestamptz)

  ### 4. verification_requests
  Track verification requests for college IDs and skills
  - `id` (uuid)
  - `user_id` (uuid, FK to profiles)
  - `type` (text: 'college' or 'skill')
  - `skill_id` (uuid, FK to skills, nullable)
  - `document_url` (text)
  - `status` (text: 'pending', 'approved', 'rejected')
  - `admin_notes` (text)
  - `created_at` (timestamptz)
  - `reviewed_at` (timestamptz)

  ### 5. swap_requests
  Track skill exchange requests between users
  - `id` (uuid)
  - `requester_id` (uuid, FK to profiles)
  - `provider_id` (uuid, FK to profiles)
  - `requester_skill_id` (uuid, FK to skills)
  - `provider_skill_id` (uuid, FK to skills)
  - `status` (text: 'pending', 'accepted', 'rejected', 'ongoing', 'completed')
  - `message` (text)
  - `scheduled_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. messages
  In-app messaging system
  - `id` (uuid)
  - `swap_request_id` (uuid, FK to swap_requests)
  - `sender_id` (uuid, FK to profiles)
  - `content` (text)
  - `file_url` (text)
  - `read` (boolean)
  - `created_at` (timestamptz)

  ### 7. reviews
  User ratings and reviews after completed swaps
  - `id` (uuid)
  - `swap_request_id` (uuid, FK to swap_requests)
  - `reviewer_id` (uuid, FK to profiles)
  - `reviewee_id` (uuid, FK to profiles)
  - `rating` (integer, 1-5)
  - `comment` (text)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can read their own data
  - Users can update their own profiles
  - Admin role for verification approvals
  - Public read access for profiles and skills (for discovery)
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  bio text DEFAULT '',
  college text DEFAULT '',
  location text DEFAULT '',
  avatar_url text DEFAULT '',
  phone_number text DEFAULT '',
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  college_verified boolean DEFAULT false,
  trust_score numeric DEFAULT 0,
  total_swaps integer DEFAULT 0,
  response_time_hours numeric DEFAULT 0,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skills are viewable by everyone"
  ON skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('offered', 'wanted')),
  level text CHECK (level IN ('beginner', 'intermediate', 'expert')),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_id, type)
);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User skills are viewable by everyone"
  ON user_skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own skills"
  ON user_skills FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
  ON user_skills FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
  ON user_skills FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('college', 'skill')),
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE,
  document_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification requests"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ));

CREATE POLICY "Users can create verification requests"
  ON verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update verification requests"
  ON verification_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create swap_requests table
CREATE TABLE IF NOT EXISTS swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_skill_id uuid NOT NULL REFERENCES skills(id),
  provider_skill_id uuid NOT NULL REFERENCES skills(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ongoing', 'completed', 'cancelled')),
  message text DEFAULT '',
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own swap requests"
  ON swap_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = provider_id);

CREATE POLICY "Users can create swap requests"
  ON swap_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update relevant swap requests"
  ON swap_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = provider_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = provider_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_request_id uuid NOT NULL REFERENCES swap_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  file_url text DEFAULT '',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their swaps"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = messages.swap_request_id
      AND (swap_requests.requester_id = auth.uid() OR swap_requests.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages to their swaps"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = messages.swap_request_id
      AND (swap_requests.requester_id = auth.uid() OR swap_requests.provider_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = messages.swap_request_id
      AND (swap_requests.requester_id = auth.uid() OR swap_requests.provider_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = messages.swap_request_id
      AND (swap_requests.requester_id = auth.uid() OR swap_requests.provider_id = auth.uid())
    )
  );

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_request_id uuid NOT NULL REFERENCES swap_requests(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(swap_request_id, reviewer_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for completed swaps"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM swap_requests
      WHERE swap_requests.id = reviews.swap_request_id
      AND swap_requests.status = 'completed'
      AND (swap_requests.requester_id = auth.uid() OR swap_requests.provider_id = auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_type ON user_skills(type);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester ON swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_provider ON swap_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_swap_request ON messages(swap_request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- Insert default skill categories
INSERT INTO skills (name, category, description) VALUES
  ('Web Development', 'Programming', 'HTML, CSS, JavaScript, React, etc.'),
  ('Mobile Development', 'Programming', 'iOS, Android, React Native'),
  ('Python Programming', 'Programming', 'Python coding and scripting'),
  ('Java Programming', 'Programming', 'Java development'),
  ('Data Science', 'Programming', 'Data analysis, ML, AI'),
  ('UI/UX Design', 'Design', 'User interface and experience design'),
  ('Graphic Design', 'Design', 'Photoshop, Illustrator, design principles'),
  ('Video Editing', 'Design', 'Video production and editing'),
  ('Spanish', 'Languages', 'Spanish language learning'),
  ('French', 'Languages', 'French language learning'),
  ('German', 'Languages', 'German language learning'),
  ('Mandarin', 'Languages', 'Chinese Mandarin language'),
  ('Guitar', 'Music', 'Guitar playing and music theory'),
  ('Piano', 'Music', 'Piano playing and music theory'),
  ('Singing', 'Music', 'Vocal training and singing'),
  ('Public Speaking', 'Communication', 'Presentation and speaking skills'),
  ('Writing', 'Communication', 'Creative and technical writing'),
  ('Photography', 'Creative', 'Photography skills and techniques'),
  ('Yoga', 'Fitness', 'Yoga practice and instruction'),
  ('Fitness Training', 'Fitness', 'Personal training and exercise')
ON CONFLICT (name) DO NOTHING;