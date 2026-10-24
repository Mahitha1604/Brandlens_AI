import { NextRequest, NextResponse } from 'next/server';
import { getAppStats } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const user = getServerSessionUser(request);

    const stats = getAppStats(user?.id, isDemo);
    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Failed to get app stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
