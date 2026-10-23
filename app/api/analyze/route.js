import { NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { analyzeMediaCompliance } from '@/lib/gemini';
import { ReportModel } from '@/models/Report';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title') || 'Untitled Asset';
    const contentType = formData.get('contentType') || 'Movie';
    const aspectRatio = formData.get('aspectRatio') || '16:9';
    const userEmail = formData.get('userEmail') || 'creator@cinema.io';
    let duration = parseFloat(formData.get('duration') || '0');

    if (!file) {
      return NextResponse.json(
        { error: 'No media file provided for analysis.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'video/mp4';

    console.log(`[Analyze API] Processing file "${title}", size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB, mime: ${mimeType}`);

    // Step 1: Upload to Cloudinary
    let cloudinaryResult = null;
    try {
      cloudinaryResult = await uploadToCloudinary(buffer, {
        resource_type: 'auto',
        public_id: `ott_${Date.now()}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      });
      console.log('[Analyze API] Cloudinary upload successful:', cloudinaryResult.secure_url);
    } catch (uploadErr) {
      console.error('[Analyze API] Cloudinary upload failed:', uploadErr);
      return NextResponse.json(
        { error: `Cloudinary media storage failed: ${uploadErr.message}` },
        { status: 500 }
      );
    }

    if (cloudinaryResult.duration && !duration) {
      duration = Math.round(cloudinaryResult.duration);
    }

    // Step 2: Multi-modal AI Regulatory Analysis via Gemini
    console.log('[Analyze API] Invoking Gemini Compliance Engine...');
    const complianceAnalysis = await analyzeMediaCompliance({
      fileBuffer: buffer,
      mimeType: mimeType,
      title: title,
      contentType: contentType,
      aspectRatio: aspectRatio,
      duration: duration,
      cloudinaryUrl: cloudinaryResult.secure_url,
    });

    // Step 3: Persist Compliance Report in MongoDB Atlas
    console.log('[Analyze API] Persisting report to database...');
    const newReport = await ReportModel.create({
      title,
      contentType,
      aspectRatio,
      mediaUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      fileSize: buffer.length,
      duration: duration,
      userEmail,
      ageClassification: complianceAnalysis.ageClassification || 'U/A 13+',
      riskScore: typeof complianceAnalysis.riskScore === 'number' ? complianceAnalysis.riskScore : 35,
      status: complianceAnalysis.status || 'Conditional Approval',
      summary: complianceAnalysis.summary || 'Content analysis completed.',
      descriptors: complianceAnalysis.descriptors || {},
      violations: complianceAnalysis.violations || [],
      remediationSuggestions: complianceAnalysis.remediationSuggestions || [],
    });

    return NextResponse.json(
      {
        success: true,
        reportId: newReport._id?.toString() || newReport.id,
        report: newReport,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Analyze API] Fatal error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete regulatory analysis.' },
      { status: 500 }
    );
  }
}
