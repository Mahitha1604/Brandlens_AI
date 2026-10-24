import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/auth';
import { updateUserOnboarding } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    let completed = true;
    try {
      const body = await request.json();
      if (typeof body?.completed === 'boolean') {
        completed = body.completed;
      }
    } catch {
      // Body is empty or optional, default to true
    }

    updateUserOnboarding(user.id, completed);

    return NextResponse.json({
      success: true,
      onboarding_completed: completed,
    });
  } catch (error) {
    console.error('Onboarding update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
