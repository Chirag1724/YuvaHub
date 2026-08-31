import { auth } from '../lib/firebase';

const API_BASE_URL = "/api/v1";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SessionStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface MentorProfile {
  mentorUid: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  headline?: string;
  company?: string;
  role?: string;
  experienceYears?: number;
  skills?: string[];
  bio?: string;
  timezone?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  stats?: {
    sessionsCompleted: number;
    totalHoursMentored: number;
    avgRating: number;
    totalRatings: number;
  };
  [key: string]: any;
}

export interface AvailabilitySlot {
  id?: string;
  _id?: string;
  mentorUid: string;
  mentorName?: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  status: 'open' | 'booked' | 'cancelled';
}

export interface SessionNote {
  noteId: string;
  authorUid: string;
  authorName: string;
  authorRole: 'mentor' | 'student';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  itemId: string;
  title: string;
  assignee: 'mentor' | 'student' | 'both';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'done';
  createdAt: string;
  completedAt?: string;
}

export interface MentorshipSession {
  sessionId: string;
  mentorUid: string;
  mentorName: string;
  mentorCompany?: string;
  studentUid: string;
  studentName: string;
  topic: string;
  agenda?: string;
  slot: { date: string; startTime: string; endTime: string; timezone?: string };
  slotDateTime: string;
  meetingUrl?: string;
  status: SessionStatus;
  statusHistory?: { status: SessionStatus; at: string; by: string }[];
  notes?: SessionNote[];
  actionItems?: ActionItem[];
  feedback?: { rating: number; comment: string; submittedAt: string };
  reminderTimestamps?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface MentorApplication {
  applicationId: string;
  applicantUid: string;
  name: string;
  email: string;
  linkedinUrl?: string;
  collegeCompany?: string;
  field?: string;
  experienceYears: number;
  skills?: string[];
  availability?: string[];
  whyMentor: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  [key: string]: any;
}

export interface MentorAnalytics {
  role: 'mentor' | 'student';
  student: {
    totalSessions: number;
    completed: number;
    cancelled: number;
    noShow: number;
    upcoming: number;
    completionRate: number;
    actionItemsCompleted: number;
    actionItemsOpen: number;
    topicsCovered: number;
    avgRatingGiven: number;
    trend: { week: string; count: number }[];
  };
  mentor: {
    sessionsCompleted: number;
    totalHoursMentored: number;
    avgRating: number;
    totalRatings: number;
    completionRate: number;
    upcoming: number;
    pendingRequests: number;
    studentsMentored: number;
    topTopics: [string, number][];
    trend: { week: string; count: number }[];
  } | null;
}

// ─── Fetch helpers ──────────────────────────────────────────────────────────

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }
  return { 'Content-Type': 'application/json' };
}

async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

function pickList(data: any): any[] {
  return data?.items ?? data?.data ?? data?.slots ?? data?.profiles ?? [];
}

// ─── Mentors & discovery ────────────────────────────────────────────────────

export async function fetchMentors(params?: { search?: string; skills?: string[]; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.append('search', params.search);
  if (params?.skills?.length) qs.append('skills', params.skills.join(','));
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));
  const data = await request(`/mentors?${qs.toString()}`);
  return { mentors: pickList(data), total: data?.meta?.total ?? data?.total ?? 0 };
}

export async function fetchMentorDetail(mentorUid: string) {
  const data = await request(`/mentors/${mentorUid}`);
  return data?.mentor ?? data;
}

export async function fetchMentorAvailability(mentorUid: string) {
  const data = await request(`/mentorship/availability?mentorUid=${encodeURIComponent(mentorUid)}`);
  return data?.availableSlots ?? data?.slots ?? [];
}

// ─── Booking & sessions ─────────────────────────────────────────────────────

