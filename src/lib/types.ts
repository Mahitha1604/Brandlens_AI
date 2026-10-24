export type RuleCategory = 'guideline' | 'terminology' | 'verified_fact' | 'permitted_claim';
export type RuleSeverity = 'violation' | 'warning' | 'suggestion';
export type DraftStatus = 'draft' | 'under_review' | 'changes_requested' | 'approved' | 'rejected';
export type DraftChannel =
  | 'social_ad'
  | 'press_release'
  | 'landing_page'
  | 'email'
  | 'email_newsletter'
  | 'blog_post'
  | 'instagram_post'
  | 'linkedin_post'
  | 'website_copy'
  | 'other';
export type PersonaRole = 'copywriter' | 'reviewer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: PersonaRole;
  workspace_id?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface UserPersona {
  id: string;
  name: string;
  role: PersonaRole;
  title: string;
  avatar: string;
}

export interface Brand {
  id: string;
  user_id?: string | null;
  workspace_id?: string | null;
  organization_id?: string | null;
  name: string;
  industry: string;
  description: string;
  tone_guidelines: string;
  disclaimers: string;
  is_sample?: boolean;
  is_archived?: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandRule {
  id: string;
  brand_id: string;
  category: RuleCategory;
  rule_key: string;
  title: string;
  content: string;
  forbidden_terms: string[]; // parsed from JSON array
  replacement_terms: string;
  rationale: string;
  severity: RuleSeverity;
  created_at: string;
}

export interface BrandWithRules extends Brand {
  rules: BrandRule[];
  counts: {
    guidelines: number;
    terminology: number;
    verified_facts: number;
    permitted_claims: number;
    total: number;
  };
}

export interface Draft {
  id: string;
  user_id?: string | null;
  workspace_id?: string | null;
  organization_id?: string | null;
  brand_id: string;
  title: string;
  content: string;
  channel: DraftChannel;
  target_audience: string;
  status: DraftStatus;
  current_revision: number;
  last_decision_notes?: string;
  last_decided_by?: string;
  last_decided_at?: string;
  created_at: string;
  updated_at: string;
}

export type GovernanceAction = 'approve' | 'request_changes' | 'reject';

export interface GovernanceDecisionRequest {
  draft_id: string;
  decision: GovernanceAction;
  comment: string;
  actor_name: string;
  actor_role: PersonaRole;
}

export interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface DraftRevision {
  id: string;
  user_id?: string | null;
  workspace_id?: string | null;
  organization_id?: string | null;
  draft_id: string;
  version: number;
  content: string;
  created_by: string;
  change_summary: string;
  created_at: string;
}

export interface ReviewFinding {
  id: string;
  review_id?: string;
  rule_id: string | null;
  rule_key?: string;
  category: RuleCategory;
  severity: RuleSeverity;
  flagged_text: string;
  suggested_replacement: string;
  rationale: string;
  evidence_snippet: string;
  start_index: number;
  end_index: number;
  is_resolved?: boolean;
}

export interface ReviewSummary {
  id: string;
  draft_id: string;
  revision_id: string;
  reviewer_role: string;
  status: DraftStatus;
  score_overall: number;
  score_terminology: number;
  score_claims: number;
  score_tone: number;
  notes: string;
  findings: ReviewFinding[];
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  workspace_id?: string | null;
  organization_id?: string | null;
  draft_id?: string | null;
  brand_id?: string | null;
  actor: string;
  actor_role: PersonaRole;
  action: string;
  details: string;
  created_at: string;
}

export type FindingSource = 'deterministic' | 'ai_contextual' | 'offline_fallback';

export type EvidenceStatus =
  | 'supported'
  | 'insufficient_evidence'
  | 'potential_conflict'
  | 'human_review_required';

export type ContextualCategory = 'tone' | 'claim' | 'messaging' | 'readability';

export interface DeterministicFinding {
  id: string;
  rule_id: string;
  rule_key: string;
  category: RuleCategory;
  severity: RuleSeverity;
  source: 'deterministic';
  flagged_text: string;
  suggested_replacement: string;
  rationale: string;
  evidence_snippet: string;
  start_index: number;
  end_index: number;
  confidence: number;
  requires_human_review: boolean;
}

export interface DeterministicResult {
  brand_id: string;
  total_rules_evaluated: number;
  findings: DeterministicFinding[];
  summary: {
    violations_count: number;
    warnings_count: number;
    suggestions_count: number;
    total_findings: number;
    passed: boolean;
    cleanliness_score: number;
  };
  evaluated_at: string;
}

export interface ContextualFinding {
  id: string;
  source: 'ai_contextual' | 'offline_fallback';
  category: ContextualCategory;
  severity: RuleSeverity;
  flagged_text: string;
  start_index: number;
  end_index: number;
  explanation: string;
  evidence_status: EvidenceStatus;
  relevant_evidence_id: string | null;
  relevant_evidence_reference: string | null;
  suggested_correction: string;
  confidence: number;
  requires_human_review: boolean;
}

export interface ContextualReviewResult {
  brand_id: string;
  is_fallback: boolean;
  provider: 'google_gemini' | 'offline_fallback_engine';
  model: string;
  fallback_reason?: string;
  findings: ContextualFinding[];
  claim_summary: {
    total_claims_evaluated: number;
    supported_claims: number;
    insufficient_evidence_claims: number;
    conflicting_claims: number;
    human_review_claims: number;
  };
  evaluated_at: string;
}

export interface UnifiedReviewResponse {
  draft_id?: string;
  brand_id: string;
  deterministic: DeterministicResult;
  contextual: ContextualReviewResult;
  overall_score: number;
  overall_passed: boolean;
  reviewed_text?: string;
  reviewed_revision?: number;
  evaluated_at: string;
}

// -------------------------------------------------------------
// Organization, Team Collaboration & In-App Notifications
// -------------------------------------------------------------

export type OrgRole = 'owner' | 'manager' | 'reviewer' | 'copywriter';

export interface Organization {
  id: string;
  name: string;
  type: 'marketing_team' | 'agency' | 'enterprise';
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  joined_at: string;
  user_name?: string;
  user_email?: string;
}

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string;
  role: OrgRole;
  invite_code: string;
  created_by: string;
  created_at: string;
  expires_at: string;
}

export type NotificationType =
  | 'SUBMISSION_PENDING'
  | 'CHANGES_REQUESTED'
  | 'DRAFT_APPROVED'
  | 'DRAFT_REJECTED'
  | 'TEAM_INVITE'
  | 'GENERAL';

export interface InAppNotification {
  id: string;
  user_id: string;
  organization_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}



