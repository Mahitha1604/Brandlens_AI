import { NextRequest, NextResponse } from 'next/server';
import { hashToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { deleteSession } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const rawToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (rawToken) {
      const tokenHash = hashToken(rawToken.trim());
      deleteSession(tokenHash);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Signed out successfully.',
    });

    // Clear cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during sign out.' },
      { status: 500 }
    );
  }
}
