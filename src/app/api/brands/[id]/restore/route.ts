import { NextRequest, NextResponse } from 'next/server';
import { getBrandById, restoreBrand } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to restore brand.' },
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

    if (brand.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to restore this brand.' },
        { status: 403 }
      );
    }

    const success = restoreBrand(id, user.id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to restore brand.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Brand "${brand.name}" restored to active workspace.`,
    });
  } catch (error) {
    console.error('Failed to restore brand:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
