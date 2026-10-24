import { NextRequest, NextResponse } from 'next/server';
import {
  getOrganizationById,
  getOrganizationMembers,
  getOrganizationInvites,
  getUserRoleInOrganization,
} from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(
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

    const userRole = getUserRoleInOrganization(orgId, user.id);
    if (!userRole) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You are not a member of this organization.' },
        { status: 403 }
      );
    }

    const members = getOrganizationMembers(orgId);
    const invites = ['owner', 'manager'].includes(userRole) ? getOrganizationInvites(orgId) : [];

    return NextResponse.json({
      success: true,
      data: {
        organization: org,
        members,
        invites,
        userRole,
      },
    });
  } catch (error) {
    console.error('Failed to get organization details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching organization.' },
      { status: 500 }
    );
  }
}
