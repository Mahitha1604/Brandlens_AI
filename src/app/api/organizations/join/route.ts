import { NextRequest, NextResponse } from 'next/server';
import { acceptOrganizationInvite } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to join an organization.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const inviteCode = String(body.invite_code || '').trim();

    if (!inviteCode) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid invitation code.' },
        { status: 400 }
      );
    }

    const result = acceptOrganizationInvite(inviteCode, user.id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to join organization.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.organization,
      message: `Successfully joined ${result.organization?.name}!`,
    });
  } catch (error) {
    console.error('Failed to join organization:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while joining organization.' },
      { status: 500 }
    );
  }
}
