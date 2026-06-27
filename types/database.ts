export interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  age_verified: boolean;
  xp: number;
  created_at: string;
  updated_at: string;
  gender: string | null;
}

export interface Bar {
  id: string;
  google_place_id: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  is_active: boolean;
  created_at: string;
  price_demi: number | null;
  price_pinte: number | null;
  price_little_john: number | null;
  has_rewards?: boolean;
}

export interface ChallengeType {
  id: string;
  name: string;
  description: string | null;
  tutorial_illustration_url: string | null;
  is_active: boolean;
  created_at: string;
}

export type PerformanceVisibility = 'public' | 'followers' | 'private';

export type PerformanceStatus = 'pending' | 'approved' | 'rejected' | 'unverified';
// pending = video soumise, en attente de vérification admin
// approved = certifiée (compte dans le classement)
// rejected = rejetée par un admin
// unverified = sans vidéo, non certifiable

export type VideoStatus = 'none' | 'uploading' | 'uploaded' | 'failed';

export interface Performance {
  id: string;
  user_id: string;
  bar_id: string;
  challenge_type_id: string;
  time_ms: number;
  volume_ml: number | null;
  video_url: string | null;
  video_status: VideoStatus;
  status: PerformanceStatus;
  visibility: PerformanceVisibility;
  created_at: string;
}

export interface PerformanceWithDetails extends Performance {
  profiles: Profile;
  bars: Bar;
  challenge_types: ChallengeType;
  comments_count?: number;
}

export interface LeaderboardEntry {
  rank: number;
  profile: Profile;
  time_ms: number;
  created_at: string;
  status: PerformanceStatus;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface BarFollow {
  id: string;
  user_id: string;
  bar_id: string;
  created_at: string;
}

export interface Yermat {
  id: string;
  performance_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  performance_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface CommentWithProfile extends Comment {
  profiles: Profile | null;
}