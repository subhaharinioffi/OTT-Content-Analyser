'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import {
  UploadCloud,
  Film,
  Video,
  Music,
  Image as ImageIcon,
  Smartphone,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileVideo,
  Play,
  RotateCcw,
  X,
  FileQuestion,
} from 'lucide-react';
import styles from './submit.module.css';
import CinemaVideoWallBg from '@/components/CinemaVideoWallBg';

const CONTENT_TYPES = [
  { id: 'Poster (img)', label: 'Poster (img)', icon: ImageIcon, defaultAspect: '16:9', desc: 'High-res promotional one-sheet or key visual' },
  { id: 'Movie', label: 'Movie', icon: Film, defaultAspect: '16:9', desc: 'Full-length theatrical or streaming feature film' },
  { id: 'Short Film', label: 'Short Film', icon: Video, defaultAspect: '16:9', desc: 'Short narrative format under 45 minutes' },
  { id: 'Song', label: 'Song', icon: Music, defaultAspect: '16:9', desc: 'Official music track, lyrical video or master' },
  { id: 'Short Video (Reels)', label: 'Short Video (Reels)', icon: Smartphone, defaultAspect: '9:16', desc: 'Vertical mobile format (Reels, TikTok, Shorts)' },
];

const ANALYSIS_STAGES = [
  'Uploading asset to Cloudinary Storage CDN...',
  'Ingesting media into Google Gemini Multimodal Engine...',
  'Evaluating visual & audio signals against CBFC & OTT Rules...',
  'Screening 7 mandatory content descriptors & timeline flags...',
  'Synthesizing certification report & persisting in MongoDB Atlas...',
];

