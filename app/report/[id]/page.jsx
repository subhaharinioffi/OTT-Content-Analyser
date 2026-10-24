'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Download,
  Share2,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Clock,
  Sparkles,
  Layers,
  CheckCircle,
  XCircle,
  Film,
  Smartphone,
  Music,
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Target,
  Crosshair,
  Maximize2,
  Wrench,
  Info,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';
import CinemaVideoWallBg from '@/components/CinemaVideoWallBg';
import MagicBentoCard from '@/components/MagicBentoCard';
import styles from './report.module.css';

/**
 * Strips raw coordinate bracket patterns (e.g., "[ymin:880, xmin:50, ymax:970, xmax:950]"
 * or "Box [720,60,960,940]") and converts them into natural, human-readable placement phrases.
 */
function sanitizeCoordinateText(text) {
  if (!text || typeof text !== 'string') return text || '';

  let sanitized = text;

  // Match patterns like "across [ymin:880, xmin:50, ymax:970, xmax:950]" or "[ymin:180...]"
  sanitized = sanitized.replace(
    /(?:across|at|in|within|over|along)?\s*\[\s*(?:ymin\s*:\s*(\d+)[,\s]+xmin\s*:\s*(\d+)[,\s]+ymax\s*:\s*(\d+)[,\s]+xmax\s*:\s*(\d+)|(\d+)[,\s]+(\d+)[,\s]+(\d+)[,\s]+(\d+))\s*\]/gi,
    (match, ymin1, xmin1, ymax1, xmax1, ymin2, xmin2, ymax2, xmax2) => {
      const ymin = parseInt(ymin1 || ymin2, 10);
      const ymax = parseInt(ymax1 || ymax2, 10);
      const yAvg = (ymin + ymax) / 2;

      // Select human placement term based on vertical position
      if (yAvg >= 650) {
        return 'across the bottom margin';
      } else if (yAvg <= 350) {
        return 'in the upper region';
      } else {
        return 'in the center frame';
      }
    }
  );

  // Clean remaining raw box labels or coordinate brackets
  sanitized = sanitized
    .replace(/Box\s*\[[^\]]+\]/gi, '')
    .replace(/\[\s*ymin[^\]]*\]/gi, '')
    .replace(/\[\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return sanitized;
}

/**
 * Extracts a concise, human-readable issue title from issue metadata,
 * removing redundant raw position labels.
 */
function getIssueTitle(issue, index) {
  if (issue.title) return sanitizeCoordinateText(issue.title);

  if (issue.regionLabel) {
    const cleaned = issue.regionLabel
      .replace(/^(Bottom Margins?|Central Character Silhouette|Upper Region|Top Margins?|Header Region|Background Region)\s*[-:]\s*/i, '')
      .trim();
    if (cleaned.length > 0) return sanitizeCoordinateText(cleaned);
  }

  if (issue.offendingSnippet) {
    const match = issue.offendingSnippet.match(/^([^:.]+)(?::|\.)/);
    if (match && match[1].length >= 8 && match[1].length <= 55) {
      return sanitizeCoordinateText(match[1].trim());
    }
  }

  const categoryName = issue.themeName?.replace(/\s*\([A-Z]\)/, '') || 'Compliance Concern';
  return `${categoryName} Flag #${index + 1}`;
}

function getSeverityKey(severity) {
  const s = String(severity || '').toLowerCase();
  if (s.includes('crit') || s.includes('sev') || s.includes('high')) return 'critical';
  if (s.includes('mod') || s.includes('med')) return 'moderate';
  if (s.includes('low') || s.includes('mild')) return 'low';
  return 'low';
}

function getSeverityColor(severity, isResolved = false) {
  if (isResolved) return '#10b981';
  const key = getSeverityKey(severity);
  if (key === 'critical') return '#ef4444';
  if (key === 'moderate') return '#f59e0b';
  return '#3b82f6';
}

export default function ReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const videoRef = useRef(null);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pinpointed'); // 'pinpointed' | 'matrix' | 'simulator'
  const [appliedFixes, setAppliedFixes] = useState({});
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [hoveredIssueId, setHoveredIssueId] = useState(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/reports/${id}`);
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
          const firstIssue = data.report.pinpointedIssues?.[0] || data.report.violations?.[0];
          if (firstIssue) {
            setSelectedIssueId(firstIssue.id || 'issue_0');
          }
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

  const handleSeek = (seconds, issueId) => {
    if (issueId) setSelectedIssueId(issueId);
    if (videoRef.current && typeof seconds === 'number') {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const toggleFix = (index) => {
    setAppliedFixes((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const isIssueResolved = (index, issueId) => {
    return Boolean(appliedFixes[index] || (issueId && appliedFixes[issueId]));
  };

  const handleOpenInSimulator = (index) => {
    setActiveTab('simulator');
    setAppliedFixes((prev) => ({
      ...prev,
      [index]: true,
    }));
  };

  // Calculate simulated risk score based on toggled fixes
  const calculateSimulatedRisk = () => {
    if (!report) return 0;
    let base = report.riskScore ?? 30;
    const suggestions = report.remediationSuggestions || [];
    let reduction = 0;

    suggestions.forEach((item, idx) => {
      if (appliedFixes[idx]) {
        reduction += (base - (item.projectedRiskScore || base * 0.6)) * 0.65;
      }
    });

    return Math.max(5, Math.round(base - reduction));
  };

  // Export Clean PDF Certificate without raw coordinates
  const exportPDF = () => {
    if (!report) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [229, 28, 35]; // #E51C23
    const darkBg = [9, 10, 15]; // #090A0F

    // Header Banner
    doc.setFillColor(...darkBg);
    doc.rect(0, 0, 210, 36, 'F');

    // Red decorative bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 36, 210, 2, 'F');

    // Title & Logo Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SHORTFUNDLY CENSORAI • REGULATORY COMPLIANCE CERTIFICATE', 14, 16);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 190, 205);
    doc.text('Official OTT Content Compliance & CBFC Section 5B / IT Rules 2021 Assessment', 14, 24);
    doc.text(
      `Certificate No: SFC-${(report._id?.toString() || report.id || 'AUDIT').slice(-8).toUpperCase()} | Date: ${new Date().toLocaleDateString()}`,
      14,
      30
    );

    // Section 1: Specifications
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. ASSET SPECIFICATION & TARGET GOAL VERIFICATION', 14, 46);

    const targetGoal = report.targetRatingGoal || 'Auto-Detect';
    const assignedRating = report.assignedRating || report.ageClassification || 'U/A 13+';
    const isTargetAchieved = report.targetRatingAchieved ? 'YES (Achieved)' : 'PENDING EDITORIAL REMEDIATION';

    doc.autoTable({
      startY: 50,
      head: [['Attribute', 'Verified Specification', 'Classification Metric', 'Rating Value']],
      body: [
        ['Asset Title', report.title, 'Statutory Age Rating', assignedRating],
        ['Format / Aspect', `${report.contentType} (${report.aspectRatio})`, 'Target Rating Goal', targetGoal],
        [
          'Duration / File',
          `${report.duration ? report.duration + ' sec' : 'N/A'} • ${(report.fileSize / 1024 / 1024).toFixed(2)} MB`,
          'Target Goal Status',
          isTargetAchieved,
        ],
        ['Content Descriptor', report.officialContentDescriptor || 'Standard Broadcast Rating', 'Release Friction', `${report.riskScore ?? 25}% Friction`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.8 },
    });

    // Section 2: Executive Summary
    const summaryY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('2. REGULATORY FINDINGS & CERTIFICATION MEMORANDUM', 14, summaryY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitSummary = doc.splitTextToSize(report.executiveSummary || report.summary || 'Compliant with standards.', 182);
    doc.text(splitSummary, 14, summaryY + 5);

    // Section 3: Pinpointed Issues & 3-Tier Remediation (Sanitized without raw coordinate arrays)
    const issues = report.pinpointedIssues && report.pinpointedIssues.length > 0
      ? report.pinpointedIssues
      : report.violations || [];

    if (issues.length > 0) {
      const issueY = summaryY + 7 + splitSummary.length * 4.2;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. PINPOINTED COMPLIANCE ISSUES & ACTIONABLE REMEDIATION', 14, issueY);

      const issueRows = issues.map((p, idx) => {
        const location = p.timestampStart
          ? `${p.timestampStart}-${p.timestampEnd}`
          : p.boundingBox?.regionLabel
          ? sanitizeCoordinateText(p.boundingBox.regionLabel)
          : `Visual Issue #${idx + 1}`;

        const rem = sanitizeCoordinateText(p.remediation?.toAchieveTargetRating || p.actionableSuggestion || 'Apply standard editorial cut');
        const problem = sanitizeCoordinateText(p.problemDescription || p.description || 'Statutory compliance concern');

        return [
          `#${idx + 1} (${location})`,
          p.themeName || p.category || 'Theme',
          p.severity || 'Moderate',
          problem,
          rem,
        ];
      });

      doc.autoTable({
        startY: issueY + 4,
        head: [['Where (Time / Region)', 'Theme', 'Severity', 'Triggered Statutory Violation', 'Remediation (To Reach Target)']],
        body: issueRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2.2 },
      });
    }

    doc.save(`Shortfundly_CensorAI_Certificate_${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <div className={styles.reportWrapper}>
        <CinemaVideoWallBg />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Retrieving official regulatory compliance report...</p>
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
          <h2>Compliance Record Not Found</h2>
          <p>{error || 'The requested certification review could not be loaded.'}</p>
          <Link href="/" className={styles.backBtn}>
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const simulatedRisk = calculateSimulatedRisk();
  const isPoster = report.contentType?.includes('Poster');
  const isSong = report.contentType?.includes('Song');
  const isVertical = report.aspectRatio === '9:16';

  const assignedRating = report.assignedRating || report.ageClassification || 'U/A 13+';
  const targetRatingGoal = report.targetRatingGoal || 'Auto-Detect (Standard Assessment)';
  const isTargetAchieved = report.targetRatingAchieved ?? (targetRatingGoal.includes('Auto') || targetRatingGoal === assignedRating);

  const issuesList = (report.pinpointedIssues && report.pinpointedIssues.length > 0)
    ? report.pinpointedIssues
    : (report.violations || []).map((v, i) => ({
        id: `iss_${i}`,
        themeId: v.category?.startsWith('V') ? 'V' : v.category?.startsWith('L') ? 'L' : 'D',
        themeName: v.category || 'Compliance Issue',
        severity: v.severity || 'Moderate',
        modality: isPoster ? 'Poster Region' : 'Visual Frame',
        timestampStart: v.startTime,
        timestampEnd: v.endTime,
        timestampSeconds: v.secondOffset,
        boundingBox: isPoster ? { ymin: 720, xmin: 80, ymax: 950, xmax: 920, regionLabel: 'Mandatory Health Advisory Region' } : null,
        offendingSnippet: v.description,
        problemDescription: v.ruleViolated || v.description,
        remediation: {
          toAchieveTargetRating: v.actionableSuggestion || 'Apply standard editorial remediation.',
          editType: isPoster ? 'Add Statutory Disclaimer' : 'Scene Trim',
          ratingImpactIfUnchanged: `Retaining element retains current rating (${assignedRating}).`,
        },
      }));

  const activeIssue = issuesList.find((i) => i.id === (hoveredIssueId || selectedIssueId)) || issuesList.find((i) => i.id === selectedIssueId) || issuesList[0];
  const activeIssueId = hoveredIssueId || selectedIssueId;
  const hasActiveSelection = Boolean(activeIssueId);

  // Status computation for What-If Simulator
  const currentFriction = report.riskScore ?? 25;
  const hasAnyFixApplied = Object.values(appliedFixes).some(Boolean);

  const getCurrentStatusText = () => {
    if (report.status && (report.status.toLowerCase().includes('reject') || report.status.toLowerCase().includes('fail'))) {
      return report.status;
    }
    if (currentFriction >= 40) return 'Flagged for Rejection';
    if (currentFriction >= 20) return 'Conditional Approval';
    return 'Standard Clearance';
  };

  const getProjectedStatusText = () => {
    if (!hasAnyFixApplied) {
      return getCurrentStatusText();
    }
    if (simulatedRisk <= 15) {
      return 'Ready for Standard Clearance';
    }
    if (simulatedRisk < currentFriction) {
      return 'Conditional Review Clearance';
    }
    return 'Remediation In Progress';
  };

  // 6-Theme Matrix sorting and flag count mapping
  const defaultThemeMatrix = [
    { themeId: 'V', themeName: 'Violence', severity: 'Moderate', violationCount: 1, summaryNote: 'Combat sequences with physical impact cues.' },
    { themeId: 'S', themeName: 'Nudity & Sex', severity: 'None', violationCount: 0, summaryNote: 'No anatomical or explicit nudity detected.' },
    { themeId: 'L', themeName: 'Language', severity: 'Mild', violationCount: 1, summaryNote: 'Street dialogue with occasional colloquial slang.' },
    { themeId: 'D', themeName: 'Substance Abuse', severity: 'Moderate', violationCount: 1, summaryNote: 'Depiction of smoking/alcohol requires statutory warning.' },
    { themeId: 'T', themeName: 'Threat, Horror & Mature Themes', severity: 'Low', violationCount: 0, summaryNote: 'Psychological thriller suspense.' },
    { themeId: 'C', themeName: 'Discrimination & Sovereignty', severity: 'None', violationCount: 0, summaryNote: 'No defamation or communal discord identified.' },
  ];

  const rawThemes = report.themeMatrix && report.themeMatrix.length > 0 ? report.themeMatrix : defaultThemeMatrix;

  const getThemeIssueMatches = (theme) => {
    return issuesList.filter((issue) => {
      const tId = (theme.themeId || '').toUpperCase();
      const iId = (issue.themeId || '').toUpperCase();
      if (tId && iId && tId === iId) return true;

      const tName = (theme.themeName || '').toLowerCase().replace(/\s*\([a-z]\)/g, '').trim();
      const iName = (issue.themeName || '').toLowerCase().replace(/\s*\([a-z]\)/g, '').trim();
      return Boolean(tName && iName && (tName.includes(iName) || iName.includes(tName)));
    });
  };

  const sortedThemeMatrix = [...rawThemes].sort((a, b) => {
    const matchesA = getThemeIssueMatches(a);
    const matchesB = getThemeIssueMatches(b);
    const countA = Math.max(a.violationCount || 0, matchesA.length);
    const countB = Math.max(b.violationCount || 0, matchesB.length);

    const getRank = (t, count) => {
      const sev = (t.severity || '').toLowerCase();
      const isCompliant = (sev === 'none' || sev === '') && count === 0;
      if (isCompliant) return 0;
      if (sev.includes('crit') || sev.includes('sev') || sev.includes('high')) return 4;
      if (sev.includes('mod') || sev.includes('med')) return 3;
      if (sev.includes('low') || sev.includes('mild') || count > 0) return 2;
      return 1;
    };

    const rankA = getRank(a, countA);
    const rankB = getRank(b, countB);

    if (rankA !== rankB) return rankB - rankA;
    return countB - countA;
  });

  return (
    <div className={styles.reportWrapper}>
      {/* Seamless Looping Video Wall Background */}
      <CinemaVideoWallBg />

      <div className={styles.reportContainer}>
        {/* Top Navigation & Action Bar */}
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Back to Regulatory Dashboard</span>
          </Link>
          <div className={styles.actionButtons}>
            <button onClick={exportPDF} className={styles.exportPdfBtn}>
              <Download size={16} />
              <span>Export Official PDF Report</span>
            </button>
          </div>
        </div>

        {/* Hero Certification Banner wrapped in MagicBentoCard */}
        <MagicBentoCard className={styles.heroBentoCard} glowColor="#E51C23" enableStars={true} enableTilt={false}>
          <section className={styles.heroBanner}>
            <div className={styles.heroLeft}>
              <div className={styles.assetHeader}>
                <span className={styles.contentTypeTag}>{report.contentType}</span>
                <span className={styles.aspectRatioTag}>{report.aspectRatio}</span>
                <span className={styles.timestampTag}>
                  Audit Completed: {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className={styles.assetTitle}>{report.title}</h1>
              <p className={styles.summaryText}>{report.executiveSummary || report.summary}</p>
            </div>

            {/* Badges: Statutory Rating & Risk Friction */}
            <div className={styles.heroRight}>
              <div className={styles.ratingCard}>
                <span className={styles.ratingLabel}>Statutory Age Rating</span>
                <div className={`${styles.ageBadgeBig} ${styles[`badge_${assignedRating.replace(/[^a-zA-Z0-9]/g, '')}`] || styles.badgeDefault}`}>
                  {assignedRating}
                </div>
                <span className={styles.ratingStatus}>{report.status}</span>
              </div>

              <div className={styles.riskCard}>
                <span className={styles.riskLabel}>Release Risk</span>
                <div className={styles.radialGauge}>
                  <svg className={styles.radialSvg} viewBox="0 0 100 100">
                    <circle className={styles.radialBg} cx="50" cy="50" r="40" />
                    <circle
                      className={styles.radialProgress}
                      cx="50"
                      cy="50"
                      r="40"
                      style={{
                        strokeDasharray: 251.2,
                        strokeDashoffset: 251.2 - (251.2 * (report.riskScore ?? 25)) / 100,
                        stroke:
                          (report.riskScore ?? 25) > 60
                            ? 'var(--accent-rose)'
                            : (report.riskScore ?? 25) > 30
                            ? 'var(--accent-secondary)'
                            : 'var(--accent-emerald)',
                      }}
                    />
                  </svg>
                  <div className={styles.radialContent}>
                    <span className={styles.radialNumber}>{report.riskScore ?? 25}%</span>
                    <span className={styles.radialText}>Friction</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </MagicBentoCard>

        {/* Main Inspection Grid */}
        <div className={styles.inspectionGrid}>
          {/* Left Column: Adaptive Media Player with Interactive Visual Pinpointing */}
          <div className={styles.playerColumn}>
            <MagicBentoCard className={styles.inspectorBentoCard} glowColor="#38BDF8" enableStars={false} enableTilt={false}>
              <div className={styles.playerCardHeader}>
                <div className={styles.playerTitleWrapper}>
                  <Film size={16} className={styles.playerIcon} />
                  <span className={styles.playerHeaderTitle}>
                    Compliance Inspector &amp; Visual Locator ({report.aspectRatio})
                  </span>
                </div>

                {/* Clean Header Controls with Overlays Toggle & Issues Detected Pill */}
                <div className={styles.locatorControls}>
                  {isPoster && (
                    <button
                      type="button"
                      onClick={() => setShowOverlays((prev) => !prev)}
                      className={`${styles.overlayToggleBtn} ${showOverlays ? styles.overlayToggleActive : ''}`}
                      title={showOverlays ? 'Hide bounding box overlays' : 'Show bounding box overlays'}
                    >
                      {showOverlays ? <Eye size={13} /> : <EyeOff size={13} />}
                      <span>{showOverlays ? 'Hide Overlays' : 'Show Overlays'}</span>
                    </button>
                  )}
                  <span className={styles.issuesDetectedPill}>
                    <Crosshair size={13} />
                    <span>{issuesList.length} {issuesList.length === 1 ? 'Issue Detected' : 'Issues Detected'}</span>
                  </span>
                </div>
              </div>

              {/* Viewport with Bounding Box Overlay support */}
              <div
                className={`${styles.mediaViewport} ${
                  isVertical ? styles.verticalViewport : styles.widescreenViewport
                }`}
              >
                {isPoster || report.mediaUrl?.match(/\.(jpeg|jpg|png|webp)/i) ? (
                  <div className={styles.imageOverlayContainer}>
                    <img
                      src={report.mediaUrl}
                      alt={report.title}
                      className={styles.inspectorImage}
                    />

                    {/* SVG Bounding Box Overlays for Poster (0-1000 coordinate canvas) */}
                    <svg
                      viewBox="0 0 1000 1000"
                      preserveAspectRatio="none"
                      className={`${styles.bboxSvgOverlay} ${!showOverlays ? styles.bboxSvgHidden : ''}`}
                    >
                      {issuesList.map((issue, idx) => {
                        const box = issue.boundingBox;
                        if (!box || typeof box.ymin !== 'number') return null;

                        const isResolved = isIssueResolved(idx, issue.id);
                        const isSelected = issue.id === selectedIssueId;
                        const isHovered = issue.id === hoveredIssueId;
                        const isActive = isHovered || isSelected;

                        const w = Math.max(24, box.xmax - box.xmin);
                        const h = Math.max(24, box.ymax - box.ymin);
                        const sevColor = getSeverityColor(issue.severity, isResolved);
                        const issueNum = idx + 1;
                        const categoryShort = issue.themeName?.replace(/\s*\([A-Z]\)/, '') || 'Issue';

                        return (
                          <g
                            key={issue.id}
                            onClick={() => {
                              setSelectedIssueId(issue.id);
                              setActiveTab('pinpointed');
                            }}
                            onMouseEnter={() => setHoveredIssueId(issue.id)}
                            onMouseLeave={() => setHoveredIssueId(null)}
                            className={`${styles.bboxGroup} ${
                              isActive ? styles.bboxGroupActive : ''
                            } ${
                              hasActiveSelection && !isActive ? styles.bboxGroupDimmed : ''
                            } ${
                              isResolved ? styles.bboxGroupResolved : ''
                            }`}
                            style={{
                              '--issue-color': sevColor,
                            }}
                          >
                            {/* Bounding Box Rect */}
                            <rect
                              x={box.xmin}
                              y={box.ymin}
                              width={w}
                              height={h}
                              rx={6}
                              className={`${styles.bboxRect} ${
                                isActive ? styles.bboxRectActive : ''
                              } ${
                                isResolved ? styles.bboxRectResolved : ''
                              }`}
                              style={{
                                stroke: sevColor,
                                fill: isResolved
                                  ? 'rgba(16, 185, 129, 0.16)'
                                  : isActive
                                  ? `${sevColor}28`
                                  : `${sevColor}12`,
                              }}
                            />

                            {/* Bold Circular Numbered Badge at top-left corner */}
                            <circle
                              cx={box.xmin + 22}
                              cy={box.ymin + 22}
                              r={18}
                              className={styles.bboxBadgeCircle}
                              style={{
                                fill: sevColor,
                              }}
                            />
                            <text
                              x={box.xmin + 22}
                              y={box.ymin + 28}
                              textAnchor="middle"
                              className={styles.bboxBadgeText}
                            >
                              {isResolved ? '✓' : `#${issueNum}`}
                            </text>

                            {/* Compact Category Tooltip on Active/Hover */}
                            {isActive && (
                              <foreignObject
                                x={Math.max(6, Math.min(680, box.xmin + 46))}
                                y={Math.max(6, box.ymin + 6)}
                                width="280"
                                height="38"
                                className={styles.tooltipForeignObject}
                              >
                                <div
                                  className={`${styles.bboxTooltip} ${
                                    isResolved ? styles.bboxTooltipResolved : ''
                                  }`}
                                  style={{
                                    '--tooltip-border': sevColor,
                                  }}
                                >
                                  <span className={styles.tooltipText}>
                                    #{issueNum} {categoryShort}
                                  </span>
                                  {isResolved && (
                                    <span className={styles.tooltipResolvedTag}>
                                      ✓ Resolved
                                    </span>
                                  )}
                                </div>
                              </foreignObject>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : isSong ? (
                  <div className={styles.songInspector}>
                    <Music size={64} className={styles.songIcon} />
                    <audio
                      ref={videoRef}
                      src={report.mediaUrl}
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      className={styles.audioPlayerElem}
                    />
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    src={report.mediaUrl}
                    controls
                    onTimeUpdate={handleTimeUpdate}
                    className={styles.inspectorVideo}
                  />
                )}
              </div>

              {/* Clickable Timeline Markers for Video/Audio */}
              {!isPoster && issuesList.some((i) => typeof i.timestampSeconds === 'number') && (
                <div className={styles.timelineBarContainer}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.timelineTitle}>
                      <Clock size={13} />
                      <span>Pinpointed Video/Audio Timestamp Markers (Click to seek)</span>
                    </span>
                    <span className={styles.timelineCount}>
                      {issuesList.filter((i) => typeof i.timestampSeconds === 'number').length} Markers
                    </span>
                  </div>
                  <div className={styles.timelineTrack}>
                    {issuesList.map((issue, idx) => {
                      if (typeof issue.timestampSeconds !== 'number') return null;
                      const totalDur = report.duration || 60;
                      const posPercent = Math.min(
                        96,
                        Math.max(4, (issue.timestampSeconds / totalDur) * 100)
                      );
                      const isSelected = issue.id === activeIssue?.id;
                      const isResolved = isIssueResolved(idx, issue.id);

                      return (
                        <button
                          key={issue.id}
                          onClick={() => handleSeek(issue.timestampSeconds, issue.id)}
                          onMouseEnter={() => setHoveredIssueId(issue.id)}
                          onMouseLeave={() => setHoveredIssueId(null)}
                          style={{ left: `${posPercent}%` }}
                          className={`${styles.timelineMarker} ${isSelected ? styles.timelineMarkerActive : ''} ${
                            isResolved ? styles.timelineMarkerResolved : styles[`marker_${issue.severity?.toLowerCase()}`] || styles.markerDefault
                          }`}
                          title={`Jump to ${issue.timestampStart} - ${issue.themeName} (${issue.severity})`}
                        >
                          <span className={styles.markerTooltip}>
                            #{idx + 1} {issue.timestampStart} {issue.themeName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </MagicBentoCard>
          </div>

          {/* Right Column: Pinpointed Issues & Remediation, 6-Theme Matrix & What-If Simulator */}
          <div className={styles.detailsColumn}>
            {/* Navigation Tabs */}
            <div className={styles.tabNav}>
              <button
                onClick={() => setActiveTab('pinpointed')}
                className={`${styles.tabBtn} ${activeTab === 'pinpointed' ? styles.tabActive : ''}`}
              >
                <Crosshair size={14} />
                <span>Pinpointed Issues &amp; Remediation ({issuesList.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`${styles.tabBtn} ${activeTab === 'matrix' ? styles.tabActive : ''}`}
              >
                <span>6-Theme Matrix</span>
              </button>
              <button
                onClick={() => setActiveTab('simulator')}
                className={`${styles.tabBtn} ${activeTab === 'simulator' ? styles.tabActive : ''}`}
              >
                <Sparkles size={14} />
                <span>What-If Simulator</span>
              </button>
            </div>

            {/* Tab 1: Pinpointed Issues with 3-Part Restructured Hierarchy (What -> Why -> How) */}
            {activeTab === 'pinpointed' && (
              <div className={styles.issuesContainer}>
                <div className={styles.issuesHeader}>
                  <h3 className={styles.matrixTitle}>Where Issues Occur &amp; Actionable Remediation</h3>
                  <p className={styles.matrixDesc}>
                    Every violation is pinpointed with clear regulatory guidance and tailored editorial remediation:
                  </p>
                </div>

                <div className={styles.issuesList}>
                  {issuesList.map((issue, idx) => {
                    const isSelected = issue.id === selectedIssueId;
                    const isHovered = issue.id === hoveredIssueId;
                    const isResolved = isIssueResolved(idx, issue.id);
                    const hasTime = !!issue.timestampStart;
                    const sevKey = getSeverityKey(issue.severity);
                    const sevColor = getSeverityColor(issue.severity, isResolved);
                    const issueTitle = getIssueTitle(issue, idx);

                    return (
                      <MagicBentoCard
                        key={issue.id}
                        glowColor={sevColor}
                        enableStars={false}
                        enableTilt={false}
                        className={`${styles.issueCard} ${isSelected ? styles.issueCardSelected : ''} ${
                          isHovered ? styles.issueCardHovered : ''
                        } ${isResolved ? styles.issueCardResolved : ''}`}
                        onClick={() => {
                          setSelectedIssueId(issue.id);
                          if (hasTime && typeof issue.timestampSeconds === 'number') {
                            handleSeek(issue.timestampSeconds, issue.id);
                          }
                        }}
                        onMouseEnter={() => setHoveredIssueId(issue.id)}
                        onMouseLeave={() => setHoveredIssueId(null)}
                        style={{
                          '--card-accent-color': sevColor,
                        }}
                      >
                        {/* 1. Card Header (The "What"): Numbered Badge + Title + Category Pill & Severity */}
                        <div className={styles.cardHeader}>
                          <div className={styles.cardHeaderLeft}>
                            <div
                              className={styles.cardNumberBadge}
                              style={{
                                backgroundColor: sevColor,
                              }}
                            >
                              #{idx + 1}
                            </div>
                            <div className={styles.cardTitleInfo}>
                              <h4 className={styles.cardIssueTitle}>{issueTitle}</h4>
                              <div className={styles.cardMetaRow}>
                                <span className={styles.categoryPill}>{issue.themeName}</span>
                                {hasTime && (
                                  <span className={styles.timestampPill}>
                                    <Clock size={11} />
                                    <span>{issue.timestampStart} - {issue.timestampEnd}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className={styles.cardHeaderRight}>
                            {isResolved ? (
                              <span className={styles.resolvedBadge}>
                                <Check size={11} />
                                <span>RESOLVED</span>
                              </span>
                            ) : (
                              <span className={`${styles.severityBadge} ${styles[`sev_${sevKey}`]}`}>
                                {issue.severity}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 2. Card Body (The "Why"): Identified Depiction & Collapsible Regulatory Guideline */}
                        <div className={styles.cardBody}>
                          {issue.offendingSnippet && (
                            <div className={styles.depictionContainer}>
                              <span className={styles.depictionLabel}>Identified Depiction</span>
                              <p className={styles.depictionSnippet}>&ldquo;{issue.offendingSnippet}&rdquo;</p>
                            </div>
                          )}

                          {issue.problemDescription && (
                            <details className={styles.regulatoryAccordion}>
                              <summary className={styles.regulatorySummary}>
                                <span className={styles.regulatorySummaryText}>
                                  ⚖️ View Regulatory Guideline
                                </span>
                                <ChevronDown size={14} className={styles.accordionArrow} />
                              </summary>
                              <div className={styles.regulatoryBody}>
                                <p className={styles.regulatoryText}>{issue.problemDescription}</p>
                              </div>
                            </details>
                          )}
                        </div>

                        {/* 3. Card Footer Box (The "How to Fix"): Actionable Remediation Subpanel */}
                        <div className={styles.cardFooterSubpanel}>
                          <div className={styles.remediationHeader}>
                            <div className={styles.remediationTitleGroup}>
                              <Wrench size={13} className={styles.remediationWrenchIcon} />
                              <span className={styles.remediationSectionTitle}>Actionable Compliance Remediation</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenInSimulator(idx);
                              }}
                              className={styles.fixButton}
                              title="Test this fix in What-If Simulator"
                            >
                              <Sparkles size={12} />
                              <span>🔧 Fix: {issue.remediation?.editType || 'Apply Disclaimer'}</span>
                              <ChevronRight size={12} />
                            </button>
                          </div>

                          <p className={styles.remediationActionCopy}>
                            {sanitizeCoordinateText(
                              issue.remediation?.toAchieveTargetRating ||
                              issue.actionableSuggestion ||
                              'Apply standard editorial remediation.'
                            )}
                          </p>

                          {issue.remediation?.ratingImpactIfUnchanged && (
                            <div className={styles.ratingImpactRow}>
                              <Info size={12} className={styles.impactIcon} />
                              <span>{sanitizeCoordinateText(issue.remediation.ratingImpactIfUnchanged)}</span>
                            </div>
                          )}
                        </div>
                      </MagicBentoCard>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: 6 Mandatory Statutory Themes Matrix (Sorted by Priority & Interactive Filtering) */}
            {activeTab === 'matrix' && (
              <div className={styles.matrixContainer}>
                <div className={styles.matrixHeader}>
                  <h3 className={styles.matrixTitle}>6 Mandatory Statutory Themes (CBFC &amp; IT Rules 2021)</h3>
                  <p className={styles.matrixDesc}>
                    Sorted by regulatory priority. Click any active category to jump directly to its pinpointed occurrences:
                  </p>
                </div>

                <div className={styles.matrixGrid}>
                  {sortedThemeMatrix.map((theme) => {
                    const matches = getThemeIssueMatches(theme);
                    const flagCount = Math.max(theme.violationCount || 0, matches.length);
                    const isFlagged = flagCount > 0 || (theme.severity && theme.severity.toLowerCase() !== 'none');
                    const sevKey = getSeverityKey(theme.severity);

                    return (
                      <MagicBentoCard
                        key={theme.themeId}
                        glowColor={isFlagged ? (sevKey === 'critical' ? '#EF4444' : '#F59E0B') : '#10B981'}
                        enableStars={false}
                        enableTilt={false}
                        onClick={() => {
                          if (isFlagged) {
                            const target = matches[0] || issuesList[0];
                            if (target) {
                              setSelectedIssueId(target.id);
                            }
                            setActiveTab('pinpointed');
                          }
                        }}
                        className={`${styles.descriptorCard} ${
                          isFlagged ? styles.themeCardClickable : styles.themeCardCompliant
                        }`}
                        title={isFlagged ? `Click to inspect ${theme.themeName} in Pinpointed Issues` : `${theme.themeName} compliant`}
                      >
                        <div className={styles.descTop}>
                          <div className={`${styles.themeIdBadge} ${isFlagged ? styles.themeIdBadgeFlagged : ''}`}>
                            {theme.themeId}
                          </div>
                          <span className={styles.descName}>{theme.themeName}</span>
                          <span className={`${styles.descSeverity} ${styles[`sev_${sevKey}`] || ''}`}>
                            {theme.severity || 'None'}
                          </span>
                        </div>

                        <p className={styles.descDetails}>{theme.summaryNote}</p>

                        <div className={styles.themeFooter}>
                          <span className={`${styles.violationCountPill} ${isFlagged ? styles.countPillFlagged : ''}`}>
                            {flagCount} {flagCount === 1 ? 'Flag' : 'Flags'}
                          </span>
                          {isFlagged && (
                            <span className={styles.viewIssuesLink}>
                              <span>View Issues</span>
                              <ChevronRight size={12} />
                            </span>
                          )}
                        </div>
                      </MagicBentoCard>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: What-If Remediation Simulator with Plain-English Status Shift & Green Delta Badges */}
            {activeTab === 'simulator' && (
              <div className={styles.simulatorContainer}>
                <div className={styles.simCardTop}>
                  <div className={styles.simHeaderInfo}>
                    <h3 className={styles.matrixTitle}>Interactive What-If Remediation Simulator</h3>
                    <p className={styles.matrixDesc}>
                      Simulate editorial fixes to lower release friction and verify target clearance status:
                    </p>

                    {/* Plain-English Status Transition Banner */}
                    <div className={styles.statusShiftContainer}>
                      <div className={styles.statusShiftBadgeCurrent}>
                        <span className={styles.statusShiftPrefix}>Status:</span>
                        <span className={styles.statusShiftText}>{getCurrentStatusText()}</span>
                      </div>
                      <span className={styles.statusShiftArrow}>➔</span>
                      <div
                        className={`${styles.statusShiftBadgeProjected} ${
                          hasAnyFixApplied ? styles.statusShiftProjectedActive : ''
                        }`}
                      >
                        <span className={styles.statusShiftPrefix}>Projected:</span>
                        <span className={styles.statusShiftText}>{getProjectedStatusText()}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.simComparisonCard}>
                    <div className={styles.simScoreBox}>
                      <span className={styles.simLabel}>Current Friction</span>
                      <span className={styles.simCurrentVal}>{report.riskScore ?? 25}%</span>
                    </div>
                    <ChevronRight size={20} className={styles.simArrow} />
                    <div className={styles.simScoreBox}>
                      <span className={styles.simLabel}>Projected Friction</span>
                      <span className={styles.simProjectedVal}>{simulatedRisk}%</span>
                    </div>
                  </div>
                </div>

                <div className={styles.suggestionsList}>
                  {report.remediationSuggestions && report.remediationSuggestions.length > 0 ? (
                    report.remediationSuggestions.map((item, idx) => {
                      const isChecked = Boolean(appliedFixes[idx]);
                      const baseRisk = report.riskScore ?? 25;
                      const targetScore = item.projectedRiskScore ?? Math.max(8, baseRisk - 14);
                      const reductionDelta = Math.max(5, Math.round(baseRisk - targetScore));
                      const linkedIssue = issuesList[idx];

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleFix(idx)}
                          onMouseEnter={() => {
                            if (linkedIssue) setHoveredIssueId(linkedIssue.id);
                          }}
                          onMouseLeave={() => setHoveredIssueId(null)}
                          className={`${styles.suggestionItem} ${isChecked ? styles.suggestionChecked : ''}`}
                        >
                          <div className={styles.checkboxWrapper}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleFix(idx)}
                              className={styles.checkboxInput}
                              id={`sim-check-${idx}`}
                            />
                          </div>

                          <div className={styles.suggestionContent}>
                            <span className={styles.suggestionAction}>
                              {sanitizeCoordinateText(item.action)}
                            </span>
                            <span className={styles.suggestionImpact}>
                              {sanitizeCoordinateText(item.impact)}
                            </span>
                          </div>

                          {/* Clear Green Reduction Delta Badge */}
                          <div className={styles.deltaReductionBadge}>
                            -{reductionDelta}% Friction
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className={styles.noFixesText}>
                      No further remediation cuts required for this certified asset.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
