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
} from 'lucide-react';
import styles from './report.module.css';

export default function ReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const videoRef = useRef(null);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'violations' | 'simulator'
  const [appliedFixes, setAppliedFixes] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/reports/${id}`);
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
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

  const handleSeek = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
      setIsPlaying(true);
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
    let base = report.riskScore;
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
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CINECOMPLY AI • REGULATORY COMPLIANCE CERTIFICATE', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 190, 205);
    doc.text('Official OTT Platform Content Guidelines & Regulatory Review Assessment', 14, 24);
    doc.text(`Certificate No: CC-${report._id?.slice(-8).toUpperCase()} | Issue Date: ${new Date().toLocaleDateString()}`, 14, 30);

    // Section 1: Executive Metadata & Age Rating
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('1. ASSET SPECIFICATION & STATUTORY CLASSIFICATION', 14, 48);

    doc.autoTable({
      startY: 52,
      head: [['Attribute', 'Verified Specification', 'Classification Metric', 'Rating Value']],
      body: [
        ['Asset Title', report.title, 'Age Classification', report.ageClassification],
        ['Content Format', report.contentType, 'Release Risk Score', `${report.riskScore}% Friction`],
        ['Aspect Ratio', report.aspectRatio, 'Certification Status', report.status],
        ['Duration / Size', `${report.duration ? report.duration + ' sec' : 'N/A'} • ${(report.fileSize / 1024 / 1024).toFixed(2)} MB`, 'Regulatory Framework', 'CBFC Sec 5B & OTT Rules 2021'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    // Section 2: Executive Summary
    const summaryY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. REGULATORY FINDINGS & CERTIFICATION MEMORANDUM', 14, summaryY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const splitSummary = doc.splitTextToSize(report.summary, 182);
    doc.text(splitSummary, 14, summaryY + 6);

    // Section 3: Mandatory Content Descriptors Matrix
    const matrixY = summaryY + 8 + splitSummary.length * 4.5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('3. MANDATORY CONTENT DESCRIPTORS (6 CORE THEMES)', 14, matrixY);

    const descriptorRows = Object.entries(report.descriptors || {}).map(([key, val]) => [
      key.toUpperCase(),
      `${val?.score ?? 0} / 10`,
      val?.severity || 'Low',
      val?.details || 'Compliant with national broadcast guidelines.',
    ]);

    doc.autoTable({
      startY: matrixY + 4,
      head: [['Category Theme', 'Score (0-10)', 'Severity Level', 'Regulatory Findings & Details']],
      body: descriptorRows,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });

    // Section 4: Timestamped Violations
    if (report.violations && report.violations.length > 0) {
      const violationY = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('4. TIMESTAMPED VIOLATION LOG & REMEDIATION MANDATES', 14, violationY);

      const violationRows = report.violations.map((v) => [
        `${v.startTime} - ${v.endTime}`,
        v.category,
        v.severity,
        v.ruleViolated,
        v.actionableSuggestion,
      ]);

      doc.autoTable({
        startY: violationY + 4,
        head: [['Timestamp', 'Category', 'Severity', 'Statutory Clause', 'Actionable Remediation']],
        body: violationRows,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
      });
    }

    // Official Stamp & Footer
    const finalY = doc.lastAutoTable.finalY + 12;
    if (finalY < 270) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text('This digital certificate has been algorithmically validated and registered under Ministry of I&B Digital Ethics Code.', 14, finalY);
      doc.text('Authorized Regulatory Signatory: CineComply AI Autonomous Audit Officer', 14, finalY + 5);
    }

    // Save PDF
    doc.save(`CineComply_Certificate_${report.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Retrieving official regulatory compliance report...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle size={48} className={styles.errorIcon} />
        <h2>Compliance Record Not Found</h2>
        <p>{error || 'The requested certification review could not be loaded.'}</p>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const simulatedRisk = calculateSimulatedRisk();
  const isPoster = report.contentType?.includes('Poster');
  const isSong = report.contentType?.includes('Song');
  const isVertical = report.aspectRatio === '9:16';

  return (
    <div className={styles.reportContainer}>
      {/* Top Navigation & Actions Bar */}
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

      {/* Hero Certification Banner */}
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
          <p className={styles.summaryText}>{report.summary}</p>
        </div>

        {/* Badges: Age Rating & Risk Gauge */}
        <div className={styles.heroRight}>
          {/* Age Classification Badge */}
          <div className={styles.ratingCard}>
            <span className={styles.ratingLabel}>Statutory Age Rating</span>
            <div className={`${styles.ageBadgeBig} ${styles[`badge_${report.ageClassification.replace(/[^a-zA-Z0-9]/g, '')}`] || styles.badgeDefault}`}>
              {report.ageClassification}
            </div>
            <span className={styles.ratingStatus}>{report.status}</span>
          </div>

          {/* Risk to Release Gauge */}
          <div className={styles.riskCard}>
            <span className={styles.riskLabel}>Release Risk</span>
            <div className={styles.radialGauge}>
              <svg className={styles.radialSvg} viewBox="0 0 100 100">
                <circle
                  className={styles.radialBg}
                  cx="50"
                  cy="50"
                  r="40"
                />
                <circle
                  className={styles.radialProgress}
                  cx="50"
                  cy="50"
                  r="40"
                  style={{
                    strokeDasharray: 251.2,
                    strokeDashoffset: 251.2 - (251.2 * report.riskScore) / 100,
                    stroke:
                      report.riskScore > 60
                        ? 'var(--accent-rose)'
                        : report.riskScore > 30
                        ? 'var(--accent-secondary)'
                        : 'var(--accent-emerald)',
                  }}
                />
              </svg>
              <div className={styles.radialContent}>
                <span className={styles.radialNumber}>{report.riskScore}%</span>
                <span className={styles.radialText}>Friction</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Inspection Grid */}
      <div className={styles.inspectionGrid}>
        {/* Left Column: Adaptive Media Player with Timeline Markers */}
        <div className={styles.playerColumn}>
          <div className={styles.playerCard}>
            <div className={styles.playerCardHeader}>
              <div className={styles.playerTitleWrapper}>
                <Film size={16} className={styles.playerIcon} />
                <span className={styles.playerHeaderTitle}>
                  Adaptive Compliance Inspector ({report.aspectRatio})
                </span>
              </div>
              <span className={styles.playerLivePill}>Sync Timeline</span>
            </div>

            {/* Video / Image / Audio Inspector */}
            <div
              className={`${styles.mediaViewport} ${
                isVertical ? styles.verticalViewport : styles.widescreenViewport
              }`}
            >
              {isPoster || report.mediaUrl?.match(/\.(jpeg|jpg|png|webp)/i) ? (
                <img
                  src={report.mediaUrl}
                  alt={report.title}
                  className={styles.inspectorImage}
                />
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

            {/* Interactive Timeline Violation Bar */}
            {report.violations && report.violations.length > 0 && (
              <div className={styles.timelineBarContainer}>
                <div className={styles.timelineHeader}>
                  <span className={styles.timelineTitle}>
                    <Clock size={13} />
                    <span>Clickable Timeline Violation Markers</span>
                  </span>
                  <span className={styles.timelineCount}>
                    {report.violations.length} Flagged Frames
                  </span>
                </div>
                <div className={styles.timelineTrack}>
                  {report.violations.map((v, idx) => {
                    // Position percentage
                    const totalDur = report.duration || 60;
                    const posPercent = Math.min(
                      96,
                      Math.max(4, ((v.secondOffset || idx * 10) / totalDur) * 100)
                    );
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSeek(v.secondOffset || 0)}
                        style={{ left: `${posPercent}%` }}
                        className={`${styles.timelineMarker} ${
                          styles[`marker_${v.severity.toLowerCase()}`] || styles.markerDefault
                        }`}
                        title={`Jump to ${v.startTime} - ${v.category} (${v.severity})`}
                      >
                        <span className={styles.markerTooltip}>
                          {v.startTime} {v.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Descriptors Matrix, Violations Log & Remediation Simulator */}
        <div className={styles.detailsColumn}>
          {/* Navigation Tabs */}
          <div className={styles.tabNav}>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`${styles.tabBtn} ${activeTab === 'matrix' ? styles.tabActive : ''}`}
            >
              <span>6-Theme Matrix</span>
            </button>
            <button
              onClick={() => setActiveTab('violations')}
              className={`${styles.tabBtn} ${activeTab === 'violations' ? styles.tabActive : ''}`}
            >
              <span>Violation Log ({report.violations?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`${styles.tabBtn} ${activeTab === 'simulator' ? styles.tabActive : ''}`}
            >
              <Sparkles size={14} />
              <span>What-If Remediation</span>
            </button>
          </div>

          {/* Tab 1: 6 Mandatory Content Descriptors Matrix */}
          {activeTab === 'matrix' && (
            <div className={styles.matrixContainer}>
              <div className={styles.matrixHeader}>
                <h3 className={styles.matrixTitle}>Mandatory Content Descriptors</h3>
                <p className={styles.matrixDesc}>
                  Evaluated across the 6 statutory categories required under CBFC and Digital Media Ethics Code:
                </p>
              </div>

              <div className={styles.matrixGrid}>
                {Object.entries(report.descriptors || {}).map(([key, item]) => {
                  const score = item?.score ?? 0;
                  const severity = item?.severity || 'Low';
                  const details = item?.details || 'Within acceptable broadcast bounds.';

                  return (
                    <div key={key} className={styles.descriptorCard}>
                      <div className={styles.descTop}>
                        <span className={styles.descName}>{key.toUpperCase()}</span>
                        <span
                          className={`${styles.descSeverity} ${
                            styles[`sev_${severity.toLowerCase()}`] || ''
                          }`}
                        >
                          {severity}
                        </span>
                      </div>

                      <div className={styles.descMeterWrapper}>
                        <div className={styles.descMeterTrack}>
                          <div
                            className={styles.descMeterFill}
                            style={{
                              width: `${score * 10}%`,
                              background:
                                score > 6
                                  ? 'var(--accent-rose)'
                                  : score > 3
                                  ? 'var(--accent-secondary)'
                                  : 'var(--accent-emerald)',
                            }}
                          />
                        </div>
                        <span className={styles.descScoreText}>{score}/10</span>
                      </div>

                      <p className={styles.descDetails}>{details}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Timestamped Violation Log */}
          {activeTab === 'violations' && (
            <div className={styles.violationsContainer}>
              <div className={styles.violationsHeader}>
                <h3 className={styles.matrixTitle}>Timestamped Regulatory Incidents</h3>
                <p className={styles.matrixDesc}>
                  Click on any incident card to jump the player to the exact frame:
                </p>
              </div>

              {report.violations && report.violations.length > 0 ? (
                <div className={styles.violationsList}>
                  {report.violations.map((violation, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSeek(violation.secondOffset || 0)}
                      className={styles.violationCard}
                    >
                      <div className={styles.violationCardTop}>
                        <div className={styles.timestampBadge}>
                          <Clock size={12} />
                          <span>
                            {violation.startTime} - {violation.endTime}
                          </span>
                        </div>
                        <span className={styles.violationCategory}>
                          {violation.category}
                        </span>
                        <span
                          className={`${styles.violationSeverity} ${
                            styles[`sev_${violation.severity.toLowerCase()}`] || ''
                          }`}
                        >
                          {violation.severity}
                        </span>
                      </div>

                      <p className={styles.violationDesc}>{violation.description}</p>

                      <div className={styles.ruleViolatedBox}>
                        <span className={styles.ruleLabel}>Rule Violated:</span>
                        <span className={styles.ruleText}>{violation.ruleViolated}</span>
                      </div>

                      <div className={styles.actionableBox}>
                        <span className={styles.actionableLabel}>Remediation:</span>
                        <span className={styles.actionableText}>
                          {violation.actionableSuggestion}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.cleanViolationsBox}>
                  <CheckCircle size={32} className={styles.cleanIcon} />
                  <h4>No Regulatory Violations Flagged</h4>
                  <p>All frames and audio stems comply with the statutory code.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: What-If Remediation Simulator */}
          {activeTab === 'simulator' && (
            <div className={styles.simulatorContainer}>
              <div className={styles.simCardTop}>
                <div className={styles.simHeaderInfo}>
                  <h3 className={styles.matrixTitle}>Interactive What-If Remediation</h3>
                  <p className={styles.matrixDesc}>
                    Simulate how implementing proposed editorial cuts lowers the release risk and revises statutory rating:
                  </p>
                </div>

                {/* Simulated Score Comparison */}
                <div className={styles.simComparisonCard}>
                  <div className={styles.simScoreBox}>
                    <span className={styles.simLabel}>Current Risk</span>
                    <span className={styles.simCurrentVal}>{report.riskScore}%</span>
                  </div>
                  <ChevronRight size={20} className={styles.simArrow} />
                  <div className={styles.simScoreBox}>
                    <span className={styles.simLabel}>Projected Risk</span>
                    <span className={styles.simProjectedVal}>{simulatedRisk}%</span>
                  </div>
                </div>
              </div>

              {/* Suggestions Checklist */}
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
                          Target: {item.projectedRiskScore}% Risk
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
  );
}
