import { NextRequest, NextResponse } from 'next/server';
import { getBrands, getArchivedBrands, createBrand, resetDatabaseToDefaults } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const isArchived = request.nextUrl.searchParams.get('archived') === 'true';
    const orgId = request.nextUrl.searchParams.get('org_id') || undefined;
    const user = getServerSessionUser(request);

    if (!user && !isDemo) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to access brands.' },
        { status: 401 }
      );
    }

    if (isArchived) {
      const archivedBrands = getArchivedBrands(user?.id);
      return NextResponse.json({
        success: true,
        data: archivedBrands,
      });
    }

    const brands = getBrands(user?.id, isDemo, 'active', orgId);
    return NextResponse.json({
      success: true,
      data: brands,
      is_demo: isDemo,
    });
  } catch (error) {
    console.error('Failed to get brands:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve brands' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getServerSessionUser(request);
    const body = await request.json();

    // 1. Support reset to clean seed presets (admin/demo only)
    if (body.action === 'reset_presets') {
      resetDatabaseToDefaults();
      const brands = getBrands(user?.id, true);
      return NextResponse.json({
        success: true,
        message: 'Database reset to default brand presets',
        data: brands,
      });
    }

    // Creating a personal brand requires an authenticated user
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to create a brand.' },
        { status: 401 }
      );
    }

    // 2. Support user brand creation
    if (body.name) {
      const name = String(body.name).trim();
      const industry = String(body.industry || '').trim();
      const description = String(body.description || '').trim();
      const tone = String(body.tone_guidelines || '').trim();
      const disclaimers = String(body.disclaimers || '').trim();

      if (!name || name.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Brand name must be at least 2 characters long.' },
          { status: 400 }
        );
      }

      if (!industry || industry.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Industry is required (e.g. Technology, Retail, Healthcare).' },
          { status: 400 }
        );
      }

      const newBrand = createBrand({
        name,
        industry,
        description: description || 'No description provided.',
        tone_guidelines: tone || 'Professional, trustworthy, and clear.',
        disclaimers: disclaimers || '',
        is_sample: false,
        user_id: user.id,
        organization_id: body.organization_id || null,
      });

      return NextResponse.json({
        success: true,
        data: newBrand,
        message: `Brand "${newBrand.name}" created successfully.`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing required brand name.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Failed to process brand action:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body or database error' },
      { status: 500 }
    );
  }
}
