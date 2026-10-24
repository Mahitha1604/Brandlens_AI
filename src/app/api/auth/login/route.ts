import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateSessionToken, hashToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';
import { findUserByEmail, createSession } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Please enter both email and password.' },
        { status: 400 }
      );
    }

    const userWithHash = findUserByEmail(email);
    if (!userWithHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, userWithHash.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Generate authenticated session
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
    createSession({
      userId: userWithHash.id,
      tokenHash,
      expiresAt,
    });

    const user = {
      id: userWithHash.id,
      email: userWithHash.email,
      name: userWithHash.name,
      role: userWithHash.role,
      onboarding_completed: userWithHash.onboarding_completed,
      created_at: userWithHash.created_at,
      updated_at: userWithHash.updated_at,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Signed in successfully.',
      user,
      data: user,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: rawToken,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during sign in.' },
      { status: 500 }
    );
  }
}
