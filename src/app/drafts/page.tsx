"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Trash2,
  Edit2,
  Building2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useBrandSession } from '@/context/BrandSessionContext';
import type { Draft, DraftStatus } from '@/lib/types';

export default function DraftsPage() {
  const router = useRouter();
  const { isDemoMode, brands, createNewDraft, selectDraft } = useBrandSession();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Inline Rename Modal
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete Confirm Modal
  const [deletingDraft, setDeletingDraft] = useState<Draft | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDrafts = useCallback(async () => {
    try {
      const url = `/api/drafts${isDemoMode ? '?demo=true' : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setDrafts(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const url = `/api/drafts${isDemoMode ? '?demo=true' : ''}`;
        const res = await fetch(url);
        const json = await res.json();
        if (isMounted && json.success) {
          setDrafts(json.data || []);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [isDemoMode]);

  const handleOpenDraft = async (d: Draft) => {
    await selectDraft(d);
    router.push('/studio');
  };

  const handleCreateNew = () => {
    createNewDraft();
    router.push('/studio');
  };

  const handleRenameSubmit = async () => {
    if (!editingDraft || !newTitle.trim()) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/drafts/${editingDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingDraft(null);
        await fetchDrafts();
      } else {
        alert(json.error || 'Failed to rename draft.');
      }
    } catch {
      alert('Network error while renaming draft.');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingDraft) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/drafts/${deletingDraft.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setDeletingDraft(null);
        await fetchDrafts();
      } else {
        alert(json.error || 'Failed to delete draft.');
      }
    } catch {
      alert('Network error while deleting draft.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDrafts = drafts.filter((d) => {
    if (selectedBrand !== 'all' && d.brand_id !== selectedBrand) return false;
    if (selectedChannel !== 'all' && d.channel !== selectedChannel) return false;
    if (selectedStatus !== 'all' && d.status !== selectedStatus) return false;
    if (
      searchQuery.trim() &&
      !d.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !d.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: DraftStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Approved
          </span>
        );
      case 'under_review':
        return (
          <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
            <Clock className="h-3 w-3 text-blue-600" />
            Under Review
          </span>
        );
      case 'changes_requested':
        return (
          <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            Changes Requested
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
            <XCircle className="h-3 w-3 text-rose-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 border border-gray-200">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                <FileText className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-gray-950">Marketing Drafts</h1>
              <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-bold text-gray-700">
                {drafts.length} Total
              </span>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 max-w-2xl leading-relaxed">
              Browse, manage, and edit marketing content across all client brands and communication channels. Every draft tracks separate revisions, AI findings, and governance decisions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchDrafts}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Draft</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or copy..."
              className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Brand Filter */}
          <div>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Filter */}
          <div>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Channels</option>
              <option value="instagram_post">Instagram Post</option>
              <option value="linkedin_post">LinkedIn Post</option>
              <option value="website_copy">Website / Landing Page</option>
              <option value="email_newsletter">Email Campaign</option>
              <option value="social_ad">Paid Social Ad</option>
              <option value="press_release">Press Release</option>
              <option value="blog_post">Blog Article</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Drafts List */}
        {isLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-600">Loading your drafts...</p>
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No Drafts Found</h3>
            <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              {drafts.length === 0
                ? "You haven't created any marketing drafts yet. Click 'New Draft' to start drafting and checking content."
                : 'No drafts matched your search and filter criteria.'}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleCreateNew}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Create First Draft
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5">
            {filteredDrafts.map((d) => {
              const brand = brands.find((b) => b.id === d.brand_id);
              return (
                <div
                  key={d.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs hover:border-gray-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getStatusBadge(d.status)}
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 capitalize">
                          {d.channel.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">
                          Revision #{d.current_revision}
                        </span>
                        {d.last_decided_by && (
                          <span className="text-[10px] text-gray-400">
                            (Decided by {d.last_decided_by})
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-gray-950 truncate">{d.title}</h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDraft(d);
                          setNewTitle(d.title);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Rename Draft"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingDraft(d)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Draft"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDraft(d)}
                        className="flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        <span>Open in Studio</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Copy preview */}
                  <p className="text-xs text-gray-700 font-mono bg-gray-50/70 p-3 rounded-xl border border-gray-150 line-clamp-2">
                    {d.content}
                  </p>

                  {/* Decision notes if present */}
                  {d.last_decision_notes && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Reviewer Feedback:</strong> <span>{d.last_decision_notes}</span>
                      </div>
                    </div>
                  )}

                  {/* Metadata footer */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 gap-2 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span>{brand?.name || d.brand_id}</span>
                    </span>
                    <span>Last updated: {new Date(d.updated_at).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rename Modal */}
        {editingDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Rename Draft</h3>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Draft Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingDraft(null)}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRenameSubmit}
                  disabled={isRenaming}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isRenaming ? 'Saving...' : 'Save Title'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingDraft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 space-y-3">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                <span>Delete Draft Confirmation</span>
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to permanently delete draft <strong>&quot;{deletingDraft.title}&quot;</strong>? All associated content revisions and review records will be removed.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeletingDraft(null)}
                  className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={isDeleting}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
