import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Prioritize high-performance, active Gemini models with fallback
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
];

const REGULATORY_SYSTEM_PROMPT = `You are a Senior Regulatory Compliance Officer and Lead Content Analyst for OTT Streaming Platforms and Film Certification Boards (CBFC Section 5B & India Digital Media Ethics Code Rules 2021).

You evaluate media submissions (Movie, Short Film, Song, Poster (img), Short Video (Reels)) with extreme analytical rigor, contextual nuance, and objectivity.

EVALUATION FRAMEWORK:
You MUST evaluate the content across the 6 Mandatory Statutory Themes:
1. Violence: Real bloodshed, gore, weapons brandishing/combat, malicious physical assault, torture, domestic abuse.
2. Nudity & Sex: Nudity, sexual activity, explicit intimacy, suggestive visual framing or objectification.
3. Language: Profanity, vulgarities, slurs, double-meaning dialogue or abusive lyrics.
4. Substance Abuse: Consumption or glamorization of alcohol, smoking, tobacco, narcotics, and missing statutory health tickers.
5. Threat & Horror: Suicide, self-harm, jump scares, psychological terror, grotesque horror, extortion/intimidation.
6. Discrimination & Sovereignty: Communal, caste or religious hatred, defamation, disrespect to national symbols, flags, or public order.

CRITICAL RULES FOR REELS, SHORT CLIPS, AND COMEDY / CAMPUS CONTENT:
1. Distinguish firmly between genuine criminal/violent acts and lighthearted comedy, campus fun, friendly teasing, comedic slapstick, spoof sketches, dance moves, or social media reels.
2. DO NOT classify student banter, funny walks, dramatic theatrical expressions for comedy, or playful mock-chases as Violence or Threat.
3. When analyzing reels or short videos with upbeat, playful, college, or humorous themes, accurately identify the genre as "Comedy", "Campus Life", "Humor", or "Entertainment". DO NOT falsely classify them as "Action Thriller", "Crime", or "Psychological Horror".
4. Violence flags require ACTUAL harmful physical assault, weapons, bloodshed, or malicious intent to harm. Playful, friendly, or comedic interactions MUST NOT be flagged as Violence.

CRITICAL FLAGGING RULES:
1. Raise a flag ONLY when the corresponding content is ACTUALLY detected in the submitted media.
2. If content has NO relevant concern under a category, set "detected": false and "severity": "None".
3. NEVER generate false-positive warnings simply because the media belongs to a certain genre:
   - A romantic movie or song should NOT automatically receive a Nudity & Sex flag unless explicit content is present.
   - An action movie or poster should NOT automatically receive a Violence flag unless explicit violence is depicted.
   - A comedy should NOT automatically receive a Language flag unless profanity is present.
   - A horror piece should NOT automatically receive a Threat & Horror flag unless genuine threats/horror are detected.
4. For each of the 6 categories, provide:
   - category: Exact name ("Violence", "Nudity & Sex", "Language", "Substance Abuse", "Threat & Horror", "Discrimination & Sovereignty")
   - detected: boolean (true ONLY if actually present)
   - severity: "None" (if detected: false) or "Low" | "Moderate" | "High" | "Severe" (if detected: true)
   - explanation: Clear, objective 1-2 sentence description of what was detected (or brief note confirming absence)
   - evidence: Direct media evidence (dialogue snippet, visual element, frame description, or lyrics bar)
   - timestamp: Exact timestamp or region reference (e.g. "00:18:42 - 00:19:10", "Central Visual Focus", "Bottom center margin", or "01:24 - 01:30")
   - confidence: Integer score from 0 to 100 representing confidence in this classification
   - context: Biological/dramatic context explaining why the scene occurs
   - uncertainForHumanReview: boolean (true if confidence is below 75% or borderline, requiring manual human verification)
   - boundingBox: For visual concerns (posters or video frames), provide coordinates normalized to 0-1000 scale: { "ymin": 250, "xmin": 250, "ymax": 750, "xmax": 750, "regionLabel": "Central Visual Focus" } (null if non-visual/clean)

CONTENT REVIEW RULES:
1. Content Summary:
   - For Movie / Short Film / Reel: Explain what the story is about, main themes, overall tone, and important content characteristics.
   - For Song: Explain the meaning and theme of lyrics, emotional tone, and language/lyrical content.
   - For Poster / Image: Explain visual description, main subject, and potentially sensitive visual elements.
2. Genre and Theme Classification:
   - Identify Primary Genre and Secondary Genres/Themes.
   - Do NOT force into a rigid predefined list; infer the true genre naturally (e.g., "Comedy / Campus Life", "Romantic Comedy", "Cyberpunk Thriller", "Acoustic Indie Folk").
   - Provide a genreBreakdown array with estimated presence/strength percentage (e.g., Comedy: 80%, Campus Humor: 60%, Romance: 20%).
   - These percentages represent the strength of that genre's influence, NOT probabilities; they do not need to sum to 100%. Multiple genres coexist naturally.
   - Provide a brief coexistenceExplanation.

SUGGESTIONS RULES:
1. Creative Improvement:
   - Provide EXACTLY ONE meaningful suggestion to improve the overall content (e.g., narrative clarity, pacing, character development, visual composition, or audio balance).
   - Must be specifically relevant to the actual media. Avoid generic boilerplate advice.
2. Regulatory Improvement:
   - Provide EXACTLY ONE suggestion to reduce detected regulatory flags, ONLY if at least one flag is detected.
   - Must preserve the creative intent of the filmmaker/creator wherever possible.
   - If NO flags are detected across all 6 categories, you MUST return EXACTLY:
     "No regulatory reduction suggestions required."

Return strictly valid JSON conforming to the requested schema.`;

