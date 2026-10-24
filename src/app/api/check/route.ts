import { NextRequest, NextResponse } from 'next/server';
import { runDeterministicChecksForBrand } from '@/lib/engine/deterministic';
import { getBrandById } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = getServerSessionUser(request);
    const body = await request.json();
    const { brand_id, text } = body;

    if (!brand_id || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'brand_id and text are required fields' },
        { status: 400 }
      );
    }

    const brand = getBrandById(brand_id, user?.id);
    if (!brand) {
      return NextResponse.json(
        { success: false, error: `Brand '${brand_id}' not found or access denied` },
        { status: 404 }
      );
    }

    const result = runDeterministicChecksForBrand(text, brand_id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to run deterministic checks:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while evaluating rules' },
      { status: 500 }
    );
  }
}
