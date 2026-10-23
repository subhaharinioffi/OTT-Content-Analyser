'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
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
  User,
} from 'lucide-react';
import ReflectiveCard from '@/components/ReflectiveCard';
import MagicBentoCard from '@/components/MagicBentoCard';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const { data: session } = useSession();
  const username =
    session?.user?.username ||
    session?.user?.name ||
    session?.user?.email?.split('@')[0] ||
    'Reviewer';

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

  const getFormatIcon = (format) => {
    switch (format) {
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
        return <Film size={16} />;
    }
  };

  const getRatingBadgeClass = (rating) => {
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
        {/* Welcome Reviewer Banner */}
        <div className={styles.welcomeBanner}>
          <div className={styles.welcomeGreeting}>
            <span>Welcome - <strong className={styles.welcomeUsername}>{username}</strong></span>
          </div>
          <div className={styles.welcomeMetaBadge}>
            <Sparkles size={13} />
            <span>ONLINE REVIEWER SESSION</span>
          </div>
        </div>

        {/* Landing Hero with React Bits <ReflectiveCard /> Specular WebGL Interaction */}
        <ReflectiveCard
          width="100%"
          height="auto"
          radius={24}
          tint="#E51C23"
          imageSrc="/dashboard-bg.jpg"
          metalness={0.78}
          roughness={0.28}
          shine={1.8}
          glare={0.9}
          warp={0.35}
          warpScale={1.2}
          bevel={5}
          tiltStrength={12}
          enableTilt={true}
          className={styles.heroReflectiveCardWrapper}
        >
          <section className={styles.heroSection}>
            <div className={styles.heroLeft}>
              <div className={styles.heroWelcomeRow}>
                <div className={styles.heroWelcomePill}>
                  <User size={13} />
                  <span>Welcome - <strong>{username}</strong></span>
                </div>
                <div className={styles.brandBadge}>
                  <div className={styles.pulseDot} />
                  <span>SHORTFUNDLY CENSORAI • REGULATORY INTELLIGENCE</span>
                </div>
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
        </ReflectiveCard>

        {/* Telemetry Precision Cards with React Bits Magic Bento Effect */}
        <section className={styles.telemetryGrid}>
          <MagicBentoCard
            glowColor="#38BDF8"
            enableStars={true}
            enableTilt={true}
            tiltFactor={5}
            className={styles.telemetryBentoCard}
          >
            <div className={styles.telemetryCardInner}>
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
          </MagicBentoCard>

          <MagicBentoCard
            glowColor="#10B981"
            enableStars={true}
            enableTilt={true}
            tiltFactor={5}
            className={styles.telemetryBentoCard}
          >
            <div className={styles.telemetryCardInner}>
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
          </MagicBentoCard>

          <MagicBentoCard
            glowColor="#E11D48"
            enableStars={true}
            enableTilt={true}
            tiltFactor={5}
            className={styles.telemetryBentoCard}
          >
            <div className={styles.telemetryCardInner}>
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
          </MagicBentoCard>

          <MagicBentoCard
            glowColor="#F59E0B"
            enableStars={true}
            enableTilt={true}
            tiltFactor={5}
            className={styles.telemetryBentoCard}
          >
            <div className={styles.telemetryCardInner}>
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
          </MagicBentoCard>
        </section>

        {/* Production-Ready Regulatory Audit Queue with Magic Bento Effect */}
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
            <MagicBentoCard
              glowColor="#E51C23"
              enableStars={false}
              enableTilt={false}
              className={styles.tableBentoCard}
            >
              <div className={styles.tableCard}>
                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Asset &amp; Media</th>
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
                                (report.fileUrl && /\.(jpg|jpeg|png|webp)/i.test(report.fileUrl)) ? (
                                  <Image
                                    src={report.fileUrl || '/demo_poster.png'}
                                    alt={report.title}
                                    width={44}
                                    height={44}
                                    className={styles.thumbImg}
                                  />
                                ) : (
                                  <div className={styles.formatIconThumb}>
                                    {getFormatIcon(report.contentType)}
                                  </div>
                                )}
                              </div>
                              <div className={styles.assetMeta}>
                                <span className={styles.assetTitle}>{report.title}</span>
                                <span className={styles.assetRatio}>{report.aspectRatio} Cinema</span>
                              </div>
                            </td>

                            <td>
                              <span className={styles.formatTag}>
                                {getFormatIcon(report.contentType)}
                                <span>{report.contentType}</span>
                              </span>
                            </td>

                            <td>
                              <span
                                className={`${styles.ratingBadge} ${getRatingBadgeClass(report.rating)}`}
                              >
                                {report.rating}
                              </span>
                            </td>

                            <td>
                              <div className={styles.riskBarWrapper}>
                                <div className={styles.riskText}>
                                  <span className={styles.riskPercent}>{report.riskScore}%</span>
                                  <span className={styles.riskLevel}>{report.riskLevel}</span>
                                </div>
                                <div className={styles.riskTrack}>
                                  <div
                                    className={styles.riskFill}
                                    style={{
                                      width: `${report.riskScore}%`,
                                      background:
                                        report.riskScore > 65
                                          ? '#E11D48'
                                          : report.riskScore > 35
                                          ? '#F59E0B'
                                          : '#10B981',
                                    }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td>
                              <div className={styles.violationsCell}>
                                {violationsCount > 0 ? (
                                  <span className={styles.violationPill}>
                                    <AlertTriangle size={12} />
                                    <span>{violationsCount} Flagged Issues</span>
                                  </span>
                                ) : (
                                  <span className={styles.cleanPill}>
                                    <ShieldCheck size={12} />
                                    <span>Zero Flags • Clean</span>
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              <div className={styles.dateCell}>
                                <Clock size={13} />
                                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                              </div>
                            </td>

                            <td>
                              <Link href={`/report/${id}`} className={styles.viewReportBtn}>
                                <span>Inspect Audit</span>
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
            </MagicBentoCard>
          )}
        </section>
      </div>
    </div>
  );
}