export default function SubmitPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const fileInputRef = useRef(null);

  const [contentType, setContentType] = useState('Movie');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileDuration, setFileDuration] = useState(0);
  const [detectedRatio, setDetectedRatio] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Warning Popup Modal state for incompatible file uploads
  const [warningModal, setWarningModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    fileName: '',
    fileSize: '',
    selectedCategory: '',
    detectedType: '',
    requiredType: '',
    suggestedCategory: '',
    pendingFile: null,
  });

  // Handle file selection and aspect ratio auto-detection
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processSelectedFile(selected);
  };

  const processSelectedFile = (selected, targetCategory = contentType) => {
    if (!selected) return;

    const fileName = selected.name || 'unnamed_file';
    const fileType = selected.type || '';
    const lowerName = fileName.toLowerCase();

    // Comprehensive extension and MIME check
    const isImage =
      fileType.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|bmp|svg|tiff|avif)$/i.test(lowerName);

    const isVideo =
      fileType.startsWith('video/') ||
      /\.(mp4|mov|webm|mkv|avi|m4v|flv|wmv)$/i.test(lowerName);

    const isAudio =
      fileType.startsWith('audio/') ||
      /\.(mp3|wav|ogg|aac|flac|m4a|wma)$/i.test(lowerName);

    const isVideoCategory = ['Movie', 'Short Film', 'Short Video (Reels)'].includes(targetCategory);
    const isPosterCategory = targetCategory === 'Poster (img)';
    const isSongCategory = targetCategory === 'Song';

    // 1. Critical Rule: Image uploaded when Video Source is selected -> REJECT and show warning popup
    if (isVideoCategory && isImage) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setWarningModal({
        isOpen: true,
        title: 'Image File Not Accepted for Video Source',
        message: `You selected "${targetCategory}" (Video Source), but attempted to upload an image file ("${fileName}"). Video regulatory screening requires video files (.MP4, .MOV, .WEBM).`,
        fileName,
        fileSize: (selected.size / 1024 / 1024).toFixed(2),
        selectedCategory: targetCategory,
        detectedType: `Image (${fileType || 'JPEG/PNG'})`,
        requiredType: 'Video Format (.mp4, .mov, .webm)',
        suggestedCategory: 'Poster (img)',
        pendingFile: selected,
      });
      return;
    }

    // 2. Video uploaded when Poster is selected -> REJECT and show warning popup
    if (isPosterCategory && isVideo) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setWarningModal({
        isOpen: true,
        title: 'Video File Not Accepted for Poster',
        message: `You selected "Poster (img)", but uploaded a video file ("${fileName}"). Poster regulatory screening requires static key visual images (.PNG, .JPG, .WEBP).`,
        fileName,
        fileSize: (selected.size / 1024 / 1024).toFixed(2),
        selectedCategory: targetCategory,
        detectedType: `Video (${fileType || 'MP4/MOV'})`,
        requiredType: 'Image Format (.png, .jpg, .webp)',
        suggestedCategory: 'Movie',
        pendingFile: selected,
      });
      return;
    }

    // 3. Image uploaded when Song is selected -> REJECT and show warning popup
    if (isSongCategory && isImage) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setWarningModal({
        isOpen: true,
        title: 'Image File Not Accepted for Audio Track',
        message: `You selected "Song", but uploaded an image file ("${fileName}"). Song regulatory screening requires master audio (.MP3, .WAV) or a music video.`,
        fileName,
        fileSize: (selected.size / 1024 / 1024).toFixed(2),
        selectedCategory: targetCategory,
        detectedType: `Image (${fileType || 'JPEG/PNG'})`,
        requiredType: 'Audio (.mp3, .wav) or Music Video',
        suggestedCategory: 'Poster (img)',
        pendingFile: selected,
      });
      return;
    }

    // File passed validation -> Accept and generate preview
    setFile(selected);
    setErrorMessage('');

    const previewUrl = URL.createObjectURL(selected);
    setFilePreview(previewUrl);

    // Auto-detect aspect ratio for images
    if (isImage) {
      const img = new window.Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        if (ratio < 0.8) {
          setAspectRatio('9:16');
          setDetectedRatio(`9:16 (${img.width}x${img.height})`);
        } else {
          setAspectRatio('16:9');
          setDetectedRatio(`16:9 (${img.width}x${img.height})`);
        }
      };
      img.src = previewUrl;
    }

    // Auto-detect aspect ratio and duration for video
    if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setFileDuration(Math.round(video.duration));
        const ratio = video.videoWidth / video.videoHeight;
        if (ratio < 0.8) {
          setAspectRatio('9:16');
          setDetectedRatio(`9:16 (${video.videoWidth}x${video.videoHeight})`);
          if (targetCategory !== 'Short Video (Reels)') {
            setContentType('Short Video (Reels)');
          }
        } else {
          setAspectRatio('16:9');
          setDetectedRatio(`16:9 (${video.videoWidth}x${video.videoHeight})`);
        }
      };
      video.src = previewUrl;
    }
  };

  const handleSwitchCategoryAndApply = () => {
    if (!warningModal.pendingFile) return;
    const target = warningModal.suggestedCategory;
    setContentType(target);
    const pending = warningModal.pendingFile;
    setWarningModal((prev) => ({ ...prev, isOpen: false, pendingFile: null }));
    processSelectedFile(pending, target);
  };

  const handleSelectAlternativeFile = () => {
    setWarningModal((prev) => ({ ...prev, isOpen: false, pendingFile: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }
  };

  const handleCloseWarning = () => {
    setWarningModal((prev) => ({ ...prev, isOpen: false, pendingFile: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processSelectedFile(dropped);
    }
  };

  const handleSelectContentType = (type) => {
    setContentType(type.id);
    if (!detectedRatio) {
      setAspectRatio(type.defaultAspect);
    }
    // If a file is already loaded, validate compatibility with new selection
    if (file) {
      const fileName = file.name || '';
      const fileType = file.type || '';
      const lowerName = fileName.toLowerCase();
      const isImg =
        fileType.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif|bmp|svg|tiff)$/i.test(lowerName);
      const isVid =
        fileType.startsWith('video/') ||
        /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(lowerName);
      const isVideoCategory = ['Movie', 'Short Film', 'Short Video (Reels)'].includes(type.id);

      if (isVideoCategory && isImg) {
        setWarningModal({
          isOpen: true,
          title: 'Image Incompatible with ' + type.label,
          message: `You selected "${type.label}" (Video Source), but your selected media is an image ("${fileName}"). Video regulatory screening requires video files (.MP4, .MOV, .WEBM).`,
          fileName,
          fileSize: (file.size / 1024 / 1024).toFixed(2),
          selectedCategory: type.id,
          detectedType: `Image (${fileType || 'JPEG/PNG'})`,
          requiredType: 'Video Format (.mp4, .mov, .webm)',
          suggestedCategory: 'Poster (img)',
          pendingFile: file,
        });
        setFile(null);
        setFilePreview(null);
        setDetectedRatio(null);
      } else if (type.id === 'Poster (img)' && isVid) {
        setWarningModal({
          isOpen: true,
          title: 'Video Incompatible with Poster Format',
          message: `You selected "Poster (img)", but your selected media is a video file ("${fileName}"). Poster regulatory screening requires static key visual images (.PNG, .JPG).`,
          fileName,
          fileSize: (file.size / 1024 / 1024).toFixed(2),
          selectedCategory: type.id,
          detectedType: `Video (${fileType || 'MP4/MOV'})`,
          requiredType: 'Image Format (.png, .jpg, .webp)',
          suggestedCategory: 'Movie',
          pendingFile: file,
        });
        setFile(null);
        setFilePreview(null);
        setDetectedRatio(null);
      }
    }
  };

  const handleLoadDemoPoster = async (isVertical = false) => {
    try {
      const fileName = isVertical ? 'demo_poster_vertical.png' : 'demo_poster.png';
      const posterTitle = isVertical ? 'Neon Reckoning : The Underground' : 'Red Sands : Protocol 9';
      const res = await fetch(`/${fileName}`);
      const blob = await res.blob();
      const demoFile = new File([blob], fileName, { type: 'image/png' });
      setContentType('Poster (img)');
      setTitle(posterTitle);
      setSynopsis(
        isVertical
          ? 'Vertical 9:16 mobile promotional one-sheet for neo-noir thriller series. Features urban street aesthetic, neon gradient lighting, and statutory age advisory block.'
          : 'Official 16:9 widescreen cinema teaser poster. High atmospheric contrast, silhouetted protagonist, and international festival award laurels.'
      );
      processSelectedFile(demoFile, 'Poster (img)');
    } catch (err) {
      console.error('Failed to load demo poster:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a media file to upload.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please enter an asset title.');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setCurrentStage(0);

    // Stage progression animation
    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < ANALYSIS_STAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2800);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('contentType', contentType);
      formData.append('aspectRatio', aspectRatio);
      formData.append('duration', fileDuration.toString());
      formData.append('userEmail', session?.user?.email || 'creator@cinema.io');

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Regulatory compliance analysis failed.');
      }

      setCurrentStage(ANALYSIS_STAGES.length - 1);

      // Brief delay to show 100% completion then navigate to report
      setTimeout(() => {
        router.push(`/report/${data.reportId}`);
      }, 800);
    } catch (err) {
      clearInterval(interval);
      setUploading(false);
      setErrorMessage(err.message || 'Analysis encountered an error.');
    }
  };

  return (
    <div className={styles.submitWrapper}>
      {/* Seamless Looping OTT Video Wall Background with Crimson Sweep & Cinema Dust */}
      <CinemaVideoWallBg />

      <div className={styles.submitContainer}>
      {/* Warning Popup Modal for Incompatible File Formats */}
      {warningModal.isOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBackdrop} onClick={handleCloseWarning} />
          <div className={styles.warningModalCard}>
            <button
              type="button"
              className={styles.modalCloseBtn}
              onClick={handleCloseWarning}
              aria-label="Close Warning"
            >
              <X size={20} />
            </button>

            <div className={styles.modalHeader}>
              <div className={styles.warningIconWrapper}>
                <AlertTriangle size={32} />
              </div>
              <div className={styles.modalHeaderText}>
                <span className={styles.modalBadge}>FORMAT VALIDATION ALERT</span>
                <h3 className={styles.modalTitle}>{warningModal.title}</h3>
              </div>
            </div>

            <p className={styles.modalMessage}>{warningModal.message}</p>

            {/* Diagnostic File Details Box */}
            <div className={styles.mismatchDetailsCard}>
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Selected Category:</span>
                <span className={styles.detailValSelected}>{warningModal.selectedCategory}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Uploaded File:</span>
                <span className={styles.detailValFile}>
                  {warningModal.fileName} ({warningModal.fileSize} MB)
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Detected Format:</span>
                <span className={styles.detailValDetected}>{warningModal.detectedType}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailKey}>Accepted Format:</span>
                <span className={styles.detailValRequired}>{warningModal.requiredType}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.modalActionButtons}>
              {warningModal.suggestedCategory && (
                <button
                  type="button"
                  onClick={handleSwitchCategoryAndApply}
                  className={styles.modalPrimaryActionBtn}
                >
                  <Sparkles size={16} />
                  <span>Switch to &quot;{warningModal.suggestedCategory}&quot; &amp; Keep File</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSelectAlternativeFile}
                className={styles.modalSecondaryActionBtn}
              >
                <Video size={16} />
                <span>Select Valid Video File</span>
              </button>

              <button
                type="button"
                onClick={handleCloseWarning}
                className={styles.modalCancelBtn}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.headerArea}>
        <div className={styles.breadcrumb}>
          <span>Shortfundly CensorAI</span>
          <span>/</span>
          <span className={styles.activeBreadcrumb}>New Asset Submission</span>
        </div>
        <h1 className={styles.pageTitle}>
          Submit Media for <span className={styles.redHighlight}>Regulatory Analysis</span>
        </h1>
        <p className={styles.pageSubtitle}>
          Upload media in 16:9 cinema widescreen or 9:16 vertical orientation. Our Gemini-powered engine classifies age rating and generates an official CBFC/OTT review matrix.
        </p>
      </div>

      {errorMessage && (
        <div className={styles.errorBanner}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {uploading ? (
        <div className={styles.progressContainer}>
          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <div className={styles.progressPulse} />
              <h2 className={styles.progressTitle}>Autonomous Regulatory Engine Active</h2>
            </div>
            <p className={styles.progressStageText}>{ANALYSIS_STAGES[currentStage]}</p>

            {/* Stepper Visualizer */}
            <div className={styles.stepperList}>
              {ANALYSIS_STAGES.map((stageText, idx) => {
                const isDone = idx < currentStage;
                const isCurrent = idx === currentStage;
                return (
                  <div
                    key={idx}
                    className={`${styles.stepItem} ${isDone ? styles.stepDone : isCurrent ? styles.stepCurrent : ''}`}
                  >
                    <div className={styles.stepIndicator}>
                      {isDone ? <CheckCircle size={14} /> : <span>{idx + 1}</span>}
                    </div>
                    <span className={styles.stepLabel}>{stageText}</span>
                  </div>
                );
              })}
            </div>

            <div className={styles.complianceGuarantee}>
              <ShieldCheck size={16} />
              <span>
                All assets are analyzed directly via Gemini API and encrypted in Cloudinary & MongoDB Atlas.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          {/* Left Column: Content Type & Details */}
          <div className={styles.leftColumn}>
            {/* Step 3.1: Content Type Options Array */}
            <div className={styles.formCard}>
              <label className={styles.cardHeaderLabel}>
                1. Select Asset Format <span className={styles.requiredAsterisk}>*</span>
              </label>
              <div className={styles.contentTypeGrid}>
                {CONTENT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = contentType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleSelectContentType(type)}
                      className={`${styles.typeOption} ${isSelected ? styles.typeSelected : ''}`}
                    >
                      <div className={styles.typeIconBox}>
                        <Icon size={20} />
                      </div>
                      <div className={styles.typeDetails}>
                        <span className={styles.typeName}>{type.label}</span>
                        <span className={styles.typeDesc}>{type.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3.2: Aspect Ratio & Metadata */}
            <div className={styles.formCard}>
              <label className={styles.cardHeaderLabel}>2. Aspect Ratio & Orientation</label>
              <div className={styles.aspectRatioRow}>
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`${styles.aspectBtn} ${aspectRatio === '16:9' ? styles.aspectActive : ''}`}
                >
                  <div className={styles.aspectIcon169} />
                  <span>16:9 Widescreen (Cinema / OTT / Web)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`${styles.aspectBtn} ${aspectRatio === '9:16' ? styles.aspectActive : ''}`}
                >
                  <div className={styles.aspectIcon916} />
                  <span>9:16 Vertical (Reels / Shorts / Mobile)</span>
                </button>
              </div>

              {detectedRatio && (
                <div className={styles.autoDetectedTag}>
                  <Sparkles size={14} />
                  <span>Auto-detected resolution: {detectedRatio}</span>
                </div>
              )}

              <div className={styles.metadataFields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Asset Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Midnight Protocol (Episode 1) or Red Sands Teaser"
                    required
                    className={styles.textInput}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Editorial Synopsis / Content Advisory Notes</label>
                  <textarea
                    value={synopsis}
                    onChange={(e) => setSynopsis(e.target.value)}
                    placeholder="Provide creative context, target genre, intended broadcast platform, or existing sensitivities..."
                    rows={3}
                    className={styles.textareaInput}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: File Upload & Live Preview */}
          <div className={styles.rightColumn}>
            <div className={styles.formCard}>
              <div className={styles.uploadHeaderRow}>
                <label className={styles.cardHeaderLabel}>
                  3. Media File Upload <span className={styles.requiredAsterisk}>*</span>
                </label>
                {!filePreview && (
                  <div className={styles.demoLoadGroup}>
                    <button
                      type="button"
                      onClick={() => handleLoadDemoPoster(false)}
                      className={styles.quickDemoPill}
                      title="Load generated 16:9 cinema demo poster"
                    >
                      <Sparkles size={13} />
                      <span>16:9 Demo Poster</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadDemoPoster(true)}
                      className={styles.quickDemoPill}
                      title="Load generated 9:16 vertical demo poster"
                    >
                      <Sparkles size={13} />
                      <span>9:16 Demo Poster</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Dropzone */}
              {!filePreview ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.dropzone}
                >
                  <div className={styles.dropzoneIconWrapper}>
                    <UploadCloud size={38} />
                  </div>
                  <h3 className={styles.dropzoneTitle}>Click or Drag & Drop Media Asset</h3>
                  <p className={styles.dropzoneSub}>
                    Supports MP4 movies, short films, high-res posters (PNG/JPG), audio songs (MP3/WAV), or vertical reels
                  </p>
                  <span className={styles.browsePill}>Browse Local Files</span>
                </div>
              ) : (
                /* Live Preview Inspector */
                <div className={styles.previewContainer}>
                  <div
                    className={`${styles.previewBox} ${
                      aspectRatio === '9:16' ? styles.preview916 : styles.preview169
                    }`}
                  >
                    {file?.type?.startsWith('image/') ? (
                      <img src={filePreview} alt="Preview" className={styles.previewImage} />
                    ) : file?.type?.startsWith('video/') ? (
                      <video
                        src={filePreview}
                        controls
                        className={styles.previewVideo}
                      />
                    ) : (
                      <div className={styles.audioPreviewWrapper}>
                        <Music size={48} className={styles.audioIcon} />
                        <audio src={filePreview} controls className={styles.audioPlayer} />
                        <span className={styles.audioFileName}>{file.name}</span>
                      </div>
                    )}
                  </div>

                  {/* File Metadata Pill & Reset */}
                  <div className={styles.previewFooter}>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {aspectRatio}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setFilePreview(null);
                        setDetectedRatio(null);
                      }}
                      className={styles.resetFileBtn}
                      title="Choose a different file"
                    >
                      <RotateCcw size={15} />
                      <span>Change</span>
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,image/png,image/jpeg,image/webp,audio/mpeg,audio/wav"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={!file || !title.trim()}
                className={styles.submitStudioBtn}
              >
                <div className={styles.btnInner}>
                  <Sparkles size={18} />
                  <span>Execute AI Regulatory Screening</span>
                  <ArrowRight size={18} />
                </div>
              </button>

              <div className={styles.securityNote}>
                <ShieldCheck size={14} />
                <span>Media processed with strict confidentiality & stored securely on Cloudinary CDN.</span>
              </div>
            </div>
          </div>
        </form>
      )}
      </div>
    </div>
  );
}
