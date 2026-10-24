import { NextRequest, NextResponse } from 'next/server';
import { markNotificationRead } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const success = markNotificationRead(id, user.id);

    return NextResponse.json({
      success,
      message: success ? 'Notification marked as read.' : 'Notification not found.',
    });
  } catch (error) {
    console.error('Failed to mark notification read:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
