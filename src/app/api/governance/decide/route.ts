import { NextRequest, NextResponse } from 'next/server';
import { updateDraftStatusAndDecision, getDraftById } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';
import type { DraftStatus, PersonaRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const user = getServerSessionUser(request);

    if (!user && !isDemo) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to submit governance decisions.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { draft_id, decision, comment, actor_name, actor_role } = body;

    if (!draft_id || !decision) {
      return NextResponse.json(
        { success: false, error: 'draft_id and decision are required fields.' },
        { status: 400 }
      );
    }

    const draft = getDraftById(draft_id, user?.id);
    if (!draft) {
      return NextResponse.json(
        { success: false, error: `Draft '${draft_id}' not found or access denied.` },
        { status: 404 }
      );
    }

    // Role enforcement: session user role takes precedence over untrusted request body
    const role: PersonaRole = user ? user.role : (actor_role || 'copywriter');
    const actor: string = user ? user.name : (actor_name || 'Anonymous User');
    const decisionComment: string = typeof comment === 'string' ? comment.trim() : '';

    // 1. Submit for review action (permitted for all roles including copywriters)
    if (decision === 'submit_review') {
      const updated = updateDraftStatusAndDecision(
        draft_id,
        'under_review',
        actor,
        role,
        decisionComment || 'Submitted draft copy for brand governance review.',
        user?.id
      );
      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Draft successfully submitted for governance review.',
      });
    }

    // 2. Withdraw from review action (permitted for draft creator or admin)
    if (decision === 'withdraw') {
      if (user && draft.user_id && draft.user_id !== user.id && role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Access Denied: Only the draft author or an administrator can withdraw this submission.' },
          { status: 403 }
        );
      }
      const updated = updateDraftStatusAndDecision(
        draft_id,
        'draft',
        actor,
        role,
        decisionComment || 'Draft submission withdrawn by author for further editing.',
        user?.id
      );
      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Draft submission successfully withdrawn.',
      });
    }

    // 3. SERVER-SIDE PERMISSION ENFORCEMENT:
    // Only reviewers and admins can approve, request changes, or reject!
    if (role !== 'reviewer' && role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Access Denied: Only users with Reviewer or Admin roles have permission to approve, request changes, or reject drafts.',
        },
        { status: 403 }
      );
    }

    // 4. PREVENT SELF-APPROVAL:
    // A user cannot approve their own submitted draft by default
    if (decision === 'approve' && user && draft.user_id && draft.user_id === user.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Copywriters and authors cannot approve their own submitted drafts. A designated Reviewer or Brand Manager must approve this revision.',
        },
        { status: 403 }
      );
    }

    // 3. Map decisions to statuses
    let targetStatus: DraftStatus;
    let actionLabel = '';

    if (decision === 'approve') {
      targetStatus = 'approved';
      actionLabel = 'approved';
    } else if (decision === 'request_changes') {
      if (!decisionComment || decisionComment.length < 5) {
        return NextResponse.json(
          {
            success: false,
            error: 'Reviewer comment is required when requesting changes (min 5 characters).',
          },
          { status: 400 }
        );
      }
      targetStatus = 'changes_requested';
      actionLabel = 'changes requested for';
    } else if (decision === 'reject') {
      if (!decisionComment || decisionComment.length < 5) {
        return NextResponse.json(
          {
            success: false,
            error: 'Reviewer comment is required when rejecting a draft (min 5 characters).',
          },
          { status: 400 }
        );
      }
      targetStatus = 'rejected';
      actionLabel = 'rejected';
    } else {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid decision '${decision}'. Expected 'approve', 'request_changes', 'reject', or 'submit_review'.`,
        },
        { status: 400 }
      );
    }

    const updated = updateDraftStatusAndDecision(
      draft_id,
      targetStatus,
      actor,
      role,
      decisionComment || `Governance decision: ${decision}`,
      user?.id
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Draft successfully ${actionLabel}.`,
    });
  } catch (error) {
    console.error('Failed to process governance decision:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while recording governance decision.' },
      { status: 500 }
    );
  }
}
