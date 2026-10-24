import { NextRequest, NextResponse } from 'next/server';
import { createOrganization, getOrganizationsForUser } from '@/lib/db';
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

    const orgs = getOrganizationsForUser(user.id);

    return NextResponse.json({
      success: true,
      data: orgs,
    });
  } catch (error) {
    console.error('Failed to get organizations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while fetching organizations.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to create an organization.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = String(body.name || '').trim();
    const type = ['marketing_team', 'agency', 'enterprise'].includes(body.type)
      ? body.type
      : 'agency';

    if (!name || name.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Organization name must be at least 2 characters long.' },
        { status: 400 }
      );
    }

    const org = createOrganization(name, user.id, type);

    return NextResponse.json({
      success: true,
      data: org,
      message: `Organization "${org.name}" created successfully.`,
    });
  } catch (error) {
    console.error('Failed to create organization:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while creating organization.' },
      { status: 500 }
    );
  }
}
