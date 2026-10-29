import { NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { analyzeMediaCompliance } from '@/lib/gemini';
import { ReportModel } from '@/models/Report';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  try {
    let title = 'Untitled Asset';
    let contentType = 'Movie';
    let aspectRatio = '16:9';
    let userEmail = 'creator@cinema.io';
    let targetRatingGoal = 'Auto-Detect (Standard Assessment)';
    let duration = 0;
    let cloudinaryUrl = '';
    let publicId = '';
    let fileSize = 0;
    let buffer = null;
    let mimeType = 'video/mp4';
    let videoFrames = [];

    const contentTypeHeader = request.headers.get('content-type') || '';

    // Handle JSON payload (from Direct Client-to-Cloudinary upload or extracted frames)
    if (contentTypeHeader.includes('application/json')) {
      const jsonBody = await request.json();
      title = jsonBody.title || title;
      contentType = jsonBody.contentType || contentType;
      aspectRatio = jsonBody.aspectRatio || aspectRatio;
      userEmail = jsonBody.userEmail || userEmail;
      targetRatingGoal = jsonBody.targetRatingGoal || targetRatingGoal;
      duration = parseFloat(jsonBody.duration || '0');
      cloudinaryUrl = jsonBody.cloudinaryUrl || '';
      publicId = jsonBody.publicId || '';
      fileSize = jsonBody.fileSize || 0;
      mimeType = jsonBody.mimeType || mimeType;
      videoFrames = Array.isArray(jsonBody.videoFrames) ? jsonBody.videoFrames : [];

      console.log(`[Analyze API JSON] Processing "${title}" (${contentType}), Cloudinary URL: ${cloudinaryUrl}, Frames: ${videoFrames.length}`);
    } else {
      // Handle Multipart Form Data payload (fallback for small files / images)
      const formData = await request.formData();
      const file = formData.get('file');
      title = formData.get('title') || title;
      contentType = formData.get('contentType') || contentType;
      aspectRatio = formData.get('aspectRatio') || aspectRatio;
      userEmail = formData.get('userEmail') || userEmail;
      targetRatingGoal = formData.get('targetRatingGoal') || targetRatingGoal;
      duration = parseFloat(formData.get('duration') || '0');

      if (!file) {
        return NextResponse.json(
          { error: 'No media file provided for analysis.' },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      mimeType = file.type || mimeType;
      fileSize = buffer.length;

      console.log(`[Analyze API Multipart] Processing file "${title}", size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

      // Upload buffer to Cloudinary
      const safeSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'asset';
      try {
        const cloudinaryResult = await uploadToCloudinary(buffer, {
          resource_type: 'auto',
          public_id: `ott_${Date.now()}_${safeSlug}`,
        });
        cloudinaryUrl = cloudinaryResult.secure_url;
        publicId = cloudinaryResult.public_id;
        if (cloudinaryResult.duration && !duration) {
          duration = Math.round(cloudinaryResult.duration);
        }
        console.log('[Analyze API Multipart] Cloudinary upload successful:', cloudinaryUrl);
      } catch (uploadErr) {
        console.error('[Analyze API Multipart] Cloudinary upload failed:', uploadErr);
        return NextResponse.json(
          { error: `Cloudinary media storage failed: ${uploadErr.message}` },
          { status: 500 }
        );
      }
    }

    if (!cloudinaryUrl) {
      return NextResponse.json(
        { error: 'Media URL missing. Please re-upload your file.' },
        { status: 400 }
      );
    }

    // Step 2: Multi-modal AI Regulatory Analysis via Gemini Engine
    console.log('[Analyze API] Invoking Gemini Compliance Engine for:', title);
    const complianceAnalysis = await analyzeMediaCompliance({
      fileBuffer: buffer, // will be null for large client-uploaded videos
      mimeType: mimeType,
      title: title,
      contentType: contentType,
      aspectRatio: aspectRatio,
      duration: duration,
      cloudinaryUrl: cloudinaryUrl,
      targetRatingGoal: targetRatingGoal,
      videoFrames: videoFrames,
    });

    // Step 3: Persist Compliance Report in MongoDB Atlas & Cloud Storage
    console.log('[Analyze API] Persisting report to database...');
    const newReport = await ReportModel.create({
      title,
      contentType,
      aspectRatio,
      mediaUrl: cloudinaryUrl,
      publicId: publicId,
      fileSize: fileSize,
      duration: duration,
      userEmail,
      ageClassification: complianceAnalysis.assignedRating || complianceAnalysis.ageClassification || 'U/A 13+',
      assignedRating: complianceAnalysis.assignedRating || complianceAnalysis.ageClassification || 'U/A 13+',
      targetRatingGoal: targetRatingGoal,
      targetRatingAchieved: complianceAnalysis.targetRatingAchieved,
      complianceScore: typeof complianceAnalysis.complianceScore === 'number' ? complianceAnalysis.complianceScore : 75,
      riskScore: typeof complianceAnalysis.riskScore === 'number' ? complianceAnalysis.riskScore : 25,
      status: complianceAnalysis.status || 'Conditional Approval',
      officialContentDescriptor: complianceAnalysis.officialContentDescriptor,
      summary: complianceAnalysis.executiveSummary || complianceAnalysis.summary,
      executiveSummary: complianceAnalysis.executiveSummary || complianceAnalysis.summary,
      overallSummary: complianceAnalysis.overallSummary || complianceAnalysis.summary,
      contentReview: complianceAnalysis.contentReview,
      contentFlags: complianceAnalysis.contentFlags,
      suggestions: complianceAnalysis.suggestions,
      themeMatrix: complianceAnalysis.themeMatrix || [],
      descriptors: complianceAnalysis.descriptors || {},
      pinpointedIssues: complianceAnalysis.pinpointedIssues || [],
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
