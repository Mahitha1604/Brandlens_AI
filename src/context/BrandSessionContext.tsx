"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import type {
  BrandWithRules,
  Draft,
  DraftChannel,
  UnifiedReviewResponse,
  UserPersona,
  User,
  PersonaRole,
} from '@/lib/types';
import { applyCorrectionToText, shiftFindingOffsets } from '@/lib/engine/corrections';

export const PERSONAS: UserPersona[] = [
  {
    id: 'persona-copywriter',
    name: 'Sarah Chen',
    role: 'copywriter',
    title: 'Senior Copywriter',
    avatar: 'SC',
  },
  {
    id: 'persona-reviewer',
    name: 'Marcus Vance',
    role: 'reviewer',
    title: 'Brand Compliance Lead',
    avatar: 'MV',
  },
  {
    id: 'persona-admin',
    name: 'Elena Rostova',
    role: 'admin',
    title: 'VP Brand & Governance',
    avatar: 'ER',
  },
];

interface ApplyCorrectionResult {
  success: boolean;
  message: string;
}

interface BrandSessionContextType {
  // Authentication & Session
  currentUser: User | null;
  isDemoMode: boolean;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name: string,
    role?: PersonaRole
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;

  // Onboarding
  showOnboardingTour: boolean;
  setShowOnboardingTour: (show: boolean) => void;
  completeOnboarding: () => Promise<void>;

  // Brands
  brands: BrandWithRules[];
  archivedBrands: BrandWithRules[];
  selectedBrandId: string;
  activeBrand: BrandWithRules | null;
  setSelectedBrandId: (id: string) => void;
  refreshBrands: () => Promise<void>;
  loadArchivedBrands: () => Promise<void>;
  isLoadingBrands: boolean;
  archiveBrandProfile: (id: string) => Promise<{ success: boolean; message: string; error?: string }>;
  restoreBrandProfile: (id: string) => Promise<{ success: boolean; message: string; error?: string }>;
  deleteBrandProfile: (id: string, permanentConfirm?: boolean) => Promise<{ success: boolean; message: string; error?: string }>;

  // Persona / Role
  currentPersona: UserPersona;
  setCurrentPersona: (p: UserPersona) => void;

  // Multi-Draft State & Management
  brandDrafts: Draft[];
  activeDraftId: string | null;
  isLoadingDrafts: boolean;
  lastSavedAt: string | null;
  isReviewStale: boolean;
  loadBrandDrafts: (brandId?: string) => Promise<void>;
  selectDraft: (draft: Draft) => Promise<void>;
  createNewDraft: (preset?: { title?: string; channel?: DraftChannel; audience?: string }) => void;
  saveCurrentDraft: () => Promise<{ success: boolean; message: string; draft?: Draft; error?: string }>;
  deleteCurrentDraft: (draftId: string) => Promise<{ success: boolean; message: string; error?: string }>;

  // Draft Input State
  draftTitle: string;
  setDraftTitle: (t: string) => void;
  draftChannel: DraftChannel;
  setDraftChannel: (c: DraftChannel) => void;
  targetAudience: string;
  setTargetAudience: (a: string) => void;
  draftContent: string;
  setDraftContent: (c: string) => void;
  reviewInstructions: string;
  setReviewInstructions: (i: string) => void;
  submittedDraft: Draft | null;
  setSubmittedDraft: (d: Draft | null) => void;

