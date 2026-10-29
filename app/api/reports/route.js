import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ReportModel } from '@/models/Report';
import { ensureSeedData } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await ensureSeedData();

    // Determine the logged in user's email
    let userEmail = '';

    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        userEmail = session.user.email;
      }
    } catch (sessionErr) {
      console.warn('Session retrieval notice in reports API:', sessionErr.message);
    }

    // Also support userEmail passed via query params (from client dashboard)
    if (request?.url) {
      const { searchParams } = new URL(request.url);
      const paramEmail = searchParams.get('userEmail') || searchParams.get('email');
      if (paramEmail) {
        userEmail = paramEmail;
      }
    }

    // The audit queue MUST NOT be common - only show contents for the authenticated user
    if (!userEmail) {
      return NextResponse.json({
        reports: [],
        telemetry: {
          totalSubmissions: 0,
          approvedCount: 0,
          highRiskCount: 0,
          avgRiskScore: 0,
          clearanceRate: 100,
        },
      });
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    const reports = await ReportModel.find({ userEmail: cleanEmail });

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
      userEmail: cleanEmail,
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

export async function DELETE(request) {
  try {
    let userEmail = '';
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        userEmail = session.user.email;
      }
    } catch (e) {}

    if (request?.url) {
      const { searchParams } = new URL(request.url);
      const paramEmail = searchParams.get('userEmail') || searchParams.get('email');
      if (paramEmail) userEmail = paramEmail;
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required to clean audit queue.' },
        { status: 400 }
      );
    }

    const cleanEmail = userEmail.toLowerCase().trim();
    await ReportModel.deleteMany({ userEmail: cleanEmail });

    return NextResponse.json({
      success: true,
      message: `Successfully cleared regulatory audit queue for ${cleanEmail}.`,
    });
  } catch (error) {
    console.error('Clean queue error:', error);
    return NextResponse.json(
      { error: 'Failed to clean regulatory audit queue.' },
      { status: 500 }
    );
  }
}
