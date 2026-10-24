import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user,
      data: user,
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { success: false, authenticated: false, user: null, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
