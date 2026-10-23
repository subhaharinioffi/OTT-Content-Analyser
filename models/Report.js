import mongoose from 'mongoose';
import { connectToDatabase, isDbFallback, getLocalCollection, saveLocalCollection } from '@/lib/mongodb';
import { saveReportToCloud, getCloudReportById, getCloudReports } from '@/lib/cloudStorage';
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
      enum: ['U', 'U/A 7+', 'U/A 13+', 'U/A 16+', 'A', 'REJECTED'],
    },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    status: { type: String, default: 'Approved' },
    summary: { type: String, required: true },
    descriptors: {
      themes: { score: Number, severity: String, details: String },
      violence: { score: Number, severity: String, details: String },
      nudity: { score: Number, severity: String, details: String },
      sex: { score: Number, severity: String, details: String },
      language: { score: Number, severity: String, details: String },
      substanceAbuse: { score: Number, severity: String, details: String },
      horror: { score: Number, severity: String, details: String },
    },
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
  { timestamps: true }
);

const MongooseReport = mongoose.models.Report || mongoose.model('Report', ReportSchema);

export const ReportModel = {
  async find(filter = {}) {
    await connectToDatabase();
    if (!isDbFallback()) {
      try {
        const found = await MongooseReport.find(filter).sort({ createdAt: -1 });
        if (found && found.length > 0) return found;
      } catch (err) {
        console.warn('[ReportModel] Mongoose find error:', err.message);
      }
    }
    // Always fall back to cloud persistent storage
    const cloudReports = await getCloudReports();
    if (cloudReports && cloudReports.length > 0) {
      return cloudReports;
    }
    const local = getLocalCollection('reports');
    return local.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
