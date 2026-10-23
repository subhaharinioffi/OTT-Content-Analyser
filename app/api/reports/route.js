import { NextResponse } from 'next/server';
import { ReportModel } from '@/models/Report';
import { ensureSeedData } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureSeedData();
    const reports = await ReportModel.find({});

    const totalSubmissions = reports.length;
    let totalRisk = 0;
    let highRiskCount = 0;
    let approvedCount = 0;

    reports.forEach((r) => {
      totalRisk += r.riskScore || 0;
      if (r.riskScore > 50) highRiskCount++;
      if (r.status === 'Approved' || r.ageClassification === 'U' || r.ageClassification === 'U/A 7+') {
        approvedCount++;
      }
    });

    const avgRiskScore = totalSubmissions > 0 ? Math.round(totalRisk / totalSubmissions) : 0;
    const clearanceRate = totalSubmissions > 0 ? Math.round((approvedCount / totalSubmissions) * 100) : 100;

    return NextResponse.json({
      reports,
      telemetry: {
        totalSubmissions,
        approvedCount,
        highRiskCount,
        avgRiskScore,
        clearanceRate,
      },
    });
  } catch (error) {
    console.error('Fetch reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance reports.' },
      { status: 500 }
    );
  }
}
