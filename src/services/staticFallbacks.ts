export interface FallbackOpportunity {
  id: string;
  title: string;
  type: string;
  organization: string;
  tags: string[];
  deadline: string;
  apply_link: string;
  description: string;
  location: string;
  match_score?: number;
  match_reason?: string;
  isLive?: boolean;
  applicationFee?: {
    isFree: boolean;
    amount?: number;
    currency?: string;
  };
  verificationDetails?: {
    isVerified: boolean;
    verifiedBy: string;
    verifiedAt: string;
    auditSourceUrl: string;
    reviewerNotes?: string;
  };
}

import { ISSUE_536_OPPORTUNITIES } from "./issue536Opportunities";
import { ISSUE_536_VERIFIED_HACKATHONS } from "./issue536VerifiedHackathons";

const EXISTING_CURATED_FALLBACKS: FallbackOpportunity[] = [
  {
    id: "fb_gsoc_2026",
    title: "Google Summer of Code (GSoC) - Open Source Fellow",
    type: "Fellowship",
    organization: "Google Open Source",
    tags: ["Open Source", "Software Engineering", "Aesthetic"],
    deadline: "12 days left",
    apply_link: "https://summerofcode.withgoogle.com",
    description: "An intensive global program focused on bringing student developers into open source software development. Work with a mentor organization on a real-world software project throughout the summer.",
    location: "Remote / Online",
    match_score: 98,
    match_reason: "Matches your programming interests and provides structural open source exposure.",
    isLive: true,
    applicationFee: { isFree: true, amount: 0, currency: "USD" },
    verificationDetails: {
      isVerified: true,
      verifiedBy: "YuvaHub Audit Team",
      verifiedAt: "2026-07-20",
      auditSourceUrl: "https://summerofcode.withgoogle.com",
      reviewerNotes: "Verified official Google Open Source program page. Zero application fees required."
    }
  },
  {
    id: "fb_imagine_cup",
    title: "Microsoft Imagine Cup - Social Impact Tech Challenge",
    type: "Hackathon",
    organization: "Microsoft",
    tags: ["Product Strategy", "AI/ML", "Innovation"],
    deadline: "Rolling admission",
    apply_link: "https://imaginecup.microsoft.com",
    description: "Launch your startup with the Imagine Cup. Show off your technical skills, develop a creative social-impact solution using Azure Cloud, and win funding, mentorship, and global recognition.",
    location: "Global Virtual",
    match_score: 95,
    match_reason: "Aligns with product strategy and software engineering goals for civic technology.",
    isLive: true
  },
  {
    id: "fb_stripe_intern",
    title: "Software Engineering Summer Intern - Infrastructure & APIs",
    type: "Internship",
    organization: "Stripe",
    tags: ["Backend", "Systems", "Fintech"],
    deadline: "Enrollment Open",
    apply_link: "https://stripe.com/jobs",
    description: "Collaborate with talented engineers on Stripe's core payment infrastructure, web hooks, billing systems, and high-availability developer APIs.",
    location: "San Francisco, CA / Hybrid",
    match_score: 94,
    match_reason: "Stripe's developer environment matches software engineering requirements.",
    isLive: true
  },
  {
    id: "fb_devpost_ai",
    title: "Global Generative AI Hackathon for Developers",
    type: "Hackathon",
    organization: "Devpost Innovate",
    tags: ["AI/ML", "Frontend", "Hackathon"],
    deadline: "6 days left",
    apply_link: "https://devpost.com",
    description: "Build generative AI applications using modern API platforms and open models through an online developer hackathon.",
    location: "Online / Virtual",
    match_score: 92,
    match_reason: "High alignment with modern AI application development.",
    isLive: true
  },
  {
    id: "fb_meta_fellow",
    title: "Artificial Intelligence Research Student Fellowship",
    type: "Fellowship",
    organization: "Meta Research",
    tags: ["AI/ML", "Research", "Graduate Studies"],
    deadline: "Rolling admission",
    apply_link: "https://research.facebook.com",
    description: "Research opportunities around machine learning, computer vision, natural language processing and related areas.",
    location: "Menlo Park, CA / Remote",
    match_score: 96,
    match_reason: "Useful for students interested in machine learning research.",
    isLive: true
  },
  {
    id: "fb_figma_ux",
    title: "Figma Creator Space - Next-Gen UI/UX Student Challenge",
    type: "Hackathon",
    organization: "Figma",
    tags: ["UI/UX", "Design Systems", "Web"],
    deadline: "20 days left",
    apply_link: "https://figma.com/education",
    description: "Student-focused design challenge for prototyping consumer digital experiences and design systems.",
    location: "Tokyo, Japan / Remote",
    match_score: 90,
    match_reason: "Useful for students building UI and component-system skills.",
    isLive: true
  },
  {
    id: "fb_github_campus",
    title: "GitHub Campus Expert Program - Leadership Cohort",
    type: "Fellowship",
    organization: "GitHub Education",
    tags: ["Community", "Git", "Developer Relations"],
    deadline: "Rolling admission",
    apply_link: "https://education.github.com",
    description: "Training in technical communication, public speaking, Git workflows and developer community building.",
    location: "Global Virtual",
    match_score: 89,
    match_reason: "Builds community management and developer advocacy skills.",
    isLive: true
  },
  {
    id: "fb_uber_pm",
    title: "Associate Product Manager Student Program (APM)",
    type: "Internship",
    organization: "Uber",
    tags: ["Product Management", "Data Analytics", "Strategy"],
    deadline: "Apply soon",
    apply_link: "https://uber.com/careers",
    description: "Product-focused student opportunity involving user research, analytics, product planning and engineering collaboration.",
    location: "New York, NY / Hybrid",
    match_score: 93,
    match_reason: "Bridges user-centric design, analytics and product operations."
  },
  {
    id: "fb_google_scholar",
    title: "Generation Google Scholarship (Women in Computer Science)",
    type: "Scholarship",
    organization: "Google Career",
    tags: ["Computer Science", "Diversity", "Academic Support"],
    deadline: "Annual cycle",
    apply_link: "https://buildyourfuture.withgoogle.com",
    description: "Scholarship and professional development support for eligible students studying computer science and technology.",
    location: "Global Support",
    match_score: 91,
    match_reason: "Supports eligible computer science students."
  },
  {
    id: "fb_adobe_scholar",
    title: "Adobe Research Creative Assistant Fellowship",
    type: "Fellowship",
    organization: "Adobe Research",
    tags: ["Design Systems", "AI/ML", "Creative Tech"],
    deadline: "Rolling admission",
    apply_link: "https://research.adobe.com",
    description: "Research opportunities at the intersection of digital media, creative interaction and artificial intelligence.",
    location: "Seattle, WA / Remote",
    match_score: 88,
    match_reason: "Useful for students interested in creative technology and AI research.",
    isLive: true
  }
];

