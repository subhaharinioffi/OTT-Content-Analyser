import bcrypt from 'bcryptjs';
import { UserModel } from '@/models/User';
import { ReportModel } from '@/models/Report';

let isSeeded = false;

export async function ensureSeedData() {
  if (isSeeded) return;

  try {
    // 1. Ensure Demo Reviewer User
    const existingUser = await UserModel.findOne({ email: 'demo.reviewer@cinecomply.io' });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('Compliance2026!', 10);
      await UserModel.create({
        name: 'Subhaharini S (Lead Reviewer)',
        email: 'demo.reviewer@cinecomply.io',
        password: hashedPassword,
        role: 'reviewer',
        organization: 'Shortfundly Regulatory Labs',
      });
      console.log('✅ Seeded demo reviewer user.');
    }

    // 2. Ensure Initial Regulatory Submissions if empty
    const existingReports = await ReportModel.find({});
    if (existingReports.length === 0) {
      const sampleReports = [
        {
          title: 'Shadow Protocol: The Cyber Heist',
          contentType: 'Movie',
          aspectRatio: '16:9',
          mediaUrl: 'https://res.cloudinary.com/czqgne9x/video/upload/v1729000000/samples/elephants.mp4',
          duration: 94,
          fileSize: 45200000,
          userEmail: 'demo.reviewer@cinecomply.io',
          ageClassification: 'U/A 16+',
          riskScore: 48,
          status: 'Conditional Approval',
          summary: 'High-octane cyber thrill narrative set in neo-metropolitan terrain. Evaluated under Digital Media Ethics Code (2021) and CBFC Guidelines. High technical merit with intense kinetic physical confrontations and verbal friction in act two.',
          descriptors: {
            themes: { score: 5, severity: 'Moderate', details: 'Depicts clandestine espionage and geopolitical sabotage.' },
            violence: { score: 7, severity: 'Severe', details: 'Armed tactical gunfights and close-quarter combat strikes.' },
            nudity: { score: 1, severity: 'None', details: 'Zero explicit anatomical exposure.' },
            sex: { score: 2, severity: 'Low', details: 'Brief intimate dialogue without physical graphicness.' },
            language: { score: 6, severity: 'Moderate', details: 'Multiple instances of coarse street profanity in climactic chase.' },
            substanceAbuse: { score: 4, severity: 'Moderate', details: 'Social cigar and whiskey consumption without anti-tobacco advisory.' },
            horror: { score: 3, severity: 'Low', details: 'Atmospheric claustrophobic tension during interrogation scene.' },
          },
          violations: [
            {
              startTime: '00:18',
              endTime: '00:24',
              secondOffset: 18,
              category: 'Substance Abuse',
              severity: 'Moderate',
              description: 'Character lights cigar during strategy briefing with prominent smoke cloud.',
              ruleViolated: 'COTPA Section 5 & Ministry of Health Statutory Advisory Guidelines',
              actionableSuggestion: 'Superimpose 30-point statutory bilingual advisory scroll at bottom border.',
            },
            {
              startTime: '00:42',
              endTime: '00:49',
              secondOffset: 42,
              category: 'Violence',
              severity: 'Severe',
              description: 'Graphic ballistic shootout with shattered glass impact and simulated wound spray.',
              ruleViolated: 'CBFC Guideline 2(vii) / OTT Digital Media Code Part II Rule 4',
              actionableSuggestion: 'Trim 4 frames of bullet impact point-blank shot to qualify for broader U/A 13+.',
            },
            {
              startTime: '01:12',
              endTime: '01:16',
              secondOffset: 72,
              category: 'Language',
              severity: 'Moderate',
              description: 'Audible vulgar expletive spoken during escape.',
              ruleViolated: 'Community Guidelines on Vulgar Colloquialisms',
              actionableSuggestion: 'Bleep or mask central audio phoneme on dialogue track.',
            },
          ],
          remediationSuggestions: [
            {
              action: 'Apply anti-tobacco statutory scroll at 00:18',
              projectedRiskScore: 36,
              impact: 'Clears mandatory Ministry of Health compliance mandate immediately.',
            },
            {
              action: 'Trim 4 frames of ballistic impact at 00:45',
              projectedRiskScore: 22,
              impact: 'Relaxes age rating from U/A 16+ to U/A 13+, opening family streaming segment.',
            },
            {
              action: 'Audio mute expletive at 01:14',
              projectedRiskScore: 16,
              impact: 'Brings Language descriptor to clean Tier 1 broadcast compliance.',
            },
          ],
        },
        {
          title: 'Neon Drift: Tokyo Nightfall',
          contentType: 'Short Video (Reels)',
          aspectRatio: '9:16',
          mediaUrl: 'https://res.cloudinary.com/czqgne9x/video/upload/v1729000000/samples/cld-sample.mp4',
          duration: 32,
          fileSize: 12400000,
          userEmail: 'creator@shortfundly.com',
          ageClassification: 'U/A 13+',
          riskScore: 24,
          status: 'Approved',
          summary: 'Vertical mobile short highlighting underground automotive tuner culture and drift precision. Evaluated for dangerous stunts and reckless driving glamorization under Ministry guidelines.',
          descriptors: {
            themes: { score: 3, severity: 'Low', details: 'Motorsport racing passion and mechanical craftsmanship.' },
            violence: { score: 1, severity: 'None', details: 'Zero physical aggression or bodily injury.' },
            nudity: { score: 1, severity: 'None', details: 'Urban streetwear apparel throughout.' },
            sex: { score: 1, severity: 'None', details: 'No romantic or suggestive content.' },
            language: { score: 2, severity: 'Low', details: 'Fast-paced street slang without profanity.' },
            substanceAbuse: { score: 1, severity: 'None', details: 'No tobacco, alcohol or narcotics present.' },
            horror: { score: 2, severity: 'Low', details: 'High-contrast strobing neon lighting.' },
          },
          violations: [
            {
              startTime: '00:04',
              endTime: '00:09',
              secondOffset: 4,
              category: 'Themes',
              severity: 'Low',
              description: 'Drifting vehicle near public pedestrian curb without safety disclaimer.',
              ruleViolated: 'Motor Vehicles Act Guidelines & OTT Stunt Safety Advisory Charter',
              actionableSuggestion: 'Include static disclaimer: "Stunts performed on closed sanctioned course under professional supervision."',
            },
          ],
          remediationSuggestions: [
            {
              action: 'Insert stunt safety disclaimer in opening 3 seconds',
              projectedRiskScore: 12,
              impact: 'Achieves unconditional approval across all youth and universal distribution channels.',
            },
          ],
        },
        {
          title: 'The Silent Canvas: Official Theatrical One-Sheet',
          contentType: 'Poster (img)',
          aspectRatio: '16:9',
          mediaUrl: 'https://res.cloudinary.com/czqgne9x/image/upload/v1729000000/samples/balloons.jpg',
          duration: 0,
          fileSize: 3400000,
          userEmail: 'marketing@cinema.io',
          ageClassification: 'U',
          riskScore: 8,
          status: 'Approved',
          summary: 'Promotional key art visual poster for festival release. Evaluated for visual decency, typography, and color psychological safety. No disturbing or sensitive cues identified.',
          descriptors: {
            themes: { score: 1, severity: 'None', details: 'Inspirational human drama aesthetic.' },
            violence: { score: 0, severity: 'None', details: 'No weapons or distressing cues.' },
            nudity: { score: 0, severity: 'None', details: 'Fully modest attire.' },
            sex: { score: 0, severity: 'None', details: 'Zero suggestive framing.' },
            language: { score: 0, severity: 'None', details: 'Clean standard credits text.' },
            substanceAbuse: { score: 0, severity: 'None', details: 'Zero substance depictions.' },
            horror: { score: 0, severity: 'None', details: 'Warm pastel palette.' },
          },
          violations: [],
          remediationSuggestions: [],
        },
      ];

      for (const item of sampleReports) {
        await ReportModel.create(item);
      }
      console.log('✅ Seeded initial realistic regulatory submissions.');
    }

    isSeeded = true;
  } catch (err) {
    console.warn('Seed data warning:', err.message);
  }
}
