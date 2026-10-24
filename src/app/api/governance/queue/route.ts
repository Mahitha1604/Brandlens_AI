import { NextRequest, NextResponse } from 'next/server';
import { getReviewQueue, getUserRoleInOrganization } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const orgId = request.nextUrl.searchParams.get('org_id') || undefined;
    const user = getServerSessionUser(request);

    if (!user && !isDemo) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to view review queue.' },
        { status: 401 }
      );
    }

    // If org_id is provided, check user's membership and permissions
    if (user && orgId) {
      const role = getUserRoleInOrganization(orgId, user.id);
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Access denied: You are not a member of this organization.' },
          { status: 403 }
        );
      }
    }

    const queue = getReviewQueue(user?.id, orgId, isDemo);

    return NextResponse.json({
      success: true,
      data: queue,
      count: queue.length,
      is_demo: isDemo,
    });
  } catch (error) {
    console.error('Failed to get review queue:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while retrieving review queue.' },
      { status: 500 }
    );
  }
}
