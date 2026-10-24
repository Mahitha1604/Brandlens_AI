import { NextRequest, NextResponse } from 'next/server';
import { getDrafts, saveDraft } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const user = getServerSessionUser(request);
    const brandId = request.nextUrl.searchParams.get('brand_id') || undefined;
    const orgId = request.nextUrl.searchParams.get('org_id') || undefined;

    const drafts = getDrafts(brandId, user?.id, isDemo, orgId);

    return NextResponse.json({
      success: true,
      data: drafts,
    });
  } catch (error) {
    console.error('Failed to get drafts:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const user = getServerSessionUser(request);

    if (!user && !isDemo) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to save drafts.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    if (!body.content || !body.brand_id) {
      return NextResponse.json(
        { success: false, error: 'Draft content and brand_id are required' },
        { status: 400 }
      );
    }

    const draft = saveDraft({
      id: body.id,
      brand_id: body.brand_id,
      title: body.title || 'Untitled Draft',
      content: body.content,
      channel: body.channel || 'social_ad',
      target_audience: body.target_audience || 'General',
      created_by: user ? user.name : (body.created_by || 'Demo User'),
      user_id: user ? user.id : null,
      organization_id: body.organization_id || null,
    });

    return NextResponse.json({
      success: true,
      data: draft,
    });
  } catch (error) {
    console.error('Failed to save draft:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
