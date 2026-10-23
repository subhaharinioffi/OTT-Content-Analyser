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
  ExternalLink,
  Target,
  Crosshair,
  Maximize2,
  Wrench,
  Info,
} from 'lucide-react';
import CinemaVideoWallBg from '@/components/CinemaVideoWallBg';
import MagicBentoCard from '@/components/MagicBentoCard';
import styles from './report.module.css';

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

  // Generate Branded PDF Compliance Certificate
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
    doc.text(`Certificate No: SFC-${(report._id?.toString() || report.id || 'AUDIT').slice(-8).toUpperCase()} | Date: ${new Date().toLocaleDateString()}`, 14, 30);

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
        ['Duration / File', `${report.duration ? report.duration + ' sec' : 'N/A'} • ${(report.fileSize / 1024 / 1024).toFixed(2)} MB`, 'Target Goal Status', isTargetAchieved],
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

    // Section 3: Pinpointed Issues & 3-Tier Remediation
    const issues = report.pinpointedIssues && report.pinpointedIssues.length > 0
      ? report.pinpointedIssues
      : report.violations || [];

    if (issues.length > 0) {
      const issueY = summaryY + 7 + splitSummary.length * 4.2;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. PINPOINTED COMPLIANCE ISSUES & ACTIONABLE REMEDIATION', 14, issueY);

      const issueRows = issues.map((p) => {
        const location = p.timestampStart
          ? `${p.timestampStart}-${p.timestampEnd}`
          : p.boundingBox
          ? `Box [${p.boundingBox.ymin},${p.boundingBox.xmin},${p.boundingBox.ymax},${p.boundingBox.xmax}]`
          : 'Static Visual';

        const rem = p.remediation?.toAchieveTargetRating || p.actionableSuggestion || 'Apply standard editorial cut';
        return [location, p.themeName || p.category || 'Theme', p.severity || 'Moderate', p.problemDescription || p.description || 'Statutory issue', rem];
      });

      doc.autoTable({
        startY: issueY + 4,
        head: [['Where (Time/Box)', 'Theme', 'Severity', 'Triggered Statutory Violation', 'Remediation (To Reach Target)']],
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

  const activeIssue = issuesList.find((i) => i.id === selectedIssueId) || issuesList[0];

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

              {/* Target Rating Goal Callout */}
              
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
                {isPoster ? (
                  <span className={styles.playerLivePill}>
                    <Crosshair size={13} />
                    <span>[ymin, xmin, ymax, xmax] Coordinates</span>
                  </span>
                ) : (
                  <span className={styles.playerLivePill}>
                    <Clock size={13} />
                    <span>Interactive Timeline</span>
                  </span>
                )}
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

                    {/* SVG Bounding Box Overlays for Poster (normalized 0-1000 coordinates) */}
                    <svg
                      viewBox="0 0 1000 1000"
                      preserveAspectRatio="none"
                      className={styles.bboxSvgOverlay}
                    >
                      {issuesList.map((issue) => {
                        const box = issue.boundingBox;
                        if (!box || typeof box.ymin !== 'number') return null;
                        const isSelected = issue.id === activeIssue?.id;
                        const w = Math.max(20, box.xmax - box.xmin);
                        const h = Math.max(20, box.ymax - box.ymin);

                        return (
                          <g
                            key={issue.id}
                            onClick={() => setSelectedIssueId(issue.id)}
                            className={styles.bboxGroup}
                          >
                            <rect
                              x={box.xmin}
                              y={box.ymin}
                              width={w}
                              height={h}
                              className={`${styles.bboxRect} ${isSelected ? styles.bboxRectActive : ''}`}
                            />
                            {/* Region Label Tag */}
                            <foreignObject
                              x={box.xmin}
                              y={Math.max(10, box.ymin - 38)}
                              width={Math.max(240, w)}
                              height={34}
                            >
                              <div
                                className={`${styles.bboxLabel} ${isSelected ? styles.bboxLabelActive : ''}`}
                              >
                                <span>{issue.themeName?.split(' ')[0]}: {box.regionLabel || 'Flagged Region'}</span>
                              </div>
                            </foreignObject>
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
                    {issuesList.map((issue) => {
                      if (typeof issue.timestampSeconds !== 'number') return null;
                      const totalDur = report.duration || 60;
                      const posPercent = Math.min(
                        96,
                        Math.max(4, (issue.timestampSeconds / totalDur) * 100)
                      );
                      const isSelected = issue.id === activeIssue?.id;

                      return (
                        <button
                          key={issue.id}
                          onClick={() => handleSeek(issue.timestampSeconds, issue.id)}
                          style={{ left: `${posPercent}%` }}
                          className={`${styles.timelineMarker} ${isSelected ? styles.timelineMarkerActive : ''} ${
                            styles[`marker_${issue.severity?.toLowerCase()}`] || styles.markerDefault
                          }`}
                          title={`Jump to ${issue.timestampStart} - ${issue.themeName} (${issue.severity})`}
                        >
                          <span className={styles.markerTooltip}>
                            {issue.timestampStart} {issue.themeName}
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

            {/* Tab 1: Pinpointed Issues with 3-Tier Actionable Remediation */}
            {activeTab === 'pinpointed' && (
              <div className={styles.issuesContainer}>
                <div className={styles.issuesHeader}>
                  <h3 className={styles.matrixTitle}>Where Issues Occur &amp; Actionable Remediation</h3>
                  <p className={styles.matrixDesc}>
                    Every violation is pinpointed by timestamp or bounding box with instructions tailored to your target rating:
                  </p>
                </div>

                <div className={styles.issuesList}>
                  {issuesList.map((issue) => {
                    const isSelected = issue.id === activeIssue?.id;
                    const hasBox = !!issue.boundingBox;
                    const hasTime = !!issue.timestampStart;

                    return (
                      <MagicBentoCard
                        key={issue.id}
                        glowColor={issue.severity === 'Severe' || issue.severity === 'Critical' ? '#E11D48' : '#F59E0B'}
                        enableStars={false}
                        enableTilt={false}
                        className={`${styles.issueCard} ${isSelected ? styles.issueCardActive : ''}`}
                        onClick={() => {
                          setSelectedIssueId(issue.id);
                          if (hasTime && typeof issue.timestampSeconds === 'number') {
                            handleSeek(issue.timestampSeconds, issue.id);
                          }
                        }}
                      >
                        <div className={styles.issueTopRow}>
                          <div className={styles.locationPill}>
                            {hasTime ? (
                              <>
                                <Clock size={12} />
                                <span>{issue.timestampStart} - {issue.timestampEnd}</span>
                              </>
                            ) : hasBox ? (
                              <>
                                <Crosshair size={12} />
                                <span>Box [{issue.boundingBox.ymin},{issue.boundingBox.xmin},{issue.boundingBox.ymax},{issue.boundingBox.xmax}]</span>
                              </>
                            ) : (
                              <span>Asset Element</span>
                            )}
                          </div>

                          <span className={styles.modalityTag}>{issue.modality || 'Visual'}</span>
                          <span className={styles.themeTag}>{issue.themeName}</span>
                          <span className={`${styles.severityTag} ${styles[`sev_${issue.severity?.toLowerCase()}`] || ''}`}>
                            {issue.severity}
                          </span>
                        </div>

                        {/* Offending Element */}
                        <div className={styles.offendingBox}>
                          <span className={styles.offendingLabel}>Identified Depiction:</span>
                          <p className={styles.offendingSnippet}>&ldquo;{issue.offendingSnippet}&rdquo;</p>
                        </div>

                        {/* Problem Description */}
                        <p className={styles.problemDesc}>{issue.problemDescription}</p>

                        {/* 3-Tier Remediation Section */}
                        <div className={styles.remediationCard}>
                          <div className={styles.remediationHeader}>
                            <Wrench size={14} className={styles.wrenchIcon} />
                            <span className={styles.remediationTitle}>
                              Actionable Compliance Remediation
                            </span>
                            {issue.remediation?.editType && (
                              <span className={styles.editTypeBadge}>{issue.remediation.editType}</span>
                            )}
                          </div>

                          <div className={styles.remediationInstruction}>
                            <strong>Action:</strong> {issue.remediation?.toAchieveTargetRating || issue.actionableSuggestion || 'Apply standard edit cut.'}
                          </div>

                          {issue.remediation?.ratingImpactIfUnchanged && (
                            <div className={styles.ratingImpact}>
                              <Info size={12} />
                              <span>{issue.remediation.ratingImpactIfUnchanged}</span>
                            </div>
                          )}
                        </div>
                      </MagicBentoCard>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: 6 Mandatory Statutory Themes Matrix */}
            {activeTab === 'matrix' && (
              <div className={styles.matrixContainer}>
                <div className={styles.matrixHeader}>
                  <h3 className={styles.matrixTitle}>6 Mandatory Statutory Themes (CBFC &amp; IT Rules 2021)</h3>
                  <p className={styles.matrixDesc}>
                    Evaluated across official Indian regulatory standards:
                  </p>
                </div>

                <div className={styles.matrixGrid}>
                  {(report.themeMatrix && report.themeMatrix.length > 0
                    ? report.themeMatrix
                    : [
                        { themeId: 'V', themeName: 'Violence', severity: 'Moderate', violationCount: 1, summaryNote: 'Combat sequences with physical impact cues.' },
                        { themeId: 'S', themeName: 'Nudity & Sex', severity: 'None', violationCount: 0, summaryNote: 'No anatomical or explicit nudity detected.' },
                        { themeId: 'L', themeName: 'Language', severity: 'Mild', violationCount: 1, summaryNote: 'Street dialogue with occasional colloquial slang.' },
                        { themeId: 'D', themeName: 'Substance Abuse', severity: 'Moderate', violationCount: 1, summaryNote: 'Depiction of smoking/alcohol requires statutory warning.' },
                        { themeId: 'T', themeName: 'Threat, Horror & Mature Themes', severity: 'Low', violationCount: 0, summaryNote: 'Psychological thriller suspense.' },
                        { themeId: 'C', themeName: 'Discrimination & Sovereignty', severity: 'None', violationCount: 0, summaryNote: 'No defamation or communal discord identified.' },
                      ]
                  ).map((theme) => {
                    const sev = theme.severity || 'None';
                    return (
                      <MagicBentoCard
                        key={theme.themeId}
                        glowColor={sev === 'Severe' ? '#E11D48' : sev === 'Moderate' ? '#F59E0B' : '#10B981'}
                        enableStars={false}
                        enableTilt={false}
                        className={styles.descriptorCard}
                      >
                        <div className={styles.descTop}>
                          <div className={styles.themeIdBadge}>{theme.themeId}</div>
                          <span className={styles.descName}>{theme.themeName}</span>
                          <span className={`${styles.descSeverity} ${styles[`sev_${sev.toLowerCase()}`] || ''}`}>
                            {sev}
                          </span>
                        </div>

                        <p className={styles.descDetails}>{theme.summaryNote}</p>
                        <div className={styles.themeFooter}>
                          <span className={styles.violationCountPill}>
                            {theme.violationCount || 0} Flags
                          </span>
                        </div>
                      </MagicBentoCard>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: What-If Remediation Simulator */}
            {activeTab === 'simulator' && (
              <div className={styles.simulatorContainer}>
                <div className={styles.simCardTop}>
                  <div className={styles.simHeaderInfo}>
                    <h3 className={styles.matrixTitle}>Interactive What-If Remediation Simulator</h3>
                    <p className={styles.matrixDesc}>
                      Simulate how applying proposed editorial fixes lowers release friction and qualifies for target &quot;{targetRatingGoal}&quot;:
                    </p>
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
                      const isChecked = !!appliedFixes[idx];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleFix(idx)}
                          className={`${styles.suggestionItem} ${isChecked ? styles.suggestionChecked : ''}`}
                        >
                          <div className={styles.checkboxWrapper}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleFix(idx)}
                              className={styles.checkboxInput}
                            />
                          </div>
                          <div className={styles.suggestionContent}>
                            <span className={styles.suggestionAction}>{item.action}</span>
                            <span className={styles.suggestionImpact}>{item.impact}</span>
                          </div>
                          <div className={styles.projectedPill}>
                            Target: {item.projectedRiskScore}% Friction
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