/**
 * Main AI analysis engine for media compliance
 */
export async function analyzeMediaCompliance({
  fileBuffer,
  mimeType,
  title,
  contentType,
  aspectRatio = '16:9',
  duration = 0,
  cloudinaryUrl = '',
  targetRatingGoal = 'Auto-Detect (Standard Assessment)',
  videoFrames = [],
}) {
  const isPoster = contentType.includes('Poster');
  const isSong = contentType.includes('Song');
  const isVideo = ['Movie', 'Short Film', 'Short Video (Reels)'].includes(contentType);

  // If buffer is missing (e.g., direct Cloudinary client upload), fetch it from Cloudinary
  let activeBuffer = fileBuffer;
  let activeMimeType = mimeType;

  if (!activeBuffer && cloudinaryUrl) {
    try {
      console.log(`[Gemini Engine] Fetching media buffer from Cloudinary URL: ${cloudinaryUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const res = await fetch(cloudinaryUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        // Only load into inlineData if size is under 20MB
        if (arrayBuf.byteLength > 0 && arrayBuf.byteLength < 22 * 1024 * 1024) {
          activeBuffer = Buffer.from(arrayBuf);
          activeMimeType = res.headers.get('content-type') || activeMimeType;
          console.log(`[Gemini Engine] Successfully fetched ${(activeBuffer.length / 1024 / 1024).toFixed(2)} MB buffer`);
        }
      }
    } catch (fetchErr) {
      console.warn('[Gemini Engine] Cloudinary media buffer fetch skipped:', fetchErr.message);
    }
  }

  // Construct media-specific prompt
  let mediaTypeGuidance = '';
  if (isPoster) {
    mediaTypeGuidance = `This is a Poster / Key Visual graphic.
- Analyze the visual composition, prominent subjects, character poses, color scheme, typography, taglines, and credit billing blocks.
- Timestamp fields should reference visual locations on the poster (e.g., "Top Right Margin", "Central Character Silhouette", "Bottom Disclaimer Ticker").
- Inspect specifically for weapon brandishing, graphic blood/gore, provocative poses, missing statutory health warnings, or offensive text.`;
  } else if (isSong) {
    mediaTypeGuidance = `This is a Song / Master Audio Track.
- Analyze the lyrical content, musical arrangement, emotional progression, vocal intensity, and language.
- Timestamp fields should reference audio track times (e.g., "01:14 - 01:22").
- Inspect for profane lyrics, double-meaning innuendo, substance abuse glorification, or derogatory slurs.`;
  } else {
    mediaTypeGuidance = `This is a Video asset (${contentType}, duration: ${duration ? duration + ' seconds' : 'full timeline'}).
- Analyze the cinematic narrative arc, character interactions, dialogue, visual staging, and pacing.
- Timestamps MUST be in MM:SS format (e.g., "00:14 - 00:22").
- Inspect across the entire timeline for physical conflict, coarse language, sexual references, substance abuse, and intense horror.`;
  }

  const promptText = `Perform a comprehensive Content Review, Genre Analysis, Regulatory Flag Screening, and Editorial Suggestion review on this media submission:
- Asset Title: "${title}"
- Asset Type: ${contentType}
- Aspect Ratio: ${aspectRatio}
- Duration / Scope: ${duration ? duration + ' seconds' : isPoster ? 'Static Graphic Visual' : 'Audio Track'}
- Target Rating Goal: "${targetRatingGoal}"
- Media URL: ${cloudinaryUrl || 'Direct Local Stream'}

${mediaTypeGuidance}

MANDATORY JSON OUTPUT SCHEMA:
{
  "contentReview": {
    "summary": "Short, meaningful summary conforming to media type instructions",
    "storyOrSubject": "What the story or visual subject is about",
    "mainThemes": ["Theme 1", "Theme 2"],
    "overallTone": "Overall tone description",
    "contentCharacteristics": "Important content characteristics or sensitive elements",
    "genreClassification": {
      "primaryGenre": "Primary inferred genre",
      "secondaryGenres": ["Secondary Genre 1", "Secondary Genre 2"],
      "genreBreakdown": [
        { "genre": "Genre Name", "percentage": 70 },
        { "genre": "Genre Name", "percentage": 45 }
      ],
      "coexistenceExplanation": "Explanation of how multiple genres coexist and why percentages reflect presence strength"
    }
  },
  "contentFlags": [
    {
      "category": "Violence",
      "detected": false,
      "severity": "None",
      "explanation": "Explanation",
      "evidence": "Evidence or N/A",
      "timestamp": "Timestamp or N/A",
      "confidence": 95,
      "context": "Context or N/A",
      "uncertainForHumanReview": false
    },
    {
      "category": "Nudity & Sex",
      "detected": false,
      "severity": "None",
      "explanation": "Explanation",
      "evidence": "Evidence or N/A",
      "timestamp": "Timestamp or N/A",
      "confidence": 98,
      "context": "Context or N/A",
      "uncertainForHumanReview": false
    },
    {
      "category": "Language",
      "detected": false,
      "severity": "None",
      "explanation": "Explanation",
      "evidence": "Evidence or N/A",
      "timestamp": "Timestamp or N/A",
      "confidence": 95,
      "context": "Context or N/A",
      "uncertainForHumanReview": false
    },
    {
      "category": "Substance Abuse",
      "detected": false,
      "severity": "None",
      "explanation": "Explanation",
      "evidence": "Evidence or N/A",
      "timestamp": "Timestamp or N/A",
      "confidence": 95,
      "context": "Context or N/A",
      "uncertainForHumanReview": false
    },
    {
      "category": "Threat & Horror",
      "detected": false,
      "severity": "None",
      "explanation": "Explanation",
      "evidence": "Evidence or N/A",
      "timestamp": "Timestamp or N/A",
      "confidence": 95,
      "context": "Context or N/A",
      "uncertainForHumanReview": false
    },
    {
      "category": "Discrimination & Sovereignty",
      "detected": false,
      "severity": "None",
      "explanation": "Explanation",
      "evidence": "Evidence or N/A",
      "timestamp": "Timestamp or N/A",
      "confidence": 98,
      "context": "Context or N/A",
      "uncertainForHumanReview": false
    }
  ],
  "suggestions": {
    "creativeImprovement": "Exactly ONE meaningful suggestion to improve the overall content (narrative, pacing, visual clarity, or audio balance).",
    "regulatoryImprovement": "Exactly ONE suggestion to reduce detected regulatory flags (or 'No regulatory reduction suggestions required.' if no flags exist)."
  },
  "assignedRating": "U | U/A 7+ | U/A 13+ | U/A 16+ | A",
  "complianceScore": 85,
  "riskScore": 15,
  "overallSummary": "Concise executive certification summary."
}`;

  const contents = [];

  // Ingest direct media file buffer if available (audio or small video/poster)
  if (activeBuffer && (activeMimeType?.startsWith('image/') || activeMimeType?.startsWith('audio/') || activeMimeType?.startsWith('video/'))) {
    contents.push({
      inlineData: {
        data: activeBuffer.toString('base64'),
        mimeType: activeMimeType,
      },
    });
  }

  // Ingest sampled timeline keyframes (essential for full movies, long videos, and reels)
  if (Array.isArray(videoFrames) && videoFrames.length > 0) {
    console.log(`[Gemini Engine] Ingesting ${videoFrames.length} sampled timeline frames into multimodal payload`);
    videoFrames.slice(0, 12).forEach((f, idx) => {
      const b64Data = (f.data || '').replace(/^data:image\/\w+;base64,/, '');
      if (b64Data) {
        contents.push({
          inlineData: {
            data: b64Data,
            mimeType: f.mimeType || 'image/jpeg',
          },
        });
      }
    });
  }

  contents.push(promptText);

  let lastError = null;

  // Try candidate models in order of availability and speed
  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini Engine] Attempting compliance review with model: ${modelName}`);

      let rawText = '';

      // First attempt with official SDK
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: REGULATORY_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.15,
          },
        });
        rawText = response.text || '';
      } catch (sdkErr) {
        console.warn(`[Gemini Engine] SDK call failed for ${modelName}:`, sdkErr.message);

        // Fallback to direct Generative Language REST API
        if (apiKey) {
          console.log(`[Gemini Engine] Retrying ${modelName} via direct REST API...`);
          const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

          const frameParts = (Array.isArray(videoFrames) && videoFrames.length > 0)
            ? videoFrames.slice(0, 12).map((f) => {
                const b64 = (f.data || '').replace(/^data:image\/\w+;base64,/, '');
                return b64 ? { inline_data: { mime_type: f.mimeType || 'image/jpeg', data: b64 } } : null;
              }).filter(Boolean)
            : [];

          const restRes = await fetch(restUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    activeBuffer && (activeMimeType?.startsWith('image/') || activeMimeType?.startsWith('audio/'))
                      ? {
                          inline_data: {
                            mime_type: activeMimeType,
                            data: activeBuffer.toString('base64'),
                          },
                        }
                      : null,
                    ...frameParts,
                    { text: `${REGULATORY_SYSTEM_PROMPT}\n\n${promptText}` },
                  ].filter(Boolean),
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.15,
              },
            }),
          });

          if (!restRes.ok) {
            const errData = await restRes.json().catch(() => ({}));
            throw new Error(errData.error?.message || `REST status ${restRes.status}`);
          }

          const restData = await restRes.json();
          rawText = restData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          throw sdkErr;
        }
      }

      if (!rawText || rawText.length < 20) {
        throw new Error('Empty response from model');
      }

      console.log(`[Gemini Engine] Model ${modelName} succeeded (${rawText.length} chars)`);

      const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Validate and normalize structured output
      return normalizeAnalysisOutput(parsed, {
        title,
        contentType,
        aspectRatio,
        duration,
        targetRatingGoal,
      });
    } catch (err) {
      console.warn(`[Gemini Engine] Failed with ${modelName}:`, err.message);
      lastError = err;
    }
  }

  // If all live models failed due to quota/network, fail gracefully with clear diagnostic
  console.error('[Gemini Engine] All candidate models exhausted:', lastError?.message);
  throw new Error(
    `AI Regulatory screening failed across all models (${lastError?.message || 'Network / Quota timeout'}). Please check your Gemini API key or try again in a few moments.`
  );
}

