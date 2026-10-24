import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Brand,
  BrandRule,
  BrandWithRules,
  Draft,
  DraftRevision,
  DraftStatus,
  PersonaRole,
  RuleCategory,
  RuleSeverity,
  AuditLog,
  User,
  UserSession,
  UnifiedReviewResponse,
  Organization,
  OrganizationMember,
  OrganizationInvite,
  InAppNotification,
  NotificationType,
  OrgRole,
} from './types';

// Global cache for Next.js hot-reload in development
const globalForDb = globalThis as unknown as {
  _brandlensDb?: DatabaseSync;
  _schemaInitialized?: boolean;
};

function getDbInstance(): DatabaseSync {
  if (globalForDb._brandlensDb) {
    return globalForDb._brandlensDb;
  }

  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'brandlens.db');
  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  initSchema(db);
  seedInitialDataIfEmpty(db);

  globalForDb._brandlensDb = db;
  return db;
}

function initSchema(db: DatabaseSync) {
  if (globalForDb._schemaInitialized) {
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT NOT NULL,
      description TEXT NOT NULL,
      tone_guidelines TEXT NOT NULL,
      disclaimers TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0,
      user_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brand_rules (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      category TEXT NOT NULL, -- 'guideline' | 'terminology' | 'verified_fact' | 'permitted_claim'
      rule_key TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      forbidden_terms TEXT NOT NULL, -- JSON array of strings
      replacement_terms TEXT NOT NULL,
      rationale TEXT NOT NULL,
      severity TEXT NOT NULL, -- 'violation' | 'warning' | 'suggestion'
      created_at TEXT NOT NULL,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      channel TEXT NOT NULL,
      target_audience TEXT NOT NULL,
      status TEXT NOT NULL, -- 'draft' | 'under_review' | 'changes_requested' | 'approved'
      current_revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS draft_revisions (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_by TEXT NOT NULL,
      change_summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      draft_id TEXT NOT NULL,
      revision_id TEXT NOT NULL,
      reviewer_role TEXT NOT NULL,
      status TEXT NOT NULL,
      score_overall INTEGER NOT NULL,
      score_terminology INTEGER NOT NULL,
      score_claims INTEGER NOT NULL,
      score_tone INTEGER NOT NULL,
      notes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_findings (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      rule_id TEXT,
      rule_key TEXT,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      flagged_text TEXT NOT NULL,
      suggested_replacement TEXT NOT NULL,
      rationale TEXT NOT NULL,
      evidence_snippet TEXT NOT NULL,
      start_index INTEGER NOT NULL,
      end_index INTEGER NOT NULL,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      draft_id TEXT,
      brand_id TEXT,
      actor TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'copywriter',
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'agency', -- 'marketing_team' | 'agency' | 'enterprise'
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'copywriter', -- 'owner' | 'manager' | 'reviewer' | 'copywriter'
      joined_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS organization_invites (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'copywriter',
      invite_code TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      organization_id TEXT,
      type TEXT NOT NULL, -- 'SUBMISSION_PENDING' | 'CHANGES_REQUESTED' | 'DRAFT_APPROVED' | 'DRAFT_REJECTED' | 'TEAM_INVITE' | 'GENERAL'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_brand_rules_brand ON brand_rules(brand_id);
    CREATE INDEX IF NOT EXISTS idx_brand_rules_cat ON brand_rules(category);
    CREATE INDEX IF NOT EXISTS idx_drafts_brand ON drafts(brand_id);
    CREATE INDEX IF NOT EXISTS idx_revisions_draft ON draft_revisions(draft_id);
    CREATE INDEX IF NOT EXISTS idx_findings_review ON review_findings(review_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_draft ON audit_logs(draft_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_brand ON audit_logs(brand_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);

  // Stage 5 & 6 safe table migrations
  try {
    db.exec(`ALTER TABLE brands ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE brands ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE brands ADD COLUMN archived_at TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE drafts ADD COLUMN last_decision_notes TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE drafts ADD COLUMN last_decided_by TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE drafts ADD COLUMN last_decided_at TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE brands ADD COLUMN user_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE drafts ADD COLUMN user_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE draft_revisions ADD COLUMN user_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE audit_logs ADD COLUMN user_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE brands ADD COLUMN organization_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE drafts ADD COLUMN organization_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE draft_revisions ADD COLUMN organization_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE audit_logs ADD COLUMN organization_id TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE reviews ADD COLUMN unified_json TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE reviews ADD COLUMN reviewed_text TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE reviews ADD COLUMN reviewed_revision INTEGER;`);
  } catch {}
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_brands_user ON brands(user_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_brands_org ON brands(organization_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_brands_archived ON brands(is_archived);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_drafts_user ON drafts(user_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_drafts_org ON drafts(organization_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_revisions_user ON draft_revisions(user_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_reviews_draft ON reviews(draft_id);`);
  } catch {}

  globalForDb._schemaInitialized = true;
}

function seedInitialDataIfEmpty(db: DatabaseSync) {
  const brandCountRow = db.prepare('SELECT COUNT(*) as count FROM brands').get() as { count: number };
  if (brandCountRow && brandCountRow.count > 0) {
    return;
  }

  const now = new Date().toISOString();

  // 1. Seed Brand: ApexPay (FinTech / Regulatory)
  const insertBrand = db.prepare(`
    INSERT INTO brands (id, name, industry, description, tone_guidelines, disclaimers, is_sample, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBrand.run(
    'apexpay',
    'ApexPay',
    'FinTech & Cross-Border Payments',
    'Institutional B2B payment rails and automated treasury routing platform.',
    'Objective, mathematically rigorous, calm, enterprise-grade. Never use emotional FOMO, speculative hyperbole, or vague consumer promises.',
    'ApexPay Technologies Inc. is a registered Money Services Business (FinCEN MSB #31000214). Services subject to underwriting and jurisdiction approval.',
    1,
    now,
    now
  );

  // 2. Seed Brand: Verdant Aura (Clean Beauty / Eco)
  insertBrand.run(
    'verdant-aura',
    'Verdant Aura',
    'Clean Beauty & Sustainable Personal Care',
    'Ethical botanical skincare formulated with clinically validated, regenerative agriculture ingredients.',
    'Empathetic, authentic, transparent, scientifically grounded. Avoid fear-mongering about synthetic ingredients or unsubstantiated greenwashing claims.',
    'Formulated without parabens, synthetic fragrances, or phthalates. Certified Cruelty-Free by Leaping Bunny and dermatologically tested for sensitive skin.',
    1,
    now,
    now
  );

  // Rules for ApexPay
  const insertRule = db.prepare(`
    INSERT INTO brand_rules (id, brand_id, category, rule_key, title, content, forbidden_terms, replacement_terms, rationale, severity, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // ApexPay Rules
  const apexRules: Array<{
    id: string;
    cat: RuleCategory;
    key: string;
    title: string;
    content: string;
    forbidden: string[];
    replacement: string;
    rationale: string;
    sev: RuleSeverity;
  }> = [
    {
      id: 'rule-apex-term-1',
      cat: 'terminology',
      key: 'APEX_TERM_BULLETPROOF',
      title: 'Prohibited security absolute "bulletproof"',
      content: 'Never claim security or encryption is "bulletproof", "unhackable", or "impenetrable".',
      forbidden: ['bulletproof', 'unhackable', 'impenetrable', '100% secure'],
      replacement: 'defense-in-depth security model',
      rationale: 'Regulatory and legal liability: cybersecurity cannot guarantee absolute immunity from all threat vectors.',
      sev: 'violation',
    },
    {
      id: 'rule-apex-term-2',
      cat: 'terminology',
      key: 'APEX_TERM_RISK_FREE',
      title: 'Prohibited financial claim "risk-free"',
      content: 'All financial copy must avoid claiming investment or treasury yield is "risk-free" or "guaranteed".',
      forbidden: ['risk-free', 'zero risk', 'no risk', 'guaranteed returns'],
      replacement: 'risk-mitigated treasury management',
      rationale: 'SEC and CFPB guidelines prohibit advertising financial products or settlement instruments as zero-risk.',
      sev: 'violation',
    },
    {
      id: 'rule-apex-term-3',
      cat: 'terminology',
      key: 'APEX_TERM_INSTANT',
      title: 'Terminology standard for settlement speed',
      content: 'Do not state transfers are "instant" or "instantaneous" without qualifying network batching.',
      forbidden: ['instantaneous', 'instant settlement', 'zero-second transfer'],
      replacement: 'near real-time settlement (sub-second average)',
      rationale: 'Automated Clearing House (ACH) and SWIFT hops depend on counterparty nodes and cannot guarantee zero latency.',
      sev: 'warning',
    },
    {
      id: 'rule-apex-term-4',
      cat: 'terminology',
      key: 'APEX_TERM_UPTIME_100',
      title: 'Prohibited SLA claim "100% uptime"',
      content: 'Do not claim 100% uptime. Use the legally audited SLA metric.',
      forbidden: ['100% uptime', 'never goes down', 'zero downtime'],
      replacement: '99.97% audited availability with 99.99% core SLA',
      rationale: 'SLA contractual terms commit to 99.99% availability; advertising 100% creates actionable breach of warranty.',
      sev: 'violation',
    },
    {
      id: 'rule-apex-term-5',
      cat: 'terminology',
      key: 'APEX_TRADEMARK_CASING',
      title: 'Mandatory PascalCase Brand Trademark',
      content: 'Brand name must always be capitalized as "ApexPay" (PascalCase with capital P).',
      forbidden: ['apex pay', 'Apexpay', 'APEXPAY', 'apexpay'],
      replacement: 'ApexPay',
      rationale: 'Registered trademark consistency in institutional collateral.',
      sev: 'warning',
    },
    {
      id: 'rule-apex-fact-1',
      cat: 'verified_fact',
      key: 'APEX_FACT_AUDITED_VOLUME',
      title: 'FY2025 Audited Volume: $14.2B across 38 currencies',
      content: 'ApexPay processed $14.2B in annualized transaction volume across 38 global currencies in FY2025.',
      forbidden: ['over $50B', 'hundreds of billions', 'trillions in volume', 'all world currencies'],
      replacement: '$14.2B processed volume across 38 currencies (FY2025 audited)',
      rationale: 'Citation: Deloitte Independent Auditor Report FY2025, Section 4.1.',
      sev: 'violation',
    },
    {
      id: 'rule-apex-fact-2',
      cat: 'verified_fact',
      key: 'APEX_FACT_SOC2_ISO',
      title: 'Verified Compliance: SOC-2 Type II and ISO 27001',
      content: 'ApexPay maintains active SOC-2 Type II audit report and ISO/IEC 27001:2022 certification.',
      forbidden: ['military grade security', 'bank-level NSA security'],
      replacement: 'SOC-2 Type II certified and ISO 27001 compliant infrastructure',
      rationale: 'Citation: Schellman Compliance LLC Attestation 2025.',
      sev: 'suggestion',
    },
    {
      id: 'rule-apex-claim-1',
      cat: 'permitted_claim',
      key: 'APEX_CLAIM_ZERO_MAINTENANCE',
      title: 'Permitted Claim: "Zero monthly account maintenance fee"',
      content: 'Permitted to state "Zero monthly account fees", but MUST clarify that per-transaction interchange fees apply.',
      forbidden: ['completely free platform', 'zero cost forever', 'free money transfers'],
      replacement: 'Zero monthly account maintenance fee (standard per-transaction interchange applies)',
      rationale: 'Truth in Advertising: advertising a service as free when transaction fees apply violates FTC deceptive pricing guides.',
      sev: 'violation',
    },
    {
      id: 'rule-apex-guide-1',
      cat: 'guideline',
      key: 'APEX_GUIDE_NO_FOMO',
      title: 'Tone Guideline: No Urgency or Fear-Inducing CTAs',
      content: 'Avoid promotional countdowns or breathless copy like "Act now before rates expire!" or "Don’t get left behind".',
      forbidden: ['act now before it is too late', 'limited time offer hurry', 'massive windfall await'],
      replacement: 'explore schedule with an institutional specialist',
      rationale: 'Brand tone requirement: Institutional B2B buyers require sober, evidence-led communications.',
      sev: 'warning',
    },
  ];

  for (const r of apexRules) {
    insertRule.run(
      r.id,
      'apexpay',
      r.cat,
      r.key,
      r.title,
      r.content,
      JSON.stringify(r.forbidden),
      r.replacement,
      r.rationale,
      r.sev,
      now
    );
  }

  // Rules for Verdant Aura
  const verdantRules: Array<{
    id: string;
    cat: RuleCategory;
    key: string;
    title: string;
    content: string;
    forbidden: string[];
    replacement: string;
    rationale: string;
    sev: RuleSeverity;
  }> = [
    {
      id: 'rule-va-term-1',
      cat: 'terminology',
      key: 'VA_TERM_CHEMICAL_FREE',
      title: 'Prohibited claim "chemical-free"',
      content: 'Never use the phrase "chemical-free". All botanical matter and water are chemical entities.',
      forbidden: ['chemical-free', 'zero chemicals', 'no chemicals whatsoever'],
      replacement: 'botanically derived, formulated without synthetic additives',
      rationale: 'Advertising Standards Authority & FDA prohibit "chemical-free" claims as scientifically false and misleading.',
      sev: 'violation',
    },
    {
      id: 'rule-va-term-2',
      cat: 'terminology',
      key: 'VA_TERM_MIRACLE',
      title: 'Prohibited hyperbole "miracle cure"',
      content: 'Do not use medical terms like "cures eczema", "miracle elixir", or "erases wrinkles forever".',
      forbidden: ['miracle cure', 'cures acne', 'permanently erases wrinkles', 'miraculous formula'],
      replacement: 'clinically formulated to visibly soothe skin and diminish appearance of fine lines',
      rationale: 'Cosmetic regulatory boundaries: claims of curing disease or permanent biological alteration classify the item as an unapproved new drug.',
      sev: 'violation',
    },
    {
      id: 'rule-va-term-3',
      cat: 'terminology',
      key: 'VA_TERM_100_NATURAL',
      title: 'Formulation percentage accuracy',
      content: 'Do not claim "100% natural". The accurate certified figure is 98.4% plant-based.',
      forbidden: ['100% natural', '100% pure nature', 'purest product on earth'],
      replacement: '98.4% plant-derived formulation (with 1.6% eco-certified clean preservatives)',
      rationale: 'Transparency disclosure: 1.6% safe preservation stabilizers are essential to prevent microbial contamination.',
      sev: 'warning',
    },
    {
      id: 'rule-va-fact-1',
      cat: 'verified_fact',
      key: 'VA_FACT_PCR_PACKAGING',
      title: 'Verified Packaging: 100% Post-Consumer Recycled Glass & Aluminum',
      content: 'All bottles and primary packaging are manufactured from 100% PCR recycled material with soy-based ink printing.',
      forbidden: ['zero footprint', 'saves the planet from plastic'],
      replacement: 'packaged in 100% post-consumer recycled (PCR) aluminum and glass',
      rationale: 'Citation: EarthCert Global Packaging Audit 2025 #EC-9841.',
      sev: 'suggestion',
    },
    {
      id: 'rule-va-fact-2',
      cat: 'verified_fact',
      key: 'VA_FACT_CLINICAL_91',
      title: 'Clinical Trial Result: 91% reported calmer skin after 8 weeks',
      content: 'In an 8-week blind clinical study of 120 participants with sensitive skin, 91% reported significant reduction in visible redness.',
      forbidden: ['100% of women agree', 'all testers saw overnight results'],
      replacement: '91% of participants in an 8-week 120-person clinical trial reported visibly calmer skin',
      rationale: 'Citation: Dermatological Clinical Evaluation Report VA-2024-C03.',
      sev: 'violation',
    },
    {
      id: 'rule-va-claim-1',
      cat: 'permitted_claim',
      key: 'VA_CLAIM_CARBON_NEUTRAL',
      title: 'Permitted Claim: "Carbon-neutral shipping" (requires partner citation)',
      content: 'Permitted to claim "Carbon-neutral shipping" only when accompanied by disclosure of Pachama reforestation offsets.',
      forbidden: ['zero emission supply chain', 'negative carbon brand'],
      replacement: 'carbon-neutral delivery verified through verified Pachama reforestation credits',
      rationale: 'FTC Green Guides requirement: environmental claims must clearly specify offset mechanism.',
      sev: 'warning',
    },
  ];

  for (const r of verdantRules) {
    insertRule.run(
      r.id,
      'verdant-aura',
      r.cat,
      r.key,
      r.title,
      r.content,
      JSON.stringify(r.forbidden),
      r.replacement,
      r.rationale,
      r.sev,
      now
    );
  }

  // Pre-seed an initial sample draft for ApexPay
  const insertDraft = db.prepare(`
    INSERT INTO drafts (id, brand_id, title, content, channel, target_audience, status, current_revision, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialDraftContent = `Welcome to apex pay, the bulletproof payments solution for high-growth enterprises. Our zero-risk treasury engine gives you 100% uptime with instantaneous cross-border wire transfers. Act now before it is too late to lock in completely free platform access and over $50B in volume routing!`;

  insertDraft.run(
    'draft-sample-1',
    'apexpay',
    'High-Growth Enterprise Landing Copy (Sample Flagged)',
    initialDraftContent,
    'landing_page',
    'CFOs and Corporate Treasurers',
    'draft',
    1,
    now,
    now
  );

  const insertRevision = db.prepare(`
    INSERT INTO draft_revisions (id, draft_id, version, content, created_by, change_summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertRevision.run(
    'rev-sample-1',
    'draft-sample-1',
    1,
    initialDraftContent,
    'Sarah (Copywriter)',
    'Initial marketing copy draft submission',
    now
  );

  // Pre-seed initial audit log
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, draft_id, brand_id, actor, actor_role, action, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(
    'audit-seed-1',
    'draft-sample-1',
    'apexpay',
    'System Seeder',
    'admin',
    'SEED_INITIAL_DATA',
    'Initialized brand knowledge base with ApexPay and Verdant Aura presets',
    now
  );
}

// -------------------------------------------------------------
// User & Authentication Functions
// -------------------------------------------------------------

export function createUser(data: {
  email: string;
  password_hash: string;
  name: string;
  role?: PersonaRole;
}): User {
  const db = getDbInstance();
  const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const role: PersonaRole = data.role || 'copywriter';

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, data.email.toLowerCase().trim(), data.password_hash, data.name.trim(), role, now, now);

  return {
    id,
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
    role,
    onboarding_completed: false,
    created_at: now,
    updated_at: now,
  };
}

export function findUserByEmail(email: string): (User & { password_hash: string }) | null {
  const db = getDbInstance();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as unknown as {
    id: string;
    email: string;
    password_hash: string;
    name: string;
    role: PersonaRole;
    onboarding_completed: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    name: row.name,
    role: row.role,
    onboarding_completed: Boolean(row.onboarding_completed),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function findUserById(id: string): User | null {
  const db = getDbInstance();
  const row = db.prepare('SELECT id, email, name, role, onboarding_completed, created_at, updated_at FROM users WHERE id = ?').get(id) as unknown as {
    id: string;
    email: string;
    name: string;
    role: PersonaRole;
    onboarding_completed: number;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    onboarding_completed: Boolean(row.onboarding_completed),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function updateUserOnboarding(userId: string, completed: boolean): void {
  const db = getDbInstance();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users SET onboarding_completed = ?, updated_at = ? WHERE id = ?
  `).run(completed ? 1 : 0, now, userId);
}

export function createSession(data: {
  userId: string;
  tokenHash: string;
  expiresAt: string;
}): UserSession {
  const db = getDbInstance();
  const id = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.userId, data.tokenHash, data.expiresAt, now);

  return {
    id,
    user_id: data.userId,
    token_hash: data.tokenHash,
    expires_at: data.expiresAt,
    created_at: now,
  };
}

export function findSessionByTokenHash(tokenHash: string): UserSession | null {
  const db = getDbInstance();
  const row = db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash) as unknown as UserSession | undefined;
  return row || null;
}

export function deleteSession(tokenHash: string): void {
  const db = getDbInstance();
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function deleteUserSessions(userId: string): void {
  const db = getDbInstance();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

// -------------------------------------------------------------
// Database Access Functions (with User Isolation & Demo Mode Support)
// -------------------------------------------------------------

export function getBrands(
  userId?: string | null,
  isDemo: boolean = false,
  archivedMode: 'active' | 'archived' | 'all' = 'active',
  organizationId?: string | null
): BrandWithRules[] {
  const db = getDbInstance();
  let brands: Brand[];

  if (isDemo) {
    // Demo Mode: only return sample brands
    brands = db.prepare('SELECT * FROM brands WHERE is_sample = 1 ORDER BY name ASC').all() as unknown as Brand[];
  } else if (organizationId) {
    // Organization / Agency workspace: return brands belonging to this organization
    if (archivedMode === 'active') {
      brands = db.prepare('SELECT * FROM brands WHERE organization_id = ? AND (is_archived IS NULL OR is_archived = 0) ORDER BY name ASC').all(organizationId) as unknown as Brand[];
    } else if (archivedMode === 'archived') {
      brands = db.prepare('SELECT * FROM brands WHERE organization_id = ? AND is_archived = 1 ORDER BY name ASC').all(organizationId) as unknown as Brand[];
    } else {
      brands = db.prepare('SELECT * FROM brands WHERE organization_id = ? ORDER BY name ASC').all(organizationId) as unknown as Brand[];
    }
  } else if (userId) {
    // Authenticated Personal Workspace: filter by active / archived (personal brands have no organization_id or match user)
    if (archivedMode === 'active') {
      brands = db.prepare('SELECT * FROM brands WHERE user_id = ? AND (organization_id IS NULL OR organization_id = \'\') AND (is_archived IS NULL OR is_archived = 0) ORDER BY name ASC').all(userId) as unknown as Brand[];
    } else if (archivedMode === 'archived') {
      brands = db.prepare('SELECT * FROM brands WHERE user_id = ? AND (organization_id IS NULL OR organization_id = \'\') AND is_archived = 1 ORDER BY name ASC').all(userId) as unknown as Brand[];
    } else {
      brands = db.prepare('SELECT * FROM brands WHERE user_id = ? AND (organization_id IS NULL OR organization_id = \'\') ORDER BY name ASC').all(userId) as unknown as Brand[];
    }
  } else if (userId === null) {
    // Explicit unauthenticated user query (from API routes when not logged in)
    return [];
  } else {
    // Legacy tests / direct CLI calls without user filter
    if (archivedMode === 'active') {
      brands = db.prepare('SELECT * FROM brands WHERE (is_archived IS NULL OR is_archived = 0) ORDER BY name ASC').all() as unknown as Brand[];
    } else if (archivedMode === 'archived') {
      brands = db.prepare('SELECT * FROM brands WHERE is_archived = 1 ORDER BY name ASC').all() as unknown as Brand[];
    } else {
      brands = db.prepare('SELECT * FROM brands ORDER BY name ASC').all() as unknown as Brand[];
    }
  }

  return brands.map((b) => {
    const rules = getBrandRules(b.id);
    return {
      ...b,
      is_sample: Boolean(b.is_sample),
      is_archived: Boolean(b.is_archived),
      archived_at: b.archived_at || null,
      rules,
      counts: {
        guidelines: rules.filter((r) => r.category === 'guideline').length,
        terminology: rules.filter((r) => r.category === 'terminology').length,
        verified_facts: rules.filter((r) => r.category === 'verified_fact').length,
        permitted_claims: rules.filter((r) => r.category === 'permitted_claim').length,
        total: rules.length,
      },
    };
  });
}

export function getArchivedBrands(userId?: string | null): Array<BrandWithRules & { drafts_count: number }> {
  const db = getDbInstance();
  const archived = getBrands(userId, false, 'archived');
  return archived.map((b) => {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM drafts WHERE brand_id = ?').get(b.id) as { count: number };
    return {
      ...b,
      drafts_count: countRow?.count || 0,
    };
  });
}

export function archiveBrand(id: string, userId?: string | null): boolean {
  const db = getDbInstance();
  const brand = getBrandById(id, userId);
  if (!brand) return false;
  if (brand.is_sample) return false; // Protected
  if (userId && brand.user_id && brand.user_id !== userId) return false;

  const now = new Date().toISOString();
  db.prepare('UPDATE brands SET is_archived = 1, archived_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);

  recordAuditLog({
    user_id: userId || brand.user_id || null,
    brand_id: id,
    actor: userId ? (findUserById(userId)?.name || 'Authorized User') : 'User',
    actor_role: 'admin',
    action: 'BRAND_ARCHIVED',
    details: `Brand "${brand.name}" was archived. All associated drafts, revisions, and rules are safely retained.`,
  });

  return true;
}

export function restoreBrand(id: string, userId?: string | null): boolean {
  const db = getDbInstance();
  const brand = getBrandById(id, userId);
  if (!brand) return false;
  if (brand.is_sample) return false;
  if (userId && brand.user_id && brand.user_id !== userId) return false;

  const now = new Date().toISOString();
  db.prepare('UPDATE brands SET is_archived = 0, archived_at = NULL, updated_at = ? WHERE id = ?').run(now, id);

  recordAuditLog({
    user_id: userId || brand.user_id || null,
    brand_id: id,
    actor: userId ? (findUserById(userId)?.name || 'Authorized User') : 'User',
    actor_role: 'admin',
    action: 'BRAND_RESTORED',
    details: `Brand "${brand.name}" was restored to active workspace.`,
  });

  return true;
}

export function getBrandById(id: string, userId?: string | null, organizationId?: string | null): BrandWithRules | null {
  const db = getDbInstance();
  const brand = db.prepare('SELECT * FROM brands WHERE id = ?').get(id) as unknown as Brand | undefined;
  if (!brand) return null;

  // Authorization check: allow if sample brand OR belongs to requesting user/org OR no filter
  if (brand.is_sample) {
    // Sample brands are accessible to all
  } else if (organizationId && brand.organization_id === organizationId) {
    // Scoped to requesting organization
  } else if (userId) {
    if (brand.organization_id) {
      const userRole = getUserRoleInOrganization(brand.organization_id, userId);
      if (!userRole) return null;
    } else if (brand.user_id && brand.user_id !== userId) {
      return null;
    }
  }

  const rules = getBrandRules(id);
  return {
    ...brand,
    is_sample: Boolean(brand.is_sample),
    is_archived: Boolean(brand.is_archived),
    archived_at: brand.archived_at || null,
    rules,
    counts: {
      guidelines: rules.filter((r) => r.category === 'guideline').length,
      terminology: rules.filter((r) => r.category === 'terminology').length,
      verified_facts: rules.filter((r) => r.category === 'verified_fact').length,
      permitted_claims: rules.filter((r) => r.category === 'permitted_claim').length,
      total: rules.length,
    },
  };
}

export function getBrandRules(brandId: string): BrandRule[] {
  const db = getDbInstance();
  const rows = db.prepare('SELECT * FROM brand_rules WHERE brand_id = ? ORDER BY category, title ASC').all(brandId) as Array<{
    id: string;
    brand_id: string;
    category: RuleCategory;
    rule_key: string;
    title: string;
    content: string;
    forbidden_terms: string;
    replacement_terms: string;
    rationale: string;
    severity: RuleSeverity;
    created_at: string;
  }>;

  return rows.map((r) => {
    let parsedForbidden: string[] = [];
    try {
      parsedForbidden = JSON.parse(r.forbidden_terms);
    } catch {
      parsedForbidden = r.forbidden_terms ? r.forbidden_terms.split(',').map((s) => s.trim()) : [];
    }
    return {
      ...r,
      forbidden_terms: parsedForbidden,
    };
  });
}

export function updateBrand(
  id: string,
  data: {
    name?: string;
    industry?: string;
    description?: string;
    tone_guidelines?: string;
    disclaimers?: string;
  },
  userId?: string | null
): BrandWithRules | null {
  const db = getDbInstance();
  const current = getBrandById(id, userId);
  if (!current) return null;

  // Protect preloaded sample brands from modification in user workspace
  if (current.is_sample && userId) {
    return null;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE brands
    SET name = COALESCE(?, name),
        industry = COALESCE(?, industry),
        description = COALESCE(?, description),
        tone_guidelines = COALESCE(?, tone_guidelines),
        disclaimers = COALESCE(?, disclaimers),
        updated_at = ?
    WHERE id = ?
  `).run(
    data.name ?? null,
    data.industry ?? null,
    data.description ?? null,
    data.tone_guidelines ?? null,
    data.disclaimers ?? null,
    now,
    id
  );

  return getBrandById(id);
}

export function deleteBrand(id: string, userId?: string | null): boolean {
  const db = getDbInstance();
  const brand = getBrandById(id, userId);
  if (!brand) return false;
  if (brand.is_sample) {
    return false; // Cannot delete protected sample demo brands
  }
  if (userId && brand.user_id && brand.user_id !== userId) {
    return false; // Forbidden
  }

  const drafts = db.prepare('SELECT id FROM drafts WHERE brand_id = ?').all(id) as Array<{ id: string }>;
  const rules = db.prepare('SELECT id FROM brand_rules WHERE brand_id = ?').all(id) as Array<{ id: string }>;

  // Record permanent deletion in audit trail BEFORE removing records (preserving governance accountability)
  recordAuditLog({
    user_id: userId || brand.user_id || null,
    brand_id: id,
    actor: userId ? (findUserById(userId)?.name || 'Authorized User') : 'User',
    actor_role: 'admin',
    action: 'BRAND_PERMANENTLY_DELETED',
    details: `Brand "${brand.name}" was permanently deleted (${drafts.length} drafts and ${rules.length} rules removed).`,
  });

  // Remove child drafts, revisions, reviews, and rules
  for (const d of drafts) {
    db.prepare('DELETE FROM draft_revisions WHERE draft_id = ?').run(d.id);
    db.prepare('DELETE FROM reviews WHERE draft_id = ?').run(d.id);
  }
  db.prepare('DELETE FROM drafts WHERE brand_id = ?').run(id);
  db.prepare('DELETE FROM brand_rules WHERE brand_id = ?').run(id);
  const result = db.prepare('DELETE FROM brands WHERE id = ?').run(id);
  return Number(result.changes) > 0;
}

export function createBrand(data: {
  name: string;
  industry: string;
  description: string;
  tone_guidelines: string;
  disclaimers: string;
  is_sample?: boolean;
  user_id?: string | null;
  organization_id?: string | null;
}): BrandWithRules {
  const db = getDbInstance();
  const id =
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `brand-${Date.now()}`;
  const now = new Date().toISOString();

  const existing = getBrandById(id);
  const finalId = existing ? `${id}-${Date.now().toString(36)}` : id;

  db.prepare(`
    INSERT INTO brands (id, user_id, organization_id, name, industry, description, tone_guidelines, disclaimers, is_sample, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    finalId,
    data.user_id || null,
    data.organization_id || null,
    data.name.trim(),
    data.industry.trim(),
    data.description.trim(),
    data.tone_guidelines.trim(),
    data.disclaimers.trim(),
    data.is_sample ? 1 : 0,
    now,
    now
  );

  recordAuditLog({
    user_id: data.user_id || null,
    organization_id: data.organization_id || null,
    brand_id: finalId,
    actor: 'User',
    actor_role: 'admin',
    action: 'BRAND_CREATED',
    details: `Created new brand profile "${data.name.trim()}" (${data.industry.trim()})`,
  });

  return getBrandById(finalId, data.user_id, data.organization_id)!;
}

export function createOrUpdateBrandRule(rule: Partial<BrandRule> & { brand_id: string }): BrandRule {
  const db = getDbInstance();
  const now = new Date().toISOString();
  const id = rule.id || `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const forbiddenJson = JSON.stringify(rule.forbidden_terms || []);

  const existing = rule.id ? db.prepare('SELECT id FROM brand_rules WHERE id = ?').get(rule.id) : null;

  if (existing) {
    db.prepare(`
      UPDATE brand_rules
      SET category = ?,
          rule_key = ?,
          title = ?,
          content = ?,
          forbidden_terms = ?,
          replacement_terms = ?,
          rationale = ?,
          severity = ?
      WHERE id = ?
    `).run(
      rule.category || 'guideline',
      rule.rule_key || 'CUSTOM_RULE',
      rule.title || 'Untitled Rule',
      rule.content || '',
      forbiddenJson,
      rule.replacement_terms || '',
      rule.rationale || '',
      rule.severity || 'warning',
      id
    );
  } else {
    db.prepare(`
      INSERT INTO brand_rules (id, brand_id, category, rule_key, title, content, forbidden_terms, replacement_terms, rationale, severity, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      rule.brand_id,
      rule.category || 'guideline',
      rule.rule_key || `RULE_${Date.now()}`,
      rule.title || 'Untitled Rule',
      rule.content || '',
      forbiddenJson,
      rule.replacement_terms || '',
      rule.rationale || '',
      rule.severity || 'warning',
      now
    );
  }

  const fetched = db.prepare('SELECT * FROM brand_rules WHERE id = ?').get(id) as unknown as {
    id: string;
    brand_id: string;
    category: RuleCategory;
    rule_key: string;
    title: string;
    content: string;
    forbidden_terms: string;
    replacement_terms: string;
    rationale: string;
    severity: RuleSeverity;
    created_at: string;
  };

  return {
    ...fetched,
    forbidden_terms: JSON.parse(fetched.forbidden_terms),
  };
}

export function deleteBrandRule(id: string): boolean {
  const db = getDbInstance();
  const result = db.prepare('DELETE FROM brand_rules WHERE id = ?').run(id);
  return Number(result.changes) > 0;
}

export function resetDatabaseToDefaults(): void {
  const db = getDbInstance();
  db.exec(`
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS review_findings;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS draft_revisions;
    DROP TABLE IF EXISTS drafts;
    DROP TABLE IF EXISTS brand_rules;
    DROP TABLE IF EXISTS brands;
  `);
  initSchema(db);
  seedInitialDataIfEmpty(db);
}

// -------------------------------------------------------------
// Drafts & Revisions helper functions for Stage 1 persistence & Stage 6 User Isolation
// -------------------------------------------------------------

export function getDrafts(
  brandId?: string,
  userId?: string | null,
  isDemo: boolean = false,
  organizationId?: string | null
): Draft[] {
  const db = getDbInstance();
  if (isDemo) {
    if (brandId) {
      return db.prepare("SELECT * FROM drafts WHERE brand_id = ? AND (user_id IS NULL OR id LIKE 'draft-sample-%') ORDER BY updated_at DESC").all(brandId) as unknown as Draft[];
    }
    return db.prepare("SELECT * FROM drafts WHERE (user_id IS NULL OR id LIKE 'draft-sample-%') ORDER BY updated_at DESC").all() as unknown as Draft[];
  }

  if (organizationId) {
    if (brandId) {
      return db.prepare('SELECT * FROM drafts WHERE brand_id = ? AND organization_id = ? ORDER BY updated_at DESC').all(brandId, organizationId) as unknown as Draft[];
    }
    return db.prepare('SELECT * FROM drafts WHERE organization_id = ? ORDER BY updated_at DESC').all(organizationId) as unknown as Draft[];
  }

  if (userId) {
    if (brandId) {
      return db.prepare('SELECT * FROM drafts WHERE brand_id = ? AND user_id = ? AND (organization_id IS NULL OR organization_id = \'\') ORDER BY updated_at DESC').all(brandId, userId) as unknown as Draft[];
    }
    return db.prepare('SELECT * FROM drafts WHERE user_id = ? AND (organization_id IS NULL OR organization_id = \'\') ORDER BY updated_at DESC').all(userId) as unknown as Draft[];
  }

  if (userId === null) {
    return [];
  }

  // Legacy tests / direct CLI calls
  if (brandId) {
    return db.prepare('SELECT * FROM drafts WHERE brand_id = ? ORDER BY updated_at DESC').all(brandId) as unknown as Draft[];
  }
  return db.prepare('SELECT * FROM drafts ORDER BY updated_at DESC').all() as unknown as Draft[];
}

export function getDraftById(id: string, userId?: string | null, organizationId?: string | null): Draft | null {
  const db = getDbInstance();
  const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as unknown as Draft | undefined;
  if (!row) return null;

  if (row.id.startsWith('draft-sample-')) return row;

  if (organizationId && row.organization_id === organizationId) {
    return row;
  }

  if (userId) {
    if (row.user_id === userId) return row;
    if (row.organization_id) {
      const userRole = getUserRoleInOrganization(row.organization_id, userId);
      if (userRole) return row;
    }
    return null;
  }

  return row;
}

export function saveDraft(data: {
  id?: string;
  brand_id: string;
  title: string;
  content: string;
  channel?: string;
  target_audience?: string;
  created_by?: string;
  user_id?: string | null;
  organization_id?: string | null;
}): Draft {
  const db = getDbInstance();
  const now = new Date().toISOString();
  const id = data.id || `draft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const existing = data.id ? getDraftById(data.id, data.user_id, data.organization_id) : null;

  if (existing) {
    const nextRevision = existing.current_revision + 1;
    let newStatus = existing.status;
    let invalidated = false;

    // RULE: Any meaningful content edit to an approved draft invalidates the approval!
    if (existing.status === 'approved' && existing.content !== data.content) {
      newStatus = 'draft';
      invalidated = true;
    }

    db.prepare(`
      UPDATE drafts
      SET brand_id = ?,
          title = ?,
          content = ?,
          channel = ?,
          target_audience = ?,
          status = ?,
          current_revision = ?,
          organization_id = COALESCE(?, organization_id),
          updated_at = ?
      WHERE id = ?
    `).run(
      data.brand_id,
      data.title,
      data.content,
      data.channel || existing.channel,
      data.target_audience || existing.target_audience,
      newStatus,
      nextRevision,
      data.organization_id || null,
      now,
      id
    );

    db.prepare(`
      INSERT INTO draft_revisions (id, user_id, organization_id, draft_id, version, content, created_by, change_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `rev-${id}-v${nextRevision}`,
      data.user_id || existing.user_id || null,
      data.organization_id || existing.organization_id || null,
      id,
      nextRevision,
      data.content,
      data.created_by || 'Current User',
      invalidated
        ? 'Content updated; previous approval invalidated for re-review'
        : 'Updated draft content',
      now
    );

    if (invalidated) {
      recordAuditLog({
        user_id: data.user_id || existing.user_id || null,
        organization_id: data.organization_id || existing.organization_id || null,
        draft_id: id,
        brand_id: data.brand_id,
        actor: data.created_by || 'Current User',
        actor_role: 'copywriter',
        action: 'APPROVAL_INVALIDATED',
        details: `Draft modified after approval. Previous approval invalidated and reset to draft for revision #${nextRevision}.`,
      });
    } else {
      recordAuditLog({
        user_id: data.user_id || existing.user_id || null,
        organization_id: data.organization_id || existing.organization_id || null,
        draft_id: id,
        brand_id: data.brand_id,
        actor: data.created_by || 'Current User',
        actor_role: 'copywriter',
        action: 'DRAFT_REVISED',
        details: `Saved revision #${nextRevision} of draft "${data.title}"`,
      });
    }
  } else {
    db.prepare(`
      INSERT INTO drafts (id, user_id, organization_id, brand_id, title, content, channel, target_audience, status, current_revision, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id,
      data.user_id || null,
      data.organization_id || null,
      data.brand_id,
      data.title,
      data.content,
      data.channel || 'social_ad',
      data.target_audience || 'General Audience',
      'draft',
      now,
      now
    );

    db.prepare(`
      INSERT INTO draft_revisions (id, user_id, organization_id, draft_id, version, content, created_by, change_summary, created_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, 'Initial draft creation', ?)
    `).run(
      `rev-${id}-v1`,
      data.user_id || null,
      data.organization_id || null,
      id,
      data.content,
      data.created_by || 'Current User',
      now
    );

    recordAuditLog({
      user_id: data.user_id || null,
      organization_id: data.organization_id || null,
      draft_id: id,
      brand_id: data.brand_id,
      actor: data.created_by || 'Current User',
      actor_role: 'copywriter',
      action: 'DRAFT_CREATED',
      details: `Created draft "${data.title}" (Revision #1)`,
    });
  }

  return getDraftById(id, data.user_id, data.organization_id)!;
}

export function deleteDraft(draftId: string, userId?: string | null): boolean {
  const db = getDbInstance();
  const draft = getDraftById(draftId, userId);
  if (!draft) return false;
  if (userId && draft.user_id && draft.user_id !== userId) return false;
  if (draft.id.startsWith('draft-sample-') && !userId) return false;

  recordAuditLog({
    user_id: userId || draft.user_id || null,
    draft_id: draftId,
    brand_id: draft.brand_id,
    actor: userId ? (findUserById(userId)?.name || 'Authorized User') : 'User',
    actor_role: 'copywriter',
    action: 'DRAFT_DELETED',
    details: `Deleted draft "${draft.title}" (Revision #${draft.current_revision}).`,
  });

  db.prepare('DELETE FROM draft_revisions WHERE draft_id = ?').run(draftId);
  db.prepare('DELETE FROM reviews WHERE draft_id = ?').run(draftId);
  const result = db.prepare('DELETE FROM drafts WHERE id = ?').run(draftId);
  return Number(result.changes) > 0;
}

export function saveDraftReview(
  draftId: string,
  revisionNumber: number,
  review: UnifiedReviewResponse,
  reviewerRole: PersonaRole = 'copywriter'
): void {
  const db = getDbInstance();
  const now = new Date().toISOString();
  const id = `revw-${draftId}-r${revisionNumber}-${Date.now()}`;
  const revisionId = `rev-${draftId}-v${revisionNumber}`;

  db.prepare(`
    INSERT INTO reviews (
      id, draft_id, revision_id, reviewer_role, status,
      score_overall, score_terminology, score_claims, score_tone,
      notes, unified_json, reviewed_text, reviewed_revision, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    draftId,
    revisionId,
    reviewerRole,
    review.overall_passed ? 'approved' : 'changes_requested',
    review.overall_score,
    review.deterministic.summary.cleanliness_score,
    Math.max(0, 100 - (review.contextual.claim_summary.insufficient_evidence_claims + review.contextual.claim_summary.conflicting_claims) * 20),
    review.overall_score,
    review.contextual.fallback_reason || (review.overall_passed ? 'Automated compliance check passed' : 'Compliance violations or warnings detected'),
    JSON.stringify(review),
    review.reviewed_text || '',
    revisionNumber,
    now
  );

  recordAuditLog({
    draft_id: draftId,
    brand_id: review.brand_id,
    actor: review.contextual.provider === 'google_gemini' ? 'Google Gemini 2.5 Flash' : 'Deterministic & Offline Engine',
    actor_role: 'reviewer',
    action: 'REVIEW_COMPLETED',
    details: `Executed compliance check for draft (Score: ${review.overall_score}/100, Passed: ${review.overall_passed ? 'Yes' : 'No'}, Violations: ${review.deterministic.summary.violations_count + review.contextual.findings.filter(f => f.severity === 'violation').length}).`,
  });
}

export function getLatestDraftReview(draftId: string): UnifiedReviewResponse | null {
  const db = getDbInstance();
  const row = db.prepare(`
    SELECT unified_json FROM reviews WHERE draft_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(draftId) as { unified_json: string } | undefined;

  if (!row || !row.unified_json) return null;
  try {
    return JSON.parse(row.unified_json) as UnifiedReviewResponse;
  } catch {
    return null;
  }
}

export function recordAuditLog(entry: {
  user_id?: string | null;
  organization_id?: string | null;
  draft_id?: string | null;
  brand_id?: string | null;
  actor: string;
  actor_role: PersonaRole;
  action: string;
  details: string;
}): AuditLog {
  const db = getDbInstance();
  const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, organization_id, draft_id, brand_id, actor, actor_role, action, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.user_id || null,
    entry.organization_id || null,
    entry.draft_id || null,
    entry.brand_id || null,
    entry.actor,
    entry.actor_role,
    entry.action,
    entry.details,
    now
  );

  return {
    id,
    user_id: entry.user_id || null,
    organization_id: entry.organization_id || null,
    draft_id: entry.draft_id || null,
    brand_id: entry.brand_id || null,
    actor: entry.actor,
    actor_role: entry.actor_role,
    action: entry.action,
    details: entry.details,
    created_at: now,
  };
}

export function getAuditLogs(
  draftId?: string,
  brandId?: string,
  userId?: string | null,
  isDemo: boolean = false
): AuditLog[] {
  const db = getDbInstance();
  if (isDemo) {
    if (draftId) {
      return db.prepare('SELECT * FROM audit_logs WHERE draft_id = ? ORDER BY created_at DESC').all(draftId) as unknown as AuditLog[];
    }
    if (brandId) {
      return db.prepare('SELECT * FROM audit_logs WHERE brand_id = ? ORDER BY created_at DESC').all(brandId) as unknown as AuditLog[];
    }
    return db.prepare('SELECT * FROM audit_logs WHERE user_id IS NULL ORDER BY created_at DESC').all() as unknown as AuditLog[];
  }

  if (userId) {
    if (draftId) {
      return db.prepare('SELECT * FROM audit_logs WHERE draft_id = ? AND user_id = ? ORDER BY created_at DESC').all(draftId, userId) as unknown as AuditLog[];
    }
    if (brandId) {
      return db.prepare('SELECT * FROM audit_logs WHERE brand_id = ? AND user_id = ? ORDER BY created_at DESC').all(brandId, userId) as unknown as AuditLog[];
    }
    return db.prepare('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC').all(userId) as unknown as AuditLog[];
  }

  if (userId === null) {
    return [];
  }

  // Legacy tests / direct CLI calls
  if (draftId) {
    return db.prepare('SELECT * FROM audit_logs WHERE draft_id = ? ORDER BY created_at DESC').all(draftId) as unknown as AuditLog[];
  }
  if (brandId) {
    return db.prepare('SELECT * FROM audit_logs WHERE brand_id = ? ORDER BY created_at DESC').all(brandId) as unknown as AuditLog[];
  }
  return db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC').all() as unknown as AuditLog[];
}

export function updateDraftStatusAndDecision(
  draftId: string,
  newStatus: DraftStatus,
  actorName: string,
  actorRole: PersonaRole,
  comment: string,
  userId?: string | null
): Draft {
  const db = getDbInstance();
  const draft = getDraftById(draftId);
  if (!draft) {
    throw new Error(`Draft '${draftId}' not found`);
  }

  // SELF-APPROVAL ENFORCEMENT:
  // A copywriter / author cannot approve their own submitted draft by default
  if (newStatus === 'approved' && userId && draft.user_id && draft.user_id === userId) {
    throw new Error('Copywriters and authors cannot approve their own submitted drafts. A designated Reviewer or Brand Manager must approve this revision.');
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE drafts
    SET status = ?,
        last_decision_notes = ?,
        last_decided_by = ?,
        last_decided_at = ?,
        updated_at = ?
    WHERE id = ?
  `).run(newStatus, comment, actorName, now, now, draftId);

  let actionName = 'STATUS_UPDATED';
  if (newStatus === 'approved') actionName = 'DRAFT_APPROVED';
  else if (newStatus === 'changes_requested') actionName = 'CHANGES_REQUESTED';
  else if (newStatus === 'rejected') actionName = 'DRAFT_REJECTED';
  else if (newStatus === 'under_review') actionName = 'SUBMITTED_FOR_REVIEW';
  else if (newStatus === 'draft') actionName = 'DRAFT_WITHDRAWN';

  recordAuditLog({
    user_id: userId || draft.user_id || null,
    organization_id: draft.organization_id || null,
    draft_id: draftId,
    brand_id: draft.brand_id,
    actor: actorName,
    actor_role: actorRole,
    action: actionName,
    details: comment || `Transitioned draft status to ${newStatus}`,
  });

  // DISPATCH REAL IN-APP NOTIFICATIONS
  try {
    if (newStatus === 'under_review' && draft.organization_id) {
      notifyOrganizationReviewers(draft.organization_id, draft, actorName);
    } else if (newStatus === 'approved' && draft.user_id && draft.user_id !== userId) {
      createNotification({
        userId: draft.user_id,
        organizationId: draft.organization_id || null,
        type: 'DRAFT_APPROVED',
        title: 'Draft Approved',
        message: `Your draft "${draft.title}" (Revision #${draft.current_revision}) was approved by ${actorName}.`,
        link: `/studio?draftId=${draft.id}`,
      });
    } else if (newStatus === 'changes_requested' && draft.user_id && draft.user_id !== userId) {
      createNotification({
        userId: draft.user_id,
        organizationId: draft.organization_id || null,
        type: 'CHANGES_REQUESTED',
        title: 'Changes Requested',
        message: `${actorName} requested changes on "${draft.title}": ${comment}`,
        link: `/studio?draftId=${draft.id}`,
      });
    } else if (newStatus === 'rejected' && draft.user_id && draft.user_id !== userId) {
      createNotification({
        userId: draft.user_id,
        organizationId: draft.organization_id || null,
        type: 'DRAFT_REJECTED',
        title: 'Draft Rejected',
        message: `${actorName} rejected "${draft.title}": ${comment}`,
        link: `/studio?draftId=${draft.id}`,
      });
    }
  } catch (notifErr) {
    console.warn('Failed to dispatch notification:', notifErr);
  }

  return getDraftById(draftId)!;
}

export interface DetailedDraftRevision extends DraftRevision {
  draft_title?: string;
  brand_id?: string;
  brand_name?: string;
  channel?: string;
}

export function getDraftRevisions(
  draftId?: string,
  userId?: string | null,
  isDemo: boolean = false
): DetailedDraftRevision[] {
  const db = getDbInstance();
  if (isDemo) {
    if (draftId) {
      return db.prepare(`
        SELECT r.*, d.title as draft_title, d.brand_id as brand_id, b.name as brand_name, d.channel as channel
        FROM draft_revisions r
        JOIN drafts d ON r.draft_id = d.id
        JOIN brands b ON d.brand_id = b.id
        WHERE r.draft_id = ? AND (d.user_id IS NULL OR d.id LIKE 'draft-sample-%')
        ORDER BY r.created_at DESC
      `).all(draftId) as unknown as DetailedDraftRevision[];
    }

    return db.prepare(`
      SELECT r.*, d.title as draft_title, d.brand_id as brand_id, b.name as brand_name, d.channel as channel
      FROM draft_revisions r
      JOIN drafts d ON r.draft_id = d.id
      JOIN brands b ON d.brand_id = b.id
      WHERE (d.user_id IS NULL OR d.id LIKE 'draft-sample-%')
      ORDER BY r.created_at DESC
    `).all() as unknown as DetailedDraftRevision[];
  }

  if (userId) {
    if (draftId) {
      return db.prepare(`
        SELECT r.*, d.title as draft_title, d.brand_id as brand_id, b.name as brand_name, d.channel as channel
        FROM draft_revisions r
        JOIN drafts d ON r.draft_id = d.id
        JOIN brands b ON d.brand_id = b.id
        WHERE r.draft_id = ? AND (d.user_id = ? OR r.user_id = ?)
        ORDER BY r.created_at DESC
      `).all(draftId, userId, userId) as unknown as DetailedDraftRevision[];
    }

    return db.prepare(`
      SELECT r.*, d.title as draft_title, d.brand_id as brand_id, b.name as brand_name, d.channel as channel
      FROM draft_revisions r
      JOIN drafts d ON r.draft_id = d.id
      JOIN brands b ON d.brand_id = b.id
      WHERE (d.user_id = ? OR r.user_id = ?)
      ORDER BY r.created_at DESC
    `).all(userId, userId) as unknown as DetailedDraftRevision[];
  }

  if (userId === null) {
    return [];
  }

  // Legacy tests / direct CLI calls
  if (draftId) {
    return db.prepare(`
      SELECT r.*, d.title as draft_title, d.brand_id as brand_id, b.name as brand_name, d.channel as channel
      FROM draft_revisions r
      JOIN drafts d ON r.draft_id = d.id
      JOIN brands b ON d.brand_id = b.id
      WHERE r.draft_id = ?
      ORDER BY r.created_at DESC
    `).all(draftId) as unknown as DetailedDraftRevision[];
  }

  return db.prepare(`
    SELECT r.*, d.title as draft_title, d.brand_id as brand_id, b.name as brand_name, d.channel as channel
    FROM draft_revisions r
    JOIN drafts d ON r.draft_id = d.id
    JOIN brands b ON d.brand_id = b.id
    ORDER BY r.created_at DESC
  `).all() as unknown as DetailedDraftRevision[];
}

export function getAppStats(userId?: string | null, isDemo: boolean = false): {
  brands_count: number;
  rules_count: number;
  drafts_count: number;
  revisions_count: number;
  approved_drafts_count: number;
  pending_reviews_count: number;
} {
  const db = getDbInstance();

  if (isDemo) {
    const brandsRow = db.prepare('SELECT COUNT(*) as count FROM brands WHERE is_sample = 1 AND (is_archived IS NULL OR is_archived = 0)').get() as { count: number };
    const rulesRow = db.prepare('SELECT COUNT(*) as count FROM brand_rules WHERE brand_id IN (SELECT id FROM brands WHERE is_sample = 1)').get() as { count: number };
    const draftsRow = db.prepare("SELECT COUNT(*) as count FROM drafts WHERE user_id IS NULL OR id LIKE 'draft-sample-%'").get() as { count: number };
    const revisionsRow = db.prepare("SELECT COUNT(*) as count FROM draft_revisions WHERE user_id IS NULL OR id LIKE 'rev-sample-%'").get() as { count: number };
    const approvedRow = db.prepare("SELECT COUNT(*) as count FROM drafts WHERE (user_id IS NULL OR id LIKE 'draft-sample-%') AND status = 'approved'").get() as { count: number };
    const pendingRow = db.prepare("SELECT COUNT(*) as count FROM drafts WHERE (user_id IS NULL OR id LIKE 'draft-sample-%') AND status = 'under_review'").get() as { count: number };

    return {
      brands_count: brandsRow?.count || 0,
      rules_count: rulesRow?.count || 0,
      drafts_count: draftsRow?.count || 0,
      revisions_count: revisionsRow?.count || 0,
      approved_drafts_count: approvedRow?.count || 0,
      pending_reviews_count: pendingRow?.count || 0,
    };
  }

  if (!userId) {
    return {
      brands_count: 0,
      rules_count: 0,
      drafts_count: 0,
      revisions_count: 0,
      approved_drafts_count: 0,
      pending_reviews_count: 0,
    };
  }

  const brandsRow = db.prepare('SELECT COUNT(*) as count FROM brands WHERE user_id = ? AND (is_archived IS NULL OR is_archived = 0)').get(userId) as { count: number };
  const rulesRow = db.prepare('SELECT COUNT(*) as count FROM brand_rules WHERE brand_id IN (SELECT id FROM brands WHERE user_id = ?)').get(userId) as { count: number };
  const draftsRow = db.prepare('SELECT COUNT(*) as count FROM drafts WHERE user_id = ?').get(userId) as { count: number };
  const revisionsRow = db.prepare('SELECT COUNT(*) as count FROM draft_revisions WHERE user_id = ?').get(userId) as { count: number };
  const approvedRow = db.prepare("SELECT COUNT(*) as count FROM drafts WHERE user_id = ? AND status = 'approved'").get(userId) as { count: number };
  const pendingRow = db.prepare("SELECT COUNT(*) as count FROM drafts WHERE user_id = ? AND status = 'under_review'").get(userId) as { count: number };

  return {
    brands_count: brandsRow?.count || 0,
    rules_count: rulesRow?.count || 0,
    drafts_count: draftsRow?.count || 0,
    revisions_count: revisionsRow?.count || 0,
    approved_drafts_count: approvedRow?.count || 0,
    pending_reviews_count: pendingRow?.count || 0,
  };
}

// -------------------------------------------------------------
// Organization & Multi-Client Agency Collaboration Functions
// -------------------------------------------------------------

export function createOrganization(
  name: string,
  ownerId: string,
  type: 'marketing_team' | 'agency' | 'enterprise' = 'agency'
): Organization {
  const db = getDbInstance();
  const id = `org-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO organizations (id, name, type, owner_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), type, ownerId, now, now);

  // Add creator as owner member
  db.prepare(`
    INSERT INTO organization_members (id, organization_id, user_id, role, joined_at)
    VALUES (?, ?, ?, 'owner', ?)
  `).run(`mem-${id}-${ownerId}`, id, ownerId, now);

  recordAuditLog({
    user_id: ownerId,
    organization_id: id,
    actor: findUserById(ownerId)?.name || 'Owner',
    actor_role: 'admin',
    action: 'ORGANIZATION_CREATED',
    details: `Created new organization workspace "${name.trim()}" (${type}).`,
  });

  return { id, name: name.trim(), type, owner_id: ownerId, created_at: now, updated_at: now };
}

export function getOrganizationsForUser(userId: string): Array<Organization & { role: OrgRole }> {
  const db = getDbInstance();
  const rows = db.prepare(`
    SELECT o.*, m.role
    FROM organizations o
    JOIN organization_members m ON o.id = m.organization_id
    WHERE m.user_id = ?
    ORDER BY o.name ASC
  `).all(userId) as unknown as Array<Organization & { role: OrgRole }>;
  return rows;
}

export function getOrganizationById(id: string): Organization | null {
  const db = getDbInstance();
  const row = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id) as Organization | undefined;
  return row || null;
}

export function addOrganizationMember(orgId: string, userId: string, role: OrgRole): OrganizationMember {
  const db = getDbInstance();
  const now = new Date().toISOString();
  const id = `mem-${orgId}-${userId}`;

  db.prepare(`
    INSERT INTO organization_members (id, organization_id, user_id, role, joined_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(organization_id, user_id) DO UPDATE SET role = excluded.role
  `).run(id, orgId, userId, role, now);

  const user = findUserById(userId);
  return {
    id,
    organization_id: orgId,
    user_id: userId,
    role,
    joined_at: now,
    user_name: user?.name,
    user_email: user?.email,
  };
}

export function getOrganizationMembers(orgId: string): OrganizationMember[] {
  const db = getDbInstance();
  const rows = db.prepare(`
    SELECT m.*, u.name as user_name, u.email as user_email
    FROM organization_members m
    JOIN users u ON m.user_id = u.id
    WHERE m.organization_id = ?
    ORDER BY m.joined_at ASC
  `).all(orgId) as unknown as OrganizationMember[];
  return rows;
}

export function getUserRoleInOrganization(orgId: string, userId: string): OrgRole | null {
  const db = getDbInstance();
  const row = db.prepare('SELECT role FROM organization_members WHERE organization_id = ? AND user_id = ?').get(orgId, userId) as { role: OrgRole } | undefined;
  return row?.role || null;
}

export function createOrganizationInvite(orgId: string, email: string, role: OrgRole, createdBy: string): OrganizationInvite {
  const db = getDbInstance();
  const id = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const inviteCode = `invite-${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO organization_invites (id, organization_id, email, role, invite_code, created_by, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, orgId, email.toLowerCase().trim(), role, inviteCode, createdBy, now, expiresAt);

  return { id, organization_id: orgId, email: email.toLowerCase().trim(), role, invite_code: inviteCode, created_by: createdBy, created_at: now, expires_at: expiresAt };
}

export function acceptOrganizationInvite(inviteCode: string, userId: string): { success: boolean; organization?: Organization; error?: string } {
  const db = getDbInstance();
  const now = new Date().toISOString();
  const invite = db.prepare('SELECT * FROM organization_invites WHERE invite_code = ? AND expires_at > ?').get(inviteCode, now) as OrganizationInvite | undefined;

  if (!invite) {
    return { success: false, error: 'Invalid or expired organization invitation code.' };
  }

  const org = getOrganizationById(invite.organization_id);
  if (!org) {
    return { success: false, error: 'Organization not found.' };
  }

  addOrganizationMember(invite.organization_id, userId, invite.role);
  db.prepare('DELETE FROM organization_invites WHERE id = ?').run(invite.id);

  createNotification({
    userId,
    organizationId: invite.organization_id,
    type: 'TEAM_INVITE',
    title: `Joined ${org.name}`,
    message: `You successfully joined the workspace for "${org.name}" as a ${invite.role}.`,
    link: '/studio',
  });

  return { success: true, organization: org };
}

export function getOrganizationInvites(orgId: string): OrganizationInvite[] {
  const db = getDbInstance();
  const now = new Date().toISOString();
  const rows = db.prepare('SELECT * FROM organization_invites WHERE organization_id = ? AND expires_at > ? ORDER BY created_at DESC').all(orgId, now) as unknown as OrganizationInvite[];
  return rows;
}

// -------------------------------------------------------------
// Real In-App Notification Functions
// -------------------------------------------------------------

export function createNotification(data: {
  userId: string;
  organizationId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}): InAppNotification {
  const db = getDbInstance();
  const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO notifications (id, user_id, organization_id, type, title, message, link, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, data.userId, data.organizationId || null, data.type, data.title, data.message, data.link || null, now);

  return {
    id,
    user_id: data.userId,
    organization_id: data.organizationId || null,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link || null,
    is_read: false,
    created_at: now,
  };
}

export function getNotificationsForUser(userId: string, limit: number = 30): { notifications: InAppNotification[]; unread_count: number } {
  const db = getDbInstance();
  const rows = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, limit) as unknown as InAppNotification[];

  const countRow = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(userId) as { count: number };

  return {
    notifications: rows.map(r => ({ ...r, is_read: Boolean(r.is_read) })),
    unread_count: countRow?.count || 0,
  };
}

export function markNotificationRead(id: string, userId: string): boolean {
  const db = getDbInstance();
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
  return Number(result.changes) > 0;
}

export function markAllNotificationsRead(userId: string): boolean {
  const db = getDbInstance();
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  return Number(result.changes) > 0;
}

export function notifyOrganizationReviewers(orgId: string, draft: Draft, submitterName: string): void {
  const db = getDbInstance();
  const reviewers = db.prepare(`
    SELECT user_id FROM organization_members
    WHERE organization_id = ? AND role IN ('owner', 'manager', 'reviewer')
  `).all(orgId) as Array<{ user_id: string }>;

  for (const r of reviewers) {
    if (r.user_id !== draft.user_id) {
      createNotification({
        userId: r.user_id,
        organizationId: orgId,
        type: 'SUBMISSION_PENDING',
        title: 'Draft Submitted for Review',
        message: `${submitterName} submitted "${draft.title}" (Revision #${draft.current_revision}) for brand review.`,
        link: `/queue?draftId=${draft.id}`,
      });
    }
  }
}

// -------------------------------------------------------------
// Review Queue Function for Brand Managers & Reviewers
// -------------------------------------------------------------

export function getReviewQueue(
  userId?: string | null,
  organizationId?: string | null,
  isDemo: boolean = false
): Array<Draft & { brand_name: string; submitter_name: string; latest_score?: number }> {
  const db = getDbInstance();

  if (isDemo) {
    const rows = db.prepare(`
      SELECT d.*, b.name as brand_name, COALESCE((SELECT created_by FROM draft_revisions WHERE draft_id = d.id ORDER BY version DESC LIMIT 1), 'Demo User') as submitter_name
      FROM drafts d
      LEFT JOIN brands b ON d.brand_id = b.id
      WHERE d.status = 'under_review' AND (d.user_id IS NULL OR d.id LIKE 'draft-sample-%')
      ORDER BY d.updated_at DESC
    `).all() as unknown as Array<Draft & { brand_name: string; submitter_name: string }>;

    return rows.map(r => ({
      ...r,
      latest_score: getLatestDraftReview(r.id)?.overall_score,
    }));
  }

  if (!userId) return [];

  let rows: Array<Draft & { brand_name: string; submitter_name: string }>;

  if (organizationId) {
    // Review queue for the organization/agency
    rows = db.prepare(`
      SELECT d.*, b.name as brand_name, COALESCE(u.name, (SELECT created_by FROM draft_revisions WHERE draft_id = d.id ORDER BY version DESC LIMIT 1), 'Content Creator') as submitter_name
      FROM drafts d
      LEFT JOIN brands b ON d.brand_id = b.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.status = 'under_review' AND d.organization_id = ?
      ORDER BY d.updated_at DESC
    `).all(organizationId) as unknown as Array<Draft & { brand_name: string; submitter_name: string }>;
  } else {
    // Personal workspace: show any drafts user submitted
    rows = db.prepare(`
      SELECT d.*, b.name as brand_name, COALESCE((SELECT created_by FROM draft_revisions WHERE draft_id = d.id ORDER BY version DESC LIMIT 1), 'Author') as submitter_name
      FROM drafts d
      LEFT JOIN brands b ON d.brand_id = b.id
      WHERE d.status = 'under_review' AND d.user_id = ?
      ORDER BY d.updated_at DESC
    `).all(userId) as unknown as Array<Draft & { brand_name: string; submitter_name: string }>;
  }

  return rows.map(r => ({
    ...r,
    latest_score: getLatestDraftReview(r.id)?.overall_score,
  }));
}

