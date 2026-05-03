export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'buyer' | 'provider'
export type JobStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
export type BidStatus = 'pending' | 'accepted' | 'rejected'
export type Urgency = 'low' | 'medium' | 'high'
export type PaymentStatus = 'unpaid' | 'paid'

export interface Profile {
  id: string
  role: UserRole
  name: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export interface ProviderProfile {
  id: string
  user_id: string
  skills: string[]
  bio: string | null
  service_radius_km: number
  lat: number | null
  lng: number | null
  portfolio_urls: string[]
  avg_rating: number
  completed_jobs: number
  is_verified: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  icon: string
  description: string | null
}

export interface Job {
  id: string
  buyer_id: string
  category_id: string
  title: string
  description: string | null
  lat: number
  lng: number
  address: string | null
  urgency: Urgency
  photo_urls: string[]
  status: JobStatus
  accepted_bid_id: string | null
  payment_status: PaymentStatus
  created_at: string
  // joined
  category?: Category
  buyer?: Profile
  accepted_bid?: Bid
}

export interface Bid {
  id: string
  job_id: string
  provider_id: string
  price: number
  eta_minutes: number
  message: string | null
  status: BidStatus
  created_at: string
  // joined
  provider?: Profile
  provider_profile?: ProviderProfile
}

export interface Message {
  id: string
  job_id: string
  sender_id: string
  content: string
  created_at: string
  // joined
  sender?: Profile
}

export interface Review {
  id: string
  job_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}
