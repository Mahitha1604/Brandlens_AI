import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateSessionToken, hashToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';
import { createUser, findUserByEmail, createSession } from '@/lib/db';
import type { PersonaRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const name = (body.name || '').trim();
    const role: PersonaRole = ['copywriter', 'reviewer', 'admin'].includes(body.role)
      ? body.role
      : 'copywriter';

    // Validation
    if (!email || !email.includes('@') || email.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }
    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    const existing = findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const user = createUser({
      email,
      password_hash: passwordHash,
      name,
      role,
    });

    // Create session
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
    createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user,
      data: user,
    });

    // Set secure HTTP-only cookie
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
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
