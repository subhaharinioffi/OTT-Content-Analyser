import { NextResponse } from 'next/server';
import { ReportModel } from '@/models/Report';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Report ID is required.' }, { status: 400 });
    }

    const report = await ReportModel.findById(id);

    if (!report) {
      return NextResponse.json({ error: 'Compliance report not found.' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Fetch single report error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve compliance report.' },
      { status: 500 }
    );
  }
}
