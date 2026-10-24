import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const user = getServerSessionUser(request);
    const draftId = request.nextUrl.searchParams.get('draft_id') || undefined;
    const brandId = request.nextUrl.searchParams.get('brand_id') || undefined;

    const logs = getAuditLogs(draftId, brandId, user?.id, isDemo);

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