/**
 * Validates, normalizes, and enriches AI review results
 * Ensures strict compliance with Section 1, 2, 3 and backward compatibility.
 */
function normalizeAnalysisOutput(raw, { title, contentType, aspectRatio, duration, targetRatingGoal }) {
  const isPoster = contentType.includes('Poster');
  const target = targetRatingGoal || 'Auto-Detect (Standard Assessment)';
  const assigned = raw.assignedRating || (isPoster ? 'U/A 16+' : 'U/A 13+');
  const compScore = typeof raw.complianceScore === 'number' ? raw.complianceScore : (typeof raw.riskScore === 'number' ? 100 - raw.riskScore : 88);
  const riskScore = typeof raw.riskScore === 'number' ? raw.riskScore : (100 - compScore);

  const isAchieved = target.includes('Auto')
    ? true
    : target === assigned || (target === 'A' && ['U', 'U/A 7+', 'U/A 13+', 'U/A 16+', 'A'].includes(assigned));

  // --- SECTION 1: CONTENT REVIEW NORMALIZATION ---
  const rawReview = raw.contentReview || {};
  const contentReview = {
    summary:
      rawReview.summary ||
      raw.summary ||
      `Content analysis of "${title}" (${contentType}) conducted under CBFC Section 5B and OTT 2021 Rules.`,
    storyOrSubject:
      rawReview.storyOrSubject ||
      rawReview.summary ||
      `Core narrative and thematic representation of "${title}".`,
    mainThemes: Array.isArray(rawReview.mainThemes) && rawReview.mainThemes.length > 0
      ? rawReview.mainThemes
      : ['Dramatic Fiction', 'Contemporary Expression'],
    overallTone: rawReview.overallTone || 'Reflective & Atmospheric',
    contentCharacteristics:
      rawReview.contentCharacteristics ||
      'Evaluated for statutory broadcast compatibility.',
    genreClassification: {
      primaryGenre:
        rawReview.genreClassification?.primaryGenre ||
        rawReview.primaryGenre ||
        (isPoster ? 'Key Visual Art' : 'Drama'),
      secondaryGenres:
        Array.isArray(rawReview.genreClassification?.secondaryGenres) &&
        rawReview.genreClassification.secondaryGenres.length > 0
          ? rawReview.genreClassification.secondaryGenres
          : ['Social Drama', 'Narrative Cinema'],
      genreBreakdown:
        Array.isArray(rawReview.genreClassification?.genreBreakdown) &&
        rawReview.genreClassification.genreBreakdown.length > 0
          ? rawReview.genreClassification.genreBreakdown.map((g) => ({
              genre: g.genre || 'Drama',
              percentage: typeof g.percentage === 'number' ? Math.min(100, Math.max(1, g.percentage)) : 50,
            }))
          : [
              { genre: rawReview.genreClassification?.primaryGenre || 'Drama', percentage: 75 },
              { genre: 'Action / Suspense', percentage: 40 },
            ],
      coexistenceExplanation:
        rawReview.genreClassification?.coexistenceExplanation ||
        'Multiple cinematic genres naturally coexist; percentages express relative presence rather than mutually exclusive probability.',
    },
  };

  // --- SECTION 2: 6 REGULATORY THEMES NORMALIZATION ---
  const REQUIRED_CATEGORIES = [
    'Violence',
    'Nudity & Sex',
    'Language',
    'Substance Abuse',
    'Threat & Horror',
    'Discrimination & Sovereignty',
  ];

  const rawFlags = Array.isArray(raw.contentFlags) ? raw.contentFlags : [];
  const contentFlags = REQUIRED_CATEGORIES.map((catName) => {
    const existing = rawFlags.find(
      (f) =>
        f.category &&
        f.category.toLowerCase().replace(/[^a-z]/g, '') === catName.toLowerCase().replace(/[^a-z]/g, '')
    );

    if (existing) {
      const isDetected = Boolean(existing.detected && existing.severity !== 'None');
      const conf = typeof existing.confidence === 'number' ? existing.confidence : 90;

      // Extract or synthesize normalized bounding box (0-1000 scale) for visual locating
      let box = existing.boundingBox || null;
      if (!box && isDetected) {
        const loc = ((existing.timestamp || '') + ' ' + (existing.evidence || '')).toLowerCase();
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
        severity: isDetected ? existing.severity || 'Moderate' : 'None',
        explanation: existing.explanation || (isDetected ? 'Specific content concern flagged.' : 'No concerns detected.'),
        evidence: existing.evidence || 'N/A',
        timestamp: existing.timestamp || (isPoster ? 'Central Visual Focus' : 'N/A'),
        confidence: conf,
        context: existing.context || 'Evaluated against statutory OTT standards.',
        uncertainForHumanReview: Boolean(existing.uncertainForHumanReview || (isDetected && conf < 75)),
        boundingBox: box,
      };
    }

    // Default to clean/not detected if model didn't flag this category
    return {
      category: catName,
      detected: false,
      severity: 'None',
      explanation: `No ${catName.toLowerCase()} concerns detected in the submitted media.`,
      evidence: 'N/A',
      timestamp: 'N/A',
      confidence: 96,
      context: 'Clean under regulatory standards.',
      uncertainForHumanReview: false,
      boundingBox: null,
    };
  });

  // Calculate detected flags count
  const detectedFlags = contentFlags.filter((f) => f.detected);

  // --- SECTION 3: SUGGESTIONS NORMALIZATION ---
  const rawSuggestions = raw.suggestions || {};
  let creativeImp = rawSuggestions.creativeImprovement;
  let regulatoryImp = rawSuggestions.regulatoryImprovement;

  if (!creativeImp) {
    creativeImp = 'Enhance pacing and thematic depth in dialogue transitions to strengthen viewer engagement.';
  }

  if (detectedFlags.length === 0) {
    regulatoryImp = 'No regulatory reduction suggestions required.';
  } else if (!regulatoryImp || regulatoryImp.toLowerCase().includes('no regulatory')) {
    // Generate actionable suggestion from the primary detected flag
    const primaryFlag = detectedFlags[0];
    regulatoryImp = `Consider editorial adjustment to the ${primaryFlag.category} sequence (${primaryFlag.timestamp}): ${primaryFlag.explanation}`;
  }

  const suggestions = {
    creativeImprovement: creativeImp,
    regulatoryImprovement: regulatoryImp,
  };

  // --- BACKWARD COMPATIBILITY MAPPINGS ---
  // Theme Matrix (for legacy views)
  const themeMatrix = contentFlags.map((flag, idx) => {
    const ids = ['V', 'S', 'L', 'D', 'T', 'C'];
    return {
      themeId: ids[idx] || 'G',
      themeName: flag.category,
      severity: flag.severity,
      violationCount: flag.detected ? 1 : 0,
      summaryNote: flag.explanation,
    };
  });

  // Pinpointed Issues (for video seek and poster bounding box overlays)
  const pinpointedIssues = detectedFlags.map((f, idx) => {
    const ids = ['V', 'S', 'L', 'D', 'T', 'C'];
    const matchedIdx = REQUIRED_CATEGORIES.indexOf(f.category);
    const themeId = matchedIdx >= 0 ? ids[matchedIdx] : 'G';

    // Parse seconds from timestamp if possible
    let secOffset = null;
    if (f.timestamp && f.timestamp.includes(':')) {
      const parts = f.timestamp.split(':');
      const m = parseInt(parts[0], 10);
      const s = parseInt(parts[1], 10);
      if (!isNaN(m) && !isNaN(s)) {
        secOffset = m * 60 + s;
      }
    }

    return {
      id: `issue_${idx + 1}`,
      themeId: themeId,
      themeName: f.category,
      severity: f.severity,
      modality: isPoster ? 'Poster Visual' : 'Media Frame',
      timestampStart: f.timestamp || '00:00',
      timestampEnd: f.timestamp || '00:05',
      timestampSeconds: secOffset,
      boundingBox: f.boundingBox || (isPoster
        ? {
            ymin: 250,
            xmin: 200,
            ymax: 750,
            xmax: 800,
            regionLabel: f.evidence || `${f.category} Element`,
          }
        : null),
      offendingSnippet: f.evidence,
      problemDescription: f.explanation,
      remediation: {
        toAchieveTargetRating: suggestions.regulatoryImprovement,
        editType: isPoster ? 'Modify Visual Element' : 'Scene Trim / Audio Mute',
        ratingImpactIfUnchanged: `Retains current rating (${assigned}).`,
      },
    };
  });

  return {
    assignedRating: assigned,
    ageClassification: assigned,
    targetRatingGoal: target,
    targetRatingAchieved: isAchieved,
    complianceScore: compScore,
    riskScore: riskScore,
    status: isAchieved
      ? detectedFlags.length === 0
        ? 'Approved (Fully Compliant)'
        : 'Approved (Target Achieved)'
      : 'Conditional Approval (Remediation Recommended)',
    officialContentDescriptor:
      raw.officialContentDescriptor ||
      `${assigned} | ${contentReview.genreClassification.primaryGenre} • ${detectedFlags.length > 0 ? detectedFlags.map((f) => f.category).join(', ') : 'Zero Statutory Flags'}`,
    summary: contentReview.summary,
    executiveSummary: raw.overallSummary || contentReview.summary,
    overallSummary: raw.overallSummary || contentReview.summary,

    // New 4-Section Data Structures
    contentReview,
    contentFlags,
    suggestions,

    // Legacy fields preserved for existing components & DB
    themeMatrix,
    pinpointedIssues,
    violations: pinpointedIssues.map((p) => ({
      startTime: p.timestampStart,
      endTime: p.timestampEnd,
      secondOffset: p.timestampSeconds,
      category: p.themeName,
      severity: p.severity,
      description: p.offendingSnippet,
      ruleViolated: p.problemDescription,
      actionableSuggestion: suggestions.regulatoryImprovement,
    })),
    remediationSuggestions: [
      {
        action: suggestions.regulatoryImprovement,
        projectedRiskScore: Math.max(5, riskScore - 12),
        impact: 'Lowers regulatory friction and secures broadcast clearance.',
      },
    ],
  };
}