  // Review State
  reviewResponse: UnifiedReviewResponse | null;
  setReviewResponse: (r: UnifiedReviewResponse | null) => void;
  isReviewing: boolean;
  appliedFindingIds: string[];
  lastCorrectionMessage: string | null;
  applyCorrection: (
    findingId: string,
    flaggedText: string,
    suggestedReplacement: string,
    startIndex: number,
    endIndex: number
  ) => ApplyCorrectionResult;
  applyAllGrammarCorrections: () => { count: number; message: string };
  executeReview: () => Promise<boolean>;
  submitDraftForReview: () => Promise<{ success: boolean; message: string; error?: string }>;
  decideDraft: (
    decision: 'approve' | 'request_changes' | 'reject',
    comment: string
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  createBrandProfile: (data: {
    name: string;
    industry: string;
    description: string;
    tone_guidelines?: string;
    disclaimers?: string;
  }) => Promise<{ success: boolean; message: string; brand?: BrandWithRules; error?: string }>;
  loadSampleDraft: (sample: {
    title: string;
    channel: DraftChannel;
    audience: string;
    content: string;
  }) => void;
}

const BrandSessionContext = createContext<BrandSessionContextType | null>(null);

const STORAGE_KEYS = {
  CONTENT: 'brandlens_draft_content',
  TITLE: 'brandlens_draft_title',
  BRAND_ID: 'brandlens_selected_brand_id',
  INSTRUCTIONS: 'brandlens_review_instructions',
  DEMO_MODE: 'brandlens_is_demo_mode',
};

function getInitialStorage(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function BrandSessionProvider({ children }: { children: React.ReactNode }) {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return getInitialStorage(STORAGE_KEYS.DEMO_MODE, 'false') === 'true';
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);

  // Brands state
  const [brands, setBrands] = useState<BrandWithRules[]>([]);
  const [archivedBrands, setArchivedBrands] = useState<BrandWithRules[]>([]);
  const [selectedBrandId, setSelectedBrandIdState] = useState<string>(() =>
    getInitialStorage(STORAGE_KEYS.BRAND_ID, '')
  );
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  // Persona
  const [customPersona, setCustomPersona] = useState<UserPersona | null>(null);

  // Multi-Draft Management State
  const [brandDrafts, setBrandDrafts] = useState<Draft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [reviewedContent, setReviewedContent] = useState<string | null>(null);

  // Draft inputs
  const [draftTitle, setDraftTitleState] = useState<string>('');
  const [draftChannel, setDraftChannel] = useState<DraftChannel>('landing_page');
  const [targetAudience, setTargetAudience] = useState('');
  const [draftContent, setDraftContentState] = useState<string>('');
  const [reviewInstructions, setReviewInstructionsState] = useState<string>('');

  // Results
  const [submittedDraft, setSubmittedDraft] = useState<Draft | null>(null);
  const [reviewResponse, setReviewResponse] = useState<UnifiedReviewResponse | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [appliedFindingIds, setAppliedFindingIds] = useState<string[]>([]);
  const [lastCorrectionMessage, setLastCorrectionMessage] = useState<string | null>(null);

  // Compute whether displayed review is stale compared to current editor content
  const isReviewStale = useMemo(() => {
    if (!reviewResponse || !reviewedContent || !draftContent.trim()) return false;
    return reviewResponse.reviewed_text !== draftContent;
  }, [reviewResponse, reviewedContent, draftContent]);

  // Compute active persona
  const currentPersona: UserPersona = useMemo(() => {
    if (customPersona) return customPersona;
    if (currentUser) {
      const initials = currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U';
      const title =
        currentUser.role === 'admin'
          ? 'Administrator'
          : currentUser.role === 'reviewer'
          ? 'Brand Compliance Reviewer'
          : 'Copywriter';
      return {
        id: `user-${currentUser.id}`,
        name: currentUser.name,
        role: currentUser.role,
        title,
        avatar: initials,
      };
    }
    if (isDemoMode) {
      return PERSONAS[1]; // Marcus Vance (Reviewer) for demo preview
    }
    return PERSONAS[0];
  }, [customPersona, currentUser, isDemoMode]);

  const setCurrentPersona = useCallback((p: UserPersona) => {
    setCustomPersona(p);
  }, []);

  const setDraftContent = useCallback((text: string) => {
    setDraftContentState(text);
    if (!text.trim()) {
      setReviewResponse(null);
      setReviewedContent(null);
      setAppliedFindingIds([]);
    }
  }, []);

  const setDraftTitle = useCallback((title: string) => {
    setDraftTitleState(title);
  }, []);

  const loadBrandDrafts = useCallback(
    async (brandId?: string) => {
      const targetBrandId = brandId || selectedBrandId;
      if (!targetBrandId) {
        setBrandDrafts([]);
        return;
      }
      setIsLoadingDrafts(true);
      try {
        const url = isDemoMode
          ? `/api/drafts?brand_id=${encodeURIComponent(targetBrandId)}&demo=true`
          : `/api/drafts?brand_id=${encodeURIComponent(targetBrandId)}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setBrandDrafts(json.data);
          } else {
            setBrandDrafts([]);
          }
        }
      } catch (err) {
        console.error('Error loading brand drafts:', err);
        setBrandDrafts([]);
      } finally {
        setIsLoadingDrafts(false);
      }
    },
    [selectedBrandId, isDemoMode]
  );

  const setSelectedBrandId = useCallback((id: string) => {
    setSelectedBrandIdState(id);
    setActiveDraftId(null);
    setDraftTitleState('');
    setDraftContentState('');
    setSubmittedDraft(null);
    setReviewResponse(null);
    setReviewedContent(null);
    setAppliedFindingIds([]);
    setLastCorrectionMessage(null);
    setLastSavedAt(null);
    try {
      localStorage.setItem(STORAGE_KEYS.BRAND_ID, id);
    } catch {
      // Ignore
    }
    if (id) {
      loadBrandDrafts(id);
    } else {
      setBrandDrafts([]);
    }
  }, [loadBrandDrafts]);

  const loadArchivedBrands = useCallback(async () => {
    try {
      const url = isDemoMode ? '/api/brands?archived=true&demo=true' : '/api/brands?archived=true';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setArchivedBrands(json.data);
        }
      }
    } catch (err) {
      console.error('Error loading archived brands:', err);
    }
  }, [isDemoMode]);

  const setReviewInstructions = useCallback((inst: string) => {
    setReviewInstructionsState(inst);
  }, []);

  // Fetch brands according to auth or demo mode
  const refreshBrands = useCallback(async () => {
    setIsLoadingBrands(true);
    try {
      const url = isDemoMode ? '/api/brands?demo=true' : '/api/brands';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setBrands(json.data);
          setSelectedBrandIdState((prev) => {
            if (json.data.some((b: BrandWithRules) => b.id === prev)) {
              return prev;
            }
            return json.data.length > 0 ? json.data[0].id : '';
          });
        }
      } else {
        setBrands([]);
        setSelectedBrandIdState('');
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
      setBrands([]);
      setSelectedBrandIdState('');
    } finally {
      setIsLoadingBrands(false);
    }
  }, [isDemoMode]);

  // Initial Auth Check: verify existing session cookie
  useEffect(() => {
    let isMounted = true;
    async function checkAuthSession() {
      setIsAuthLoading(true);
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.success && json.data) {
            setCurrentUser(json.data);
            setIsDemoMode(false);
            try {
              localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
            } catch {
              // Ignore
            }
            if (!json.data.onboarding_completed) {
              setShowOnboardingTour(true);
            }
          }
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        if (isMounted) setIsAuthLoading(false);
      }
    }

    checkAuthSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // When auth session or demo mode resolves, load the corresponding brands
  useEffect(() => {
    let isMounted = true;
    if (isAuthLoading) return;

    if (!currentUser && !isDemoMode) {
      return;
    }

    async function loadInitialBrands() {
      setIsLoadingBrands(true);
      try {
        const url = isDemoMode ? '/api/brands?demo=true' : '/api/brands';
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setBrands(json.data);
            setSelectedBrandIdState((prev) => {
              if (json.data.some((b: BrandWithRules) => b.id === prev)) {
                return prev;
              }
              return json.data.length > 0 ? json.data[0].id : '';
            });
          }
        } else if (isMounted) {
          setBrands([]);
          setSelectedBrandIdState('');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching brands:', err);
          setBrands([]);
          setSelectedBrandIdState('');
        }
      } finally {
        if (isMounted) setIsLoadingBrands(false);
      }
    }

    loadInitialBrands();
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isDemoMode, currentUser]);

  // Active brand selector
  const activeBrand = useMemo(() => {
    if (brands.length === 0) return null;
    return brands.find((b) => b.id === selectedBrandId) || brands[0] || null;
  }, [brands, selectedBrandId]);

  // Load drafts whenever the active brand changes
  useEffect(() => {
    let isMounted = true;
    if (!activeBrand?.id) {
      return;
    }
    const currentBrandId: string = activeBrand.id;

    async function fetchBrandDrafts() {
      try {
        const url = isDemoMode
          ? `/api/drafts?brand_id=${encodeURIComponent(currentBrandId)}&demo=true`
          : `/api/drafts?brand_id=${encodeURIComponent(currentBrandId)}`;
        const res = await fetch(url);
        if (res.ok && isMounted) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && isMounted) {
            setBrandDrafts(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching brand drafts:', err);
      }
    }

    fetchBrandDrafts();
    return () => {
      isMounted = false;
    };
  }, [activeBrand?.id, isDemoMode]);

  // Auth actions
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setCurrentUser(json.data);
          setIsDemoMode(false);
          try {
            localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
          } catch {
            // Ignore
          }
          if (!json.data.onboarding_completed) {
            setShowOnboardingTour(true);
          }
          return { success: true };
        }
        return { success: false, error: json.error || 'Invalid credentials' };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
    []
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      role?: PersonaRole
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, role }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setCurrentUser(json.data);
          setIsDemoMode(false);
          try {
            localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
          } catch {
            // Ignore
          }
          setShowOnboardingTour(true);
          return { success: true };
        }
        return { success: false, error: json.error || 'Registration failed' };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setCurrentUser(null);
    setIsDemoMode(false);
    setBrands([]);
    setArchivedBrands([]);
    setBrandDrafts([]);
    setActiveDraftId(null);
    setSelectedBrandIdState('');
    setSubmittedDraft(null);
    setReviewResponse(null);
    setReviewedContent(null);
    setLastSavedAt(null);
    setCustomPersona(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
      localStorage.removeItem(STORAGE_KEYS.CONTENT);
      localStorage.removeItem(STORAGE_KEYS.TITLE);
      localStorage.removeItem(STORAGE_KEYS.BRAND_ID);
    } catch {
      // Ignore
    }
  }, []);

  const enterDemoMode = useCallback(() => {
    setCurrentUser(null);
    setIsDemoMode(true);
    try {
      localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'true');
    } catch {
      // Ignore
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
    } catch {
      // Ignore
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    setShowOnboardingTour(false);
    if (currentUser) {
      try {
        await fetch('/api/auth/onboarding', { method: 'POST' });
        setCurrentUser((prev) => (prev ? { ...prev, onboarding_completed: true } : null));
      } catch {
        // Ignore
      }
    }
  }, [currentUser]);

  // Brand CRUD: Archive Brand Profile
  const archiveBrandProfile = useCallback(
    async (id: string): Promise<{ success: boolean; message: string; error?: string }> => {
      try {
        const res = await fetch(`/api/brands/${encodeURIComponent(id)}/archive`, {
          method: 'POST',
        });
        const json = await res.json();
        if (res.ok && json.success) {
          await refreshBrands();
          await loadArchivedBrands();
          return { success: true, message: json.message || 'Brand successfully archived.' };
        }
        return { success: false, message: json.error || 'Failed to archive brand.', error: json.error };
      } catch (err) {
        return { success: false, message: 'Network error archiving brand.', error: String(err) };
      }
    },
    [refreshBrands, loadArchivedBrands]
  );

  // Brand CRUD: Restore Brand Profile
  const restoreBrandProfile = useCallback(
    async (id: string): Promise<{ success: boolean; message: string; error?: string }> => {
      try {
        const res = await fetch(`/api/brands/${encodeURIComponent(id)}/restore`, {
          method: 'POST',
        });
        const json = await res.json();
        if (res.ok && json.success) {
          await refreshBrands();
          await loadArchivedBrands();
          setSelectedBrandIdState(id);
          return { success: true, message: json.message || 'Brand successfully restored.' };
        }
        return { success: false, message: json.error || 'Failed to restore brand.', error: json.error };
      } catch (err) {
        return { success: false, message: 'Network error restoring brand.', error: String(err) };
      }
    },
    [refreshBrands, loadArchivedBrands]
  );

  // Brand CRUD: Delete Brand Permanently
  const deleteBrandProfile = useCallback(
    async (id: string): Promise<{ success: boolean; message: string; error?: string }> => {
      try {
        const res = await fetch(`/api/brands/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (res.ok && json.success) {
          await refreshBrands();
          await loadArchivedBrands();
          return { success: true, message: json.message || 'Brand deleted successfully.' };
        }
        return { success: false, message: json.error || 'Failed to delete brand.', error: json.error };
      } catch (err) {
        return { success: false, message: 'Network error deleting brand.', error: String(err) };
      }
    },
    [refreshBrands, loadArchivedBrands]
  );

  // Multi-Draft Actions
  const selectDraft = useCallback(
    async (draft: Draft) => {
      setActiveDraftId(draft.id);
      setDraftTitleState(draft.title);
      setDraftChannel(draft.channel as DraftChannel);
      setTargetAudience(draft.target_audience);
      setDraftContentState(draft.content);
      setSubmittedDraft(draft);
      setAppliedFindingIds([]);
      setLastCorrectionMessage(null);
      setLastSavedAt(draft.updated_at);

      // Fetch latest review for this draft if available
      try {
        const url = isDemoMode
          ? `/api/drafts/${encodeURIComponent(draft.id)}?demo=true`
          : `/api/drafts/${encodeURIComponent(draft.id)}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.latest_review) {
            setReviewResponse(json.data.latest_review);
            setReviewedContent(json.data.latest_review.reviewed_text || draft.content);
          } else {
            setReviewResponse(null);
            setReviewedContent(null);
          }
        }
      } catch (err) {
        console.error('Error fetching draft review:', err);
      }
    },
    [isDemoMode]
  );

  const createNewDraft = useCallback(
    (preset?: { title?: string; channel?: DraftChannel; audience?: string }) => {
      setActiveDraftId(null);
      setDraftTitleState(preset?.title || '');
      setDraftChannel(preset?.channel || 'landing_page');
      setTargetAudience(preset?.audience || '');
      setDraftContentState('');
      setSubmittedDraft(null);
      setReviewResponse(null);
      setReviewedContent(null);
      setAppliedFindingIds([]);
      setLastCorrectionMessage(null);
      setLastSavedAt(null);
      try {
        localStorage.removeItem(STORAGE_KEYS.CONTENT);
        localStorage.removeItem(STORAGE_KEYS.TITLE);
      } catch {
        // Ignore
      }
    },
    []
  );

  const saveCurrentDraft = useCallback(async (): Promise<{
    success: boolean;
    message: string;
    draft?: Draft;
    error?: string;
  }> => {
    if (!activeBrand) {
      return { success: false, message: 'Select a brand first', error: 'No active brand' };
    }
    if (!draftContent.trim()) {
      return { success: false, message: 'Content cannot be empty', error: 'Empty content' };
    }

    try {
      const url = isDemoMode ? '/api/drafts?demo=true' : '/api/drafts';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeDraftId || undefined,
          brand_id: activeBrand.id,
          title: draftTitle.trim() || 'Untitled Draft',
          content: draftContent,
          channel: draftChannel,
          target_audience: targetAudience.trim() || 'General Audience',
          created_by: currentUser ? currentUser.name : `${currentPersona.name} (${currentPersona.title})`,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const saved = json.data as Draft;
        setActiveDraftId(saved.id);
        setSubmittedDraft(saved);
        setLastSavedAt(saved.updated_at);
        await loadBrandDrafts(activeBrand.id);
        return {
          success: true,
          message: `Draft "${saved.title}" (Revision #${saved.current_revision}) saved.`,
          draft: saved,
        };
      }
      return {
        success: false,
        message: json.error || 'Failed to save draft.',
        error: json.error,
      };
    } catch (err) {
      return { success: false, message: 'Network error saving draft.', error: String(err) };
    }
  }, [
    activeBrand,
    draftContent,
    isDemoMode,
    activeDraftId,
    draftTitle,
    draftChannel,
    targetAudience,
    currentUser,
    currentPersona,
    loadBrandDrafts,
  ]);

