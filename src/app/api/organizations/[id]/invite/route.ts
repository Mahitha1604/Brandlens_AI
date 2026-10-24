import { NextRequest, NextResponse } from 'next/server';
import { createOrganizationInvite, getUserRoleInOrganization, getOrganizationById } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';
import type { OrgRole } from '@/lib/types';

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

    const { id: orgId } = await params;
    const org = getOrganizationById(orgId);
    if (!org) {
      return NextResponse.json(
        { success: false, error: 'Organization not found.' },
        { status: 404 }
      );
    }

    // Authorization: only owner or manager can invite members
    const userRole = getUserRoleInOrganization(orgId, user.id);
    if (!userRole || (userRole !== 'owner' && userRole !== 'manager')) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only organization owners and managers can invite team members.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const role: OrgRole = ['manager', 'reviewer', 'copywriter'].includes(body.role)
      ? body.role
      : 'copywriter';

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const invite = createOrganizationInvite(orgId, email, role, user.name);

    return NextResponse.json({
      success: true,
      data: invite,
      message: `Invitation created for ${email} with role "${role}". Share invite code: ${invite.invite_code}`,
    });
  } catch (error) {
    console.error('Failed to create invite:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while creating invitation.' },
      { status: 500 }
    );
  }
}
