'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Building2,
  UserPlus,
  Key,
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  Briefcase,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useBrandSession } from '@/context/BrandSessionContext';
import type { Organization, OrganizationMember, OrganizationInvite, OrgRole } from '@/lib/types';

export default function TeamWorkspacePage() {
  const { currentUser } = useBrandSession();

  // Organizations list
  const [organizations, setOrganizations] = useState<Array<Organization & { role: OrgRole }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // Active organization details
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [userRole, setUserRole] = useState<OrgRole | null>(null);

  // Forms state
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState<'marketing_team' | 'agency' | 'enterprise'>('agency');
  const [isCreating, setIsCreating] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('copywriter');
  const [isInviting, setIsInviting] = useState(false);
  const [lastGeneratedInvite, setLastGeneratedInvite] = useState<OrganizationInvite | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Refresh organizations for current user (used after mutation)
  const refreshOrganizations = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setOrganizations(json.data);
          setSelectedOrgId((prev) => (prev ? prev : (json.data[0]?.id || '')));
        }
      }
    } catch {
      // Ignore network errors
    }
  }, []);

  // Refresh details for selected organization (used after mutation)
  const refreshOrgDetails = useCallback(async (orgId: string) => {
    if (!orgId) {
      setActiveOrg(null);
      setMembers([]);
      setInvites([]);
      setUserRole(null);
      return;
    }
    try {
      const res = await fetch(`/api/organizations/${orgId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setActiveOrg(json.data.organization);
          setMembers(json.data.members || []);
          setInvites(json.data.invites || []);
          setUserRole(json.data.userRole || null);
        }
      }
    } catch {
      // Ignore network errors
    }
  }, []);

  // Initial load of organizations
  useEffect(() => {
    let isMounted = true;
    const fetchOrgs = async () => {
      try {
        const res = await fetch('/api/organizations');
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && Array.isArray(json.data)) {
            setOrganizations(json.data);
            setSelectedOrgId((prev) => (prev ? prev : (json.data[0]?.id || '')));
          }
        }
      } catch {
        // Ignore network errors
      }
    };
    fetchOrgs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load details when selectedOrgId changes
  useEffect(() => {
    if (!selectedOrgId) return;
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/organizations/${selectedOrgId}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success && json.data) {
            setActiveOrg(json.data.organization);
            setMembers(json.data.members || []);
            setInvites(json.data.invites || []);
            setUserRole(json.data.userRole || null);
          }
        }
      } catch {
        // Ignore network errors
      }
    };
    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedOrgId]);

  // Handle create organization
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setIsCreating(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), type: createType }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: 'success', text: `Workspace "${createName.trim()}" created successfully!` });
        setCreateName('');
        await refreshOrganizations();
        if (json.data?.id) {
          setSelectedOrgId(json.data.id);
        }
      } else {
        setFeedback({ type: 'error', text: json.error || 'Failed to create workspace.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error while creating workspace.' });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle invite member
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !inviteEmail.trim()) return;
    setIsInviting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/organizations/${selectedOrgId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({ type: 'success', text: `Invitation generated for ${inviteEmail.trim()}!` });
        setLastGeneratedInvite(json.data);
        setInviteEmail('');
        await refreshOrgDetails(selectedOrgId);
      } else {
        setFeedback({ type: 'error', text: json.error || 'Failed to generate invitation.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error while sending invitation.' });
    } finally {
      setIsInviting(false);
    }
  };

  // Handle join organization
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setFeedback({
          type: 'success',
          text: `Successfully joined ${json.data?.organization?.name || 'the workspace'}!`,
        });
        setJoinCode('');
        await refreshOrganizations();
        if (json.data?.organization?.id) {
          setSelectedOrgId(json.data.organization.id);
        }
      } else {
        setFeedback({ type: 'error', text: json.error || 'Invalid or expired invitation code.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error while joining workspace.' });
    } finally {
      setIsJoining(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-purple-600 p-2 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Team &amp; Workspaces</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage organization workspaces, team members, roles, and collaboration invites.
              </p>
            </div>
          </div>
        </div>

        {/* Workspace Quick Switcher */}
        {organizations.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            <span className="text-xs font-semibold text-gray-500 pl-2">Active:</span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-medium border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Active Workspace & Team Members */}
        <div className="lg:col-span-2 space-y-6">
          {activeOrg ? (
            <>
              {/* Organization Header Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{activeOrg.name}</h2>
                      <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                        {activeOrg.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Organization Workspace ID: <code className="font-mono text-gray-700 bg-gray-100 px-1 py-0.5 rounded">{activeOrg.id}</code>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Your Role:</span>
                    <span className="rounded-md bg-blue-100 px-2.5 py-0.5 font-bold text-blue-800 uppercase tracking-wider text-[11px]">
                      {userRole || 'Member'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-150">
                    <div className="text-xl font-bold text-gray-900">{members.length}</div>
                    <div className="text-[11px] text-gray-500 font-medium">Team Members</div>
                  </div>
                  <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-150">
                    <div className="text-xl font-bold text-purple-700">{invites.length}</div>
                    <div className="text-[11px] text-gray-500 font-medium">Pending Invites</div>
                  </div>
                  <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-150">
                    <div className="text-xl font-bold text-emerald-700">Active</div>
                    <div className="text-[11px] text-gray-500 font-medium">Workspace Status</div>
                  </div>
                </div>
              </div>

              {/* Members Directory */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-bold text-gray-900">Workspace Members ({members.length})</h3>
                  </div>
                  <span className="text-xs text-gray-400">Governance &amp; Review Roles</span>
                </div>

                <div className="divide-y divide-gray-150 border border-gray-150 rounded-xl overflow-hidden">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                          {member.user_name ? member.user_name.slice(0, 2).toUpperCase() : 'TM'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900">
                            {member.user_name || 'Team Member'}
                            {member.user_id === currentUser?.id && (
                              <span className="ml-1.5 text-[10px] text-purple-600 font-semibold">(You)</span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500">{member.user_email || 'No email registered'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            member.role === 'owner'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : member.role === 'manager'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : member.role === 'reviewer'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {member.role}
                        </span>
                        <span className="text-[10px] text-gray-400 hidden sm:inline">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invites List */}
              {invites.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-gray-900">Active Pending Invitations ({invites.length})</h3>
                  </div>

                  <div className="divide-y divide-gray-150 border border-gray-150 rounded-xl overflow-hidden">
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-amber-50/30 gap-2">
                        <div>
                          <div className="text-xs font-bold text-gray-900">{inv.email}</div>
                          <div className="text-[10px] text-gray-500">
                            Invited as <strong>{inv.role}</strong> · Expires {new Date(inv.expires_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold bg-white px-2 py-1 rounded border border-amber-200 text-amber-900">
                            {inv.invite_code}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(inv.invite_code)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy Code</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500 space-y-4">
              <Building2 className="h-10 w-10 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-gray-900">No Organization Selected</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                  You are currently operating in your <strong>Personal Workspace</strong>. Create an organization workspace to invite team members and collaborate on client brands.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Invite, Create & Join Actions */}
        <div className="space-y-6">
          {/* Invite Teammate Card (Only for Owner or Manager) */}
          {activeOrg && (userRole === 'owner' || userRole === 'manager') && (
            <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">Invite a Team Member</h3>
              </div>

              <form onSubmit={handleInvite} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Teammate&apos;s Email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="copywriter@agency.com"
                    required
                    className="w-full text-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                    className="w-full text-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="copywriter">Copywriter (Creates &amp; checks drafts)</option>
                    <option value="reviewer">Reviewer (Evaluates &amp; approves content)</option>
                    <option value="manager">Brand Manager (Manages rules &amp; team)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isInviting ? 'Generating...' : 'Generate Invitation Code'}</span>
                </button>
              </form>

              {/* Last Generated Code Banner */}
              {lastGeneratedInvite && (
                <div className="p-3 bg-white rounded-xl border border-purple-200 text-xs space-y-2 mt-2">
                  <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Invite Code Ready to Share:</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                    <code className="font-mono font-bold text-purple-900">{lastGeneratedInvite.invite_code}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(lastGeneratedInvite.invite_code)}
                      className="text-[10px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                    >
                      {copiedCode ? 'Copied! ✓' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Give this code to your teammate. They can enter it under &quot;Join Workspace&quot; below.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Join Organization Workspace Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Join a Workspace with Code</h3>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Received an invitation code from an agency owner or brand manager? Enter it here to join.
            </p>

            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. invite-a1b2c3"
                  required
                  className="w-full text-xs font-mono rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isJoining || !joinCode.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>{isJoining ? 'Joining...' : 'Join Workspace'}</span>
              </button>
            </form>
          </div>

          {/* Create New Organization Workspace Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-gray-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Create New Workspace</h3>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Start a new team or agency workspace to manage multiple brands and invite team members.
            </p>

            <form onSubmit={handleCreateOrg} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Apex Creative Agency"
                  required
                  className="w-full text-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Workspace Type
                </label>
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as 'marketing_team' | 'agency' | 'enterprise')}
                  className="w-full text-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-gray-900 cursor-pointer"
                >
                  <option value="agency">Content Agency (Multi-Client Brands)</option>
                  <option value="marketing_team">Marketing Team (Internal Governance)</option>
                  <option value="enterprise">Enterprise (Cross-Department)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isCreating || !createName.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{isCreating ? 'Creating...' : '+ Create Workspace'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
