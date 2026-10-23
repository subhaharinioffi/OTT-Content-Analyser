import mongoose from 'mongoose';
import { connectToDatabase, isDbFallback, getLocalCollection, saveLocalCollection } from '@/lib/mongodb';
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
      return await MongooseReport.find(filter).sort({ createdAt: -1 });
    }
    const reports = getLocalCollection('reports');
    return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async findById(id) {
    await connectToDatabase();
    if (!isDbFallback()) {
      return await MongooseReport.findById(id);
    }
    const reports = getLocalCollection('reports');
    return reports.find((r) => r._id === id || r.id === id) || null;
  },

  async create(data) {
    await connectToDatabase();
    if (!isDbFallback()) {
      return await MongooseReport.create(data);
    }
    const reports = getLocalCollection('reports');
    const newReport = {
      _id: crypto.randomBytes(12).toString('hex'),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reports.unshift(newReport);
    saveLocalCollection('reports', reports);
    return newReport;
  },
};

export default MongooseReport;
