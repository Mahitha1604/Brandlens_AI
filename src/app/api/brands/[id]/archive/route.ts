import { NextRequest, NextResponse } from 'next/server';
import { getBrandById, archiveBrand } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to archive brand.' },
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
        { success: false, error: 'Demonstration sample brands cannot be archived.' },
        { status: 403 }
      );
    }

    if (brand.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to archive this brand.' },
        { status: 403 }
      );
    }

    const success = archiveBrand(id, user.id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to archive brand.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Brand "${brand.name}" has been safely archived. All drafts, rules, and history are preserved.`,
    });
  } catch (error) {
    console.error('Failed to archive brand:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
