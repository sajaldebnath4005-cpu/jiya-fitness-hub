-- =============== PROFILES ===============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  first_login_tour_seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_lower_key ON public.profiles (lower(username));
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============== USER ONBOARDING PROFILE ===============
CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  age INTEGER,
  gender TEXT,
  height NUMERIC,
  weight NUMERIC,
  unit_system TEXT NOT NULL DEFAULT 'metric',
  goal TEXT,
  workout_location TEXT,
  equipment_home TEXT[] NOT NULL DEFAULT '{}',
  equipment_gym TEXT[] NOT NULL DEFAULT '{}',
  desired_results TEXT[] NOT NULL DEFAULT '{}',
  planning_style TEXT,
  focus_muscles TEXT[] NOT NULL DEFAULT '{}',
  fitness_level TEXT,
  intensity TEXT,
  past_experience TEXT,
  days_per_week INTEGER,
  session_duration INTEGER,
  injuries TEXT[] NOT NULL DEFAULT '{}',
  schedule_days TEXT[] NOT NULL DEFAULT '{}',
  schedule_time_block TEXT,
  notification_prefs JSONB NOT NULL DEFAULT '{"workout":true,"water":true,"meal":true,"weekly_report":true,"motivation":true}'::jsonb,
  target_weight NUMERIC,
  target_date DATE,
  daily_calories INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fat_g INTEGER,
  onboarding_step INTEGER NOT NULL DEFAULT 1,
  onboarding_completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_profile" ON public.user_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============== EXERCISES (shared library) ===============
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  secondary_muscles TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'Beginner',
  instructions TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  common_mistakes TEXT NOT NULL DEFAULT '',
  alternative_slugs TEXT[] NOT NULL DEFAULT '{}',
  contraindicated_conditions TEXT[] NOT NULL DEFAULT '{}',
  is_warmup BOOLEAN NOT NULL DEFAULT false,
  met NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercises TO authenticated, anon;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises readable" ON public.exercises FOR SELECT TO authenticated, anon USING (true);

-- =============== PLANS ===============
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  generated_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  split_structure TEXT NOT NULL DEFAULT '',
  notes TEXT,
  weeks_to_goal INTEGER,
  active BOOLEAN NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.workout_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  name TEXT NOT NULL,
  is_rest BOOLEAN NOT NULL DEFAULT false,
  exercise_ids UUID[] NOT NULL DEFAULT '{}',
  prescriptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_duration INTEGER NOT NULL DEFAULT 0,
  estimated_calories INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_days TO authenticated;
GRANT ALL ON public.workout_days TO service_role;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own days" ON public.workout_days FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============== LOGS ===============
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workout_day_id UUID REFERENCES public.workout_days ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  workout_name TEXT NOT NULL DEFAULT '',
  exercise_ids_completed UUID[] NOT NULL DEFAULT '{}',
  sets_logged JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration INTEGER NOT NULL DEFAULT 0,
  calories_burned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_logs TO authenticated;
GRANT ALL ON public.workout_logs TO service_role;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workout_logs" ON public.workout_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.nutrition_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'barcode',
  barcode TEXT,
  food_name TEXT NOT NULL DEFAULT '',
  brand TEXT,
  image_url TEXT,
  grade TEXT,
  serving_size TEXT,
  calories NUMERIC,
  macros JSONB NOT NULL DEFAULT '{}'::jsonb,
  nutrients_per_100g JSONB NOT NULL DEFAULT '{}'::jsonb,
  nutrients_per_serving JSONB NOT NULL DEFAULT '{}'::jsonb,
  ingredients TEXT,
  ingredients_structured JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  additives JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  raw_api_response JSONB
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_scans TO authenticated;
GRANT ALL ON public.nutrition_scans TO service_role;
ALTER TABLE public.nutrition_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scans" ON public.nutrition_scans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.body_metrics_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC,
  body_fat NUMERIC,
  muscle_mass NUMERIC,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_metrics_logs TO authenticated;
GRANT ALL ON public.body_metrics_logs TO service_role;
ALTER TABLE public.body_metrics_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metrics" ON public.body_metrics_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  ml INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water" ON public.water_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours NUMERIC NOT NULL DEFAULT 8,
  quality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sleep_logs TO authenticated;
