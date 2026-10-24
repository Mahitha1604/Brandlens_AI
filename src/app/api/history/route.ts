import { NextRequest, NextResponse } from 'next/server';
import { getDraftRevisions } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const user = getServerSessionUser(request);
    const draftId = request.nextUrl.searchParams.get('draft_id') || undefined;

    const revisions = getDraftRevisions(draftId, user?.id, isDemo);

    return NextResponse.json({
      success: true,
      data: revisions,
    });
  } catch (error) {
    console.error('Failed to get revision history:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
