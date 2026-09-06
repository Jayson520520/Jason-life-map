export type RelationshipLevel = 1 | 2 | 3 | 4 | 5;

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  nickname?: string | null;
  gender?: string | null;
  birth_year?: number | null;
  age?: number | null;
  occupation?: string | null;
  company?: string | null;
  industry?: string | null;
  phone?: string | null;
  contact_info?: string | null;
  relationship_level: RelationshipLevel;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // convenience fields surfaced on the list page — in Phase 1 these come
  // from mock data; from Phase 2 onward they are derived from the latest
  // conversation + customer_profiles.
  current_focus?: string[];
  next_step?: string;
  last_contact_at?: string;
}

export interface CustomerProfile {
  id: string;
  customer_id: string;
  family: string[];
  work: string[];
  finance: Record<string, string>;
  property: Record<string, string>;
  life_goals: string[];
  concerns: string[];
  resistance: string[];
  decision_makers: string[];
  competitors: Competitor[];
  preferences: Record<string, string>;
  updated_at: string;
}

export interface Competitor {
  name: string;
  company?: string;
  relationship?: string;
  trust_level?: string;
  notes?: string;
}

export interface NextActionInfo {
  next_question?: string;
  avoid_topics?: string[];
}

export type InputType = "text" | "voice";

export interface Conversation {
  id: string;
  customer_id: string;
  user_id: string;
  conversation_date: string;
  input_type: InputType;
  audio_url?: string | null;
  transcript?: string | null;
  summary?: string | null;
  ai_analysis?: AiAnalysis | null;
  created_at: string;
}

export interface AiAnalysis {
  summary: string;
  family_updates: string[];
  work_updates: string[];
  financial_updates: string[];
  property_updates: string[];
  life_goal_updates: string[];
  concerns: string[];
  resistance: string[];
  decision_makers: string[];
  competitors: string[];
  important_quotes: string[];
  potential_needs: string[];
  missing_information: string[];
  next_questions: string[];
  avoid_topics: string[];
  follow_up_suggestion: string;
}

export interface NextAction {
  id: string;
  customer_id: string;
  conversation_id?: string | null;
  question?: string | null;
  action?: string | null;
  avoid_topic?: string | null;
  follow_up_date?: string | null;
  status: "open" | "done" | "dismissed";
  created_at: string;
}
