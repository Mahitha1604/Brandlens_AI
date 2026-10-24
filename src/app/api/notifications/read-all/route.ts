import { NextRequest, NextResponse } from 'next/server';
import { markAllNotificationsRead } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const success = markAllNotificationsRead(user.id);

    return NextResponse.json({
      success,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    console.error('Failed to mark all notifications read:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
