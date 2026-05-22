export type KRRetailMood = "Euphoric" | "Constructive" | "Divided" | "Defensive" | "Quiet"
export type KRRetailSignalSource = "SaveTicker" | "Coinness"

export interface SaveTickerVoteStats {
  vote_counts?: {
    positive?: number
    negative?: number
  }
  total_count?: number
}

export interface SaveTickerNewsItem {
  id: string
  title: string
  content?: string
  source?: string | null
  created_at: string
  view_count?: number
  tag_names?: string[]
  vote_stats?: SaveTickerVoteStats | null
  is_top_story?: boolean
  similar_count?: number
}

export interface CoinnessBreakingNewsItem {
  id?: string | number
  newsId?: string | number
  title?: string
  content?: string
  source?: string | null
  createdAt?: string
  created_at?: string
  publishedAt?: string
  bull?: number
  bear?: number
  bullCount?: number
  bearCount?: number
  viewCount?: number
  view_count?: number
  tags?: string[]
  tagNames?: string[]
  category?: string
}

export interface KRRetailSignal {
  id: string
  title: string
  source: string
  sourceType: KRRetailSignalSource
  createdAt: string
  views: number
  votes: number
  positive: number
  negative: number
  positiveRatio: number
  conviction: number
  attention: number
  mood: KRRetailMood
  narratives: string[]
  isTopStory: boolean
}

export interface KRRetailReactionSurface {
  ok: boolean
  generatedAt: string
  totalStories: number
  totalViews: number
  totalVotes: number
  positiveRatio: number
  attentionScore: number
  convictionScore: number
  participationScore: number
  coinnessReactionScore: number
  saveTickerConvictionScore: number
  mood: KRRetailMood
  label: string
  summary: string
  topSignals: KRRetailSignal[]
  source: "combined" | "saveticker" | "coinness" | "fallback"
  sourceBreakdown: {
    saveticker: number
    coinness: number
  }
  notes: string[]
}
