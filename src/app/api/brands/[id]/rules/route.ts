import { NextRequest, NextResponse } from 'next/server';
import { getBrandById, getBrandRules, createOrUpdateBrandRule, deleteBrandRule } from '@/lib/db';
import { getServerSessionUser } from '@/lib/auth';
import type { RuleCategory, RuleSeverity } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = getServerSessionUser(request);

    const brand = getBrandById(id, user?.id);
    if (!brand) {
      return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    }

    const rules = getBrandRules(id);
    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error('Failed to get brand rules:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const brand = getBrandById(id, user.id);
    if (!brand) {
      return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    }

    if (brand.is_sample) {
      return NextResponse.json({ success: false, error: 'Sample brand rules cannot be modified' }, { status: 403 });
    }

    if (brand.user_id && brand.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.title || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Rule title and content are required' },
        { status: 400 }
      );
    }

    const validCategories: RuleCategory[] = ['guideline', 'terminology', 'verified_fact', 'permitted_claim'];
    const validSeverities: RuleSeverity[] = ['violation', 'warning', 'suggestion'];

    const category: RuleCategory = validCategories.includes(body.category) ? body.category : 'guideline';
    const severity: RuleSeverity = validSeverities.includes(body.severity) ? body.severity : 'warning';

    let forbidden: string[] = [];
    if (Array.isArray(body.forbidden_terms)) {
      forbidden = body.forbidden_terms;
    } else if (typeof body.forbidden_terms === 'string') {
      forbidden = body.forbidden_terms
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    const rule = createOrUpdateBrandRule({
      id: body.id,
      brand_id: id,
      category,
      rule_key: body.rule_key || `RULE_${Date.now()}`,
      title: body.title,
      content: body.content,
      forbidden_terms: forbidden,
      replacement_terms: body.replacement_terms || '',
      rationale: body.rationale || '',
      severity,
    });

    return NextResponse.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Failed to save brand rule:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getServerSessionUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const brand = getBrandById(id, user.id);
    if (!brand) {
      return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
    }

    if (brand.is_sample) {
      return NextResponse.json({ success: false, error: 'Sample brand rules cannot be deleted' }, { status: 403 });
    }

    if (brand.user_id && brand.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('rule_id');

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: 'Missing rule_id query parameter' },
        { status: 400 }
      );
    }

    const deleted = deleteBrandRule(ruleId);
    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Rule deleted successfully' : 'Rule not found',
    });
  } catch (error) {
    console.error('Failed to delete brand rule:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
