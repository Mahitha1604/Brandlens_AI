import { NextRequest, NextResponse } from 'next/server';
import { getNotificationsForUser } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { notifications, unread_count } = getNotificationsForUser(user.id);

    return NextResponse.json({
      success: true,
      data: notifications,
      unread_count,
    });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching notifications.' },
      { status: 500 }
    );
  }
}
