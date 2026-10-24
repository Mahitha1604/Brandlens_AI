import { NextRequest, NextResponse } from 'next/server';
import { getBrandById, updateBrand, deleteBrand } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isDemo = request.nextUrl.searchParams.get('demo') === 'true';
    const user = getServerSessionUser(request);

    const brand = getBrandById(id, user?.id);

    if (!brand) {
      return NextResponse.json(
        { success: false, error: `Brand '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    // If requesting user's brand but not demo and brand belongs to another user
    if (!isDemo && user && brand.user_id && brand.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this brand profile.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    console.error('Failed to get brand:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to update brand.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const updated = updateBrand(
      id,
      {
        name: body.name,
        industry: body.industry,
        description: body.description,
        tone_guidelines: body.tone_guidelines,
        disclaimers: body.disclaimers,
      },
      user.id
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Brand '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Failed to update brand:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to delete brand.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const brand = getBrandById(id, user.id);
    if (!brand) {
      return NextResponse.json(
        { success: false, error: `Brand '${id}' not found or access denied.` },
        { status: 404 }
      );
    }

    if (brand.is_sample) {
      return NextResponse.json(
        { success: false, error: 'Demonstration sample brands cannot be deleted.' },
        { status: 403 }
      );
    }

    if (brand.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to delete this brand.' },
        { status: 403 }
      );
    }

    const deleted = deleteBrand(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete brand.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Brand "${brand.name}" and associated rules were deleted successfully.`,
    });
  } catch (error) {
    console.error('Failed to delete brand:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
