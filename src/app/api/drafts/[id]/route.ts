import { NextRequest, NextResponse } from 'next/server';
import { getDraftById, deleteDraft, getLatestDraftReview, saveDraft } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const user = getServerSessionUser(request);
    const { id } = await params;

    const draft = getDraftById(id, user?.id);
    if (!draft) {
      return NextResponse.json(
        { success: false, error: `Draft '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    // Verify ownership unless sample demo draft
    if (!isDemo && user && draft.user_id && draft.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this draft.' },
        { status: 403 }
      );
    }

    const latestReview = getLatestDraftReview(id);

    return NextResponse.json({
      success: true,
      data: {
        ...draft,
        latest_review: latestReview,
      },
    });
  } catch (error) {
    console.error('Failed to get draft:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to delete drafts.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const draft = getDraftById(id, user.id);
    if (!draft) {
      return NextResponse.json(
        { success: false, error: `Draft '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    if (draft.id.startsWith('draft-sample-')) {
      return NextResponse.json(
        { success: false, error: 'Sample demonstration drafts cannot be deleted.' },
        { status: 403 }
      );
    }

    if (draft.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to delete this draft.' },
        { status: 403 }
      );
    }

    const success = deleteDraft(id, user.id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete draft.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Draft "${draft.title}" was deleted successfully.`,
    });
  } catch (error) {
    console.error('Failed to delete draft:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getServerSessionUser(request);
    const { id } = await params;
    const body = await request.json();

    const draft = getDraftById(id, user?.id);
    if (!draft) {
      return NextResponse.json(
        { success: false, error: `Draft '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    if (user && draft.user_id && draft.user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to edit this draft.' },
        { status: 403 }
      );
    }

    const updated = saveDraft({
      id: draft.id,
      brand_id: body.brand_id || draft.brand_id,
      title: body.title !== undefined ? String(body.title).trim() : draft.title,
      content: body.content !== undefined ? body.content : draft.content,
      channel: body.channel || draft.channel,
      target_audience: body.target_audience || draft.target_audience,
      user_id: draft.user_id,
      organization_id: draft.organization_id,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Draft "${updated.title}" updated successfully.`,
    });
  } catch (error) {
    console.error('Failed to update draft:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while updating draft.' },
      { status: 500 }
    );
  }
}
