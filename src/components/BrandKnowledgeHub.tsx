"use client";

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Sparkles,
  Archive,
  RotateCcw,
} from 'lucide-react';
import type { BrandWithRules, RuleCategory, RuleSeverity, UserPersona } from '@/lib/types';
import { useBrandSession } from '@/context/BrandSessionContext';

interface BrandKnowledgeHubProps {
  brands: BrandWithRules[];
  selectedBrandId: string;
  onSelectBrand: (brandId: string) => void;
  onBrandUpdated: () => void;
  currentPersona: UserPersona;
}

export function BrandKnowledgeHub({
  brands,
  selectedBrandId,
  onSelectBrand,
  onBrandUpdated,
  currentPersona,
}: BrandKnowledgeHubProps) {
  const {
    deleteBrandProfile,
    isDemoMode,
    archivedBrands,
    loadArchivedBrands,
    archiveBrandProfile,
    restoreBrandProfile,
  } = useBrandSession();
  const activeBrand = brands.find((b) => b.id === selectedBrandId) || brands[0];
  const [activeTab, setActiveTab] = useState<'guidelines' | 'terminology' | 'facts' | 'claims' | 'archived'>('guidelines');

  // Guidelines form state (initialized directly from activeBrand; component is keyed by activeBrand.id)
  const [brandName, setBrandName] = useState(activeBrand?.name || '');
  const [industry, setIndustry] = useState(activeBrand?.industry || '');
  const [description, setDescription] = useState(activeBrand?.description || '');
  const [toneGuidelines, setToneGuidelines] = useState(activeBrand?.tone_guidelines || '');
  const [disclaimers, setDisclaimers] = useState(activeBrand?.disclaimers || '');
  const [guidelinesSaved, setGuidelinesSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Rule Modal / inline state
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleContent, setNewRuleContent] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<RuleCategory>('terminology');
  const [newRuleForbidden, setNewRuleForbidden] = useState('');
  const [newRuleReplacement, setNewRuleReplacement] = useState('');
  const [newRuleRationale, setNewRuleRationale] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<RuleSeverity>('violation');
  const [isAddingRule, setIsAddingRule] = useState(false);

  // New Brand Profile Modal state
  const [showCreateBrandModal, setShowCreateBrandModal] = useState(false);
  const [createBrandName, setCreateBrandName] = useState('');
  const [createBrandIndustry, setCreateBrandIndustry] = useState('');
  const [createBrandDescription, setCreateBrandDescription] = useState('');
  const [createBrandTone, setCreateBrandTone] = useState('');
  const [createBrandDisclaimers, setCreateBrandDisclaimers] = useState('');
  const [createBrandError, setCreateBrandError] = useState<string | null>(null);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);

  // Archive / Permanent Delete states
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<BrandWithRules | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);

  // Reset database state
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadArchivedBrands();
  }, [loadArchivedBrands]);

  async function handleArchiveBrand() {
    if (!activeBrand) return;
    if (
      !confirm(
        `Archive brand "${activeBrand.name}"?\n\nThis will safely remove the brand from your active workspace while preserving all child drafts, revisions, and governance audit records. You can restore it anytime.`
      )
    ) {
      return;
    }
    setIsArchiving(true);
    try {
      const res = await archiveBrandProfile(activeBrand.id);
      if (res.success) {
        onBrandUpdated();
      } else {
        alert(res.error || 'Failed to archive brand.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error archiving brand.');
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleRestoreBrand(brandId: string) {
    setIsRestoring(true);
    try {
      const res = await restoreBrandProfile(brandId);
      if (res.success) {
        onBrandUpdated();
        onSelectBrand(brandId);
        setActiveTab('guidelines');
      } else {
        alert(res.error || 'Failed to restore brand.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error restoring brand.');
    } finally {
      setIsRestoring(false);
    }
  }

  async function handlePermanentDelete() {
    if (!brandToDelete) return;
    if (deleteConfirmText.trim().toLowerCase() !== brandToDelete.name.trim().toLowerCase()) {
      alert(`Please type "${brandToDelete.name}" exactly to confirm permanent deletion.`);
      return;
    }
    setIsDeletingBrand(true);
    try {
      const res = await deleteBrandProfile(brandToDelete.id);
      if (res.success) {
        setShowPermanentDeleteModal(false);
        setBrandToDelete(null);
        setDeleteConfirmText('');
        onBrandUpdated();
      } else {
        alert(res.error || 'Failed to delete brand profile.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting brand profile.');
    } finally {
      setIsDeletingBrand(false);
    }
  }

  async function handleCreateBrandSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateBrandError(null);

    const name = createBrandName.trim();
    const ind = createBrandIndustry.trim();
    const desc = createBrandDescription.trim();

    if (!name || name.length < 2) {
      setCreateBrandError('Brand name must be at least 2 characters long.');
      return;
    }
    if (!ind || ind.length < 2) {
      setCreateBrandError('Industry is required (e.g. Healthcare, Retail, Technology).');
      return;
    }
    if (!desc || desc.length < 5) {
      setCreateBrandError('Brand description must be at least 5 characters long.');
      return;
    }

    setIsCreatingBrand(true);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          industry: ind,
          description: desc,
          tone_guidelines: createBrandTone.trim() || 'Professional, trustworthy, and clear.',
          disclaimers: createBrandDisclaimers.trim() || '',
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setShowCreateBrandModal(false);
        setCreateBrandName('');
        setCreateBrandIndustry('');
        setCreateBrandDescription('');
        setCreateBrandTone('');
        setCreateBrandDisclaimers('');
        onBrandUpdated();
        onSelectBrand(json.data.id);
      } else {
        setCreateBrandError(json.error || 'Failed to create brand.');
      }
    } catch (err) {
      console.error(err);
      setCreateBrandError('Network error while creating brand profile.');
    } finally {
      setIsCreatingBrand(false);
    }
  }

  const createBrandModalMarkup = showCreateBrandModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4 backdrop-blur-2xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-150 pb-3">
          <div>
            <h3 className="font-bold text-base text-gray-900">Create New Brand Profile</h3>
            <p className="text-xs text-gray-500">
              Add your own brand profile with custom guidelines, terminology, and facts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateBrandModal(false)}
            className="text-gray-400 hover:text-gray-600 font-bold text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {createBrandError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {createBrandError}
          </div>
        )}

        <form onSubmit={handleCreateBrandSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              What is your brand called? *
            </label>
            <input
              value={createBrandName}
              onChange={(e) => setCreateBrandName(e.target.value)}
              placeholder="e.g. Acme Corp, Lumina Health"
              required
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              What type of business is it? *
            </label>
            <input
              value={createBrandIndustry}
              onChange={(e) => setCreateBrandIndustry(e.target.value)}
              placeholder="e.g. Cloud Security, Sustainable Fashion, Enterprise SaaS"
              required
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              What does your brand do? *
            </label>
            <textarea
              value={createBrandDescription}
              onChange={(e) => setCreateBrandDescription(e.target.value)}
              rows={2}
              placeholder="Brief overview of what the company does and who it serves..."
              required
              className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              How should your brand sound? (Writing style &amp; tone)
            </label>
            <textarea
              value={createBrandTone}
              onChange={(e) => setCreateBrandTone(e.target.value)}
              rows={2}
              placeholder="e.g. Rigorous, calm, enterprise-grade. Avoid FOMO, buzzwords, or hype."
              className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
              What required disclosures or footnotes must appear? (optional)
            </label>
            <input
              value={createBrandDisclaimers}
              onChange={(e) => setCreateBrandDisclaimers(e.target.value)}
              placeholder="e.g. Services subject to regulatory approval in select jurisdictions."
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-150">
            <button
              type="button"
              onClick={() => setShowCreateBrandModal(false)}
              className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingBrand || createBrandName.trim().length < 2}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreatingBrand ? 'Creating Brand...' : 'Save Brand Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!activeBrand || brands.length === 0) {
    return (
      <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12 text-center max-w-lg mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Your Brand Knowledge Hub</h2>
          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            BrandLens AI evaluates marketing copy against your specific brand guidelines, prohibited terminology, and verified corporate facts. Create your first brand profile to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateBrandModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Your First Brand</span>
          </button>
        </div>

        {createBrandModalMarkup}
      </section>
    );
  }

  // Filter rules by category
  const terminologyRules = activeBrand.rules.filter((r) => r.category === 'terminology');
  const verifiedFacts = activeBrand.rules.filter((r) => r.category === 'verified_fact');
  const permittedClaims = activeBrand.rules.filter((r) => r.category === 'permitted_claim');

  async function handleSaveGuidelines(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setGuidelinesSaved(false);

    try {
      const res = await fetch(`/api/brands/${activeBrand.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandName,
          industry,
          description,
          tone_guidelines: toneGuidelines,
          disclaimers,
        }),
      });

      if (res.ok) {
        setGuidelinesSaved(true);
        onBrandUpdated();
      } else {
        alert('Failed to save brand guidelines.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating brand guidelines.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!newRuleTitle.trim() || !newRuleContent.trim()) return;

    setIsAddingRule(true);

    try {
      const res = await fetch(`/api/brands/${activeBrand.id}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newRuleCategory,
          title: newRuleTitle,
          content: newRuleContent,
          forbidden_terms: newRuleForbidden,
          replacement_terms: newRuleReplacement,
          rationale: newRuleRationale,
          severity: newRuleSeverity,
        }),
      });

      if (res.ok) {
        setShowAddRule(false);
        setNewRuleTitle('');
        setNewRuleContent('');
        setNewRuleForbidden('');
        setNewRuleReplacement('');
        setNewRuleRationale('');
        onBrandUpdated();
      } else {
        alert('Failed to create rule.');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating rule.');
    } finally {
      setIsAddingRule(false);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const res = await fetch(`/api/brands/${activeBrand.id}/rules?rule_id=${ruleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onBrandUpdated();
      } else {
        alert('Failed to delete rule.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting rule.');
    }
  }

  async function handleResetPresets() {
    if (
      !confirm(
        'Reset database to clean Hackathon demo presets (ApexPay and Verdant Aura)? Any custom edits will be restored to defaults.'
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_presets' }),
      });
      if (res.ok) {
        onBrandUpdated();
        alert('Database successfully restored to pristine hackathon presets.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to reset database.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <section className="mb-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
      {/* Top Header: Title & Brand Switcher */}
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <BookOpen className="h-4 w-4" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              1. Brand Knowledge Hub
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Persistent governance rules, approved terminology, verified facts, and permitted claims.
          </p>
        </div>

        {/* Brand Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {brands.map((b) => {
            const isSelected = b.id === activeBrand.id;
            const isSample = b.is_sample || b.id === 'apexpay' || b.id === 'verdant-aura';
            return (
              <button
                key={b.id}
                onClick={() => onSelectBrand(b.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isSample ? 'Demonstration sample brand with preloaded rules' : 'Custom user brand profile'}
              >
                <Building2 className="h-4 w-4" />
                <span>{b.name}</span>
                {isSample ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    DEMO SAMPLE
                  </span>
                ) : (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isSelected ? 'bg-blue-700 text-blue-100' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Your Brand
                  </span>
                )}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    isSelected ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {b.counts.total} rules
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowCreateBrandModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Brand</span>
          </button>

          {!activeBrand.is_sample && (
            <button
              type="button"
              onClick={handleArchiveBrand}
              disabled={isArchiving}
              className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
              title="Safely archive this brand. Drafts and revisions are kept safe and can be restored anytime."
            >
              <Archive className="h-4 w-4 text-amber-700" />
              <span>{isArchiving ? 'Archiving...' : 'Archive Brand'}</span>
            </button>
          )}

          {isDemoMode && (
            <button
              onClick={handleResetPresets}
              disabled={isResetting}
              title="Restore default pre-seeded demo brands and rules"
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Demo Presets</span>
            </button>
          )}
        </div>
      </div>

      {/* Create New Brand Modal */}
      {createBrandModalMarkup}

      {/* Permanent Delete Brand Confirmation Modal */}
      {showPermanentDeleteModal && brandToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900">Permanently Delete Brand</h3>
                <p className="text-xs text-gray-500">Irreversible deletion of &ldquo;{brandToDelete.name}&rdquo;</p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 leading-relaxed space-y-2">
              <p>
                <strong>Warning:</strong> Permanent deletion removes this brand and its rules. Audit log records will be preserved for governance compliance.
              </p>
              <p className="text-[11px] text-rose-800">
                To confirm, type <strong className="font-mono text-rose-950">&ldquo;{brandToDelete.name}&rdquo;</strong> below:
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={brandToDelete.name}
                className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-mono focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-150">
              <button
                type="button"
                onClick={() => {
                  setShowPermanentDeleteModal(false);
                  setBrandToDelete(null);
                  setDeleteConfirmText('');
                }}
                disabled={isDeletingBrand}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={
                  isDeletingBrand ||
                  deleteConfirmText.trim().toLowerCase() !== brandToDelete.name.trim().toLowerCase()
                }
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-2"
              >
                {isDeletingBrand && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                <span>{isDeletingBrand ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Brand Context Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50/60 px-4 py-2.5 text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{activeBrand.name}:</span>
          <span className="text-blue-800">{activeBrand.industry}</span>
          <span className="text-blue-400">|</span>
          <span className="hidden sm:inline text-blue-700">{activeBrand.description}</span>
        </div>
        <div className="flex items-center gap-3 font-medium">
          <span className="text-blue-800">
            Rules: <strong className="font-bold">{activeBrand.counts.total}</strong>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-emerald-800">
            Facts: <strong className="font-bold">{activeBrand.counts.verified_facts}</strong>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-purple-800">
            Claims: <strong className="font-bold">{activeBrand.counts.permitted_claims}</strong>
          </span>
        </div>
      </div>

      {/* 4 Pillars Navigation Tabs */}
      <div className="mt-6 flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('guidelines')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'guidelines'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Tone & Guidelines
        </button>

        <button
          onClick={() => setActiveTab('terminology')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'terminology'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Approved Terminology ({terminologyRules.length})
        </button>

        <button
          onClick={() => setActiveTab('facts')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'facts'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Verified Facts ({verifiedFacts.length})
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'claims'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Permitted Claims ({permittedClaims.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('archived');
            loadArchivedBrands();
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTab === 'archived'
              ? 'border-blue-600 text-blue-700 font-semibold'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          }`}
        >
          <Archive className="h-4 w-4" />
          Archived Brands {archivedBrands.length > 0 && `(${archivedBrands.length})`}
        </button>
      </div>

      {/* Tab 1: Guidelines Form */}
      {activeTab === 'guidelines' && (
        <form onSubmit={handleSaveGuidelines} className="mt-6 space-y-5">
          <div className="rounded-xl border border-blue-150 bg-blue-50/60 p-3.5 text-xs text-blue-950 leading-relaxed">
            <strong>Writing Style &amp; Brand Guidelines:</strong> These guidelines establish your brand&apos;s voice, personality, positioning, and required legal disclaimers. Both deterministic checks and contextual AI reviews evaluate your content against these standards.
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="brandNameInput" className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                What is your brand called? *
              </label>
              <p className="text-[11px] text-gray-500 mb-1.5">Official brand or product name (required)</p>
              <input
                id="brandNameInput"
                value={brandName}
                onChange={(e) => {
                  setBrandName(e.target.value);
                  setGuidelinesSaved(false);
                }}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label htmlFor="industryInput" className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                What type of business is it? *
              </label>
              <p className="text-[11px] text-gray-500 mb-1.5">Industry and domain (e.g., Financial Technology, Healthcare)</p>
              <input
                id="industryInput"
                value={industry}
                onChange={(e) => {
                  setIndustry(e.target.value);
                  setGuidelinesSaved(false);
                }}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="descInput" className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
              What does your brand do?
            </label>
            <p className="text-[11px] text-gray-500 mb-1.5">Short description of who you serve and your core mission</p>
            <textarea
              id="descInput"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setGuidelinesSaved(false);
              }}
              rows={2}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="toneGuidelinesInput" className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
              How should your brand sound? (Writing style &amp; tone directives) *
            </label>
            <p className="text-[11px] text-gray-500 mb-1.5">Tone of voice, communication style, and prohibited superlatives</p>
            <textarea
              id="toneGuidelinesInput"
              value={toneGuidelines}
              onChange={(e) => {
                setToneGuidelines(e.target.value);
                setGuidelinesSaved(false);
              }}
              required
              rows={3}
              placeholder="e.g. Objective, calm, evidence-based. Avoid emotional FOMO, unsupported superlatives, and buzzwords..."
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="disclaimersInput" className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
              What required disclosures or footnotes must appear? (optional)
            </label>
            <p className="text-[11px] text-gray-500 mb-1.5">Regulatory license numbers, footnote qualifications, or certified testing statements</p>
            <textarea
              id="disclaimersInput"
              value={disclaimers}
              onChange={(e) => {
                setDisclaimers(e.target.value);
                setGuidelinesSaved(false);
              }}
              rows={2}
              placeholder="Regulatory license numbers, certified testing attributions..."
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Brand Guidelines'}
            </button>

            {guidelinesSaved && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Updated successfully!
              </span>
            )}
          </div>
        </form>
      )}

      {/* Tab 2: Approved Terminology Dictionary */}
      {activeTab === 'terminology' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-950 leading-relaxed">
            <strong>Approved Terminology Rules:</strong> The deterministic rule engine scans copy for prohibited buzzwords, required trademarks, and capitalization rules with sub-millisecond precision. Flagged terms are highlighted with exact character offsets.
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Prohibited vocabulary, trademark casings, and mandatory approved alternatives.
            </p>
            <button
              onClick={() => {
                setNewRuleCategory('terminology');
                setShowAddRule(true);
              }}
              className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Term Rule
            </button>
          </div>

          <div className="grid gap-3">
            {terminologyRules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 sm:flex-row sm:items-start"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        rule.severity === 'violation'
                          ? 'bg-red-100 text-red-800'
                          : rule.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {rule.severity}
                    </span>
                    <span className="font-semibold text-gray-900">{rule.title}</span>
                    <span className="text-xs text-gray-400">({rule.rule_key})</span>
                  </div>

                  <p className="text-sm text-gray-700">{rule.content}</p>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-red-700">Prohibited:</span>
                    {rule.forbidden_terms.map((t, idx) => (
                      <span key={idx} className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-800 ring-1 ring-red-200">
                        &quot;{t}&quot;
                      </span>
                    ))}
                    <span className="text-gray-400">➔</span>
                    <span className="font-semibold text-emerald-700">Approved:</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-900 ring-1 ring-emerald-200">
                      &quot;{rule.replacement_terms}&quot;
                    </span>
                  </div>

                  {rule.rationale && (
                    <p className="text-xs text-gray-500 italic">
                      <strong>Rationale:</strong> {rule.rationale}
                    </p>
                  )}
                </div>

                {currentPersona.role === 'admin' && (
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Rule (Admin only)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Verified Facts */}
      {activeTab === 'facts' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs text-emerald-950 leading-relaxed">
            <strong>Verified Corporate Facts:</strong> Audited records, certified metrics, and corporate statistics. BrandLens AI uses these as the single source of truth to verify factual claims in marketing copy. Factual claims without a verified corporate fact are flagged for review.
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Legally certified corporate metrics, third-party audit claims, and citations.
            </p>
            <button
              onClick={() => {
                setNewRuleCategory('verified_fact');
                setShowAddRule(true);
              }}
              className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Verified Fact
            </button>
          </div>

          <div className="grid gap-3">
            {verifiedFacts.map((fact) => (
              <div
                key={fact.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-emerald-50/20 p-4 transition-all hover:border-emerald-300 sm:flex-row sm:items-start"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-gray-900">{fact.title}</span>
                  </div>

                  <p className="text-sm text-gray-800">{fact.content}</p>

                  {fact.rationale && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100/60 px-2.5 py-1 text-xs text-emerald-900">
                      <FileText className="h-3.5 w-3.5 text-emerald-700" />
                      <span>{fact.rationale}</span>
                    </div>
                  )}

                  {fact.forbidden_terms.length > 0 && (
                    <p className="text-xs text-red-700">
                      <strong>Disallowed exaggerations:</strong> {fact.forbidden_terms.join(', ')}
                    </p>
                  )}
                </div>

                {currentPersona.role === 'admin' && (
                  <button
                    onClick={() => handleDeleteRule(fact.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Fact (Admin only)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Permitted Claims */}
      {activeTab === 'claims' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3.5 text-xs text-purple-950 leading-relaxed">
            <strong>Permitted Advertising Claims:</strong> Statements that are permitted only when accompanied by mandatory qualifying disclosures or legal disclaimers. Unqualified claims are flagged for compliance action.
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Specific marketing claims permitted only when meeting exact qualification criteria.
            </p>
            <button
              onClick={() => {
                setNewRuleCategory('permitted_claim');
                setShowAddRule(true);
              }}
              className="flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Permitted Claim
            </button>
          </div>

          <div className="grid gap-3">
            {permittedClaims.map((claim) => (
              <div
                key={claim.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-purple-50/20 p-4 transition-all hover:border-purple-300 sm:flex-row sm:items-start"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-gray-900">{claim.title}</span>
                  </div>

                  <p className="text-sm text-gray-800">{claim.content}</p>

                  <div className="rounded-lg bg-amber-50 border border-amber-200/60 p-2 text-xs text-amber-900">
                    <strong>Required Qualification:</strong> {claim.replacement_terms || 'Must include full legal footnote.'}
                  </div>

                  {claim.rationale && (
                    <p className="text-xs text-gray-500 italic">
                      <strong>Legal context:</strong> {claim.rationale}
                    </p>
                  )}
                </div>

                {currentPersona.role === 'admin' && (
                  <button
                    onClick={() => handleDeleteRule(claim.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Claim (Admin only)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Archived Brands */}
      {activeTab === 'archived' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 leading-relaxed">
            <strong>Archived Brand Profiles:</strong> These brands are hidden from your active workspace, but their guidelines, drafts, revision histories, and governance audit records remain safely preserved. You can restore an archived brand at any time.
          </div>

          {archivedBrands.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
              <Archive className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="font-semibold text-sm">No archived brands</p>
              <p className="text-xs text-gray-400 mt-1">
                When you archive a brand from the active workspace, it will appear here safely preserved.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {archivedBrands.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-gray-900">{b.name}</h4>
                      <span className="rounded bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        Archived
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{b.industry} • {b.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1">
                      <span>Rules: <strong>{b.counts?.total || 0}</strong></span>
                      <span>•</span>
                      <span>Archived on {b.archived_at ? new Date(b.archived_at).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestoreBrand(b.id)}
                      disabled={isRestoring}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{isRestoring ? 'Restoring...' : 'Restore Brand'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBrandToDelete(b);
                        setDeleteConfirmText('');
                        setShowPermanentDeleteModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
                      title="Permanently delete this archived brand"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                      <span>Permanently Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Rule Modal / Drawer */}
      {showAddRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add Brand Rule / Knowledge Clause</h3>
              <button
                onClick={() => setShowAddRule(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Category</label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value as RuleCategory)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="terminology">Terminology (Forbidden vs Approved)</option>
                    <option value="verified_fact">Verified Fact (Audited figures)</option>
                    <option value="permitted_claim">Permitted Claim (Qualified conditions)</option>
                    <option value="guideline">General Tone Guideline</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Severity</label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value as RuleSeverity)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="violation">Violation (Blocker)</option>
                    <option value="warning">Warning</option>
                    <option value="suggestion">Suggestion</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Title / Rule Name *</label>
                <input
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  required
                  placeholder="e.g. Prohibited claim 'bulletproof'"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Requirement / Content *</label>
                <textarea
                  value={newRuleContent}
                  onChange={(e) => setNewRuleContent(e.target.value)}
                  required
                  rows={2}
                  placeholder="Explain what content must or must not say..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              {newRuleCategory === 'terminology' && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Forbidden Terms (comma separated)
                    </label>
                    <input
                      value={newRuleForbidden}
                      onChange={(e) => setNewRuleForbidden(e.target.value)}
                      placeholder="e.g. bulletproof, unhackable, 100% secure"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Approved Replacement
                    </label>
                    <input
                      value={newRuleReplacement}
                      onChange={(e) => setNewRuleReplacement(e.target.value)}
                      placeholder="e.g. defense-in-depth security model"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Regulatory Rationale or Official Citation
                </label>
                <input
                  value={newRuleRationale}
                  onChange={(e) => setNewRuleRationale(e.target.value)}
                  placeholder="e.g. Citation: Deloitte FY2025 Audit Report Section 4.2"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRule(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingRule}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAddingRule ? 'Saving...' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
