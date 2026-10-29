import mongoose from 'mongoose';
import { connectToDatabase, isDbFallback, getLocalCollection, saveLocalCollection } from '@/lib/mongodb';
import { saveReportToCloud, getCloudReportById, getCloudReports, uploadRawJson, updateCloudReportsIndex } from '@/lib/cloudStorage';
import crypto from 'crypto';

const ReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    contentType: {
      type: String,
      required: true,
      enum: ['Poster (img)', 'Movie', 'Short Film', 'Song', 'Short Video (Reels)'],
    },
    aspectRatio: { type: String, default: '16:9' },
    mediaUrl: { type: String, required: true },
    publicId: { type: String },
    fileSize: { type: Number },
    duration: { type: Number, default: 0 },
    userEmail: { type: String, default: 'creator@cinema.io' },
    ageClassification: {
      type: String,
      required: true,
    },
    assignedRating: { type: String },
    targetRatingGoal: { type: String, default: 'Auto-Detect (Standard Assessment)' },
    targetRatingAchieved: { type: Boolean, default: true },
    complianceScore: { type: Number, default: 75 },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    status: { type: String, default: 'Approved' },
    officialContentDescriptor: { type: String },
    summary: { type: String, required: true },
    executiveSummary: { type: String },
    overallSummary: { type: String },
    contentReview: { type: mongoose.Schema.Types.Mixed },
    contentFlags: { type: mongoose.Schema.Types.Mixed },
    suggestions: { type: mongoose.Schema.Types.Mixed },
    videoFrames: { type: mongoose.Schema.Types.Mixed },
    themeMatrix: [
      {
        themeId: String,
        themeName: String,
        severity: String,
        violationCount: Number,
        summaryNote: String,
      },
    ],
    descriptors: {
      themes: { score: Number, severity: String, details: String },
      violence: { score: Number, severity: String, details: String },
      nudity: { score: Number, severity: String, details: String },
      sex: { score: Number, severity: String, details: String },
      language: { score: Number, severity: String, details: String },
      substanceAbuse: { score: Number, severity: String, details: String },
      horror: { score: Number, severity: String, details: String },
    },
    pinpointedIssues: [
      {
        id: String,
        themeId: String,
        themeName: String,
        severity: String,
        modality: String,
        timestampStart: String,
        timestampEnd: String,
        timestampSeconds: Number,
        boundingBox: {
          ymin: Number,
          xmin: Number,
          ymax: Number,
          xmax: Number,
          regionLabel: String,
        },
        offendingSnippet: String,
        problemDescription: String,
        remediation: {
          toAchieveTargetRating: String,
          editType: String,
          ratingImpactIfUnchanged: String,
        },
      },
    ],
    violations: [
      {
        startTime: String,
        endTime: String,
        secondOffset: Number,
        category: String,
        severity: String,
        description: String,
        ruleViolated: String,
        actionableSuggestion: String,
      },
    ],
    remediationSuggestions: [
      {
        action: String,
        projectedRiskScore: Number,
        impact: String,
      },
    ],
  },
  { timestamps: true, strict: false }
);

const MongooseReport = mongoose.models.Report || mongoose.model('Report', ReportSchema);

export const ReportModel = {
  async find(filter = {}) {
    await connectToDatabase();
    if (!isDbFallback()) {
      try {
        const found = await MongooseReport.find(filter).sort({ createdAt: -1 });
        if (found) return found;
      } catch (err) {
        console.warn('[ReportModel] Mongoose find error:', err.message);
      }
    }
    // Always fall back to cloud persistent storage
    const cloudReports = await getCloudReports();
    let reports = cloudReports && cloudReports.length > 0 ? [...cloudReports] : [...getLocalCollection('reports')];

    // Filter by userEmail if specified
    if (filter && filter.userEmail) {
      const target = filter.userEmail.toLowerCase().trim();
      reports = reports.filter((r) => (r.userEmail || '').toLowerCase().trim() === target);
    }

    return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async deleteMany(filter = {}) {
    await connectToDatabase();
    if (!isDbFallback()) {
      try {
        await MongooseReport.deleteMany(filter);
      } catch (err) {
        console.warn('[ReportModel] Mongoose deleteMany error:', err.message);
      }
    }
    let reports = await getCloudReports();
    if (filter && filter.userEmail) {
      const target = filter.userEmail.toLowerCase().trim();
      reports = reports.filter((r) => (r.userEmail || '').toLowerCase().trim() !== target);
    } else {
      reports = [];
    }
    await updateCloudReportsIndex(reports);
    saveLocalCollection('reports', reports);
    return true;
  },

  async findById(id) {
    if (!id) return null;
    await connectToDatabase();
    if (!isDbFallback()) {
      try {
        const found = await MongooseReport.findById(id);
        if (found) return found;
      } catch (err) {
        console.warn('[ReportModel] Mongoose findById error:', err.message);
      }
    }
    // Check Cloudinary cloud persistent storage
    const cloudReport = await getCloudReportById(id);
    if (cloudReport) return cloudReport;

    // Check local fallback
    const local = getLocalCollection('reports');
    return local.find((r) => r._id === id || r.id === id) || null;
  },

  async create(data) {
    await connectToDatabase();
    let created = null;
    if (!isDbFallback()) {
      try {
        created = await MongooseReport.create(data);
      } catch (err) {
        console.warn('[ReportModel] Mongoose create error:', err.message);
      }
    }

    if (!created) {
      const generatedId = crypto.randomBytes(12).toString('hex');
      created = {
        _id: generatedId,
        id: generatedId,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const reports = getLocalCollection('reports');
      reports.unshift(created);
      saveLocalCollection('reports', reports);
    }

    // Always persist to Cloudinary cloud storage so every Vercel serverless lambda can access it immediately
    try {
      const plainReport = JSON.parse(JSON.stringify(created));
      await saveReportToCloud(plainReport);
    } catch (cloudErr) {
      console.warn('[ReportModel] Cloud storage sync warning:', cloudErr.message);
    }

    return created;
  },
};

export default MongooseReport;