GRANT ALL ON public.sleep_logs TO service_role;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sleep" ON public.sleep_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX step_logs_user_date_uniq ON public.step_logs(user_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.step_logs TO authenticated;
GRANT ALL ON public.step_logs TO service_role;
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own step logs" ON public.step_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements" ON public.achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('user','jiya')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_user_created ON public.chat_messages (user_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat" ON public.chat_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============== SOCIAL ===============
CREATE TABLE public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sender_id, recipient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_requests TO authenticated;
GRANT ALL ON public.friend_requests TO service_role;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own requests" ON public.friend_requests FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "send requests" ON public.friend_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND sender_id <> recipient_id);
CREATE POLICY "respond to requests" ON public.friend_requests FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
CREATE POLICY "delete own requests" ON public.friend_requests FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE TABLE public.friendships (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "create friendships" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "delete friendships" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- profiles policies (need friendships to exist first)
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.friendships f WHERE f.user_id = auth.uid() AND f.friend_id = profiles.id)
    OR EXISTS (SELECT 1 FROM public.friend_requests r WHERE (r.sender_id = auth.uid() AND r.recipient_id = profiles.id) OR (r.recipient_id = auth.uid() AND r.sender_id = profiles.id))
  );
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =============== HELPER FUNCTIONS ===============
CREATE OR REPLACE FUNCTION public.is_username_available(_username TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(_username)));
$$;
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.search_users(_q TEXT)
RETURNS TABLE (id UUID, username TEXT, name TEXT, avatar_url TEXT, xp INTEGER, streak_days INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.name, p.avatar_url, p.xp, p.streak_days
  FROM public.profiles p
  WHERE length(trim(_q)) >= 2
    AND p.id <> auth.uid()
    AND (
      p.username ILIKE '%' || replace(replace(trim(_q), '%', '\%'), '_', '\_') || '%'
      OR p.name ILIKE '%' || replace(replace(trim(_q), '%', '\%'), '_', '\_') || '%'
    )
  ORDER BY p.username
  LIMIT 20;
$$;
GRANT EXECUTE ON FUNCTION public.search_users(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.global_leaderboard()
RETURNS TABLE (id UUID, username TEXT, name TEXT, avatar_url TEXT, xp INTEGER, streak_days INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.name, p.avatar_url, p.xp, p.streak_days
  FROM public.profiles p ORDER BY p.xp DESC, p.username LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.global_leaderboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.friends_leaderboard()
RETURNS TABLE (id UUID, username TEXT, name TEXT, avatar_url TEXT, xp INTEGER, streak_days INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.name, p.avatar_url, p.xp, p.streak_days
  FROM public.profiles p
  WHERE p.id = auth.uid()
     OR p.id IN (SELECT f.friend_id FROM public.friendships f WHERE f.user_id = auth.uid())
  ORDER BY p.xp DESC, p.username LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.friends_leaderboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_friend_request(_request_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.friend_requests;
BEGIN
  SELECT * INTO r FROM public.friend_requests WHERE id = _request_id AND recipient_id = auth.uid() AND status = 'pending';
  IF r.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  UPDATE public.friend_requests SET status = 'accepted' WHERE id = _request_id;
  INSERT INTO public.friendships (user_id, friend_id) VALUES (r.sender_id, r.recipient_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.friendships (user_id, friend_id) VALUES (r.recipient_id, r.sender_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.notifications (user_id, kind, title, body)
  VALUES (r.sender_id, 'friend', 'Friend request accepted', 'You are now friends!');
END; $$;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_friend(_friend_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.friendships WHERE (user_id = auth.uid() AND friend_id = _friend_id) OR (user_id = _friend_id AND friend_id = auth.uid());
  DELETE FROM public.friend_requests WHERE (sender_id = auth.uid() AND recipient_id = _friend_id) OR (sender_id = _friend_id AND recipient_id = auth.uid());
END; $$;
GRANT EXECUTE ON FUNCTION public.remove_friend(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_xp(_amount INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_xp INTEGER;
BEGIN
  UPDATE public.profiles SET xp = xp + GREATEST(_amount, 0), updated_at = now()
  WHERE id = auth.uid() RETURNING xp INTO new_xp;
  RETURN new_xp;
END; $$;
GRANT EXECUTE ON FUNCTION public.add_xp(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.trim_nutrition_scans()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.nutrition_scans s
  WHERE s.user_id = NEW.user_id
    AND s.id NOT IN (
      SELECT id FROM public.nutrition_scans
      WHERE user_id = NEW.user_id
      ORDER BY scanned_at DESC
      LIMIT 5
    );
  RETURN NULL;
END;
$$;
CREATE TRIGGER trim_nutrition_scans_trg
AFTER INSERT ON public.nutrition_scans
FOR EACH ROW EXECUTE FUNCTION public.trim_nutrition_scans();