export async function bookMentorshipSession(input: {
  mentorUid: string;
  slotId: string;
  topic: string;
  agenda?: string;
  studentName?: string;
}) {
  const data = await request('/mentorship/book', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data?.session ?? data;
}

export async function fetchMySessions(params?: { status?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.append('status', params.status);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.limit) qs.append('limit', String(params.limit));
  const data = await request(`/mentorship/sessions?${qs.toString()}`);
  return { sessions: pickList(data), total: data?.meta?.total ?? 0 };
}

export async function fetchSessionDetail(sessionId: string) {
  const data = await request(`/mentor-studio/sessions/${encodeURIComponent(sessionId)}`);
  return data?.session ?? data;
}

export async function updateSessionStatus(sessionId: string, status: SessionStatus) {
  const data = await request(`/mentor-studio/sessions/${encodeURIComponent(sessionId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return data?.session ?? data;
}

// ─── Notes & action items ───────────────────────────────────────────────────

export async function addSessionNote(sessionId: string, content: string) {
  const data = await request(`/mentor-studio/sessions/${encodeURIComponent(sessionId)}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return data?.note ?? data;
}

export async function updateSessionNote(sessionId: string, noteId: string, content: string) {
  const data = await request(
    `/mentor-studio/sessions/${encodeURIComponent(sessionId)}/notes/${encodeURIComponent(noteId)}`,
    { method: 'PUT', body: JSON.stringify({ content }) },
  );
  return data?.note ?? data;
}

export async function deleteSessionNote(sessionId: string, noteId: string) {
  return request(`/mentor-studio/sessions/${encodeURIComponent(sessionId)}/notes/${encodeURIComponent(noteId)}`, {
    method: 'DELETE',
  });
}

export async function addSessionActionItem(
  sessionId: string,
  input: { title: string; assignee?: 'mentor' | 'student' | 'both'; priority?: 'low' | 'medium' | 'high' },
) {
  const data = await request(`/mentor-studio/sessions/${encodeURIComponent(sessionId)}/action-items`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data?.item ?? data;
}

export async function updateSessionActionItem(
  sessionId: string,
  itemId: string,
  patch: Partial<{ title: string; status: 'open' | 'done'; priority: 'low' | 'medium' | 'high' }>,
) {
  const data = await request(
    `/mentor-studio/sessions/${encodeURIComponent(sessionId)}/action-items/${encodeURIComponent(itemId)}`,
    { method: 'PUT', body: JSON.stringify(patch) },
  );
  return data?.item ?? data;
}

export async function submitSessionFeedback(sessionId: string, input: { rating: number; comment?: string }) {
  const data = await request(`/mentor-studio/sessions/${encodeURIComponent(sessionId)}/feedback`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data?.feedback ?? data;
}

// ─── Mentor studio: profile & availability ──────────────────────────────────

export async function fetchMyMentorProfile() {
  const data = await request('/mentor-studio/profile');
  return data?.profile ?? null;
}

export async function updateMyMentorProfile(input: Partial<MentorProfile>) {
  const data = await request('/mentor-studio/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return data?.profile ?? data;
}

export async function fetchMyAvailability(params?: { from?: string; to?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.append('from', params.from);
  if (params?.to) qs.append('to', params.to);
  if (params?.status) qs.append('status', params.status);
  const data = await request(`/mentor-studio/availability?${qs.toString()}`);
  return { slots: pickList(data), total: data?.meta?.total ?? 0 };
}

export async function createAvailabilitySlots(slots: { date: string; startTime: string; endTime: string }[]) {
  const data = await request('/mentor-studio/availability', {
    method: 'POST',
    body: JSON.stringify({ slots }),
  });
  return { created: data?.created ?? 0, conflicts: data?.conflicts ?? [] };
}

export async function deleteAvailabilitySlot(slotId: string) {
  return request(`/mentor-studio/availability/${encodeURIComponent(slotId)}`, { method: 'DELETE' });
}

// ─── Analytics & applications ───────────────────────────────────────────────

export async function fetchMentorshipAnalytics() {
  const data = await request('/mentor-studio/analytics');
  return data?.analytics ?? null;
}

export async function applyToBecomeMentor(input: {
  name: string;
  email: string;
  linkedinUrl?: string;
  collegeCompany?: string;
  field?: string;
  experienceYears: number;
  skills?: string[];
  availability?: string[];
  whyMentor: string;
}) {
  const data = await request('/mentor-applications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data?.application ?? data;
}

export async function fetchMyMentorApplication() {
  const data = await request('/mentor-applications/me');
  return data?.application ?? null;
}
