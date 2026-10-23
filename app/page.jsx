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
  ExternalLink,
  Film,
  Video,
  Music,
  Image as ImageIcon,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
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
    <div className={styles.dashboardContainer}>
      {/* Studio Banner / Hero */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.brandBadge}>
            <Image
              src="/logo.png"
              alt="Logo"
              width={26}
              height={26}
              className={styles.heroLogo}
            />
            <span>Next-Gen Cinema & OTT Regulatory Intelligence</span>
          </div>
          <h1 className={styles.heroTitle}>
            Multimodal <span className={styles.redHighlight}>AI Compliance</span> & Certification
          </h1>
          <p className={styles.heroSubtitle}>
            Autonomous regulatory screening for OTT films, series, songs, and vertical reels under the Digital Media Ethics Code (2021) and CBFC guidelines.
          </p>
          <div className={styles.heroActions}>
            <Link href="/submit" className={styles.primaryUploadBtn}>
              <UploadCloud size={18} />
              <span>Launch Upload Studio</span>
            </Link>
            <button onClick={fetchReports} className={styles.refreshBtn} title="Refresh telemetry">
              <RefreshCw size={16} className={loading ? styles.spinning : ''} />
              <span>Sync Telemetry</span>
            </button>
          </div>
        </div>

        {/* Studio Live Badge */}
        <div className={styles.studioStatusCard}>
          <div className={styles.statusHeader}>
            <div className={styles.pulseDot} />
            <span className={styles.statusTitle}>REGULATORY ENGINE LIVE</span>
          </div>
          <p className={styles.statusDesc}>
            Gemini 3.5 Multimodal • Cloudinary Media CDN • MongoDB Atlas
          </p>
          <div className={styles.statusRules}>
            <span className={styles.rulePill}>CBFC Sec 5B</span>
            <span className={styles.rulePill}>IT Rules 2021</span>
            <span className={styles.rulePill}>BBFC / MPAA</span>
          </div>
        </div>
      </section>

      {/* Telemetry Precision Cards */}
      <section className={styles.telemetryGrid}>
        <div className={styles.telemetryCard}>
          <div className={styles.telemetryIconWrapper} style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8' }}>
            <Layers size={22} />
          </div>
          <div className={styles.telemetryInfo}>
            <span className={styles.telemetryLabel}>Total Submissions</span>
            <span className={styles.telemetryValue}>{telemetry.totalSubmissions}</span>
          </div>
          <div className={styles.telemetrySubtext}>All media types recorded</div>
        </div>

        <div className={styles.telemetryCard}>
          <div className={styles.telemetryIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
            <FileCheck2 size={22} />
          </div>
          <div className={styles.telemetryInfo}>
            <span className={styles.telemetryLabel}>Clearance Rate</span>
            <span className={styles.telemetryValue}>{telemetry.clearanceRate}%</span>
          </div>
          <div className={styles.telemetrySubtext}>Approved or conditional</div>
        </div>

        <div className={styles.telemetryCard}>
          <div className={styles.telemetryIconWrapper} style={{ background: 'rgba(225, 29, 72, 0.12)', color: '#E11D48' }}>
            <AlertTriangle size={22} />
          </div>
          <div className={styles.telemetryInfo}>
            <span className={styles.telemetryLabel}>High Risk Flags</span>
            <span className={styles.telemetryValue}>{telemetry.highRiskCount}</span>
          </div>
          <div className={styles.telemetrySubtext}>Requiring editorial cuts</div>
        </div>

        <div className={styles.telemetryCard}>
          <div className={styles.telemetryIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
            <Activity size={22} />
          </div>
          <div className={styles.telemetryInfo}>
            <span className={styles.telemetryLabel}>Avg Regulatory Friction</span>
            <span className={styles.telemetryValue}>{telemetry.avgRiskScore}%</span>
          </div>
          <div className={styles.telemetrySubtext}>Mean compliance risk score</div>
        </div>
      </section>

      {/* Submissions Section */}
      <section className={styles.submissionsSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Regulatory Audit Queue</h2>
            <p className={styles.sectionDesc}>
              Real-time compliance reports generated by Gemini and stored in MongoDB Atlas
            </p>
          </div>
          <Link href="/submit" className={styles.quickUploadLink}>
            <UploadCloud size={16} />
            <span>Submit Asset</span>
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
              <Film size={36} />
            </div>
            <h3 className={styles.emptyTitle}>No Submissions In Queue</h3>
            <p className={styles.emptyText}>
              Upload a movie, short film, reel, song, or poster to trigger real-time AI regulatory screening.
            </p>
            <Link href="/submit" className={styles.emptyUploadBtn}>
              <UploadCloud size={18} />
              <span>Submit Media Asset Now</span>
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
                            {report.contentType?.includes('Poster') || report.mediaUrl?.match(/\.(jpeg|jpg|png|webp)/i) ? (
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
                              {report.aspectRatio} • {report.duration ? `${report.duration}s` : 'Visual Asset'}
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
                          <span className={`${styles.ageBadge} ${getAgeBadgeClass(report.ageClassification)}`}>
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
  );
}
