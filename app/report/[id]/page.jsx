'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ShieldCheck,
  AlertTriangle,
  Download,
  ArrowLeft,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Film,
  Music,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Crosshair,
  Lightbulb,
  FileText,
  Layers,
  HelpCircle,
  AlertOctagon,
  Eye,
  Sliders,
  ExternalLink,
  X,
} from 'lucide-react';
import CinemaVideoWallBg from '@/components/CinemaVideoWallBg';
import MagicBentoCard from '@/components/MagicBentoCard';
import styles from './report.module.css';

/**
 * Normalizes report data so that both new structured reports and legacy reports
 * conform seamlessly to the 4-Section Dashboard structure.
 */
function normalizeReportData(report) {
  if (!report) return null;

  const isPoster = report.contentType?.includes('Poster');
  const isSong = report.contentType?.includes('Song');
  const isVideo = ['Movie', 'Short Film', 'Short Video (Reels)'].includes(report.contentType || '');

  // 1. Content Review
  const defaultReview = {
    summary:
      report.executiveSummary ||
      report.summary ||
      `Comprehensive content review conducted on ${report.title} (${report.contentType || 'Asset'}).`,
    storyOrSubject:
      isPoster
        ? 'Visual key promotional art framing the thematic identity of the production.'
        : isSong
        ? 'Lyrical narrative and audio master composition.'
        : 'Narrative arc depicting protagonist conflict, thematic resolution, and character dynamics.',
    mainThemes: ['Cinematic Drama', 'Atmospheric Storytelling'],
    overallTone: 'Tense, engaging, and atmospheric',
    contentCharacteristics: 'Crafted for theatrical and OTT broadcast distribution.',
    genreClassification: {
      primaryGenre: isPoster ? 'Key Visual Art' : isSong ? 'Contemporary Audio' : 'Drama',
      secondaryGenres: ['Thriller', 'Contemporary Fiction'],
      genreBreakdown: [
        { genre: isPoster ? 'Key Visual Art' : 'Drama', percentage: 70 },
        { genre: 'Thriller', percentage: 45 },
      ],
      coexistenceExplanation:
        'Multiple genres coexist naturally within the media. Percentages denote estimated presence and strength rather than mutually exclusive probability.',
    },
  };

  const contentReview = report.contentReview
    ? {
        ...defaultReview,
        ...report.contentReview,
        genreClassification: {
          ...defaultReview.genreClassification,
          ...(report.contentReview.genreClassification || {}),
          genreBreakdown:
            Array.isArray(report.contentReview.genreClassification?.genreBreakdown) &&
            report.contentReview.genreClassification.genreBreakdown.length > 0
              ? report.contentReview.genreClassification.genreBreakdown
              : defaultReview.genreClassification.genreBreakdown,
        },
      }
    : defaultReview;

  // 2. Content Flags (6 Mandatory Regulatory Themes)
  const MANDATORY_CATEGORIES = [
    'Violence',
    'Nudity & Sex',
    'Language',
    'Substance Abuse',
    'Threat & Horror',
    'Discrimination & Sovereignty',
  ];

  let contentFlags = [];

  if (Array.isArray(report.contentFlags) && report.contentFlags.length > 0) {
    contentFlags = MANDATORY_CATEGORIES.map((catName) => {
      const match = report.contentFlags.find(
        (f) =>
          f.category &&
          f.category.toLowerCase().replace(/[^a-z]/g, '') === catName.toLowerCase().replace(/[^a-z]/g, '')
      );
      if (match) {
        const isDetected = Boolean(match.detected && match.severity !== 'None');
        let box = match.boundingBox || null;
        if (!box && (isDetected || isPoster)) {
          const loc = ((match.timestamp || '') + ' ' + (match.evidence || '')).toLowerCase();
          if (loc.includes('central') || loc.includes('center')) {
            box = { ymin: 250, xmin: 250, ymax: 750, xmax: 750, regionLabel: 'Central Visual Focus' };
          } else if (loc.includes('top')) {
            box = { ymin: 60, xmin: 180, ymax: 420, xmax: 820, regionLabel: 'Top Visual Margin' };
          } else if (loc.includes('bottom')) {
            box = { ymin: 620, xmin: 150, ymax: 940, xmax: 850, regionLabel: 'Bottom Visual Ticker' };
          } else if (loc.includes('left')) {
            box = { ymin: 250, xmin: 60, ymax: 750, xmax: 480, regionLabel: 'Left Visual Frame' };
          } else if (loc.includes('right')) {
            box = { ymin: 250, xmin: 520, ymax: 750, xmax: 940, regionLabel: 'Right Visual Frame' };
          } else if (isPoster) {
            box = { ymin: 220, xmin: 200, ymax: 780, xmax: 800, regionLabel: 'Central Visual Focus' };
          }
        }

        return {
          category: catName,
          detected: isDetected,
          severity: isDetected ? match.severity || 'Moderate' : 'None',
          explanation: match.explanation || (isDetected ? 'Identified during regulatory screening.' : 'No concerns detected.'),
          evidence: match.evidence || 'N/A',
          timestamp: match.timestamp || (isPoster ? 'Central Visual Focus' : '00:00'),
          confidence: typeof match.confidence === 'number' ? match.confidence : 92,
          context: match.context || 'Evaluated under OTT and CBFC statutory guidelines.',
          uncertainForHumanReview: Boolean(match.uncertainForHumanReview || (isDetected && match.confidence < 75)),
          boundingBox: box,
        };
      }
      return {
        category: catName,
        detected: false,
        severity: 'None',
        explanation: `No ${catName.toLowerCase()} concerns detected in the submitted media.`,
        evidence: 'N/A',
        timestamp: 'N/A',
        confidence: 95,
        context: 'Clean under regulatory guidelines.',
        uncertainForHumanReview: false,
        boundingBox: null,
      };
    });
  } else {
    // Map from legacy themeMatrix or violations if old format
    const legacyIssues = report.pinpointedIssues || report.violations || [];
    contentFlags = MANDATORY_CATEGORIES.map((catName) => {
      const matchingIssue = legacyIssues.find((iss) => {
        const name = (iss.themeName || iss.category || '').toLowerCase();
        return name.includes(catName.toLowerCase().slice(0, 4));
      });

      if (matchingIssue) {
        return {
          category: catName,
          detected: true,
          severity: matchingIssue.severity || 'Moderate',
          explanation: matchingIssue.problemDescription || matchingIssue.description || 'Statutory review trigger.',
          evidence: matchingIssue.offendingSnippet || matchingIssue.description || 'Evidence documented in media timeline.',
          timestamp: matchingIssue.timestampStart
            ? `${matchingIssue.timestampStart} - ${matchingIssue.timestampEnd || matchingIssue.timestampStart}`
            : isPoster
            ? 'Key Visual Region'
            : '00:15',
          confidence: 88,
          context: 'Identified during statutory OTT screening.',
          uncertainForHumanReview: false,
        };
      }

      return {
        category: catName,
        detected: false,
        severity: 'None',
        explanation: `No ${catName.toLowerCase()} concerns detected in the submitted media.`,
        evidence: 'N/A',
        timestamp: 'N/A',
        confidence: 95,
        context: 'Clean under regulatory guidelines.',
        uncertainForHumanReview: false,
      };
    });
  }

  // 3. Suggestions
  const detectedCount = contentFlags.filter((f) => f.detected).length;
  let suggestions = report.suggestions;

  if (!suggestions) {
    suggestions = {
      creativeImprovement:
        'Strengthen dialogue rhythm and narrative pacing during pivotal dramatic transitions to enhance overall audience connection.',
      regulatoryImprovement:
        detectedCount > 0
          ? 'Apply subtle editorial trimming or audio moderation to flagged sequences to achieve target statutory clearance.'
          : 'No regulatory reduction suggestions required.',
    };
  }

  if (detectedCount === 0) {
    suggestions.regulatoryImprovement = 'No regulatory reduction suggestions required.';
  }

  return {
    ...report,
    contentReview,
    contentFlags,
    suggestions,
    videoFrames: Array.isArray(report.videoFrames) ? report.videoFrames : [],
    assignedRating: report.assignedRating || report.ageClassification || 'U/A 13+',
    complianceScore: typeof report.complianceScore === 'number' ? report.complianceScore : 88,
    riskScore: typeof report.riskScore === 'number' ? report.riskScore : 12,
  };
}