  const deleteCurrentDraft = useCallback(
    async (draftId: string): Promise<{ success: boolean; message: string; error?: string }> => {
      try {
        const res = await fetch(`/api/drafts/${encodeURIComponent(draftId)}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (res.ok && json.success) {
          if (activeDraftId === draftId) {
            createNewDraft();
          }
          if (activeBrand) {
            await loadBrandDrafts(activeBrand.id);
          }
          return { success: true, message: json.message || 'Draft deleted successfully.' };
        }
        return { success: false, message: json.error || 'Failed to delete draft.', error: json.error };
      } catch (err) {
        return { success: false, message: 'Network error deleting draft.', error: String(err) };
      }
    },
    [activeDraftId, activeBrand, createNewDraft, loadBrandDrafts]
  );

  const loadSampleDraft = useCallback(
    (sample: {
      title: string;
      channel: DraftChannel;
      audience: string;
      content: string;
    }) => {
      setActiveDraftId(null);
      setDraftTitleState(sample.title);
      setDraftChannel(sample.channel);
      setTargetAudience(sample.audience);
      setDraftContentState(sample.content);
      setSubmittedDraft(null);
      setReviewResponse(null);
      setReviewedContent(null);
      setAppliedFindingIds([]);
      setLastCorrectionMessage(null);
      setLastSavedAt(null);
      try {
        localStorage.removeItem(STORAGE_KEYS.CONTENT);
        localStorage.removeItem(STORAGE_KEYS.TITLE);
      } catch {
        // Ignore
      }
    },
    []
  );

  // 1-Click Correction Engine
  const applyCorrection = useCallback(
    (
      findingId: string,
      flaggedText: string,
      suggestedReplacement: string,
      startIndex: number,
      endIndex: number
    ): ApplyCorrectionResult => {
      if (!draftContent) {
        return { success: false, message: 'Draft text is empty' };
      }

      const result = applyCorrectionToText(draftContent, {
        id: findingId,
        flagged_text: flaggedText,
        suggested_replacement: suggestedReplacement,
        start_index: startIndex,
        end_index: endIndex,
      });

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Failed to locate target text in current draft',
        };
      }

      setDraftContent(result.updatedText);
      setAppliedFindingIds((prev) => (prev.includes(findingId) ? prev : [...prev, findingId]));

      if (reviewResponse) {
        const updatedDeterministic = shiftFindingOffsets(
          reviewResponse.deterministic.findings,
          findingId,
          result.actualEndIndex,
          result.deltaLength
        );
        const updatedContextual = shiftFindingOffsets(
          reviewResponse.contextual.findings,
          findingId,
          result.actualEndIndex,
          result.deltaLength
        );

        setReviewResponse({
          ...reviewResponse,
          deterministic: {
            ...reviewResponse.deterministic,
            findings: updatedDeterministic,
          },
          contextual: {
            ...reviewResponse.contextual,
            findings: updatedContextual,
          },
        });
      }

      const feedback = `Replaced "${flaggedText}" with "${suggestedReplacement}". Recalculated remaining offsets.`;
      setLastCorrectionMessage(feedback);
      return { success: true, message: feedback };
    },
    [draftContent, reviewResponse, setDraftContent]
  );

  // 1-Click Batch Fix for All Grammar and Spelling Errors
  const applyAllGrammarCorrections = useCallback((): { count: number; message: string } => {
    if (!draftContent || !reviewResponse) {
      return { count: 0, message: 'No content or review findings available.' };
    }

    const grammarFindings = reviewResponse.deterministic.findings.filter(
      (f) =>
        (f.rule_key.includes('GRAMMAR') ||
          f.rule_key.includes('SPELLING') ||
          f.rule_key.includes('MECHANICS') ||
          f.rule_key.includes('DUPLICATE') ||
          f.rule_key.includes('CASING')) &&
        Boolean(f.suggested_replacement) &&
        !appliedFindingIds.includes(f.id)
    );

    if (grammarFindings.length === 0) {
      return { count: 0, message: 'No unapplied grammar or spelling corrections found.' };
    }

    // Sort descending by start_index so subsequent replacements do not distort character offsets
    const sorted = [...grammarFindings].sort((a, b) => b.start_index - a.start_index);

    let updated = draftContent;
    const appliedIds: string[] = [];

    for (const f of sorted) {
      const start = f.start_index;
      const end = f.end_index;
      if (start >= 0 && end <= updated.length && start < end) {
        const slice = updated.slice(start, end);
        if (slice.toLowerCase() === f.flagged_text.toLowerCase()) {
          updated = updated.slice(0, start) + f.suggested_replacement + updated.slice(end);
          appliedIds.push(f.id);
        }
      }
    }

    if (appliedIds.length > 0) {
      setDraftContent(updated);
      setAppliedFindingIds((prev) => [...prev, ...appliedIds]);
      const feedback = `Applied ${appliedIds.length} grammar & spelling correction${appliedIds.length > 1 ? 's' : ''} to draft! Re-check content with AI to verify clean copy.`;
      setLastCorrectionMessage(feedback);
      return { count: appliedIds.length, message: feedback };
    }

    return { count: 0, message: 'Could not apply corrections due to text offset mismatch.' };
  }, [draftContent, reviewResponse, appliedFindingIds, setDraftContent]);

  // Unified Governance Review execution
  const executeReview = useCallback(async (): Promise<boolean> => {
    if (!draftContent.trim() || draftContent.length < 5) {
      return false;
    }

    setIsReviewing(true);
    setLastCorrectionMessage(null);

    const effectiveBrandId = activeBrand?.id || 'general';

    try {
      let savedDraft: Draft | null = null;

      if (activeBrand) {
        const urlDrafts = isDemoMode ? '/api/drafts?demo=true' : '/api/drafts';
        const resDraft = await fetch(urlDrafts, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeDraftId || undefined,
            brand_id: activeBrand.id,
            title: draftTitle || 'Untitled Draft',
            content: draftContent,
            channel: draftChannel,
            target_audience: targetAudience,
            created_by: currentUser ? currentUser.name : `${currentPersona.name} (${currentPersona.title})`,
          }),
        });

        if (resDraft.ok) {
          const jsonDraft = await resDraft.json();
          if (jsonDraft.success && jsonDraft.data) {
            savedDraft = jsonDraft.data as Draft;
            setActiveDraftId(savedDraft.id);
            setSubmittedDraft(savedDraft);
            setLastSavedAt(savedDraft.updated_at);
          }
        }
      }

      const customApiKey = typeof window !== 'undefined' ? localStorage.getItem('brandlens_gemini_api_key') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey && customApiKey.trim()) {
        headers['x-gemini-api-key'] = customApiKey.trim();
      }

      const resReview = await fetch('/api/review', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_id: effectiveBrandId,
          text: draftContent,
          draft_id: savedDraft?.id,
          instructions: reviewInstructions.trim() || undefined,
          api_key: customApiKey && customApiKey.trim() ? customApiKey.trim() : undefined,
        }),
      });

      if (resReview.ok) {
        const jsonReview = await resReview.json();
        if (jsonReview.success) {
          setReviewResponse(jsonReview.data);
          setReviewedContent(draftContent);
          setAppliedFindingIds([]);
          if (activeBrand) {
            await loadBrandDrafts(activeBrand.id);
          }
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Failed to execute unified review:', err);
      return false;
    } finally {
      setIsReviewing(false);
    }
  }, [
    activeBrand,
    activeDraftId,
    currentPersona,
    currentUser,
    draftChannel,
    draftContent,
    draftTitle,
    isDemoMode,
    loadBrandDrafts,
    reviewInstructions,
    targetAudience,
  ]);

  const submitDraftForReview = useCallback(async (): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> => {
    if (!submittedDraft) {
      return {
        success: false,
        message: 'Please run a brand check to save your content before submitting for review.',
        error: 'No draft saved',
      };
    }

    try {
      const url = isDemoMode ? '/api/governance/decide?demo=true' : '/api/governance/decide';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: submittedDraft.id,
          decision: 'submit_review',
          actor_name: currentUser ? currentUser.name : `${currentPersona.name} (${currentPersona.title})`,
          actor_role: currentUser ? currentUser.role : currentPersona.role,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSubmittedDraft(json.data);
        return { success: true, message: 'Content successfully submitted for approval.' };
      }
      return { success: false, message: json.error || 'Failed to submit content.', error: json.error };
    } catch (err) {
      return { success: false, message: 'Network error submitting content.', error: String(err) };
    }
  }, [submittedDraft, currentPersona, currentUser, isDemoMode]);

  const decideDraft = useCallback(
    async (
      decision: 'approve' | 'request_changes' | 'reject',
      comment: string
    ): Promise<{ success: boolean; message: string; error?: string }> => {
      if (!submittedDraft) {
        return { success: false, message: 'No content currently active.', error: 'No active draft' };
      }

      try {
        const url = isDemoMode ? '/api/governance/decide?demo=true' : '/api/governance/decide';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draft_id: submittedDraft.id,
            decision,
            comment,
            actor_name: currentUser ? currentUser.name : `${currentPersona.name} (${currentPersona.title})`,
            actor_role: currentUser ? currentUser.role : currentPersona.role,
          }),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setSubmittedDraft(json.data);
          return { success: true, message: json.message };
        }
        return { success: false, message: json.error || 'Decision rejected by server.', error: json.error };
      } catch (err) {
        return { success: false, message: 'Network error recording decision.', error: String(err) };
      }
    },
    [submittedDraft, currentPersona, currentUser, isDemoMode]
  );

  const createBrandProfile = useCallback(
    async (data: {
      name: string;
      industry: string;
      description: string;
      tone_guidelines?: string;
      disclaimers?: string;
    }): Promise<{ success: boolean; message: string; brand?: BrandWithRules; error?: string }> => {
      try {
        const url = isDemoMode ? '/api/brands?demo=true' : '/api/brands';
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const json = await res.json();
        if (res.ok && json.success) {
          await refreshBrands();
          setSelectedBrandId(json.data.id);
          return { success: true, message: json.message, brand: json.data };
        }
        return { success: false, message: json.error || 'Failed to create brand profile.', error: json.error };
      } catch (err) {
        return { success: false, message: 'Network error creating brand.', error: String(err) };
      }
    },
    [isDemoMode, refreshBrands, setSelectedBrandId]
  );

  const value = useMemo(
    () => ({
      currentUser,
      isDemoMode,
      isAuthLoading,
      login,
      register,
      logout,
      enterDemoMode,
      exitDemoMode,
      showOnboardingTour,
      setShowOnboardingTour,
      completeOnboarding,
      brands,
      archivedBrands,
      selectedBrandId,
      activeBrand,
      setSelectedBrandId,
      refreshBrands,
      loadArchivedBrands,
      isLoadingBrands,
      archiveBrandProfile,
      restoreBrandProfile,
      deleteBrandProfile,
      currentPersona,
      setCurrentPersona,
      brandDrafts,
      activeDraftId,
      isLoadingDrafts,
      lastSavedAt,
      isReviewStale,
      loadBrandDrafts,
      selectDraft,
      createNewDraft,
      saveCurrentDraft,
      deleteCurrentDraft,
      draftTitle,
      setDraftTitle,
      draftChannel,
      setDraftChannel,
      targetAudience,
      setTargetAudience,
      draftContent,
      setDraftContent,
      reviewInstructions,
      setReviewInstructions,
      submittedDraft,
      setSubmittedDraft,
      reviewResponse,
      setReviewResponse,
      isReviewing,
      appliedFindingIds,
      lastCorrectionMessage,
      applyCorrection,
      applyAllGrammarCorrections,
      executeReview,
      submitDraftForReview,
      decideDraft,
      createBrandProfile,
      loadSampleDraft,
    }),
    [
      currentUser,
      isDemoMode,
      isAuthLoading,
      login,
      register,
      logout,
      enterDemoMode,
      exitDemoMode,
      showOnboardingTour,
      setShowOnboardingTour,
      completeOnboarding,
      brands,
      archivedBrands,
      selectedBrandId,
      activeBrand,
      setSelectedBrandId,
      refreshBrands,
      loadArchivedBrands,
      isLoadingBrands,
      archiveBrandProfile,
      restoreBrandProfile,
      deleteBrandProfile,
      currentPersona,
      setCurrentPersona,
      brandDrafts,
      activeDraftId,
      isLoadingDrafts,
      lastSavedAt,
      isReviewStale,
      loadBrandDrafts,
      selectDraft,
      createNewDraft,
      saveCurrentDraft,
      deleteCurrentDraft,
      draftTitle,
      setDraftTitle,
      draftChannel,
      setDraftChannel,
      targetAudience,
      setTargetAudience,
      draftContent,
      setDraftContent,
      reviewInstructions,
      setReviewInstructions,
      submittedDraft,
      setSubmittedDraft,
      reviewResponse,
      setReviewResponse,
      isReviewing,
      appliedFindingIds,
      lastCorrectionMessage,
      applyCorrection,
      applyAllGrammarCorrections,
      executeReview,
      submitDraftForReview,
      decideDraft,
      createBrandProfile,
      loadSampleDraft,
    ]
  );

  return <BrandSessionContext.Provider value={value}>{children}</BrandSessionContext.Provider>;
}

export function useBrandSession() {
  const ctx = useContext(BrandSessionContext);
  if (!ctx) {
    throw new Error('useBrandSession must be used within a BrandSessionProvider');
  }
  return ctx;
}
