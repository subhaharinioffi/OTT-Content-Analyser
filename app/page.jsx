'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  Activity,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  Film,
  Video,
  Music,
  Image as ImageIcon,
  Smartphone,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import TiltedCard from '@/components/TiltedCard';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const [reports, setReports] = useState([]);
  const [telemetry, setTelemetry] = useState({
    totalSubmissions: 0,
    approvedCount: 0,
    highRiskCount: 0,
    avgRiskScore: 0,
    clearanceRate: 100,
  });
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.reports) {
        setReports(data.reports);
        if (data.telemetry) setTelemetry(data.telemetry);
      }
    } catch (err) {
      console.error('Error fetching dashboard reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'Movie':
        return <Film size={16} />;
      case 'Short Film':
        return <Video size={16} />;
      case 'Song':
        return <Music size={16} />;
      case 'Poster (img)':
        return <ImageIcon size={16} />;
      case 'Short Video (Reels)':
        return <Smartphone size={16} />;
      default:
        return <Layers size={16} />;
    }
  };

  const getAgeBadgeClass = (rating) => {
    switch (rating) {
      case 'U':
        return styles.badgeU;
      case 'U/A 7+':
        return styles.badgeUA7;
      case 'U/A 13+':
        return styles.badgeUA13;
      case 'U/A 16+':
        return styles.badgeUA16;
      case 'A':
        return styles.badgeA;
      case 'REJECTED':
        return styles.badgeRejected;
      default:
        return styles.badgeDefault;
    }
  };

  return (
    <div className={styles.dashboardWrapper}>
      {/* Cinematic OTT Movie Posters Mosaic Background */}
      <div className={styles.dashboardBgBackdrop} aria-hidden="true" />

      <div className={styles.dashboardContainer}>
        {/* Landing Hero with React Bits <TiltedCard /> 3D Perspective Interaction */}
        <TiltedCard
          containerWidth="100%"
          containerHeight="auto"
          scaleOnHover={1.018}
          rotateAmplitude={8}
          radius={24}
          glare={0.4}
          glareColor="#E51C23"
          shadow={0.5}
          className={styles.heroTiltedCardWrapper}
        >
          <section className={styles.heroSection}>
            <div className={styles.heroLeft}>
              <div className={styles.brandBadge}>
                <div className={styles.pulseDot} />
                <span>SHORTFUNDLY CENSORAI • REGULATORY INTELLIGENCE</span>
              </div>

              <h1 className={styles.heroTitle}>
                Next-Gen <span className={styles.redHighlight}>OTT Censorship</span> &amp; Compliance
              </h1>

              <p className={styles.heroSubtitle}>
                Autonomous multimodal AI evaluation for films, series, songs, and vertical reels under the CBFC Section 5B and Digital Media Ethics Code (2021).
              </p>

              <div className={styles.heroActions}>
                <Link href="/submit" className={styles.primaryUploadBtn}>
                  <UploadCloud size={18} />
                  <span>Submit Media for Censor Review</span>
                  <ArrowRight size={16} />
                </Link>
                <button
                  onClick={fetchReports}
                  className={styles.refreshBtn}
                  title="Refresh telemetry"
                >
                  <RefreshCw size={15} className={loading ? styles.spinning : ''} />
                  <span>Sync Status</span>
                </button>
              </div>
            </div>

            {/* Animated Shortfundly Logo Showcase */}
            <div className={styles.heroRight}>
              <div className={styles.logoStage}>
                <div className={styles.orbitRing} />
                <div className={styles.orbitRingOuter} />
                <div className={styles.logoGlowOrb} />
                <div className={styles.logoCircleWrapper}>
                  <Image
                    src="/logo.png"
                    alt="Shortfundly Circle Logo"
                    width={110}
                    height={110}
                    priority
                    className={styles.animatedLogoImg}
                  />
                </div>
                <div className={styles.stageTag}>
                  <ShieldCheck size={14} />
                  <span>AI Censor Engine Active</span>
                </div>
              </div>
            </div>
          </section>
        </TiltedCard>

      {/* Telemetry Precision Cards */}
      <section className={styles.telemetryGrid}>
        <div className={styles.telemetryCard}>
          <div
            className={styles.telemetryIconWrapper}
            style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8' }}
          >
            <Layers size={22} />
          </div>
          <div className={styles.telemetryInfo}>
            <span className={styles.telemetryLabel}>Total Audits</span>
            <span className={styles.telemetryValue}>{telemetry.totalSubmissions}</span>
          </div>
          <div className={styles.telemetrySubtext}>Real media records processed</div>
        </div>

        <div className={styles.telemetryCard}>
          <div
            className={styles.telemetryIconWrapper}
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}
          >
            <FileCheck2 size={22} />
          </div>
          <div className={styles.telemetryInfo}>
            <span className={styles.telemetryLabel}>Clearance Rate</span>
            <span className={styles.telemetryValue}>{telemetry.clearanceRate}%</span>
          </div>
          <div className={styles.telemetrySubtext}>Passed statutory threshold</div>
        </div>

        <div className={styles.telemetryCard}>
          <div
            className={styles.telemetryIconWrapper}
            style={{ background: 'rgba(225, 29, 72, 0.12)', color: '#E11D48' }}
          >
            <AlertTriangle size={22} />
          </div>
          <div className={styles.telemetryInfo}>
            <span className={styles.telemetryLabel}>Flagged Incidents</span>
            <span className={styles.telemetryValue}>{telemetry.highRiskCount}</span>
          </div>
          <div className={styles.telemetrySubtext}>Requiring editorial remediation</div>
        </div>

        <div className={styles.telemetryCard}>
          <div
            className={styles.telemetryIconWrapper}
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}
          >
            <Activity size={22} />
          </div>
          <div className={styles.telemetryInfo}>
            <span className={styles.telemetryLabel}>Mean Release Friction</span>
            <span className={styles.telemetryValue}>{telemetry.avgRiskScore}%</span>
          </div>
          <div className={styles.telemetrySubtext}>Average regulatory risk score</div>
        </div>
      </section>

      {/* Production-Ready Regulatory Audit Queue */}
      <section className={styles.submissionsSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Regulatory Audit Queue</h2>
            <p className={styles.sectionDesc}>
              Real-time censorship and compliance records stored in MongoDB Atlas
            </p>
          </div>
          <Link href="/submit" className={styles.quickUploadLink}>
            <UploadCloud size={16} />
            <span>Submit Media</span>
          </Link>
        </div>

        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <span>Loading regulatory audit records...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconCircle}>
              <Film size={34} />
            </div>
            <h3 className={styles.emptyTitle}>No Submissions In Queue</h3>
            <p className={styles.emptyText}>
              Your regulatory audit queue is currently clean. Upload a movie, short film, vertical reel, song, or poster to begin real-time AI compliance screening.
            </p>
            <Link href="/submit" className={styles.emptyUploadBtn}>
              <UploadCloud size={18} />
              <span>Submit Your First Asset</span>
            </Link>
          </div>
        ) : (
          <div className={styles.tableCard}>
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Asset & Media</th>
                    <th>Format</th>
                    <th>Age Rating</th>
                    <th>Release Risk</th>
                    <th>Key Violation Categories</th>
                    <th>Audit Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const id = report._id || report.id;
                    const violationsCount = report.violations?.length || 0;
                    return (
                      <tr key={id} className={styles.tableRow}>
                        <td className={styles.assetCell}>
                          <div className={styles.assetThumb}>
                            {report.contentType?.includes('Poster') ||
                            report.mediaUrl?.match(/\.(jpeg|jpg|png|webp)/i) ? (
                              <img
                                src={report.mediaUrl}
                                alt={report.title}
                                className={styles.thumbImg}
                              />
                            ) : (
                              <div className={styles.thumbPlaceholder}>
                                {getContentTypeIcon(report.contentType)}
                              </div>
                            )}
                          </div>
                          <div className={styles.assetMeta}>
                            <span className={styles.assetTitle}>{report.title}</span>
                            <span className={styles.assetAspect}>
                              {report.aspectRatio} •{' '}
                              {report.duration ? `${report.duration}s` : 'Visual Asset'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className={styles.typePill}>
                            {getContentTypeIcon(report.contentType)}
                            <span>{report.contentType}</span>
                          </span>
                        </td>

                        <td>
                          <span
                            className={`${styles.ageBadge} ${getAgeBadgeClass(
                              report.ageClassification
                            )}`}
                          >
                            {report.ageClassification}
                          </span>
                        </td>

                        <td>
                          <div className={styles.riskMeterWrapper}>
                            <div className={styles.riskBarTrack}>
                              <div
                                className={styles.riskBarFill}
                                style={{
                                  width: `${report.riskScore}%`,
                                  background:
                                    report.riskScore > 65
                                      ? 'var(--accent-rose)'
                                      : report.riskScore > 35
                                      ? 'var(--accent-secondary)'
                                      : 'var(--accent-emerald)',
                                }}
                              />
                            </div>
                            <span className={styles.riskScoreText}>{report.riskScore}%</span>
                          </div>
                        </td>

                        <td>
                          <div className={styles.violationSummary}>
                            {violationsCount > 0 ? (
                              <span className={styles.violationCountPill}>
                                <AlertTriangle size={12} />
                                <span>{violationsCount} Flags</span>
                              </span>
                            ) : (
                              <span className={styles.cleanPill}>Clean</span>
                            )}
                          </div>
                        </td>

                        <td className={styles.dateCell}>
                          <div className={styles.dateWrapper}>
                            <Clock size={13} />
                            <span>
                              {report.createdAt
                                ? new Date(report.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Just now'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <Link href={`/report/${id}`} className={styles.viewReportBtn}>
                            <span>Inspect</span>
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  </div>
  );
}