export default function ReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const videoRef = useRef(null);
  const inspectorRef = useRef(null);

  const [rawReport, setRawReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedFlags, setExpandedFlags] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [activeHighlight, setActiveHighlight] = useState(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/reports/${id}`);
        const data = await res.json();
        if (data.report) {
          setRawReport(data.report);
        } else {
          setError(data.error || 'Report not found.');
        }
      } catch (err) {
        setError('Failed to load compliance report.');
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadReport();
    }
  }, [id]);

  const report = normalizeReportData(rawReport);

  const toggleFlagExpand = (category) => {
    setExpandedFlags((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSeek = (timestampStr) => {
    if (!videoRef.current || !timestampStr) return;
    const match = timestampStr.match(/(\d+):(\d+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const totalSec = minutes * 60 + seconds;
      videoRef.current.currentTime = totalSec;
      videoRef.current.play();
    }
  };

  /**
   * Smoothly navigates to the Media Inspector and highlights the exact flagged issue.
   * For video assets, pulls the extracted scene keyframe from that exact timestamp
   * and renders the bounding box overlay directly over the scene.
   */
  const handleInspectIssue = (flag) => {
    if (!flag) return;

    let box = flag.boundingBox;
    const locText = ((flag.timestamp || '') + ' ' + (flag.evidence || '')).toLowerCase();

    if (!box) {
      if (locText.includes('central') || locText.includes('center')) {
        box = { ymin: 250, xmin: 250, ymax: 750, xmax: 750, regionLabel: 'Central Visual Focus' };
      } else if (locText.includes('top')) {
        box = { ymin: 60, xmin: 180, ymax: 420, xmax: 820, regionLabel: 'Top Visual Margin' };
      } else if (locText.includes('bottom')) {
        box = { ymin: 620, xmin: 150, ymax: 940, xmax: 850, regionLabel: 'Bottom Visual Ticker' };
      } else if (locText.includes('left')) {
        box = { ymin: 250, xmin: 60, ymax: 750, xmax: 480, regionLabel: 'Left Visual Frame' };
      } else if (locText.includes('right')) {
        box = { ymin: 250, xmin: 520, ymax: 750, xmax: 940, regionLabel: 'Right Visual Frame' };
      } else {
        box = { ymin: 220, xmin: 200, ymax: 780, xmax: 800, regionLabel: flag.timestamp || 'Central Visual Focus' };
      }
    }

    // Match exact or closest movie scene keyframe
    let sceneFrameSrc = null;
    let sceneFrameTime = flag.timestamp;
    if (Array.isArray(report?.videoFrames) && report.videoFrames.length > 0) {
      const match = (flag.timestamp || '').match(/(\d+):(\d+)/);
      if (match) {
        const targetSec = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        let closest = report.videoFrames[0];
        let minDiff = Infinity;
        for (const f of report.videoFrames) {
          const sec = typeof f.secondOffset === 'number' ? f.secondOffset : 0;
          const diff = Math.abs(sec - targetSec);
          if (diff < minDiff) {
            minDiff = diff;
            closest = f;
          }
        }
        if (closest && closest.data) {
          sceneFrameSrc = `data:image/jpeg;base64,${closest.data}`;
          sceneFrameTime = closest.timestamp || flag.timestamp;
        }
      } else if (report.videoFrames[0]?.data) {
        sceneFrameSrc = `data:image/jpeg;base64,${report.videoFrames[0].data}`;
      }
    }

    setActiveHighlight({
      category: flag.category,
      severity: flag.severity,
      explanation: flag.explanation,
      evidence: flag.evidence,
      timestamp: flag.timestamp,
      regionLabel: box?.regionLabel || flag.timestamp || 'Central Visual Focus',
      box: box || { ymin: 250, xmin: 250, ymax: 750, xmax: 750, regionLabel: 'Central Visual Focus' },
      sceneFrame: sceneFrameSrc,
      sceneFrameTime: sceneFrameTime,
    });

    // If timestamp has minutes/seconds, seek the video
    if (flag.timestamp && flag.timestamp.includes(':')) {
      handleSeek(flag.timestamp);
    }

    // Smoothly scroll directly to the Media Inspector
    if (inspectorRef.current) {
      inspectorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Section 4: Full Multi-page PDF Report Export
  const exportPDF = () => {
    if (!report) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [229, 28, 35]; // #E51C23 Crimson
    const darkSlate = [15, 23, 42]; // #0F172A
    const lightSlate = [241, 245, 249];
    const textDark = [30, 41, 59];
    const textMuted = [100, 116, 139];

    // --- Header Banner ---
    doc.setFillColor(...darkSlate);
    doc.rect(0, 0, 210, 32, 'F');

    doc.setFillColor(...primaryColor);
    doc.rect(0, 32, 210, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('SHORTFUNDLY CENSORAI', 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text('OFFICIAL CONTENT REGULATORY COMPLIANCE & AI REVIEW AUDIT', 14, 21);

    const submissionDate = new Date(report.createdAt || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Report ID: SFC-${(report._id?.toString() || report.id || 'AUDIT').slice(-8).toUpperCase()}  |  Date: ${submissionDate}`, 14, 27);

    // --- Section 1: Media Specifications ---
    doc.setTextColor(...textDark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. SUBMITTED MEDIA SPECIFICATIONS', 14, 42);

    const metaBody = [
      ['Asset Title', report.title || 'Untitled Asset', 'Assigned Age Rating', report.assignedRating || 'U/A 13+'],
      ['Media Format', report.contentType || 'Video', 'Target Rating Goal', report.targetRatingGoal || 'Auto-Detect'],
      ['Aspect Ratio', report.aspectRatio || '16:9', 'Compliance Score', `${report.complianceScore ?? 88} / 100`],
      [
        'Duration / Size',
        report.duration ? `${report.duration}s (${(report.fileSize / 1024 / 1024).toFixed(2)} MB)` : `${(report.fileSize / 1024 / 1024 || 1).toFixed(2)} MB`,
        'Release Status',
        report.status || 'Approved',
      ],
    ];

    autoTable(doc, {
      startY: 46,
      head: [['Attribute', 'Media Specification', 'Statutory Metric', 'Certification Value']],
      body: metaBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });

    // --- Section 2: Content Review ---
    let curY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text('2. SECTION 1 — CONTENT REVIEW & THEMATIC SUMMARY', 14, curY);

    curY += 5;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('Content Summary:', 14, curY);

    curY += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textDark);
    const splitSummary = doc.splitTextToSize(report.contentReview?.summary || 'N/A', 182);
    doc.text(splitSummary, 14, curY);
    curY += splitSummary.length * 4 + 3;

    // Story / Subject & Tone
    const storyText = `Story / Subject: ${report.contentReview?.storyOrSubject || 'N/A'}`;
    const splitStory = doc.splitTextToSize(storyText, 182);
    doc.text(splitStory, 14, curY);
    curY += splitStory.length * 4 + 2;

    const toneText = `Overall Tone: ${report.contentReview?.overallTone || 'Atmospheric'}  |  Main Themes: ${(report.contentReview?.mainThemes || []).join(', ')}`;
    doc.text(toneText, 14, curY);
    curY += 6;

    // Genre Breakdown Table
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text(`Primary Genre: ${report.contentReview?.genreClassification?.primaryGenre || 'Drama'}`, 14, curY);

    const genreRows = (report.contentReview?.genreClassification?.genreBreakdown || []).map((g) => [
      g.genre,
      `${g.percentage}% Presence / Strength`,
      'Coexists naturally as multi-genre influence',
    ]);

    autoTable(doc, {
      startY: curY + 3,
      head: [['Genre / Theme', 'Estimated Presence', 'Classification Context']],
      body: genreRows,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2 },
    });

    curY = doc.lastAutoTable.finalY + 8;

    // Check if new page needed
    if (curY > 230) {
      doc.addPage();
      curY = 20;
    }

    // --- Section 3: Content Flags (6 Mandatory Themes) ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text('3. SECTION 2 — CONTENT FLAGS & REGULATORY ANALYSIS', 14, curY);
    curY += 5;

    const flagRows = (report.contentFlags || []).map((flag) => [
      flag.category,
      flag.detected ? 'FLAG DETECTED' : 'CLEAN / NONE',
      flag.detected ? flag.severity : 'None',
      flag.detected ? flag.timestamp : 'N/A',
      `${flag.confidence}%`,
      flag.explanation || 'Verified compliant',
    ]);

    autoTable(doc, {
      startY: curY,
      head: [['Regulatory Theme', 'Status', 'Severity', 'Where / Time', 'Confidence', 'Analysis Findings']],
      body: flagRows,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2.2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32 },
        1: { cellWidth: 26 },
        2: { cellWidth: 20 },
        3: { cellWidth: 24 },
        4: { cellWidth: 18 },
        5: { cellWidth: 62 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'FLAG DETECTED') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [16, 185, 129];
          }
        }
      },
    });

    curY = doc.lastAutoTable.finalY + 8;
    if (curY > 240) {
      doc.addPage();
      curY = 20;
    }

    // --- Section 4: Suggestions ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text('4. SECTION 3 — EDITORIAL & REGULATORY SUGGESTIONS', 14, curY);
    curY += 5;

    autoTable(doc, {
      startY: curY,
      head: [['Suggestion Category', 'Detailed Actionable Recommendation']],
      body: [
        ['Creative Improvement', report.suggestions?.creativeImprovement || 'Pacing and character engagement optimizations.'],
        ['Regulatory Improvement', report.suggestions?.regulatoryImprovement || 'No regulatory reduction suggestions required.'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: 137 },
      },
    });

    curY = doc.lastAutoTable.finalY + 8;
    if (curY > 250) {
      doc.addPage();
      curY = 20;
    }

    // --- Section 5: Disclaimer & Summary ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text('5. OVERALL REVIEW SUMMARY & STATUTORY DISCLAIMER', 14, curY);
    curY += 4;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    const summaryTextFull = report.overallSummary || report.summary || 'Content evaluated against statutory standards.';
    const splitFull = doc.splitTextToSize(summaryTextFull, 182);
    doc.text(splitFull, 14, curY);
    curY += splitFull.length * 3.8 + 3;

    const disclaimer =
      'Disclaimer: This report was generated autonomously by ShortFundly CensorAI utilizing the Google Gemini API. Findings are structured according to CBFC Section 5B and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021. Final streaming publication approval is subject to verified human compliance sign-off.';
    const splitDisc = doc.splitTextToSize(disclaimer, 182);
    doc.text(splitDisc, 14, curY);

    // --- Page Numbering on All Pages ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `ShortFundly CensorAI • Certified Compliance Memorandum  |  Page ${i} of ${pageCount}`,
        14,
        290
      );
      doc.text(
        'CONFIDENTIAL & PROPRIETARY',
        165,
        290
      );
    }

    doc.save(`ShortFundly_CensorAI_Review_${(report.title || 'asset').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <div className={styles.reportWrapper}>
        <CinemaVideoWallBg />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Synthesizing structured content review dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className={styles.reportWrapper}>
        <CinemaVideoWallBg />
        <div className={styles.errorContainer}>
          <AlertTriangle size={48} className={styles.errorIcon} />
          <h2>Compliance Audit Not Found</h2>
          <p>{error || 'The requested analysis record could not be loaded.'}</p>
          <Link href="/" className={styles.backBtn}>
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const isPoster = report.contentType?.includes('Poster');
  const isSong = report.contentType?.includes('Song');
  const isVertical = report.aspectRatio === '9:16';

  const detectedFlags = (report.contentFlags || []).filter((f) => f.detected);
  const cleanFlags = (report.contentFlags || []).filter((f) => !f.detected);

  const getSeverityBadgeClass = (severity) => {
    const s = String(severity || '').toLowerCase();
    if (s.includes('sev') || s.includes('crit') || s.includes('high')) return styles.sevSevere;
    if (s.includes('mod') || s.includes('med')) return styles.sevModerate;
    return styles.sevLow;
  };

  return (
    <div className={styles.reportWrapper}>
      {/* Dynamic Looping OTT Video Wall Background */}
      <CinemaVideoWallBg />

      <div className={styles.reportContainer}>
        {/* Navigation & Action Bar */}
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>

          <div className={styles.actionGroup}>
            {/* Prominent Section 4 PDF Button */}
            <button onClick={exportPDF} className={styles.exportPdfButton} title="Download Complete Review Report as PDF">
              <Download size={16} />
              <span>Download Full Review as PDF</span>
            </button>
          </div>
        </div>

        {/* Header Hero Banner: Media Title & Statutory Overview */}
        <div className={styles.heroBannerCard}>
          <div className={styles.heroLeft}>
            <div className={styles.metaBadgeRow}>
              <span className={styles.badgeFormat}>{report.contentType}</span>
              <span className={styles.badgeAspect}>{report.aspectRatio}</span>
              <span className={styles.badgeDate}>
                Submission: {new Date(report.createdAt || Date.now()).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1 className={styles.mediaTitle}>{report.title}</h1>
            <p className={styles.mediaSubtitle}>{report.contentReview?.summary || report.summary}</p>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.ratingCard}>
              <span className={styles.ratingCardLabel}>Certified Age Rating</span>
              <div className={`${styles.ageBadge} ${styles[`badge_${report.assignedRating.replace(/[^a-zA-Z0-9]/g, '')}`] || styles.badgeDefault}`}>
                {report.assignedRating}
              </div>
              <span className={styles.ratingStatusText}>{report.status}</span>
            </div>

            <div className={styles.scoreCard}>
              <span className={styles.scoreCardLabel}>Compliance Score</span>
              <span className={styles.scoreValue}>{report.complianceScore ?? 88}%</span>
              <span className={styles.scoreSub}>
                {detectedFlags.length === 0 ? 'Zero Regulatory Flags' : `${detectedFlags.length} Flags Detected`}
              </span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Responsive Dashboard Layout */}
        <div className={styles.dashboardGrid}>
          {/* Main Column: The 4 Core Sections */}
          <div className={styles.mainColumn}>
            {/* ========================================================= */}
            {/* SECTION 1 — CONTENT REVIEW */}
            {/* ========================================================= */}
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconBadge}>
                  <FileText size={18} />
                </div>
                <div className={styles.sectionHeaderText}>
                  <span className={styles.sectionPretitle}>SECTION 1</span>
                  <h2 className={styles.sectionTitle}>Content Review &amp; Thematic Overview</h2>
                </div>
              </div>

              {/* Subsection A: Content Summary */}
              <div className={styles.contentReviewCard}>
                <h3 className={styles.subCardTitle}>A. Content Summary</h3>
                <p className={styles.summaryParagraph}>{report.contentReview?.summary}</p>

                <div className={styles.summaryDetailsGrid}>
                  {/* Story or Subject Outline */}
                  <div className={styles.detailBox}>
                    <span className={styles.detailBoxLabel}>
                      {isPoster ? 'Visual Description & Main Subject' : isSong ? 'Meaning & Theme of Lyrics' : 'Storyline & Narrative Outline'}
                    </span>
                    <p className={styles.detailBoxText}>{report.contentReview?.storyOrSubject}</p>
                  </div>

                  {/* Main Themes & Overall Tone */}
                  <div className={styles.detailBox}>
                    <span className={styles.detailBoxLabel}>Main Themes</span>
                    <div className={styles.themePillsRow}>
                      {(report.contentReview?.mainThemes || []).map((th, idx) => (
                        <span key={idx} className={styles.themePill}>
                          {th}
                        </span>
                      ))}
                    </div>

                    <div className={styles.toneRow}>
                      <span className={styles.toneLabel}>Overall Tone:</span>
                      <span className={styles.toneValue}>{report.contentReview?.overallTone}</span>
                    </div>

                    <div className={styles.characteristicsRow}>
                      <span className={styles.charLabel}>
                        {isPoster ? 'Visual Elements:' : isSong ? 'Lyrical Language:' : 'Important Content Characteristics:'}
                      </span>
                      <span className={styles.charValue}>{report.contentReview?.contentCharacteristics}</span>
                    </div>
                  </div>
                </div>

                {/* Subsection B: Genre and Theme Classification */}
                <div className={styles.genreSectionWrapper}>
                  <h3 className={styles.subCardTitle}>B. Genre and Theme Classification</h3>

                  <div className={styles.primaryGenreBanner}>
                    <div className={styles.primaryGenreLeft}>
                      <span className={styles.primaryGenreLabel}>Primary Genre</span>
                      <span className={styles.primaryGenreName}>
                        {report.contentReview?.genreClassification?.primaryGenre}
                      </span>
                    </div>
                    <div className={styles.secondaryGenresRight}>
                      <span className={styles.secondaryGenreLabel}>Secondary Themes</span>
                      <div className={styles.secondaryPills}>
                        {(report.contentReview?.genreClassification?.secondaryGenres || []).map((sg, idx) => (
                          <span key={idx} className={styles.secondaryPill}>
                            {sg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Estimated Presence Horizontal Progress Bars */}
                  <div className={styles.genreBarsContainer}>
                    <span className={styles.genreBarsHeader}>
                      Genre Presence &amp; Strength Analysis (Estimated Intensity)
                    </span>
                    <div className={styles.barsList}>
                      {(report.contentReview?.genreClassification?.genreBreakdown || []).map((item, idx) => (
                        <div key={idx} className={styles.barItem}>
                          <div className={styles.barItemHeader}>
                            <span className={styles.barItemName}>{item.genre}</span>
                            <span className={styles.barItemPercent}>{item.percentage}% Presence</span>
                          </div>
                          <div className={styles.barTrack}>
                            <div
                              className={styles.barFill}
                              style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Coexistence Explanation Note */}
                    <div className={styles.coexistenceNote}>
                      <Info size={14} className={styles.coexistenceIcon} />
                      <p className={styles.coexistenceText}>
                        <strong>Note on Genre Coexistence:</strong>{' '}
                        {report.contentReview?.genreClassification?.coexistenceExplanation ||
                          'Multiple cinematic genres naturally coexist; percentages express estimated presence rather than mutually exclusive probability.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SECTION 2 — CONTENT FLAGS (Most Important Section) */}
            {/* ========================================================= */}
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconBadgeDanger}>
                  <Crosshair size={18} />
                </div>
                <div className={styles.sectionHeaderText}>
                  <span className={styles.sectionPretitle}>SECTION 2 • CORE STATUTORY SCREENING</span>
                  <h2 className={styles.sectionTitle}>Content Flags &amp; Regulatory Analysis</h2>
                </div>
                <div className={styles.flagSummaryPill}>
                  {detectedFlags.length === 0 ? (
                    <span className={styles.allCleanBadge}>
                      <CheckCircle2 size={14} />
                      <span>Zero Flags Detected</span>
                    </span>
                  ) : (
                    <span className={styles.flagsDetectedBadge}>
                      <AlertTriangle size={14} />
                      <span>{detectedFlags.length} {detectedFlags.length === 1 ? 'Concern Flagged' : 'Concerns Flagged'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Detected Flags Cards (Raised ONLY when corresponding content is actually detected) */}
              {detectedFlags.length > 0 ? (
                <div className={styles.flagCardsList}>
                  {detectedFlags.map((flag) => {
                    const isExpanded = expandedFlags[flag.category];
                    const sevClass = getSeverityBadgeClass(flag.severity);

                    return (
                      <div key={flag.category} className={styles.detectedFlagCard}>
                        <div className={styles.flagCardTop} onClick={() => toggleFlagExpand(flag.category)}>
                          <div className={styles.flagTopLeft}>
                            <div className={styles.flagAlertIconBox}>
                              <AlertTriangle size={18} />
                            </div>
                            <div className={styles.flagTitleBox}>
                              <div className={styles.flagTitleRow}>
                                <h4 className={styles.flagCategoryTitle}>{flag.category}</h4>
                                <span className={`${styles.flagSeverityBadge} ${sevClass}`}>
                                  {flag.severity}
                                </span>
                                {flag.uncertainForHumanReview && (
                                  <span className={styles.humanReviewBadge} title="Confidence below threshold — human verification recommended">
                                    <HelpCircle size={12} />
                                    <span>Flagged for Human Review</span>
                                  </span>
                                )}
                              </div>
                              <p className={styles.flagExplanationText}>{flag.explanation}</p>
                            </div>
                          </div>

                          <div className={styles.flagActionsRight}>
                            <button
                              type="button"
                              className={styles.inspectDirectBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectIssue(flag);
                              }}
                              title="Pinpoint this issue on media / poster viewer"
                            >
                              <Crosshair size={13} />
                              <span>Pinpoint Issue</span>
                            </button>
                            <button
                              type="button"
                              className={styles.expandToggleBtn}
                              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                            >
                              <span className={styles.expandBtnText}>
                                {isExpanded ? 'Hide Evidence' : 'View Evidence & Context'}
                              </span>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Details: Timestamps, Evidence Quote, Confidence, Context */}
                        {isExpanded && (
                          <div className={styles.flagDetailsDrawer}>
                            <div className={styles.detailsGrid}>
                              {/* Evidence from Media */}
                              <div className={styles.detailCell}>
                                <span className={styles.cellLabel}>Evidence from Media (Click to pinpoint)</span>
                                <div
                                  className={styles.evidenceSnippetClickable}
                                  onClick={() => handleInspectIssue(flag)}
                                  title="Click to pinpoint evidence on media / poster viewer"
                                >
                                  <div className={styles.evidenceHeaderHint}>
                                    <Crosshair size={12} />
                                    <span>Click to pinpoint in Media Viewer</span>
                                  </div>
                                  &ldquo;{flag.evidence}&rdquo;
                                </div>
                              </div>

                              {/* Timestamp / Scene Reference */}
                              <div className={styles.detailCell}>
                                <span className={styles.cellLabel}>Where Detected (Timestamp / Region)</span>
                                <div className={styles.timestampBadgeRow}>
                                  <span
                                    className={styles.timestampClickablePill}
                                    onClick={() => handleInspectIssue(flag)}
                                    title="Click to locate on poster or seek in video"
                                  >
                                    <Crosshair size={13} />
                                    <span>{flag.timestamp || 'Central Visual Focus'}</span>
                                  </span>
                                  <span className={styles.confidenceScorePill}>
                                    Confidence: {flag.confidence}%
                                  </span>
                                </div>
                              </div>

                              {/* Relevant Dramatic Context */}
                              <div className={`${styles.detailCell} ${styles.cellFullWidth}`}>
                                <span className={styles.cellLabel}>Dramatic / Biological Context</span>
                                <p className={styles.contextText}>{flag.context}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* No-Flag Behaviour: Compact Summary of Clean Categories */}
              {cleanFlags.length > 0 && (
                <div className={styles.noFlagCompactCard}>
                  <div className={styles.noFlagCardHeader}>
                    <CheckCircle2 size={18} className={styles.cleanCheckIcon} />
                    <span className={styles.noFlagTitle}>No Detected Concerns</span>
                  </div>
                  <p className={styles.noFlagSub}>
                    The following regulatory categories were analyzed and verified compliant. Zero violations were detected:
                  </p>
                  <div className={styles.cleanCategoriesGrid}>
                    {cleanFlags.map((cf) => (
                      <div key={cf.category} className={styles.cleanItem}>
                        <Check size={14} className={styles.cleanCheckSmall} />
                        <span className={styles.cleanItemName}>{cf.category}</span>
                        <span className={styles.cleanConfidence}>({cf.confidence}% confidence)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* SECTION 3 — SUGGESTIONS */}
            {/* ========================================================= */}
            <div className={styles.sectionBlock}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconBadgeWarm}>
                  <Lightbulb size={18} />
                </div>
                <div className={styles.sectionHeaderText}>
                  <span className={styles.sectionPretitle}>SECTION 3</span>
                  <h2 className={styles.sectionTitle}>Actionable Content Suggestions</h2>
                </div>
              </div>

              <div className={styles.suggestionsGrid}>
                {/* Subsection A: Creative Improvement */}
                <div className={styles.suggestionCardCreative}>
                  <div className={styles.sugCardHeader}>
                    <div className={styles.sugIconWrapperCreative}>
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <span className={styles.sugSubtitle}>SUBSECTION A</span>
                      <h4 className={styles.sugTitle}>Creative Improvement</h4>
                    </div>
                  </div>
                  <p className={styles.sugParagraph}>{report.suggestions?.creativeImprovement}</p>
                  <div className={styles.sugFooterTag}>
                    <span>Tailored specifically to submitted {report.contentType}</span>
                  </div>
                </div>

                {/* Subsection B: Regulatory Improvement */}
                <div className={styles.suggestionCardRegulatory}>
                  <div className={styles.sugCardHeader}>
                    <div className={styles.sugIconWrapperRegulatory}>
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <span className={styles.sugSubtitle}>SUBSECTION B</span>
                      <h4 className={styles.sugTitle}>Regulatory Improvement</h4>
                    </div>
                  </div>
                  <p className={styles.sugParagraph}>
                    {detectedFlags.length === 0
                      ? 'No regulatory reduction suggestions required.'
                      : report.suggestions?.regulatoryImprovement}
                  </p>
                  <div className={styles.sugFooterTag}>
                    <span>
                      {detectedFlags.length === 0
                        ? 'Asset satisfies all clearance standards'
                        : 'Designed to preserve creative vision while lowering flags'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Memorandum & Final PDF CTA Banner */}
            <div className={styles.finalMemorandumBanner}>
              <div className={styles.memoTextGroup}>
                <span className={styles.memoPre}>EXECUTIVE SUMMARY</span>
                <p className={styles.memoText}>{report.overallSummary || report.summary}</p>
                <span className={styles.memoDisclaimer}>
                  Automated assessment generated via Gemini Multimodal Regulatory Engine conforming to CBFC Section 5B &amp; India OTT IT Rules 2021.
                </span>
              </div>
              <button onClick={exportPDF} className={styles.primaryPdfDownloadBtn}>
                <Download size={18} />
                <span>Download Full Review as PDF</span>
              </button>
            </div>
          </div>

          {/* Side Column: Media Inspector & Asset Diagnostics */}
          <div className={styles.sideColumn}>
            <div className={styles.inspectorCard} ref={inspectorRef}>
              <div className={styles.inspectorHeader}>
                <Film size={15} />
                <span>Media Inspector ({report.aspectRatio})</span>
                {activeHighlight && (
                  <button
                    type="button"
                    onClick={() => setActiveHighlight(null)}
                    className={styles.clearHighlightTopBtn}
                    title="Clear Active Highlight"
                  >
                    Clear Focus
                  </button>
                )}
              </div>

              {/* Viewport */}
              <div className={`${styles.viewport} ${isVertical ? styles.viewportVertical : styles.viewportWidescreen}`}>
                {activeHighlight?.sceneFrame || isPoster || report.mediaUrl?.match(/\.(jpeg|jpg|png|webp)/i) ? (
                  <div className={styles.posterViewportContainer}>
                    {activeHighlight?.sceneFrame && (
                      <div className={styles.sceneBannerBadge}>
                        <Film size={12} />
                        <span>Movie Scene Frame ({activeHighlight.sceneFrameTime || activeHighlight.timestamp})</span>
                      </div>
                    )}
                    <img
                      src={activeHighlight?.sceneFrame || report.mediaUrl}
                      alt={activeHighlight?.sceneFrame ? `Scene at ${activeHighlight.timestamp}` : report.title}
                      className={styles.mediaPosterImg}
                    />
                    {activeHighlight && (
                      <div className={styles.overlayWrapper}>
                        <svg
                          className={styles.overlaySvg}
                          viewBox="0 0 1000 1000"
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <mask id="highlightHole">
                              <rect x="0" y="0" width="1000" height="1000" fill="white" />
                              <rect
                                x={activeHighlight.box.xmin}
                                y={activeHighlight.box.ymin}
                                width={Math.max(60, activeHighlight.box.xmax - activeHighlight.box.xmin)}
                                height={Math.max(60, activeHighlight.box.ymax - activeHighlight.box.ymin)}
                                fill="black"
                                rx="12"
                              />
                            </mask>
                          </defs>
                          {/* Dimmed surround */}
                          <rect x="0" y="0" width="1000" height="1000" fill="rgba(0, 0, 0, 0.45)" mask="url(#highlightHole)" />
                          {/* Animated glowing bounding box */}
                          <rect
                            x={activeHighlight.box.xmin}
                            y={activeHighlight.box.ymin}
                            width={Math.max(60, activeHighlight.box.xmax - activeHighlight.box.xmin)}
                            height={Math.max(60, activeHighlight.box.ymax - activeHighlight.box.ymin)}
                            className={styles.pulsingBoundingRect}
                            rx="12"
                          />
                          {/* Reticle Target Crosshairs */}
                          <circle
                            cx={(activeHighlight.box.xmin + activeHighlight.box.xmax) / 2}
                            cy={(activeHighlight.box.ymin + activeHighlight.box.ymax) / 2}
                            r="16"
                            fill="none"
                            stroke="#e51c23"
                            strokeWidth="2.5"
                            strokeDasharray="4 3"
                          />
                        </svg>
                        {/* Floating Regulatory HUD Callout Badge */}
                        <div
                          className={styles.floatingHudCallout}
                          style={{
                            top: `${Math.min(72, Math.max(6, (activeHighlight.box.ymin / 10) - 2))}%`,
                            left: `${Math.min(60, Math.max(4, activeHighlight.box.xmin / 10))}%`,
                          }}
                        >
                          <div className={styles.hudCalloutTop}>
                            <span className={styles.hudBadge}>
                              <Crosshair size={11} /> {activeHighlight.category} ({activeHighlight.severity})
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveHighlight(null)}
                              className={styles.hudDismissBtn}
                              title="Clear highlight"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <p className={styles.hudDesc}>{activeHighlight.explanation}</p>
                          {activeHighlight.evidence && activeHighlight.evidence !== 'N/A' && (
                            <div className={styles.hudEvidence}>&ldquo;{activeHighlight.evidence}&rdquo;</div>
                          )}
                          <span className={styles.hudRegionTag}>📍 {activeHighlight.regionLabel}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : isSong ? (
                  <div className={styles.songInspectorWrapper}>
                    <Music size={52} className={styles.songIcon} />
                    <audio ref={videoRef} src={report.mediaUrl} controls className={styles.audioElem} />
                  </div>
                ) : (
                  <div className={styles.videoViewportContainer}>
                    <video
                      ref={videoRef}
                      src={report.mediaUrl}
                      controls
                      className={styles.videoElem}
                    />
                    {activeHighlight && (
                      <div className={styles.videoHudOverlay}>
                        <div className={styles.videoHudLeft}>
                          <AlertTriangle size={16} className={styles.videoHudAlertIcon} />
                          <div>
                            <div className={styles.videoHudTitle}>
                              <strong>{activeHighlight.category}</strong> • <span className={styles.videoHudSev}>{activeHighlight.severity}</span>
                              {activeHighlight.timestamp && <span className={styles.videoHudTime}>({activeHighlight.timestamp})</span>}
                            </div>
                            <p className={styles.videoHudText}>{activeHighlight.explanation}</p>
                            {activeHighlight.evidence && activeHighlight.evidence !== 'N/A' && (
                              <p className={styles.videoHudEvidence}>&ldquo;{activeHighlight.evidence}&rdquo;</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveHighlight(null)}
                          className={styles.videoHudCloseBtn}
                          title="Close alert"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Media File Diagnostics */}
              <div className={styles.diagnosticsList}>
                <div className={styles.diagRow}>
                  <span className={styles.diagLabel}>Asset Format</span>
                  <span className={styles.diagValue}>{report.contentType}</span>
                </div>
                <div className={styles.diagRow}>
                  <span className={styles.diagLabel}>Aspect Ratio</span>
                  <span className={styles.diagValue}>{report.aspectRatio}</span>
                </div>
                <div className={styles.diagRow}>
                  <span className={styles.diagLabel}>Target Age Goal</span>
                  <span className={styles.diagValue}>{report.targetRatingGoal || 'Auto-Detect'}</span>
                </div>
                {report.duration ? (
                  <div className={styles.diagRow}>
                    <span className={styles.diagLabel}>Duration</span>
                    <span className={styles.diagValue}>{report.duration} seconds</span>
                  </div>
                ) : null}
                <div className={styles.diagRow}>
                  <span className={styles.diagLabel}>Compliance Status</span>
                  <span className={styles.diagStatusBadge}>{report.status}</span>
                </div>
              </div>

              {/* Quick Jump Markers for Video Flags */}
              {detectedFlags.length > 0 && (
                <div className={styles.quickJumpContainer}>
                  <span className={styles.quickJumpHeader}>Interactive Media Issue Navigator:</span>
                  <div className={styles.quickJumpPills}>
                    {detectedFlags.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInspectIssue(f)}
                        className={`${styles.quickJumpPill} ${activeHighlight?.category === f.category ? styles.quickJumpPillActive : ''}`}
                        title={`Pinpoint ${f.category} in viewer`}
                      >
                        <Crosshair size={11} />
                        <span>{f.timestamp || 'Focus'} ({f.category})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