// Issue #536 expands the curated catalog with 50 student opportunities plus 20
// separately verified active hackathons.
export const CURATED_FALLBACKS: FallbackOpportunity[] = [
  ...EXISTING_CURATED_FALLBACKS,
  ...ISSUE_536_OPPORTUNITIES,
  ...ISSUE_536_VERIFIED_HACKATHONS,
];

export function getFilteredFallbacks(profile: any, maxCount: number = 6, searchQuery?: string): FallbackOpportunity[] {
  const skills = profile?.skills
    ? String(profile.skills).toLowerCase().split(',').map((s: string) => s.trim())
    : [];
  const field = profile?.field ? String(profile.field).toLowerCase().trim() : "";
  const country = profile?.country ? String(profile.country).toLowerCase().trim() : "";
  const q = searchQuery ? searchQuery.toLowerCase().trim() : "";

  const scored = CURATED_FALLBACKS.map(item => {
    let score = 70;
    let reasonBonus = "";

    if (q) {
      const titleMatch = item.title.toLowerCase().includes(q);
      const orgMatch = item.organization.toLowerCase().includes(q);
      const descriptionMatch = item.description.toLowerCase().includes(q);
      const tagMatch = item.tags.some(tag => tag.toLowerCase().includes(q));
      if (titleMatch || orgMatch || descriptionMatch || tagMatch) {
        score += 200;
        reasonBonus = `Matched your search for "${searchQuery}". `;
      }
    }

    if (skills.length > 0) {
      const matchedSkills = item.tags.filter(tag =>
        skills.some((s: string) => tag.toLowerCase().includes(s) || s.includes(tag.toLowerCase()))
      );
      if (matchedSkills.length > 0) {
        score += matchedSkills.length * 8;
        if (!reasonBonus) reasonBonus = `Aligned with your skills (${matchedSkills.slice(0, 2).join(', ')}). `;
      }
    }

    if (field) {
      const matchField = item.tags.some(tag => tag.toLowerCase().includes(field)) ||
        item.title.toLowerCase().includes(field) ||
        item.description.toLowerCase().includes(field);
      if (matchField) {
        score += 15;
        if (!reasonBonus) reasonBonus = `Great fit for your academic focus in ${profile?.field || field}. `;
      }
    }

    if (country && item.location.toLowerCase().includes(country)) score += 10;

    const finalScore = Math.min(299, score);
    const finalReason = reasonBonus
      ? reasonBonus.trim()
      : (item.match_reason || "Selected based on opportunity value and student relevance.");

    return {
      ...item,
      match_score: finalScore >= 270 ? Math.floor(Math.random() * 5) + 95 : Math.min(99, finalScore),
      match_reason: finalReason
    };
  });

  scored.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  if (q) {
    const queryMatches = scored.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const orgMatch = item.organization.toLowerCase().includes(q);
      const descriptionMatch = item.description.toLowerCase().includes(q);
      const tagMatch = item.tags.some(tag => tag.toLowerCase().includes(q));
      return titleMatch || orgMatch || descriptionMatch || tagMatch;
    });
    if (queryMatches.length > 0) return queryMatches.slice(0, maxCount);
  }

  return scored.slice(0, maxCount);
}
