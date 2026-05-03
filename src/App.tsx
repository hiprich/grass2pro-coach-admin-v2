import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  Home,
  Link as LinkIcon,
  LogOut,
  MapPin,
  Menu,
  Moon,
  PoundSterling,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type ConsentStatus = "green" | "amber" | "red" | "grey";

type AttendanceStatus = "present" | "absent" | "late" | "injured" | "excused";

type PaymentStatus = "paid" | "unpaid" | "overdue" | "part-paid" | "waived";

type SessionType = "training" | "match" | "trial" | "festival";
type SessionState = "scheduled" | "completed" | "cancelled";

type Coach = {
  id: string;
  name: string;
  role: string;
  credential: string;
  avatarUrl?: string;
  email?: string;
};

type Player = {
  id: string;
  name: string;
  ageGroup: string;
  team: string;
  position: string;
  status: string;
  guardianName: string;
  dateOfBirth?: string;
  footballPathway?: string;
  // Leave/erasure flags surfaced from Airtable. Undefined when the dataset
  // pre-dates the new fields (older players, demo data) so any UI gating must
  // treat falsy values as "no request on file".
  leaveRequested?: boolean;
  leaveRequestedAt?: string;
  leaveReason?: string;
  leaveNotes?: string;
  erasureRequested?: boolean;
  erasureRequestedAt?: string;
  consentStatus: ConsentStatus;
  photoConsent: boolean;
  videoConsent: boolean;
  matchPhotoConsent: boolean;
  matchVideoConsent: boolean;
  websiteConsent: boolean;
  socialConsent: boolean;
  highlightsConsent: boolean;
  internalReportsConsent?: boolean;
  pressConsent?: boolean;
  emergencyContactConsent?: boolean;
  medicalInformationConsent?: boolean;
  reviewDue: string;
  progressScore: number;
};

type Session = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  team: string;
  ageGroup: string;
  coach: string;
  type: SessionType;
  state: SessionState;
  notes: string;
  checkInEnabled?: boolean;
  qrFallbackCode?: string;
  playerIds?: string[];
};

type AttendanceRecord = {
  id: string;
  sessionId: string;
  playerId: string;
  playerName: string;
  status: AttendanceStatus;
  parentNotified: boolean;
  arrivalTime: string;
  coachNotes: string;
  departureTime?: string;
  checkInMethod?: string;
  confirmationStatus?: string;
  paymentStatus?: string;
  attendanceRecordIdText?: string;
};

type Payment = {
  id: string;
  playerId: string;
  playerName: string;
  description: string;
  amountDue: number;
  amountPaid: number;
  dueDate: string;
  status: PaymentStatus;
  paymentType: string;
  paymentLink: string;
  notes: string;
};

type AdminData = {
  coach: Coach;
  players: Player[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  payments: Payment[];
  sidebar: Array<{ id: string; label: string; count: number; icon: string }>;
  updatedAt: string;
};

type ConsentPayload = {
  childName: string;
  childDateOfBirth: string;
  ageGroup: string;
  footballPathway: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  relationship: string;
  permissions: Record<string, boolean>;
  infoSharing: Record<string, boolean>;
  usageDetails: string;
  storageDuration: string;
  withdrawalProcessAcknowledged: boolean;
  childConsulted: boolean;
  parentalResponsibility: boolean;
  notes: string;
};

// Football Pathway choices mirror the Single select options on the Airtable
// Players table. Order matters — it drives the registration dropdown order
// and the Overview KPI tile order. "" is the unset state — a parent can save
// the form without choosing one (existing players migrated before this field
// existed will start unset).
const footballPathwayOptions = [
  { value: "Grassroots Football", label: "Grassroots football", help: "Currently with a grassroots club or league side." },
  { value: "Academy Football", label: "Academy football", help: "Currently signed to an academy or development centre." },
  { value: "School Football", label: "School football", help: "Plays for a school team or college side." },
  { value: "Not Currently With a Team", label: "Not currently with a team", help: "Between clubs or starting out." },
  { value: "Other / Unsure", label: "Other or unsure", help: "Use this if none of the above describe the player today." },
];

const demoPlayers: Player[] = [
  {
    id: "ply_01",
    name: "Jayden Cole",
    ageGroup: "U11",
    team: "Grass2Pro West",
    position: "CM",
    status: "Active",
    guardianName: "M. Cole",
    footballPathway: "Grassroots Football",
    consentStatus: "green",
    photoConsent: true,
    videoConsent: true,
    matchPhotoConsent: true,
    matchVideoConsent: true,
    websiteConsent: true,
    socialConsent: false,
    highlightsConsent: true,
    internalReportsConsent: true,
    pressConsent: false,
    emergencyContactConsent: true,
    medicalInformationConsent: true,
    reviewDue: "2026-05-02",
    progressScore: 84,
  },
  {
    id: "ply_02",
    name: "Noah Patel",
    ageGroup: "U11",
    team: "Grass2Pro West",
    position: "RW",
    status: "Active",
    guardianName: "A. Patel",
    footballPathway: "Academy Football",
    consentStatus: "amber",
    photoConsent: true,
    videoConsent: true,
    matchPhotoConsent: false,
    matchVideoConsent: false,
    websiteConsent: false,
    socialConsent: false,
    highlightsConsent: false,
    internalReportsConsent: true,
    pressConsent: false,
    emergencyContactConsent: true,
    medicalInformationConsent: false,
    reviewDue: "2026-05-07",
    progressScore: 71,
  },
  {
    id: "ply_03",
    name: "Leo Brooks",
    ageGroup: "U8",
    team: "Grass2Pro Juniors",
    position: "ST",
    status: "Needs parent follow-up",
    guardianName: "S. Brooks",
    footballPathway: "Grassroots Football",
    consentStatus: "grey",
    photoConsent: false,
    videoConsent: false,
    matchPhotoConsent: false,
    matchVideoConsent: false,
    websiteConsent: false,
    socialConsent: false,
    highlightsConsent: false,
    internalReportsConsent: false,
    pressConsent: false,
    emergencyContactConsent: false,
    medicalInformationConsent: false,
    reviewDue: "2026-05-10",
    progressScore: 48,
  },
  {
    id: "ply_04",
    name: "Amari James",
    ageGroup: "U11",
    team: "Grass2Pro West",
    position: "CB",
    status: "Withdrawn media consent",
    guardianName: "T. James",
    footballPathway: "School Football",
    consentStatus: "red",
    photoConsent: false,
    videoConsent: false,
    matchPhotoConsent: false,
    matchVideoConsent: false,
    websiteConsent: false,
    socialConsent: false,
    highlightsConsent: false,
    internalReportsConsent: false,
    pressConsent: false,
    emergencyContactConsent: false,
    medicalInformationConsent: false,
    reviewDue: "2026-05-12",
    progressScore: 67,
  },
  {
    id: "ply_05",
    name: "Ethan Smith",
    ageGroup: "U8",
    team: "Grass2Pro Juniors",
    position: "GK",
    status: "Active",
    guardianName: "R. Smith",
    footballPathway: "Not Currently With a Team",
    consentStatus: "green",
    photoConsent: true,
    videoConsent: true,
    matchPhotoConsent: true,
    matchVideoConsent: true,
    websiteConsent: false,
    socialConsent: false,
    highlightsConsent: true,
    internalReportsConsent: true,
    pressConsent: false,
    emergencyContactConsent: true,
    medicalInformationConsent: true,
    reviewDue: "2026-05-04",
    progressScore: 76,
  },
];

const demoSessions: Session[] = [
  {
    id: "ses_01",
    name: "U11 West - Technical Training",
    date: "2026-04-28",
    startTime: "17:30",
    endTime: "19:00",
    location: "Pitch 3, Hackney Marshes",
    team: "Grass2Pro West",
    ageGroup: "U11",
    coach: "Kobby Mensah",
    type: "training",
    state: "scheduled",
    notes: "Focus on first-touch and turning under pressure. Bibs and cones already in the shed.",
  },
  {
    id: "ses_02",
    name: "U8 Juniors - Skills Session",
    date: "2026-04-29",
    startTime: "16:00",
    endTime: "17:00",
    location: "Community Astro, Hackney",
    team: "Grass2Pro Juniors",
    ageGroup: "U8",
    coach: "Kobby Mensah",
    type: "training",
    state: "scheduled",
    notes: "Rolling small-sided games. Parents reminded to bring water bottles.",
  },
  {
    id: "ses_03",
    name: "U11 West vs Riverside Rovers",
    date: "2026-05-03",
    startTime: "10:30",
    endTime: "12:00",
    location: "Home Pitch, Grass2Pro Ground",
    team: "Grass2Pro West",
    ageGroup: "U11",
    coach: "Kobby Mensah",
    type: "match",
    state: "scheduled",
    notes: "Friendly fixture. Ensure consent statuses checked before any match-day filming.",
  },
  {
    id: "ses_04",
    name: "U11 West - Tactical Review",
    date: "2026-04-21",
    startTime: "17:30",
    endTime: "18:45",
    location: "Pitch 3, Hackney Marshes",
    team: "Grass2Pro West",
    ageGroup: "U11",
    coach: "Kobby Mensah",
    type: "training",
    state: "completed",
    notes: "Completed session. Amari sat out due to media consent withdrawal while filming was in progress.",
  },
  {
    id: "ses_05",
    name: "U8 Juniors - Spring Festival",
    date: "2026-04-19",
    startTime: "09:30",
    endTime: "12:30",
    location: "Waltham Forest Community Pitches",
    team: "Grass2Pro Juniors",
    ageGroup: "U8",
    coach: "Kobby Mensah",
    type: "festival",
    state: "completed",
    notes: "Three round-robin games. Great team attitude, noted in parent follow-ups.",
  },
  {
    id: "ses_06",
    name: "U8 Juniors - Rain Off",
    date: "2026-04-15",
    startTime: "16:00",
    endTime: "17:00",
    location: "Community Astro, Hackney",
    team: "Grass2Pro Juniors",
    ageGroup: "U8",
    coach: "Kobby Mensah",
    type: "training",
    state: "cancelled",
    notes: "Cancelled due to weather. Rescheduled to 22 April slot.",
  },
];

const demoAttendance: AttendanceRecord[] = [
  {
    id: "att_01",
    sessionId: "ses_04",
    playerId: "ply_01",
    playerName: "Jayden Cole",
    status: "present",
    parentNotified: true,
    arrivalTime: "17:25",
    coachNotes: "Led the warm-up. Strong session, confident on the ball.",
  },
  {
    id: "att_02",
    sessionId: "ses_04",
    playerId: "ply_02",
    playerName: "Noah Patel",
    status: "late",
    parentNotified: true,
    arrivalTime: "17:55",
    coachNotes: "Arrived mid warm-up due to school run. Joined drills at 18:00.",
  },
  {
    id: "att_03",
    sessionId: "ses_04",
    playerId: "ply_04",
    playerName: "Amari James",
    status: "excused",
    parentNotified: true,
    arrivalTime: "",
    coachNotes: "Excused to keep the session media-free during filming. Rejoining Thursday.",
  },
  {
    id: "att_04",
    sessionId: "ses_05",
    playerId: "ply_03",
    playerName: "Leo Brooks",
    status: "injured",
    parentNotified: true,
    arrivalTime: "09:30",
    coachNotes: "Ankle knock from school. Did light mobility work, did not play matches.",
  },
  {
    id: "att_05",
    sessionId: "ses_05",
    playerId: "ply_05",
    playerName: "Ethan Smith",
    status: "present",
    parentNotified: true,
    arrivalTime: "09:20",
    coachNotes: "Kept two clean sheets across rotations. Confident distribution.",
  },
  {
    id: "att_06",
    sessionId: "ses_05",
    playerId: "ply_03",
    playerName: "Leo Brooks",
    status: "absent",
    parentNotified: false,
    arrivalTime: "",
    coachNotes: "No show, no message from parent. Flag for Monday follow-up call.",
  },
];

const demoPayments: Payment[] = [
  {
    id: "pay_01",
    playerId: "ply_01",
    playerName: "Jayden Cole",
    description: "May monthly subscription",
    amountDue: 65,
    amountPaid: 65,
    dueDate: "2026-05-01",
    status: "paid",
    paymentType: "Standing order",
    paymentLink: "https://example.com/tracking/pay_01",
    notes: "Paid via bank standing order — reference only, no card data stored.",
  },
  {
    id: "pay_02",
    playerId: "ply_02",
    playerName: "Noah Patel",
    description: "May monthly subscription",
    amountDue: 65,
    amountPaid: 30,
    dueDate: "2026-05-01",
    status: "part-paid",
    paymentType: "Bank transfer",
    paymentLink: "https://example.com/tracking/pay_02",
    notes: "Parent split payment between siblings. Balance expected end of month.",
  },
  {
    id: "pay_03",
    playerId: "ply_03",
    playerName: "Leo Brooks",
    description: "April monthly subscription",
    amountDue: 55,
    amountPaid: 0,
    dueDate: "2026-04-01",
    status: "overdue",
    paymentType: "Invoice",
    paymentLink: "https://example.com/tracking/pay_03",
    notes: "Parent away on deployment. Agreed to catch up in May. Monitor only.",
  },
  {
    id: "pay_04",
    playerId: "ply_04",
    playerName: "Amari James",
    description: "May monthly subscription",
    amountDue: 65,
    amountPaid: 0,
    dueDate: "2026-05-01",
    status: "unpaid",
    paymentType: "Invoice",
    paymentLink: "https://example.com/tracking/pay_04",
    notes: "Awaiting parent confirmation of bank details on file.",
  },
  {
    id: "pay_05",
    playerId: "ply_05",
    playerName: "Ethan Smith",
    description: "Spring Festival fee",
    amountDue: 15,
    amountPaid: 0,
    dueDate: "2026-04-19",
    status: "waived",
    paymentType: "Hardship waiver",
    paymentLink: "",
    notes: "Waived under Grass2Pro hardship policy. Approved by head coach.",
  },
];

const demoData: AdminData = {
  coach: {
    id: "rec_demo_coach",
    name: "Kobby Mensah",
    role: "Grassroots coach admin",
    credential: "FA Level 1 | DBS checked",
    email: "coach@grass2pro.com",
  },
  players: demoPlayers,
  sessions: demoSessions,
  attendance: demoAttendance,
  payments: demoPayments,
  sidebar: [
    { id: "overview", label: "Overview", count: demoPlayers.length, icon: "home" },
    { id: "players", label: "Players", count: demoPlayers.length, icon: "users" },
    { id: "sessions", label: "Sessions", count: demoSessions.length, icon: "calendar" },
    { id: "attendance", label: "Attendance", count: demoAttendance.length, icon: "clipboard" },
    { id: "safeguarding", label: "Safeguarding", count: demoPlayers.filter((p) => p.consentStatus === "grey" || p.consentStatus === "red").length, icon: "shield" },
    { id: "payments", label: "Payments", count: demoPayments.length, icon: "pound" },
    { id: "consent", label: "Consent Form", count: 0, icon: "file" },
  ],
  updatedAt: new Date().toISOString(),
};

const permissionOptions = [
  {
    id: "photoTraining",
    label: "Photos during sessions",
    help: "Still images captured during training and player development sessions only.",
  },
  {
    id: "photoMatch",
    label: "Photos during matches",
    help: "Still images captured at matches and fixtures. Granted independently of session photos.",
  },
  {
    id: "videoTraining",
    label: "Video for coaching review",
    help: "Training footage used by authorised Grass2Pro coaches for private analysis.",
  },
  {
    id: "videoMatch",
    label: "Video during matches",
    help: "Match footage used by authorised Grass2Pro coaches for private analysis. Granted independently of training video.",
  },
  {
    id: "internalReports",
    label: "Internal progress reports",
    help: "Use clips or images inside private progress reports shared with parent or guardian.",
  },
  {
    id: "website",
    label: "Grass2Pro website",
    help: "Use selected images or clips on a controlled Grass2Pro web page or parent portal.",
  },
  {
    id: "social",
    label: "Social media highlights",
    help: "Use selected content on Grass2Pro social channels without naming the child.",
  },
  {
    id: "press",
    label: "Press or partner media",
    help: "Use only when separately approved for a specific feature or campaign.",
  },
];

// Information-sharing permissions are recorded against the same Media Consents
// table but cover non-media data flows (emergency contact details, medical
// information). They are surfaced as a separate UI section so parents can grant
// them independently of media permissions, and they do not influence the
// Active/Limited/Needs Review media consent status.
const infoSharingOptions = [
  {
    id: "emergencyContact",
    label: "Emergency contact sharing",
    help: "Allow Grass2Pro to share the child's emergency contact details with venue staff, medical responders or partner coaches when needed for the child's safety.",
  },
  {
    id: "medicalInformation",
    label: "Medical information sharing",
    help: "Allow Grass2Pro to share relevant medical information (e.g. allergies, conditions) with first aiders, medical responders or partner coaches when needed for the child's care.",
  },
];

const iconMap = {
  home: Home,
  users: Users,
  shield: ShieldCheck,
  file: FileText,
  calendar: CalendarDays,
  clipboard: ClipboardList,
  pound: PoundSterling,
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Airtable linked-record fields can leak through as raw record IDs (e.g.
// "rec0faJqj2SUI6tiH"). Filter those out before rendering anything coach-facing
// so the Players UI never shows "rectHiu...,rec6f..." in place of a name.
const RECORD_ID_PATTERN = /^rec[a-zA-Z0-9]{14,}$/;

function sanitiseHumanString(value: string | undefined | null): string {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  const cleaned = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !RECORD_ID_PATTERN.test(part) && part.toUpperCase() !== "N/A")
    .join(", ");
  return cleaned;
}

function playerGuardianLabel(player: Player): string {
  const raw = (player.guardianName || "").trim();
  if (!raw) return "";
  const name = sanitiseHumanString(raw);
  if (name) return `Guardian ${name}`;
  // Linked-record IDs were the only thing on file — show a generic label so
  // coaches know a guardian is linked without leaking the raw rec... ids.
  return "Parent/guardian linked";
}

function playerMetaLine(player: Player): string {
  // Position is intentionally omitted from the dashboard meta line: kids
  // rotate across outfield roles for development, so a fixed position would
  // be misleading here. The field is still mapped from Airtable for future
  // scouting use.
  return playerGuardianLabel(player);
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatShortDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function apiPath(path: string) {
  if (apiBase) return `${apiBase}${path}`;
  return `/.netlify/functions${path}`;
}

// Always attempt the same-origin Netlify Functions path when running in a
// browser. The Netlify deploy serves the production site under a custom
// domain (coach.grass2pro.com) and on netlify.app/live preview URLs alike —
// restricting the attempt to a hostname allowlist meant the custom domain
// silently fell back to demoData. If the same-origin fetch fails (e.g. on a
// fully static host with no functions runtime) the catch branches below
// transparently fall back to demoData. SSR/non-browser contexts still skip
// the network call entirely.
const apiAvailable = Boolean(apiBase) || typeof window !== "undefined";

// Canonical navigation order. The frontend always renders these tabs so that
// missing or trimmed-down `sidebar` payloads from the backend never remove
// operational pages (Sessions, Attendance, Payments) the coach needs to use.
const navOrder: Array<{ id: string; label: string; icon: string }> = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "players", label: "Players", icon: "users" },
  { id: "sessions", label: "Sessions", icon: "calendar" },
  { id: "attendance", label: "Attendance", icon: "clipboard" },
  { id: "safeguarding", label: "Safeguarding", icon: "shield" },
  { id: "payments", label: "Payments", icon: "pound" },
  { id: "consent", label: "Consent Form", icon: "file" },
];

function buildStableSidebar(data: {
  players: Player[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  payments: Payment[];
  serverSidebar?: AdminData["sidebar"];
}): AdminData["sidebar"] {
  const serverById = new Map(
    (data.serverSidebar ?? []).map((item) => [item.id, item] as const),
  );
  const needsAction = data.players.filter(
    (p) => p.consentStatus === "grey" || p.consentStatus === "red",
  ).length;
  // For tabs whose counts are derived from arrays the frontend hydrates from
  // dedicated endpoints (sessions, attendance, payments), prefer the live
  // array length so the sidebar stays in sync with the rendered tab content.
  // The server's admin-data sidebar can legitimately report 0 for these tabs
  // before its sub-fetches resolve, and `?? computedCounts[…]` would happily
  // accept that zero — masking live data that the dedicated endpoints have
  // since loaded.
  const liveDerivedIds = new Set(["overview", "players", "sessions", "attendance", "safeguarding", "payments"]);
  const computedCounts: Record<string, number> = {
    overview: data.players.length,
    players: data.players.length,
    sessions: data.sessions.length,
    attendance: data.attendance.length,
    safeguarding: needsAction,
    payments: data.payments.length,
    consent: 0,
  };
  return navOrder.map((item) => {
    const fromServer = serverById.get(item.id);
    const computed = computedCounts[item.id] ?? 0;
    const count = liveDerivedIds.has(item.id)
      ? Math.max(computed, fromServer?.count ?? 0)
      : (fromServer?.count ?? computed);
    return {
      id: item.id,
      label: fromServer?.label ?? item.label,
      icon: fromServer?.icon ?? item.icon,
      count,
    };
  });
}

async function loadAdminData(): Promise<AdminData> {
  if (!apiAvailable) return demoData;

  try {
    const response = await fetch(apiPath("/admin-data"));
    if (!response.ok) throw new Error("Admin data unavailable");
    const payload = (await response.json()) as Partial<AdminData> & { warning?: string };
    // The admin-data endpoint reports its own demo-fallback by attaching a
    // `warning`. Treat that as the only signal that we should mix in demo
    // sessions/attendance/payments — otherwise a live deploy that simply
    // omits a field should resolve to an empty array, not stale demo data.
    const isLive = !payload.warning;
    const base = {
      ...demoData,
      ...payload,
      sessions: payload.sessions ?? (isLive ? [] : demoData.sessions),
      attendance: payload.attendance ?? (isLive ? [] : demoData.attendance),
      payments: payload.payments ?? (isLive ? [] : demoData.payments),
      sidebar: payload.sidebar ?? demoData.sidebar,
      players: payload.players ?? demoData.players,
      coach: payload.coach ?? demoData.coach,
    } as AdminData;

    // Pull live Sessions and Attendance from their dedicated endpoints in
    // parallel and merge them in. These are still authoritative even when
    // admin-data itself returns sessions/attendance, since the dedicated
    // endpoints are kept in lockstep with Airtable. Each lookup fails soft:
    // a network error or non-OK response leaves whatever admin-data provided.
    const [sessionsRes, attendanceRes] = await Promise.all([
      fetch(apiPath("/sessions?scope=all")).catch(() => null),
      fetch(apiPath("/attendance")).catch(() => null),
    ]);

    if (sessionsRes && sessionsRes.ok) {
      try {
        const body = (await sessionsRes.json()) as { sessions?: Session[]; warning?: string };
        // A legitimate empty array from a configured backend means "no
        // sessions yet" and should be respected. Only ignore the response
        // when the API explicitly flags itself as unavailable via `warning`.
        if (Array.isArray(body.sessions) && !body.warning) {
          base.sessions = body.sessions;
        }
      } catch {
        // ignore — keep whatever admin-data already supplied
      }
    }
    if (attendanceRes && attendanceRes.ok) {
      try {
        const body = (await attendanceRes.json()) as { attendance?: AttendanceRecord[]; warning?: string };
        if (Array.isArray(body.attendance) && !body.warning) {
          base.attendance = body.attendance;
        }
      } catch {
        // ignore — keep whatever admin-data already supplied
      }
    }

    // Always project the backend sidebar onto the canonical nav order so a
    // trimmed admin-data payload (e.g. only Overview/Players/Safeguarding/
    // Consent) cannot drop operational tabs from the UI.
    base.sidebar = buildStableSidebar({
      players: base.players,
      sessions: base.sessions,
      attendance: base.attendance,
      payments: base.payments,
      serverSidebar: payload.sidebar,
    });
    return base;
  } catch {
    return demoData;
  }
}

// Coach-side player mutations. Each call hits PATCH /api/players with a small
// action verb. The endpoint always returns the freshly normalised player so
// the UI can splice it back into state without reloading the whole dataset.
async function patchPlayerAction<T = { player: Player }>(payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(apiPath("/players"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      detail = body?.error || "";
    } catch {
      // ignore — fall back to the generic message below
    }
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function setPlayerPathway(id: string, value: string): Promise<Player> {
  const data = await patchPlayerAction<{ player: Player }>({ id, action: "set-pathway", value });
  return data.player;
}

async function markPlayerAsLeft(
  id: string,
  reason: string,
  notes: string,
): Promise<Player> {
  const data = await patchPlayerAction<{ player: Player }>({
    id,
    action: "mark-left",
    reason,
    notes,
  });
  return data.player;
}

async function acknowledgePlayerLeave(id: string): Promise<Player> {
  const data = await patchPlayerAction<{ player: Player }>({
    id,
    action: "acknowledge-leave",
  });
  return data.player;
}

async function mintPlayerPathwayToken(id: string): Promise<{ token: string; expiresAt: string; player: Player }> {
  return patchPlayerAction<{ token: string; expiresAt: string; player: Player }>({
    id,
    action: "mint-pathway-token",
  });
}

type QrCheckinScanType = "Arrival" | "Departure";

type QrCheckinResult =
  | { ok: true; id?: string; demo?: boolean; warning?: string; existingAttendanceId?: string | null }
  | { ok: false; status: number; warning?: string; message?: string; existing?: AttendanceRecord | null };

async function submitQrCheckin(payload: {
  sessionId: string;
  playerId: string;
  scanType: QrCheckinScanType;
  forceConfirm?: boolean;
  notes?: string;
}): Promise<QrCheckinResult> {
  const body = JSON.stringify({
    ...payload,
    confirmationResult: "Confirmed",
    method: "QR",
  });

  if (!apiAvailable) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { ok: true, demo: true, warning: "Demo mode — scan was not persisted." };
  }

  const response = await fetch(apiPath("/qr-checkins"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok) {
    return { ok: true, ...(json as object) } as QrCheckinResult;
  }
  // Prefer the structured `message` (set on duplicate/out-of-order 409s);
  // otherwise fall back to `error` and append the backend `detail` so the modal
  // surfaces "Airtable rejected … (Field 'X' cannot accept the provided value.)"
  // instead of a generic "Unable to record scan."
  const baseMessage =
    typeof json.message === "string"
      ? json.message
      : typeof json.error === "string"
        ? (json.error as string)
        : undefined;
  const detail = typeof json.detail === "string" ? (json.detail as string) : undefined;
  const message = baseMessage && detail ? `${baseMessage} (${detail})` : (baseMessage ?? detail);
  return {
    ok: false,
    status: response.status,
    warning: typeof json.warning === "string" ? json.warning : undefined,
    message,
    existing: (json.existing as AttendanceRecord | null) ?? null,
  };
}

async function submitConsent(payload: ConsentPayload) {
  if (!apiAvailable) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return {
      ok: true,
      demo: true,
      id: `demo_${Date.now()}`,
      selectedPermissions: Object.entries(payload.permissions)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key),
    };
  }

  const response = await fetch(apiPath("/media-consent"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Mirror the QR check-in error shape: prefer `error` and append the
    // backend `detail` so the form surfaces e.g. "Airtable rejected the
    // consent record. (Field 'X' cannot accept the provided value.)" instead
    // of a generic "Unable to save consent record."
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const baseMessage =
      typeof json.error === "string"
        ? (json.error as string)
        : typeof json.message === "string"
          ? (json.message as string)
          : undefined;
    const detail = typeof json.detail === "string" ? (json.detail as string) : undefined;
    const missing = Array.isArray(json.missing) ? (json.missing as string[]).join(", ") : undefined;
    const composed =
      baseMessage && detail
        ? `${baseMessage} (${detail})`
        : baseMessage && missing
          ? `${baseMessage} Missing: ${missing}.`
          : (baseMessage ?? detail ?? "Consent submission failed");
    throw new Error(composed);
  }

  return response.json();
}

function Grass2ProLogo() {
  // Mirrors public/favicon.svg so the dashboard mark and the home-screen icon
  // share one visual identity. Letterforms stay cream against a deep-green
  // tile in both themes (a fixed brand backdrop, not theme-driven), keeping
  // contrast high alongside the Grass2Pro wordmark.
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-label="Grass2Pro G2P mark" role="img">
      <rect width="48" height="48" rx="11" fill="#245c2f" />
      <rect x="9" y="36" width="30" height="1.5" rx="0.75" fill="#b7d958" opacity="0.45" />
      <path
        d="M16.5 16.5 a8 8 0 1 0 0 14 h2 v-5 h-3"
        fill="none"
        stroke="#f5f2e8"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.5 18.5 q3.5 -2.5 5.5 0 q2 2.5 -1.5 5 l-4 4 h6"
        fill="none"
        stroke="#b7d958"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M33 31.5 v-15 h4 a4 4 0 0 1 0 8 h-4"
        fill="none"
        stroke="#f5f2e8"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="12" r="1.8" fill="#b7d958" />
    </svg>
  );
}

// Coach-facing labels for each consent purpose recorded on the latest Media
// Consent. Order is meaningful: photos before video, sessions before matches,
// then the downstream uses (reports/website/social/press), and finally the
// information-sharing grants. The Players table renders entries as chips so
// coaches can see at a glance exactly what is allowed and what is not.
const CONSENT_PURPOSE_LABELS: Array<{ key: keyof Player; label: string }> = [
  { key: "photoConsent", label: "Photos – sessions" },
  { key: "matchPhotoConsent", label: "Photos – matches" },
  { key: "videoConsent", label: "Video – coaching review" },
  { key: "matchVideoConsent", label: "Video – matches" },
  { key: "internalReportsConsent", label: "Parent progress reports" },
  { key: "websiteConsent", label: "Grass2Pro website" },
  { key: "socialConsent", label: "Social media highlights" },
  { key: "highlightsConsent", label: "Highlight clips" },
  { key: "pressConsent", label: "Press / partner media" },
  { key: "emergencyContactConsent", label: "Emergency contact sharing" },
  { key: "medicalInformationConsent", label: "Medical info sharing" },
];

type ConsentPurposeBreakdown = {
  allowed: string[];
  restricted: string[];
};

function consentPurposeBreakdown(player: Player): ConsentPurposeBreakdown {
  const allowed: string[] = [];
  const restricted: string[] = [];
  for (const { key, label } of CONSENT_PURPOSE_LABELS) {
    if (player[key]) {
      allowed.push(label);
    } else {
      restricted.push(label);
    }
  }
  return { allowed, restricted };
}

const CONSENT_STATUS_LABELS: Record<ConsentStatus, string> = {
  green: "Full consent",
  amber: "Limited consent",
  red: "Withdrawn",
  grey: "No consent",
};

function ConsentBadgeIcon({ status }: { status: ConsentStatus }) {
  if (status === "green") return <CheckCircle2 size={14} aria-hidden="true" />;
  if (status === "amber") return <AlertTriangle size={14} aria-hidden="true" />;
  if (status === "red") return <X size={14} aria-hidden="true" />;
  return <ClipboardCheck size={14} aria-hidden="true" />;
}

function ConsentBadge({ status }: { status: ConsentStatus }) {
  return (
    <span className={`consent-badge consent-${status}`} data-testid={`badge-consent-${status}`}>
      <ConsentBadgeIcon status={status} />
      {CONSENT_STATUS_LABELS[status]}
    </span>
  );
}

// matchMedia hook used to switch between the desktop popover and the mobile
// bottom-sheet modal for consent details. Stays in sync with viewport changes
// (rotation, devtools resizing) without re-rendering the whole tree.
function useMediaQuery(query: string): boolean {
  const getMatch = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;
  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// Shared consent details panel: same chip list used in the desktop popover,
// the mobile bottom-sheet modal, and the inline mobile card row. Allowed
// purposes render as positive chips; restricted purposes render in red so
// coaches cannot miss them when consent is partial or withdrawn. For Full
// consent the restricted block is hidden entirely to avoid clutter.
function ConsentDetailsBody({
  player,
  variant,
}: {
  player: Player;
  variant: "popover" | "modal" | "card";
}) {
  const { allowed, restricted } = consentPurposeBreakdown(player);
  const showRestricted =
    restricted.length > 0 && player.consentStatus !== "green";

  if (allowed.length === 0 && !showRestricted) {
    return (
      <p className="player-sub" data-testid={`text-consent-details-${variant}-${player.id}`}>
        No consent purposes recorded.
      </p>
    );
  }

  return (
    <div
      className="consent-details"
      data-testid={`details-consent-${variant}-${player.id}`}
    >
      {allowed.length > 0 && (
        <ul
          className="consent-chip-list"
          aria-label={`Allowed consent purposes for ${player.name}`}
          data-testid={`list-consent-details-${variant}-${player.id}`}
        >
          {allowed.map((label) => (
            <li key={label} className="consent-chip consent-chip-allowed">
              {label}
            </li>
          ))}
        </ul>
      )}
      {showRestricted && (
        <ul
          className="consent-chip-list consent-chip-list-restricted"
          aria-label={`Restricted consent purposes for ${player.name}`}
          data-testid={`list-consent-restricted-${variant}-${player.id}`}
        >
          {restricted.map((label) => (
            <li key={label} className="consent-chip consent-chip-restricted">
              <X size={12} aria-hidden="true" />
              <span>{label} — not allowed</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Bottom-sheet modal anchored to the viewport (not the row) used on mobile.
// Closes on outside tap, the close button, and the Escape key. Body scroll is
// locked while open so the sheet stays fully visible above the browser chrome.
function ConsentDetailsSheet({ player, onClose }: { player: Player; onClose: () => void }) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="consent-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Consent details for ${player.name}`}
      data-testid={`sheet-consent-details-${player.id}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="consent-sheet">
        <div className="consent-sheet-header">
          <div>
            <span className="consent-sheet-kicker">Consent details</span>
            <h3 className="consent-sheet-title">{player.name}</h3>
          </div>
          <button
            type="button"
            className="consent-popover-close"
            onClick={onClose}
            aria-label="Close consent details"
            data-testid={`button-close-consent-details-${player.id}`}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <ConsentDetailsBody player={player} variant="modal" />
      </div>
    </div>
  );
}

// On desktop the badge toggles an absolute-positioned popover anchored under
// the row. On mobile the dedicated "Consent details" column is replaced by a
// fixed bottom-sheet so the chip list is always fully visible regardless of
// row position or browser chrome.
function PlayerConsentCell({ player }: { player: Player }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverId = `consent-popover-${player.id}`;
  const isMobile = useMediaQuery("(max-width: 760px)");

  useEffect(() => {
    if (!open || isMobile) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const node = wrapperRef.current;
      if (node && event.target instanceof Node && !node.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, isMobile]);

  return (
    <div className="consent-cell" ref={wrapperRef}>
      <button
        type="button"
        className={`consent-badge consent-${player.consentStatus} consent-badge-button`}
        data-testid={`badge-consent-${player.consentStatus}`}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-haspopup="dialog"
        aria-label={`${CONSENT_STATUS_LABELS[player.consentStatus]} for ${player.name}. Tap to ${open ? "hide" : "show"} consent details.`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <ConsentBadgeIcon status={player.consentStatus} />
        {CONSENT_STATUS_LABELS[player.consentStatus]}
      </button>
      <div className="player-sub">{player.status}</div>
      {open && !isMobile && (
        <div
          id={popoverId}
          className="consent-popover"
          role="dialog"
          aria-label={`Consent details for ${player.name}`}
          data-testid={`popover-consent-details-${player.id}`}
        >
          <div className="consent-popover-header">
            <span className="consent-popover-title">Consent details</span>
            <button
              type="button"
              className="consent-popover-close"
              onClick={() => setOpen(false)}
              aria-label="Close consent details"
              data-testid={`button-close-consent-details-${player.id}`}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <ConsentDetailsBody player={player} variant="popover" />
        </div>
      )}
      {open && isMobile && (
        <ConsentDetailsSheet player={player} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

const attendanceLabel: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  injured: "Injured",
  excused: "Excused",
};

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span className={`status-pill attendance-${status}`} data-testid={`badge-attendance-${status}`}>
      {attendanceLabel[status]}
    </span>
  );
}

const paymentLabel: Record<PaymentStatus, string> = {
  paid: "Paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
  "part-paid": "Part-paid",
  waived: "Waived",
};

function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`status-pill payment-${status}`} data-testid={`badge-payment-${status}`}>
      {paymentLabel[status]}
    </span>
  );
}

const sessionStateLabel: Record<SessionState, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

const sessionTypeLabel: Record<SessionType, string> = {
  training: "Training",
  match: "Match",
  trial: "Trial",
  festival: "Festival",
};

function SessionStateBadge({ state }: { state: SessionState }) {
  return (
    <span className={`status-pill session-${state}`} data-testid={`badge-session-${state}`}>
      {sessionStateLabel[state]}
    </span>
  );
}

function CoachPill({ coach }: { coach: Coach }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = coach.avatarUrl && !imageFailed;

  return (
    <div className="coach-pill" data-testid="pill-coach-profile">
      <span className="avatar" data-testid="img-coach-avatar">
        {showImage ? (
          <img src={coach.avatarUrl} alt={`${coach.name} avatar`} onError={() => setImageFailed(true)} />
        ) : (
          initials(coach.name)
        )}
      </span>
      <span className="coach-meta">
        <span className="coach-name" data-testid="text-coach-name">
          {coach.name}
        </span>
        <span className="coach-role" data-testid="text-coach-role">
          {coach.role} · {coach.credential}
        </span>
      </span>
    </div>
  );
}

function Sidebar({
  sidebar,
  activeView,
  onViewChange,
  open,
  onClose,
}: {
  sidebar: AdminData["sidebar"];
  activeView: string;
  onViewChange: (view: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Coach admin navigation">
      <div className="brand-row">
        <Grass2ProLogo />
        <div>
          <div className="brand-title">Grass2Pro</div>
          <div className="brand-subtitle">Coach admin</div>
        </div>
      </div>
      <div className="sidebar-section">
        <div className="section-label">Workspace</div>
        <nav className="nav-list" aria-label="Main navigation">
          {sidebar.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Home;
            return (
              <button
                type="button"
                key={item.id}
                className={`nav-button ${activeView === item.id ? "active" : ""}`}
                onClick={() => {
                  onViewChange(item.id);
                  onClose();
                }}
                data-testid={`button-nav-${item.id}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                <span className="nav-count" data-testid={`text-nav-count-${item.id}`}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="sidebar-card">
        <div className="safeguarding-note">
          <strong>Consent covers media and information sharing</strong>
          <p>Media consent controls filming, editing and publishing workflows. Information-sharing permissions cover emergency contact and medical details. Players without consent are never excluded from sessions.</p>
        </div>
      </div>
    </aside>
  );
}

function KpiCard({ label, value, foot, icon: Icon }: { label: string; value: number | string; foot: string; icon: typeof Users }) {
  return (
    <article className="kpi-card" data-testid={`card-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="kpi-label">
        <span>{label}</span>
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="kpi-value" data-testid={`text-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        {value}
      </div>
      <div className="kpi-foot">{foot}</div>
    </article>
  );
}

function Overview({
  data,
  onJumpToPlayers,
  onPlayerUpdate,
}: {
  data: AdminData;
  onJumpToPlayers?: () => void;
  onPlayerUpdate?: (player: Player) => void;
}) {
  // Active roster excludes players the coach has already marked as Left so
  // KPIs reflect the current squad. The Action needed card below still uses
  // the full list because outstanding leave/erasure requests can come from
  // both active and recently-left players.
  const players = data.players.filter((player) => player.status !== "Left");
  const fullConsent = players.filter((player) => player.consentStatus === "green").length;
  const limited = players.filter((player) => player.consentStatus === "amber").length;
  const notRecorded = players.filter((player) => player.consentStatus === "grey").length;
  const withdrawn = players.filter((player) => player.consentStatus === "red").length;
  const needsAction = notRecorded + withdrawn;

  const pendingLeave = data.players.filter((player) => player.leaveRequested);
  const pendingErasure = data.players.filter((player) => player.erasureRequested);

  const [ackBusyId, setAckBusyId] = useState<string | null>(null);
  const [ackError, setAckError] = useState("");

  async function handleAcknowledge(player: Player) {
    if (!onPlayerUpdate) return;
    setAckBusyId(player.id);
    setAckError("");
    try {
      const updated = await acknowledgePlayerLeave(player.id);
      onPlayerUpdate(updated);
    } catch (err) {
      setAckError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setAckBusyId(null);
    }
  }

  // Football Pathway KPI counts. Phase one is purely the current pathway split
  // — a coach can show parents "this is where my players come from today".
  // Pathway history ("moved from grassroots to academy") will come in a later
  // phase when we start writing pathway changes to a separate audit table, so
  // anything claiming movement over time is deliberately absent here.
  const pathwayCounts = footballPathwayOptions.map((option) => ({
    value: option.value,
    label: option.label,
    help: option.help,
    count: players.filter((player) => player.footballPathway === option.value).length,
  }));
  const pathwayUnset = players.filter(
    (player) => !player.footballPathway || player.footballPathway.trim() === "",
  ).length;

  return (
    <>
      <section className="kpi-grid" aria-label="Player KPIs">
        <KpiCard label="Players" value={players.length} foot="Squad total" icon={Users} />
        <KpiCard label="Full consent" value={fullConsent} foot="Photo, video and review ready" icon={CheckCircle2} />
        <KpiCard label="Limited consent" value={limited} foot="Internal-only or channel limits" icon={AlertTriangle} />
        <KpiCard label="Not recorded" value={notRecorded} foot="Awaiting parent form" icon={ClipboardCheck} />
        <KpiCard label="Withdrawn" value={withdrawn} foot="Media usage blocked" icon={X} />
      </section>

      <div className="section-heading">
        <div className="page-kicker">Football pathway</div>
        <p>
          Where each player sits today. A useful conversation starter with new parents — it shows the
          mix of children currently being coached.
        </p>
      </div>
      <section className="kpi-grid" aria-label="Football pathway KPIs">
        {pathwayCounts.map((entry) => (
          <KpiCard
            key={entry.value}
            label={entry.label}
            value={entry.count}
            foot={entry.help}
            icon={Users}
          />
        ))}
        {pathwayUnset > 0 && (
          <KpiCard
            label="Pathway not set"
            value={pathwayUnset}
            foot="Existing players awaiting a pathway choice"
            icon={ClipboardList}
          />
        )}
      </section>

      {(pendingLeave.length > 0 || pendingErasure.length > 0) && (
        <section className="panel action-needed-card" aria-labelledby="action-needed-title">
          <div className="toolbar">
            <div>
              <div className="page-kicker">Heads up</div>
              <h2 id="action-needed-title" className="page-title" style={{ fontSize: "var(--text-lg)" }}>
                Recent parent decisions
              </h2>
            </div>
            {onJumpToPlayers && (
              <button
                type="button"
                className="primary-button"
                onClick={onJumpToPlayers}
                data-testid="button-jump-to-players"
              >
                Open players list
              </button>
            )}
          </div>
          {ackError && (
            <p className="player-sub pathway-inline-error" data-testid="text-ack-error">
              {ackError}
            </p>
          )}
          <ul className="action-needed-list">
            {pendingLeave.map((player) => (
              <li key={`leave-${player.id}`} className="action-needed-item">
                <span className="action-needed-icon action-needed-icon--leave" aria-hidden="true">
                  <LogOut size={16} />
                </span>
                <div className="action-needed-body">
                  <strong>{player.name}</strong>
                  <span className="player-sub">
                    Parent has moved on from your squad{player.leaveReason ? ` — ${player.leaveReason}` : ""}
                  </span>
                  {player.leaveNotes && (
                    <span className="player-sub action-needed-notes">{player.leaveNotes}</span>
                  )}
                </div>
                <div className="action-needed-side">
                  <span className="action-needed-meta">
                    {player.leaveRequestedAt
                      ? new Date(player.leaveRequestedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })
                      : ""}
                  </span>
                  {onPlayerUpdate && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleAcknowledge(player)}
                      disabled={ackBusyId === player.id}
                      data-testid={`button-ack-leave-${player.id}`}
                    >
                      <Check size={14} aria-hidden="true" />
                      {ackBusyId === player.id ? "Saving…" : "Got it"}
                    </button>
                  )}
                </div>
              </li>
            ))}
            {pendingErasure.map((player) => (
              <li key={`erase-${player.id}`} className="action-needed-item">
                <span className="action-needed-icon action-needed-icon--erasure" aria-hidden="true">
                  <Trash2 size={16} />
                </span>
                <div className="action-needed-body">
                  <strong>{player.name}</strong>
                  <span className="player-sub">
                    Parent requested data erasure — verify and action manually in Airtable
                  </span>
                </div>
                <span className="action-needed-meta">
                  {player.erasureRequestedAt
                    ? new Date(player.erasureRequestedAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cards-grid">
        <article className="card mini-card">
          <Camera size={20} aria-hidden="true" />
          <h3>Session photos</h3>
          <p>{(() => {
            const n = players.filter((player) => player.photoConsent).length;
            return n === 1
              ? "1 player allows photos during sessions."
              : `${n} players allow photos during sessions.`;
          })()}</p>
        </article>
        <article className="card mini-card">
          <Camera size={20} aria-hidden="true" />
          <h3>Match photos</h3>
          <p>{(() => {
            const n = players.filter((player) => player.matchPhotoConsent).length;
            return n === 1
              ? "1 player allows photos during matches."
              : `${n} players allow photos during matches.`;
          })()}</p>
        </article>
        <article className="card mini-card">
          <Video size={20} aria-hidden="true" />
          <h3>Coaching video review</h3>
          <p>{(() => {
            const n = players.filter((player) => player.videoConsent).length;
            return n === 1
              ? "1 player has permission for training analysis footage."
              : `${n} players have permission for training analysis footage.`;
          })()}</p>
        </article>
        <article className="card mini-card">
          <Video size={20} aria-hidden="true" />
          <h3>Match video</h3>
          <p>{(() => {
            const n = players.filter((player) => player.matchVideoConsent).length;
            return n === 1
              ? "1 player allows match footage for coach analysis."
              : `${n} players allow match footage for coach analysis.`;
          })()}</p>
        </article>
        <article className="card mini-card">
          <ShieldCheck size={20} aria-hidden="true" />
          <h3>Needs follow-up</h3>
          <p>{needsAction === 1
            ? "1 record needs parent follow-up before any public media usage."
            : `${needsAction} records need parent follow-up before any public media usage.`}</p>
        </article>
      </section>
    </>
  );
}

// Inline pathway dropdown shown on every Players list row. Saving fires the
// `set-pathway` PATCH and the parent splices the updated player back into
// state — we don't reload the whole admin payload, so the change feels
// instantaneous. Errors are surfaced inline so the coach knows the change
// didn't stick (network blip, Airtable rejecting an unknown option, etc.).
function PathwayInlineEdit({
  player,
  onPlayerUpdate,
}: {
  player: Player;
  onPlayerUpdate: (player: Player) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const value = player.footballPathway || "";

  async function handleChange(next: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await setPlayerPathway(player.id, next);
      onPlayerUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pathway.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pathway-inline">
      <label className="sr-only" htmlFor={`pathway-${player.id}`}>
        Football pathway for {player.name}
      </label>
      <select
        id={`pathway-${player.id}`}
        className={`pathway-inline-select ${value ? "" : "pathway-inline-empty"}`}
        value={value}
        disabled={saving}
        onChange={(event) => handleChange(event.target.value)}
        data-testid={`select-pathway-${player.id}`}
      >
        <option value="">Pathway not set</option>
        {footballPathwayOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {saving && <span className="player-sub">Saving…</span>}
      {error && <span className="player-sub pathway-inline-error">{error}</span>}
    </div>
  );
}

// Per-row coach action menu: send the parent a pathway-update link, or open
// the Mark-as-Left modal. Lives next to the pathway pill so all the row's
// editing surfaces are in one place. Active players see the full menu;
// already-Left players only get a disabled hint to keep the UI honest.
function PlayerRowActions({
  player,
  onPlayerUpdate,
  onRequestMarkLeft,
}: {
  player: Player;
  onPlayerUpdate: (player: Player) => void;
  onRequestMarkLeft: (player: Player) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [linkInfo, setLinkInfo] = useState<{ url: string; copied: boolean } | null>(null);
  const [error, setError] = useState("");

  if (player.status === "Left") {
    return (
      <span className="player-sub player-row-actions-empty">
        Player has left the squad
      </span>
    );
  }

  async function sendLink() {
    setBusy(true);
    setError("");
    try {
      const result = await mintPlayerPathwayToken(player.id);
      onPlayerUpdate(result.player);
      const origin =
        typeof window !== "undefined" && window.location
          ? window.location.origin
          : "";
      const url = `${origin}/pathway/${result.token}`;
      let copied = false;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url);
          copied = true;
        } catch {
          // Clipboard can be denied (no user gesture, insecure context). The
          // link is still shown below the button so the coach can copy it
          // manually — we just won't claim we copied it for them.
        }
      }
      setLinkInfo({ url, copied });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="player-row-actions">
      <button
        type="button"
        className="link-button"
        onClick={sendLink}
        disabled={busy}
        data-testid={`button-send-pathway-link-${player.id}`}
      >
        <LinkIcon size={14} aria-hidden="true" /> {busy ? "Creating link…" : "Send link to parent"}
      </button>
      <details className="player-row-overflow">
        <summary>More…</summary>
        <p className="player-sub player-row-overflow-hint">
          Parents can leave the squad themselves with the link above. Use this only if a parent told you in person.
        </p>
        <button
          type="button"
          className="link-button link-button--danger"
          onClick={() => onRequestMarkLeft(player)}
          data-testid={`button-mark-left-${player.id}`}
        >
          <LogOut size={14} aria-hidden="true" /> Mark as left for them
        </button>
      </details>
      {linkInfo && (
        <div className="player-row-link-info" data-testid={`link-info-${player.id}`}>
          {linkInfo.copied ? (
            <span className="player-sub">
              <Check size={14} aria-hidden="true" /> Link copied. It works for 7 days.
            </span>
          ) : (
            <span className="player-sub">Copy this link to share with the parent (works for 7 days):</span>
          )}
          <code className="player-row-link">{linkInfo.url}</code>
        </div>
      )}
      {error && <span className="player-sub pathway-inline-error">{error}</span>}
    </div>
  );
}

// Coach-confirmed leaver modal. Reason is required; notes are optional and
// useful when "Other" is picked. The modal closes itself after a successful
// save and the parent splices the now-Left player back into state.
const LEAVE_REASONS = [
  "Moved area",
  "Joined another club",
  "Finished age group",
  "Parent request",
  "Other",
] as const;

function MarkAsLeftModal({
  player,
  onClose,
  onPlayerUpdate,
}: {
  player: Player;
  onClose: () => void;
  onPlayerUpdate: (player: Player) => void;
}) {
  const [reason, setReason] = useState<string>(player.leaveReason || "");
  const [notes, setNotes] = useState<string>(player.leaveNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason) {
      setError("Please pick a reason.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const updated = await markPlayerAsLeft(player.id, reason, notes);
      onPlayerUpdate(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setSubmitting(false);
    }
  }

  return (
    <div className="qr-modal-backdrop" role="dialog" aria-modal="true" aria-label="Mark player as left">
      <div className="qr-modal panel">
        <div className="toolbar">
          <div>
            <div className="page-kicker">Mark as left</div>
            <h2 className="page-title" style={{ fontSize: "var(--text-lg)" }}>{player.name}</h2>
            <div className="player-sub">
              {player.team} · {player.ageGroup}
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form className="form-section" onSubmit={submit}>
          <p className="player-sub">
            This moves the player to <strong>Left</strong>. The record stays on file (attendance,
            payments and consent history are preserved). Use the separate erasure flow only if the
            parent has asked to delete personal data.
          </p>
          <label className="form-field full">
            <span>Reason</span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              data-testid="select-leave-reason"
              required
            >
              <option value="">Choose a reason…</option>
              {LEAVE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="form-field full">
            <span>Notes (optional)</span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything useful for the audit trail — new club, moving date, etc."
              data-testid="textarea-leave-notes"
            />
          </label>
          {error && (
            <div className="message error" data-testid="status-leave-error">
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
              data-testid="button-confirm-mark-left"
            >
              {submitting ? "Saving…" : "Mark as left"}
            </button>
            <button type="button" className="filter-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlayerList({
  players,
  onPlayerUpdate,
}: {
  players: Player[];
  onPlayerUpdate: (player: Player) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ConsentStatus>("all");
  const [showLeft, setShowLeft] = useState(false);
  const [leavingPlayer, setLeavingPlayer] = useState<Player | null>(null);

  const leftCount = useMemo(
    () => players.filter((p) => p.status === "Left").length,
    [players],
  );

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      if (!showLeft && player.status === "Left") return false;
      const matchesFilter = filter === "all" || player.consentStatus === filter;
      const matchesQuery = `${player.name} ${player.team} ${player.ageGroup} ${player.guardianName}`.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, players, query, showLeft]);

  return (
    <section className="panel player-table-card" aria-labelledby="players-title">
      <div className="toolbar">
        <div>
          <div className="page-kicker">Players list</div>
          <h2 id="players-title" className="page-title">
            Player list and consent status
          </h2>
        </div>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search players</span>
          <input
            data-testid="input-search-players"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search players, teams or guardians"
          />
        </label>
      </div>
      <div className="filter-row" aria-label="Consent filters">
        {([
          { value: "all", label: "All" },
          { value: "green", label: "Full consent" },
          { value: "amber", label: "Limited consent" },
          { value: "red", label: "Withdrawn" },
          { value: "grey", label: "No consent" },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`filter-button ${filter === value ? "active" : ""}`}
            onClick={() => setFilter(value)}
            data-testid={`button-filter-${value}`}
          >
            {label}
          </button>
        ))}
        {leftCount > 0 && (
          <button
            type="button"
            className={`filter-button ${showLeft ? "active" : ""}`}
            onClick={() => setShowLeft((s) => !s)}
            data-testid="button-toggle-show-left"
          >
            {showLeft ? `Hide players who have left (${leftCount})` : `Show players who have left (${leftCount})`}
          </button>
        )}
      </div>
      {filteredPlayers.length === 0 ? (
        <div className="empty-state">
          <ShieldCheck size={32} aria-hidden="true" />
          <h3>No matching player records</h3>
          <p>Try a different search or consent filter. Players stay listed even when media consent is missing.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap player-table-desktop">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th className="actions-col">Actions</th>
                  <th>Football pathway</th>
                  <th>Consent</th>
                  <th className="consent-details-col">Consent details</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => (
                  <tr
                    key={player.id}
                    data-testid={`row-player-${player.id}`}
                    className={player.status === "Left" ? "row-left" : ""}
                  >
                    <td>
                      <div className="player-cell">
                        <span className="player-avatar">{initials(player.name)}</span>
                        <span>
                          <span className="player-name" data-testid={`text-player-name-${player.id}`}>
                            {player.name}
                          </span>
                          {playerMetaLine(player) && (
                            <span className="player-sub">{playerMetaLine(player)}</span>
                          )}
                          {player.status === "Left" && (
                            <span className="player-sub status-left-tag">
                              {player.leaveRequested ? "Left the squad (parent request)" : "Left the squad"}
                            </span>
                          )}
                          {player.leaveRequested && player.status !== "Left" && (
                            <span className="player-sub status-leave-pending">Parent asked to move on</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{player.team}</strong>
                      <div className="player-sub">{player.ageGroup}</div>
                    </td>
                    <td className="actions-col">
                      <PlayerRowActions
                        player={player}
                        onPlayerUpdate={onPlayerUpdate}
                        onRequestMarkLeft={setLeavingPlayer}
                      />
                    </td>
                    <td>
                      <PathwayInlineEdit player={player} onPlayerUpdate={onPlayerUpdate} />
                    </td>
                    <td>
                      <PlayerConsentCell player={player} />
                    </td>
                    <td className="consent-details-col">
                      <ConsentDetailsBody player={player} variant="card" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="player-card-list" aria-label="Players">
            {filteredPlayers.map((player) => (
              <li
                key={player.id}
                className={`player-card ${player.status === "Left" ? "player-card-left" : ""}`}
                data-testid={`row-player-${player.id}`}
              >
                <div className="player-card-head">
                  <span className="player-avatar">{initials(player.name)}</span>
                  <div className="player-card-identity">
                    <span className="player-name" data-testid={`text-player-name-${player.id}`}>
                      {player.name}
                    </span>
                    {playerMetaLine(player) && (
                      <span className="player-sub">{playerMetaLine(player)}</span>
                    )}
                    <span className="player-sub">
                      <strong>{player.team}</strong> · {player.ageGroup}
                    </span>
                    {player.status === "Left" && (
                      <span className="player-sub status-left-tag">
                        {player.leaveRequested ? "Left the squad (parent request)" : "Left the squad"}
                      </span>
                    )}
                    {player.leaveRequested && player.status !== "Left" && (
                      <span className="player-sub status-leave-pending">Parent asked to move on</span>
                    )}
                  </div>
                </div>
                <div className="player-card-consent">
                  <PlayerConsentCell player={player} />
                </div>
                <dl className="player-card-meta">
                  <div className="player-card-meta-row">
                    <dt>Football pathway</dt>
                    <dd>
                      <PathwayInlineEdit player={player} onPlayerUpdate={onPlayerUpdate} />
                    </dd>
                  </div>
                  <div className="player-card-meta-row">
                    <dt>Review due</dt>
                    <dd>
                      {new Date(player.reviewDue).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </dd>
                  </div>
                </dl>
                <div className="player-card-actions">
                  <PlayerRowActions
                    player={player}
                    onPlayerUpdate={onPlayerUpdate}
                    onRequestMarkLeft={setLeavingPlayer}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {leavingPlayer && (
        <MarkAsLeftModal
          player={leavingPlayer}
          onClose={() => setLeavingPlayer(null)}
          onPlayerUpdate={onPlayerUpdate}
        />
      )}
    </section>
  );
}

function QrCheckinDialog({
  session,
  players,
  onClose,
}: {
  session: Session;
  players: Player[];
  onClose: () => void;
}) {
  const [playerId, setPlayerId] = useState<string>(players[0]?.id ?? "");
  const [scanType, setScanType] = useState<QrCheckinScanType>("Arrival");
  const [stage, setStage] = useState<"choose" | "confirm" | "submitting" | "result">("choose");
  const [forceConfirm, setForceConfirm] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState("");
  const [resultOk, setResultOk] = useState(false);

  // Reset the forceConfirm override (and any stale duplicate-scan warning) when
  // the coach changes the player or scan type — otherwise a 409 against player
  // A could silently auto-arm "Confirm anyway" for player B.
  function changePlayer(nextId: string) {
    setPlayerId(nextId);
    setForceConfirm(false);
    setWarning(null);
  }
  function changeScanType(next: QrCheckinScanType) {
    setScanType(next);
    setForceConfirm(false);
    setWarning(null);
  }

  const player = players.find((p) => p.id === playerId);

  async function send(force: boolean) {
    if (!playerId || !player) return;
    setStage("submitting");
    setWarning(null);
    const result = await submitQrCheckin({
      sessionId: session.id,
      playerId,
      scanType,
      forceConfirm: force,
    });
    if (result.ok) {
      setResultOk(true);
      setResultMessage(
        result.warning
          ? `Recorded with note: ${result.warning}`
          : `${scanType} scan recorded for ${player.name}.`,
      );
      setStage("result");
      return;
    }
    if (result.status === 409 && result.warning) {
      setWarning(result.message || result.warning);
      setForceConfirm(true);
      setStage("confirm");
      return;
    }
    setResultOk(false);
    setResultMessage(result.message || "Unable to record scan.");
    setStage("result");
  }

  return (
    <div className="qr-modal-backdrop" role="dialog" aria-modal="true" aria-label="QR check-in">
      <div className="qr-modal panel">
        <div className="toolbar">
          <div>
            <div className="page-kicker">Check-in</div>
            <h2 className="page-title" style={{ fontSize: "var(--text-lg)" }}>{session.name}</h2>
            <div className="player-sub">
              {formatDate(session.date)} · {session.startTime}–{session.endTime} · {session.location}
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close check-in">
            <X size={18} />
          </button>
        </div>

        {stage === "choose" && (
          <div className="form-section">
            <label className="form-field full">
              <span>Player</span>
              <select value={playerId} onChange={(e) => changePlayer(e.target.value)} data-testid="select-qr-player">
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.team}
                  </option>
                ))}
              </select>
            </label>
            <div className="filter-row" aria-label="Scan type">
              {(["Arrival", "Departure"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`filter-button ${scanType === type ? "active" : ""}`}
                  onClick={() => changeScanType(type)}
                  data-testid={`button-qr-scantype-${type.toLowerCase()}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <button
                type="button"
                className="primary-button"
                disabled={!playerId}
                onClick={() => setStage("confirm")}
                data-testid="button-qr-review"
              >
                Review
              </button>
              <button type="button" className="filter-button" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}

        {(stage === "confirm" || stage === "submitting") && player && (
          <div className="form-section">
            <h3>Confirm scan</h3>
            <div className="summary-list">
              <div className="summary-item"><span>Session</span><strong>{session.name}</strong></div>
              <div className="summary-item"><span>Player</span><strong>{player.name}</strong></div>
              <div className="summary-item"><span>Team</span><strong>{player.team} · {player.ageGroup}</strong></div>
              <div className="summary-item"><span>Scan</span><strong>{scanType}</strong></div>
            </div>
            {warning && (
              <div className="message error" data-testid="status-qr-warning">
                {warning} {forceConfirm ? "Tap Confirm anyway to override." : ""}
              </div>
            )}
            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <button
                type="button"
                className="primary-button"
                disabled={stage === "submitting"}
                onClick={() => send(forceConfirm)}
                data-testid="button-qr-confirm"
              >
                {stage === "submitting" ? "Sending..." : forceConfirm ? "Confirm anyway" : "Confirm"}
              </button>
              <button type="button" className="filter-button" onClick={() => setStage("choose")}>Back</button>
            </div>
          </div>
        )}

        {stage === "result" && (
          <div className="form-section">
            <div className={`message ${resultOk ? "success" : "error"}`} data-testid="status-qr-result">
              {resultMessage}
            </div>
            <button type="button" className="primary-button" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Sessions({ sessions, players }: { sessions: Session[]; players: Player[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | SessionState>("all");
  const [checkinSession, setCheckinSession] = useState<Session | null>(null);

  const now = new Date();
  const upcoming = sessions.filter((s) => s.state === "scheduled" && new Date(s.date) >= new Date(now.toDateString())).length;
  const completed = sessions.filter((s) => s.state === "completed").length;
  const cancelled = sessions.filter((s) => s.state === "cancelled").length;

  const filtered = useMemo(() => {
    return sessions
      .filter((s) => {
        const matchesFilter = filter === "all" || s.state === filter;
        const matchesQuery = `${s.name} ${s.team} ${s.ageGroup} ${s.location} ${s.coach}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesFilter && matchesQuery;
      })
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filter, query, sessions]);

  return (
    <>
      <section className="kpi-grid" aria-label="Session KPIs">
        <KpiCard label="Upcoming" value={upcoming} foot="Scheduled sessions to come" icon={CalendarDays} />
        <KpiCard label="Completed" value={completed} foot="Recent sessions delivered" icon={CheckCircle2} />
        <KpiCard label="Cancelled" value={cancelled} foot="Cancelled or rained off" icon={X} />
        <KpiCard label="Total tracked" value={sessions.length} foot="All session records" icon={ClipboardCheck} />
      </section>
      <section className="panel player-table-card" aria-labelledby="sessions-title">
        <div className="toolbar">
          <div>
            <div className="page-kicker">Sessions</div>
            <h2 id="sessions-title" className="page-title">
              Upcoming and recent sessions
            </h2>
          </div>
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search sessions</span>
            <input
              data-testid="input-search-sessions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sessions, teams or venues"
            />
          </label>
        </div>
        <div className="filter-row" aria-label="Session filters">
          {(["all", "scheduled", "completed", "cancelled"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-button ${filter === status ? "active" : ""}`}
              onClick={() => setFilter(status)}
              data-testid={`button-session-filter-${status}`}
            >
              {status === "all" ? "All" : status}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={32} aria-hidden="true" />
            <h3>No matching sessions</h3>
            <p>Try a different search or status filter. Demo data includes upcoming, completed and cancelled records.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Date &amp; time</th>
                  <th>Location</th>
                  <th>Team</th>
                  <th>Coach</th>
                  <th>Type / Status</th>
                  <th>Notes</th>
                  <th>Check-in</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((session) => (
                  <tr key={session.id} data-testid={`row-session-${session.id}`}>
                    <td>
                      <span className="player-name" data-testid={`text-session-name-${session.id}`}>
                        {session.name}
                      </span>
                      <div className="player-sub">{session.ageGroup}</div>
                    </td>
                    <td>
                      <div className="inline-meta">
                        <CalendarDays size={14} aria-hidden="true" />
                        <span>{formatDate(session.date)}</span>
                      </div>
                      <div className="inline-meta muted">
                        <Clock size={14} aria-hidden="true" />
                        <span>
                          {session.startTime}–{session.endTime}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="inline-meta">
                        <MapPin size={14} aria-hidden="true" />
                        <span>{session.location}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{session.team}</strong>
                      <div className="player-sub">{session.ageGroup}</div>
                    </td>
                    <td>{session.coach}</td>
                    <td>
                      <SessionStateBadge state={session.state} />
                      <div className="player-sub">{sessionTypeLabel[session.type]}</div>
                    </td>
                    <td>
                      <span className="notes-cell">{session.notes}</span>
                    </td>
                    <td>
                      {session.state === "scheduled" ? (
                        <button
                          type="button"
                          className="filter-button"
                          onClick={() => setCheckinSession(session)}
                          data-testid={`button-checkin-${session.id}`}
                        >
                          QR check-in
                        </button>
                      ) : (
                        <span className="player-sub">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {checkinSession && (
        <QrCheckinDialog
          session={checkinSession}
          players={players}
          onClose={() => setCheckinSession(null)}
        />
      )}
    </>
  );
}

function Attendance({ attendance, sessions }: { attendance: AttendanceRecord[]; sessions: Session[] }) {
  const [filter, setFilter] = useState<"all" | AttendanceStatus>("all");
  const [sessionId, setSessionId] = useState<string>("all");

  const sessionLookup = useMemo(() => Object.fromEntries(sessions.map((s) => [s.id, s])), [sessions]);

  const filtered = useMemo(() => {
    return attendance.filter((record) => {
      const matchesStatus = filter === "all" || record.status === filter;
      const matchesSession = sessionId === "all" || record.sessionId === sessionId;
      return matchesStatus && matchesSession;
    });
  }, [attendance, filter, sessionId]);

  const counts = useMemo(() => {
    const base: Record<AttendanceStatus, number> = {
      present: 0,
      absent: 0,
      late: 0,
      injured: 0,
      excused: 0,
    };
    for (const record of attendance) base[record.status] += 1;
    return base;
  }, [attendance]);

  const attendanceRate = attendance.length
    ? Math.round(((counts.present + counts.late) / attendance.length) * 100)
    : 0;

  return (
    <>
      <section className="kpi-grid" aria-label="Attendance KPIs">
        <KpiCard label="Attendance rate" value={`${attendanceRate}%`} foot="Present or late, across tracked sessions" icon={CheckCircle2} />
        <KpiCard label="Present" value={counts.present} foot="On time or early" icon={CheckCircle2} />
        <KpiCard label="Late" value={counts.late} foot="Arrived after session start" icon={Clock} />
        <KpiCard label="Absent" value={counts.absent} foot="No show, follow up with parent" icon={AlertTriangle} />
      </section>
      <section className="panel player-table-card" aria-labelledby="attendance-title">
        <div className="toolbar">
          <div>
            <div className="page-kicker">Attendance</div>
            <h2 id="attendance-title" className="page-title">
              Session attendance log
            </h2>
          </div>
          <label className="search-field select-field">
            <span className="sr-only">Filter by session</span>
            <select
              data-testid="select-attendance-session"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
            >
              <option value="all">All sessions</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatShortDate(session.date)} · {session.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="filter-row" aria-label="Attendance status filters">
          {(["all", "present", "late", "absent", "injured", "excused"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-button ${filter === status ? "active" : ""}`}
              onClick={() => setFilter(status)}
              data-testid={`button-attendance-filter-${status}`}
            >
              {status === "all" ? "All" : status}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={32} aria-hidden="true" />
            <h3>No matching attendance records</h3>
            <p>Try a different session or status filter. Demo data includes a mix of present, late, absent, injured and excused.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Session</th>
                  <th>Status</th>
                  <th>Arrival</th>
                  <th>Parent notified</th>
                  <th>Coach notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const session = sessionLookup[record.sessionId];
                  return (
                    <tr key={record.id} data-testid={`row-attendance-${record.id}`}>
                      <td>
                        <div className="player-cell">
                          <span className="player-avatar">{initials(record.playerName)}</span>
                          <span>
                            <span className="player-name">{record.playerName}</span>
                            <span className="player-sub">{session?.ageGroup ?? ""} {session?.team ? `· ${session.team}` : ""}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>{session?.name ?? "Unknown session"}</strong>
                        <div className="player-sub">
                          {session ? `${formatShortDate(session.date)} · ${session.startTime}` : ""}
                        </div>
                      </td>
                      <td>
                        <AttendanceBadge status={record.status} />
                      </td>
                      <td>{record.arrivalTime || "—"}</td>
                      <td>
                        <span className={`status-pill ${record.parentNotified ? "notify-yes" : "notify-no"}`}>
                          {record.parentNotified ? "Notified" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <span className="notes-cell">{record.coachNotes || "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Payments({ payments }: { payments: Payment[] }) {
  const [filter, setFilter] = useState<"all" | PaymentStatus>("all");
  const [query, setQuery] = useState("");

  const totals = useMemo(() => {
    const totalDue = payments.reduce((sum, p) => sum + p.amountDue, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const overdue = payments.filter((p) => p.status === "overdue").length;
    const unpaid = payments.filter((p) => p.status === "unpaid" || p.status === "part-paid").length;
    return { totalDue, totalPaid, balance: totalDue - totalPaid, overdue, unpaid };
  }, [payments]);

  const filtered = useMemo(() => {
    return payments.filter((payment) => {
      const matchesFilter = filter === "all" || payment.status === filter;
      const matchesQuery = `${payment.playerName} ${payment.description} ${payment.paymentType}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, payments, query]);

  return (
    <>
      <section className="payments-callout" role="note" aria-label="Payments safety note">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <strong>Tracking-only demo — no card or bank details should be stored in Airtable.</strong>
          <p>
            Grass2Pro does not process payments in this dashboard. Record amounts due, amounts paid, and a reference link to your external payment provider. Never save card numbers, CVVs, full bank details or any raw PCI data in Airtable.
          </p>
        </div>
      </section>
      <section className="kpi-grid" aria-label="Payments KPIs">
        <KpiCard label="Total due" value={formatCurrency(totals.totalDue)} foot="Sum of amounts due in demo data" icon={PoundSterling} />
        <KpiCard label="Total paid" value={formatCurrency(totals.totalPaid)} foot="Amounts marked as received" icon={Banknote} />
        <KpiCard label="Balance" value={formatCurrency(totals.balance)} foot="Outstanding across players" icon={ClipboardCheck} />
        <KpiCard label="Overdue" value={totals.overdue} foot={`${totals.unpaid} unpaid / part-paid`} icon={AlertTriangle} />
      </section>
      <section className="panel player-table-card" aria-labelledby="payments-title">
        <div className="toolbar">
          <div>
            <div className="page-kicker">Payments</div>
            <h2 id="payments-title" className="page-title">
              Subscription &amp; fee tracking
            </h2>
          </div>
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search payments</span>
            <input
              data-testid="input-search-payments"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player, fee or type"
            />
          </label>
        </div>
        <div className="filter-row" aria-label="Payment status filters">
          {(["all", "paid", "unpaid", "overdue", "part-paid", "waived"] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-button ${filter === status ? "active" : ""}`}
              onClick={() => setFilter(status)}
              data-testid={`button-payment-filter-${status}`}
            >
              {status === "all" ? "All" : paymentLabel[status]}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <PoundSterling size={32} aria-hidden="true" />
            <h3>No matching payment records</h3>
            <p>Try a different status or search. Payment tracking is demo data only.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Fee</th>
                  <th>Due</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Type / Link</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => {
                  const balance = payment.amountDue - payment.amountPaid;
                  return (
                    <tr key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <td>
                        <div className="player-cell">
                          <span className="player-avatar">{initials(payment.playerName)}</span>
                          <span className="player-name">{payment.playerName}</span>
                        </div>
                      </td>
                      <td>{payment.description}</td>
                      <td>{formatCurrency(payment.amountDue)}</td>
                      <td>{formatCurrency(payment.amountPaid)}</td>
                      <td>
                        <strong>{formatCurrency(balance)}</strong>
                      </td>
                      <td>{formatShortDate(payment.dueDate)}</td>
                      <td>
                        <PaymentBadge status={payment.status} />
                      </td>
                      <td>
                        <div className="player-sub">{payment.paymentType}</div>
                        {payment.paymentLink ? (
                          <a
                            className="payment-link"
                            href={payment.paymentLink}
                            target="_blank"
                            rel="noreferrer"
                            data-testid={`link-payment-${payment.id}`}
                          >
                            Tracking link
                          </a>
                        ) : (
                          <span className="player-sub">No link</span>
                        )}
                      </td>
                      <td>
                        <span className="notes-cell">{payment.notes}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Safeguarding({ players }: { players: Player[] }) {
  const limited = players.filter((player) => player.consentStatus === "amber");
  const redGrey = players.filter((player) => player.consentStatus === "red" || player.consentStatus === "grey");
  return (
    <section className="form-layout">
      <article className="panel hero-copy">
        <div className="page-kicker">Safeguarding tab</div>
        <h1 className="page-title">Limited consent &amp; restricted media use</h1>
        <p>
          Players below have parent consent on file but with channel limits. Use the allowed list when planning training photos, coach analysis clips or any public posting.
        </p>
        {limited.length === 0 ? (
          <article className="card mini-card" data-testid="empty-limited-consent">
            <ShieldCheck size={20} aria-hidden="true" />
            <h3>No limited consent players</h3>
            <p>Every player with consent on file is either fully cleared or has not yet been recorded. Check the follow-up queue for records still awaiting a parent form.</p>
          </article>
        ) : (
          <div className="cards-grid" data-testid="list-limited-consent">
            {limited.map((player) => {
              const allowed: string[] = [];
              const restricted: string[] = [];
              (player.photoConsent ? allowed : restricted).push("Photos during sessions");
              (player.matchPhotoConsent ? allowed : restricted).push("Photos during matches");
              (player.videoConsent ? allowed : restricted).push("Coaching video review");
              (player.matchVideoConsent ? allowed : restricted).push("Match video");
              (player.highlightsConsent ? allowed : restricted).push("Highlight clips");
              (player.websiteConsent ? allowed : restricted).push("Club website");
              (player.socialConsent ? allowed : restricted).push("Social media");
              return (
                <article className="card mini-card" key={player.id} data-testid={`card-limited-${player.id}`}>
                  <AlertTriangle size={20} aria-hidden="true" />
                  <h3>{player.name}</h3>
                  <ConsentBadge status={player.consentStatus} />
                  <p>
                    <strong>Allowed:</strong> {allowed.length === 0 ? "None — internal records only." : `${allowed.join(", ")}.`}
                  </p>
                  <p>
                    <strong>Restricted:</strong> {restricted.length === 0 ? "None." : `${restricted.join(", ")}.`}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </article>
      <aside className="summary-box">
        <h2>Media safety rules</h2>
        <p>Only authorised coaches and organisation-approved devices should capture or store player media. Changing rooms, toilets and first-aid areas are always blocked. Players without consent are still included in football activity; only media usage is restricted.</p>
        <h2>Follow-up queue</h2>
        {redGrey.length === 0 ? (
          <p>No consent records need immediate follow-up.</p>
        ) : (
          <div className="summary-list">
            {redGrey.map((player) => (
              <div className="summary-item" key={player.id}>
                <span>{player.name}</span>
                <ConsentBadge status={player.consentStatus} />
              </div>
            ))}
          </div>
        )}
      </aside>
    </section>
  );
}

const createInitialConsentForm = (): ConsentPayload => ({
  childName: "",
  childDateOfBirth: "",
  ageGroup: "",
  footballPathway: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  relationship: "",
  permissions: Object.fromEntries(permissionOptions.map((option) => [option.id, false])),
  infoSharing: Object.fromEntries(infoSharingOptions.map((option) => [option.id, false])),
  usageDetails:
    "Grass2Pro may use approved photos or videos for private coaching review, parent progress reports, controlled website pages, or agreed highlight clips depending on the permissions selected below.",
  storageDuration:
    "Media and consent records are reviewed at least yearly and normally retained for the current season plus one additional season unless safeguarding, legal or account requirements require a different period.",
  withdrawalProcessAcknowledged: false,
  childConsulted: false,
  parentalResponsibility: false,
  notes: "",
});

// Email/phone validation helpers. Kept deliberately permissive: the goal is to
// catch obvious typos (e.g. confirm-field mismatch, missing "@", phone with two
// digits) without rejecting legitimate UK formats. The server in
// netlify/functions/media-consent.mjs runs the same shape of checks so a
// determined caller can't bypass the UI.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_PATTERN.test(trimmed);
}

// Strip everything that isn't a digit or a leading "+" so two visually
// different but logically identical numbers (e.g. "07901 667878" and
// "07901667878") compare equal. UK mobiles are 11 digits, international
// formats add a country code, so 10-15 digits covers the realistic range.
function normalisePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D+/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true; // optional field
  const digits = trimmed.replace(/\D+/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  // Reject characters that aren't part of common phone formatting.
  return /^[+()\-.\s\d]+$/.test(trimmed);
}

type ConsentFormErrors = {
  childDateOfBirth?: string;
  parentEmail?: string;
  parentEmailConfirm?: string;
  parentPhone?: string;
  parentPhoneConfirm?: string;
};

// Renders today's date in YYYY-MM-DD form for the date input's `max` attribute
// so a parent can't pick a future birthday.
function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Date of birth must be a real, past date. We classify the value so the form
// can surface a parent-friendly message for the specific failure (empty,
// future or otherwise unparseable) and decide when it is safe to submit or
// echo into the record summary.
type DateOfBirthState = "empty" | "future" | "invalid" | "valid";

function classifyDateOfBirth(value: string): DateOfBirthState {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return "invalid";
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "invalid";
  const todayUtc = new Date(`${todayIsoDate()}T00:00:00Z`);
  if (parsed.getTime() > todayUtc.getTime()) return "future";
  return "valid";
}

function dateOfBirthErrorFor(state: DateOfBirthState): string | undefined {
  if (state === "empty") return "Enter the player's date of birth.";
  if (state === "future") return "Player date of birth cannot be in the future.";
  if (state === "invalid") return "Enter a valid date of birth.";
  return undefined;
}

function ConsentForm() {
  const [form, setForm] = useState<ConsentPayload>(createInitialConsentForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  // Confirm fields are UI-only. They guard against typos in the contact
  // details but are never sent to the API or stored in Airtable — the parent
  // email/phone the audit trail keeps is the original field.
  const [parentEmailConfirm, setParentEmailConfirm] = useState("");
  const [parentPhoneConfirm, setParentPhoneConfirm] = useState("");
  const [errors, setErrors] = useState<ConsentFormErrors>({});

  const update = (key: keyof ConsentPayload, value: string | boolean | Record<string, boolean>) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "childDateOfBirth") {
      const state = classifyDateOfBirth(String(value));
      // Stay quiet while the field is empty so the parent does not see an
      // error before they have had a chance to type. Future/invalid values
      // get an immediate red border and message; valid past dates clear it.
      if (state === "empty" || state === "valid") {
        clearError("childDateOfBirth");
      } else {
        const liveError = dateOfBirthErrorFor(state);
        if (liveError) setError("childDateOfBirth", liveError);
      }
    }
    if (key === "parentEmail") {
      syncConfirmError(
        "parentEmailConfirm",
        parentEmailConfirm,
        value as string,
        normaliseEmail,
        "Emails do not match.",
      );
    }
    if (key === "parentPhone") {
      syncConfirmError(
        "parentPhoneConfirm",
        parentPhoneConfirm,
        value as string,
        normalisePhone,
        "Phone numbers do not match.",
      );
    }
  };

  function clearError(key: keyof ConsentFormErrors) {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function setError(key: keyof ConsentFormErrors, message: string) {
    setErrors((current) => {
      if (current[key] === message) return current;
      return { ...current, [key]: message };
    });
  }

  // Live-sync the confirm-field error state. If the confirm field is empty we
  // stay quiet (no noisy error before the parent has had a chance to type).
  // Otherwise we show the mismatch error immediately so the red border and
  // message track keystrokes in either field.
  function syncConfirmError(
    key: "parentEmailConfirm" | "parentPhoneConfirm",
    confirmValue: string,
    originalValue: string,
    normalise: (value: string) => string,
    mismatchMessage: string,
  ) {
    if (confirmValue.length === 0) {
      clearError(key);
      return;
    }
    if (normalise(originalValue) === normalise(confirmValue)) {
      clearError(key);
    } else {
      setError(key, mismatchMessage);
    }
  }

  function onParentEmailConfirmChange(value: string) {
    setParentEmailConfirm(value);
    syncConfirmError("parentEmailConfirm", value, form.parentEmail, normaliseEmail, "Emails do not match.");
  }

  function onParentPhoneConfirmChange(value: string) {
    setParentPhoneConfirm(value);
    syncConfirmError("parentPhoneConfirm", value, form.parentPhone, normalisePhone, "Phone numbers do not match.");
  }

  const emailConfirmMatches =
    parentEmailConfirm.length > 0 &&
    isValidEmail(form.parentEmail) &&
    normaliseEmail(form.parentEmail) === normaliseEmail(parentEmailConfirm);
  const phoneConfirmMatches =
    parentPhoneConfirm.length > 0 &&
    form.parentPhone.trim().length > 0 &&
    isValidPhone(form.parentPhone) &&
    normalisePhone(form.parentPhone) === normalisePhone(parentPhoneConfirm);

  function validateContactDetails(): ConsentFormErrors {
    const next: ConsentFormErrors = {};
    if (!isValidEmail(form.parentEmail)) {
      next.parentEmail = "Enter a valid email address.";
    }
    if (normaliseEmail(form.parentEmail) !== normaliseEmail(parentEmailConfirm)) {
      next.parentEmailConfirm = "Emails do not match.";
    }
    if (!isValidPhone(form.parentPhone)) {
      next.parentPhone = "Enter a phone number with 10-15 digits (spaces, +, brackets and hyphens are fine).";
    }
    if (normalisePhone(form.parentPhone) !== normalisePhone(parentPhoneConfirm)) {
      next.parentPhoneConfirm = "Phone numbers do not match.";
    }
    return next;
  }

  const dobState = classifyDateOfBirth(form.childDateOfBirth);
  const dobIsValid = dobState === "valid";
  const selectedCount = Object.values(form.permissions).filter(Boolean).length;
  const infoSharingCount = Object.values(form.infoSharing).filter(Boolean).length;
  // Active only when every media permission the form exposes is granted. A
  // partial grant is Limited consent; nothing ticked records no media consent.
  // Information-sharing toggles do not influence this status.
  const mediaStatusLabel =
    selectedCount === 0
      ? "No media consent"
      : selectedCount < permissionOptions.length
        ? "Limited consent"
        : "Active consent";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.childName || !form.parentName || !form.parentEmail || !form.parentalResponsibility || !form.withdrawalProcessAcknowledged) {
      setStatus("error");
      setErrors({});
      setMessage("Please complete the required child, parent and acknowledgement fields before submitting.");
      return;
    }

    const dobState = classifyDateOfBirth(form.childDateOfBirth);
    const dobError = dateOfBirthErrorFor(dobState);
    const contactErrors = validateContactDetails();
    if (dobError) contactErrors.childDateOfBirth = dobError;
    if (Object.keys(contactErrors).length > 0) {
      setStatus("error");
      setErrors(contactErrors);
      setMessage(
        dobError
          ? dobState === "empty"
            ? "Please add the player's date of birth before submitting."
            : "Please fix the highlighted player date of birth before submitting."
          : "Please fix the highlighted contact details before submitting.",
      );
      return;
    }
    setErrors({});
    setStatus("submitting");

    try {
      await submitConsent(form);
      setStatus("success");
      setMessage("Thank you, consent record submitted.");
      setForm(createInitialConsentForm());
      setParentEmailConfirm("");
      setParentPhoneConfirm("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Consent submission failed.");
    }
  }

  return (
    <section className="form-layout" aria-labelledby="consent-title">
      <form className="consent-form" onSubmit={onSubmit}>
        <div>
          <div className="page-kicker">Parent safeguarding consent</div>
          <h1 id="consent-title" className="page-title">
            Media consent form
          </h1>
          <p>
            Capture granular parent permissions for photo, video and usage channels, plus information-sharing permissions for emergency contact and medical details. Consent can be withdrawn later and the club keeps an audit record.
          </p>
        </div>

        <section className="form-section">
          <h2>Child and parent details</h2>
          <div className="form-grid form-grid--paired">
            <div className="form-pair">
              <label className="form-field">
                <span>Child full name *</span>
                <input value={form.childName} onChange={(event) => update("childName", event.target.value)} data-testid="input-child-name" />
              </label>
              <label className="form-field">
                <span>Player date of birth *</span>
                <input
                  type="date"
                  value={form.childDateOfBirth}
                  onChange={(event) => update("childDateOfBirth", event.target.value)}
                  max={todayIsoDate()}
                  aria-invalid={Boolean(errors.childDateOfBirth)}
                  data-testid="input-child-dob"
                />
                {errors.childDateOfBirth ? (
                  <span className="field-error" role="alert" data-testid="error-child-dob">
                    {errors.childDateOfBirth}
                  </span>
                ) : (
                  <span className="field-help">Used to set the child&apos;s age group automatically. Stored once on the player record.</span>
                )}
              </label>
            </div>
            <div className="form-pair">
              <label className="form-field">
                <span>Age group</span>
                <select value={form.ageGroup} onChange={(event) => update("ageGroup", event.target.value)} data-testid="select-age-group">
                  <option value="">Select age group</option>
                  <option value="U8">U8</option>
                  <option value="U9">U9</option>
                  <option value="U10">U10</option>
                  <option value="U11">U11</option>
                  <option value="U12">U12</option>
                  <option value="U13">U13</option>
                </select>
              </label>
              <label className="form-field">
                <span>Parent or guardian name *</span>
                <input value={form.parentName} onChange={(event) => update("parentName", event.target.value)} data-testid="input-parent-name" />
              </label>
            </div>
            <div className="form-pair">
              <label className="form-field">
                <span>Relationship</span>
                <input value={form.relationship} onChange={(event) => update("relationship", event.target.value)} data-testid="input-relationship" />
              </label>
              <label className="form-field">
                <span>Football pathway</span>
                <select
                  value={form.footballPathway}
                  onChange={(event) => update("footballPathway", event.target.value)}
                  data-testid="select-football-pathway"
                >
                  <option value="">Select pathway</option>
                  {footballPathwayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="field-help">
                  Where the child plays today. Coaches can update this later as a player progresses.
                </span>
              </label>
            </div>
            <div className="form-pair">
              <label className="form-field">
                <span>Email *</span>
                <input
                  type="email"
                  value={form.parentEmail}
                  onChange={(event) => update("parentEmail", event.target.value)}
                  aria-invalid={Boolean(errors.parentEmail)}
                  data-testid="input-parent-email"
                />
                {errors.parentEmail && (
                  <span className="field-error" role="alert" data-testid="error-parent-email">
                    {errors.parentEmail}
                  </span>
                )}
              </label>
              <label className="form-field">
                <span>Confirm email *</span>
                <input
                  type="email"
                  value={parentEmailConfirm}
                  onChange={(event) => onParentEmailConfirmChange(event.target.value)}
                  onPaste={(event) => event.preventDefault()}
                  aria-invalid={Boolean(errors.parentEmailConfirm)}
                  data-valid={emailConfirmMatches && !errors.parentEmailConfirm ? "true" : undefined}
                  autoComplete="off"
                  data-testid="input-parent-email-confirm"
                />
                {errors.parentEmailConfirm ? (
                  <span className="field-error" role="alert" data-testid="error-parent-email-confirm">
                    {errors.parentEmailConfirm}
                  </span>
                ) : emailConfirmMatches ? (
                  <span className="field-success" data-testid="success-parent-email-confirm">
                    Emails match.
                  </span>
                ) : null}
              </label>
            </div>
            <div className="form-pair">
              <label className="form-field">
                <span>Phone</span>
                <input
                  value={form.parentPhone}
                  onChange={(event) => update("parentPhone", event.target.value)}
                  inputMode="tel"
                  aria-invalid={Boolean(errors.parentPhone)}
                  data-testid="input-parent-phone"
                />
                {errors.parentPhone && (
                  <span className="field-error" role="alert" data-testid="error-parent-phone">
                    {errors.parentPhone}
                  </span>
                )}
              </label>
              <label className="form-field">
                <span>Confirm phone</span>
                <input
                  value={parentPhoneConfirm}
                  onChange={(event) => onParentPhoneConfirmChange(event.target.value)}
                  onPaste={(event) => event.preventDefault()}
                  inputMode="tel"
                  aria-invalid={Boolean(errors.parentPhoneConfirm)}
                  data-valid={phoneConfirmMatches && !errors.parentPhoneConfirm ? "true" : undefined}
                  autoComplete="off"
                  data-testid="input-parent-phone-confirm"
                />
                {errors.parentPhoneConfirm ? (
                  <span className="field-error" role="alert" data-testid="error-parent-phone-confirm">
                    {errors.parentPhoneConfirm}
                  </span>
                ) : phoneConfirmMatches ? (
                  <span className="field-success" data-testid="success-parent-phone-confirm">
                    Phone numbers match.
                  </span>
                ) : null}
              </label>
            </div>
          </div>
          <p className="field-help" data-testid="contact-details-note">
            We use these contact details for safeguarding, session administration and consent records. Promotional messages or app update announcements will use a separate opt-in.
          </p>
        </section>

        <section className="form-section">
          <h2>Photo and video permissions</h2>
          <p className="field-help">Select each specific media use the parent or guardian allows. Leaving all unchecked records no media permission.</p>
          <div className="checkbox-grid">
            {permissionOptions.map((option) => (
              <label className="checkbox-card" key={option.id}>
                <input
                  type="checkbox"
                  checked={form.permissions[option.id]}
                  onChange={(event) =>
                    update("permissions", {
                      ...form.permissions,
                      [option.id]: event.target.checked,
                    })
                  }
                  data-testid={`checkbox-permission-${option.id}`}
                />
                <span className="checkbox-copy">
                  <span>{option.label}</span>
                  <span className="field-help">{option.help}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Information sharing permissions</h2>
          <p className="field-help">These permissions are independent of media. They do not affect a player&apos;s media consent status, and leaving them unchecked never excludes a player from sessions.</p>
          <div className="checkbox-grid">
            {infoSharingOptions.map((option) => (
              <label className="checkbox-card" key={option.id}>
                <input
                  type="checkbox"
                  checked={form.infoSharing[option.id]}
                  onChange={(event) =>
                    update("infoSharing", {
                      ...form.infoSharing,
                      [option.id]: event.target.checked,
                    })
                  }
                  data-testid={`checkbox-info-sharing-${option.id}`}
                />
                <span className="checkbox-copy">
                  <span>{option.label}</span>
                  <span className="field-help">{option.help}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Usage, storage and withdrawal</h2>
          <label className="form-field full">
            <span>Usage details shown to parent</span>
            <textarea rows={4} value={form.usageDetails} onChange={(event) => update("usageDetails", event.target.value)} data-testid="textarea-usage-details" />
          </label>
          <label className="form-field full">
            <span>Storage duration</span>
            <textarea rows={3} value={form.storageDuration} onChange={(event) => update("storageDuration", event.target.value)} data-testid="textarea-storage-duration" />
          </label>
          <div className="checkbox-grid">
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={form.childConsulted}
                onChange={(event) => update("childConsulted", event.target.checked)}
                data-testid="checkbox-child-consulted"
              />
              <span className="checkbox-copy">
                <span>Child consulted</span>
                <span className="field-help">The child has been told what media may be captured and used.</span>
              </span>
            </label>
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={form.parentalResponsibility}
                onChange={(event) => update("parentalResponsibility", event.target.checked)}
                data-testid="checkbox-parental-responsibility"
              />
              <span className="checkbox-copy">
                <span>Parental responsibility *</span>
                <span className="field-help">The signer confirms they can provide consent for this child.</span>
              </span>
            </label>
            <label className="checkbox-card full">
              <input
                type="checkbox"
                checked={form.withdrawalProcessAcknowledged}
                onChange={(event) => update("withdrawalProcessAcknowledged", event.target.checked)}
                data-testid="checkbox-withdrawal-ack"
              />
              <span className="checkbox-copy">
                <span>Withdrawal process acknowledged *</span>
                <span className="field-help">
                  Consent can be withdrawn by contacting Grass2Pro. Grass2Pro will stop future use and remove stored media where practical, but already published online or printed media may be difficult to fully recall.
                </span>
                <span className="field-help" data-testid="text-withdrawal-contact">
                  To withdraw consent, contact Grass2Pro at{" "}
                  <a href="mailto:cjones@grass2pro.com">cjones@grass2pro.com</a>.
                </span>
              </span>
            </label>
          </div>
          <label className="form-field full">
            <span>Safeguarding or consent notes</span>
            <textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} data-testid="textarea-notes" />
          </label>
        </section>

        {message && <div className={`message consent-form-message ${status === "success" ? "success" : "error"}`} data-testid="status-form-message">{message}</div>}

        <button
          className="primary-button"
          type="submit"
          disabled={status === "submitting" || !dobIsValid}
          data-testid="button-submit-consent"
        >
          {status === "submitting" ? "Submitting..." : "Submit consent record"}
        </button>
      </form>

      <aside className="summary-box" aria-label="Consent summary">
        <h2>Record summary</h2>
        <div className="summary-list">
          <div className="summary-item">
            <span>Child</span>
            <strong>{form.childName || "Not entered"}</strong>
          </div>
          <div className="summary-item">
            <span>Date of birth</span>
            <strong data-testid="summary-child-dob">
              {dobIsValid
                ? form.childDateOfBirth
                : dobState === "empty"
                  ? "Not entered"
                  : "Not valid"}
            </strong>
          </div>
          <div className="summary-item">
            <span>Parent</span>
            <strong>{form.parentName || "Not entered"}</strong>
          </div>
          <div className="summary-item">
            <span>Media permissions</span>
            <strong>{selectedCount}</strong>
          </div>
          <div className="summary-item">
            <span>Information sharing</span>
            <strong>{infoSharingCount}</strong>
          </div>
          <div className="summary-item">
            <span>Media status</span>
            <strong>{mediaStatusLabel}</strong>
          </div>
        </div>
        <p>
          We store the submitted timestamp, signer details, selected media permissions, information-sharing choices, storage period and withdrawal state for safeguarding and consent records.
        </p>
      </aside>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="content" aria-live="polite" aria-busy="true">
      <div className="hero-panel">
        <div className="panel skeleton" style={{ minHeight: "16rem" }} />
        <div className="panel skeleton" style={{ minHeight: "16rem" }} />
      </div>
      <div className="kpi-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="kpi-card skeleton" style={{ minHeight: "8rem" }} key={item} />
        ))}
      </div>
    </div>
  );
}

// ----- Public parent-facing pages -----
//
// These pages render OUTSIDE the coach dashboard shell. The router is
// intentionally string-matching window.location.pathname instead of pulling
// in react-router — we only have three routes and the SPA fallback in
// netlify.toml already serves index.html for any unknown path. Each page
// owns its own data fetching, error handling and styling so a parent
// landing on a stale link sees a clear, friendly message rather than the
// dashboard.

type PublicRoute =
  | { kind: "pathway"; token: string }
  | { kind: "leave"; token: string }
  | { kind: "erasure" };

function resolvePublicRoute(): PublicRoute | null {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname || "";
  const pathwayMatch = /^\/pathway\/([A-Za-z0-9._-]+)\/?$/.exec(path);
  if (pathwayMatch) return { kind: "pathway", token: pathwayMatch[1] };
  const leaveMatch = /^\/leave\/([A-Za-z0-9._-]+)\/?$/.exec(path);
  if (leaveMatch) return { kind: "leave", token: leaveMatch[1] };
  if (/^\/erasure\/?$/.test(path)) return { kind: "erasure" };
  return null;
}

function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-page">
      <header className="public-page-header">
        <span className="public-page-brand">Grass2Pro</span>
      </header>
      <main className="public-page-main">
        <div className="public-page-card panel">{children}</div>
      </main>
      <footer className="public-page-footer">
        <span>Grass2Pro · Grassroots football coaching</span>
      </footer>
    </div>
  );
}

function PathwayUpdatePage({ token }: { token: string }) {
  type Summary = { childName: string; ageGroup: string; team: string; currentPathway: string };
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState("");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch(apiPath(`/pathway-update?token=${encodeURIComponent(token)}`))
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((body as { error?: string }).error || "This link is no longer valid.");
        }
        if (!mounted) return;
        setSummary(body as Summary);
        setValue((body as Summary).currentPathway || "");
      })
      .catch((err) => {
        if (mounted) setLoadError(err instanceof Error ? err.message : "This link is no longer valid.");
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value) {
      setError("Please choose one option.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(apiPath(`/pathway-update?token=${encodeURIComponent(token)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Could not save your choice.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your choice.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <PublicPageShell>
        <h1>Link no longer valid</h1>
        <p>{loadError}</p>
        <p className="player-sub">Please ask your coach to send a fresh link.</p>
      </PublicPageShell>
    );
  }

  if (!summary) {
    return (
      <PublicPageShell>
        <p>Loading…</p>
      </PublicPageShell>
    );
  }

  if (done) {
    return (
      <PublicPageShell>
        <h1>Thank you</h1>
        <p>We've recorded the football pathway for <strong>{summary.childName}</strong>.</p>
        <p className="player-sub">You can close this page now.</p>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <div className="page-kicker">Football pathway</div>
      <h1>Update {summary.childName}'s football pathway</h1>
      <p>
        {summary.team ? <>Squad: <strong>{summary.team}</strong>{summary.ageGroup ? ` · ${summary.ageGroup}` : ""}<br /></> : null}
        Choose the option that best describes your child's football today. Your coach uses this to
        plan sessions and to support the right development pathway.
      </p>
      <form className="form-section" onSubmit={submit}>
        <fieldset className="public-radio-group">
          <legend className="sr-only">Football pathway options</legend>
          {footballPathwayOptions.map((option) => (
            <label key={option.value} className="public-radio-option">
              <input
                type="radio"
                name="pathway"
                value={option.value}
                checked={value === option.value}
                onChange={() => setValue(option.value)}
              />
              <span>
                <strong>{option.label}</strong>
                <span className="player-sub">{option.help}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {error && <div className="message error">{error}</div>}
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Saving…" : "Save pathway"}
        </button>
      </form>
    </PublicPageShell>
  );
}

function LeaveRequestPage({ token }: { token: string }) {
  type Summary = { childName: string; ageGroup: string; team: string };
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch(apiPath(`/leave-request?token=${encodeURIComponent(token)}`))
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((body as { error?: string }).error || "This link is no longer valid.");
        }
        if (!mounted) return;
        setSummary(body as Summary);
      })
      .catch((err) => {
        if (mounted) setLoadError(err instanceof Error ? err.message : "This link is no longer valid.");
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason) {
      setError("Please pick a reason.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(apiPath(`/leave-request?token=${encodeURIComponent(token)}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, notes }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Could not send your request.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <PublicPageShell>
        <h1>Link no longer valid</h1>
        <p>{loadError}</p>
        <p className="player-sub">Please ask your coach to send a fresh link.</p>
      </PublicPageShell>
    );
  }

  if (!summary) {
    return (
      <PublicPageShell>
        <p>Loading…</p>
      </PublicPageShell>
    );
  }

  if (done) {
    return (
      <PublicPageShell>
        <h1>You're done</h1>
        <p>
          <strong>{summary.childName}</strong> has been removed from the squad and your coach has been
          notified. You don't need to do anything else.
        </p>
        <p className="player-sub">
          If you also want your child's personal data deleted from the club records, please use the
          {" "}<a href="/erasure">data erasure form</a>.
        </p>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <div className="page-kicker">Leave squad</div>
      <h1>Move on from this squad</h1>
      <p>
        {summary.team ? <>Squad: <strong>{summary.team}</strong>{summary.ageGroup ? ` · ${summary.ageGroup}` : ""}<br /></> : null}
        Submitting this form removes <strong>{summary.childName}</strong> from the squad. Your coach
        will be notified automatically — you don't need to message them. This form does
        {" "}<strong>not</strong> delete personal data; use the data erasure form for that.
      </p>
      <form className="form-section" onSubmit={submit}>
        <label className="form-field full">
          <span>Reason for leaving</span>
          <select value={reason} onChange={(event) => setReason(event.target.value)} required>
            <option value="">Choose a reason…</option>
            {LEAVE_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="form-field full">
          <span>Anything else (optional)</span>
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. moving to a new area in June, joined another club, etc."
          />
        </label>
        {error && <div className="message error">{error}</div>}
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Sending…" : "Confirm and leave squad"}
        </button>
      </form>
    </PublicPageShell>
  );
}

function ErasureRequestPage() {
  const [childName, setChildName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!childName.trim()) {
      setError("Please enter the child's full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(apiPath("/erasure-request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childName: childName.trim(), parentEmail: parentEmail.trim(), notes: notes.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Could not send your request.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <PublicPageShell>
        <h1>Request received</h1>
        <p>
          Thanks. Your erasure request has been logged for the coach to review. Under UK GDPR we
          must verify the request before deleting personal data, so the coach will contact you to
          confirm before any data is removed.
        </p>
        <p className="player-sub">You can close this page now.</p>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <div className="page-kicker">Data erasure</div>
      <h1>Request deletion of your child's personal data</h1>
      <p>
        Use this form if you want us to delete your child's personal information from the Grass2Pro
        Coach Admin records. This is separate from leaving the squad — if you only want to stop
        coaching sessions, please use the move-on link your coach sent you instead.
      </p>
      <p className="player-sub">
        Under UK GDPR we'll review and verify your request before any data is removed. The coach
        will contact you to confirm before deletion.
      </p>
      <form className="form-section" onSubmit={submit}>
        <label className="form-field full">
          <span>Child's full name</span>
          <input
            type="text"
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label className="form-field full">
          <span>Your email address</span>
          <input
            type="email"
            value={parentEmail}
            onChange={(event) => setParentEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="form-field full">
          <span>Anything else (optional)</span>
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Any additional context that helps us verify or action the request."
          />
        </label>
        {error && <div className="message error">{error}</div>}
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Sending…" : "Send erasure request"}
        </button>
      </form>
    </PublicPageShell>
  );
}

function App() {
  // Public parent-facing pages live under SPA paths and bypass the dashboard
  // shell entirely. We resolve them from window.location once at mount; the
  // pages themselves do not need React Router and never render any of the
  // coach dashboard chrome (sidebar, topbar, KPIs).
  const publicRoute = useMemo(() => resolvePublicRoute(), []);

  const [data, setData] = useState<AdminData | null>(null);
  const [activeView, setActiveView] = useState("overview");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (publicRoute) return; // public pages don't need the admin dataset
    let mounted = true;
    loadAdminData().then((payload) => {
      if (mounted) setData(payload);
    });
    return () => {
      mounted = false;
    };
  }, [publicRoute]);

  // Splice an updated player back into the admin dataset without reloading
  // everything. Used by inline pathway edits, mark-as-left and the action
  // needed card so the UI reacts immediately to a successful PATCH.
  function applyPlayerUpdate(updated: Player) {
    setData((prev) => {
      if (!prev) return prev;
      const players = prev.players.map((p) => (p.id === updated.id ? updated : p));
      return { ...prev, players };
    });
  }

  if (publicRoute?.kind === "pathway") {
    return <PathwayUpdatePage token={publicRoute.token} />;
  }
  if (publicRoute?.kind === "leave") {
    return <LeaveRequestPage token={publicRoute.token} />;
  }
  if (publicRoute?.kind === "erasure") {
    return <ErasureRequestPage />;
  }

  if (!data) return <LoadingState />;

  const title = {
    overview: "Overview",
    players: "Players",
    sessions: "Sessions",
    attendance: "Attendance",
    safeguarding: "Safeguarding",
    payments: "Payments",
    consent: "Consent Form",
  }[activeView] ?? "Overview";

  return (
    <div className="app-shell">
      <Sidebar
        sidebar={data.sidebar}
        activeView={activeView}
        onViewChange={setActiveView}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-area" id="main-content">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <button className="icon-button mobile-menu" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" data-testid="button-open-sidebar">
              <Menu size={18} />
            </button>
            <div>
              <div className="page-kicker">Coach workspace</div>
              <div className="page-title" style={{ fontSize: "var(--text-lg)" }}>
                {title}
              </div>
            </div>
          </div>
          <div className="top-actions">
            <CoachPill coach={data.coach} />
            <button
              type="button"
              className="theme-toggle"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <div className="content">
          {activeView === "overview" && (
            <Overview
              data={data}
              onJumpToPlayers={() => setActiveView("players")}
              onPlayerUpdate={applyPlayerUpdate}
            />
          )}
          {activeView === "players" && (
            <PlayerList players={data.players} onPlayerUpdate={applyPlayerUpdate} />
          )}
          {activeView === "sessions" && <Sessions sessions={data.sessions} players={data.players} />}
          {activeView === "attendance" && <Attendance attendance={data.attendance} sessions={data.sessions} />}
          {activeView === "safeguarding" && <Safeguarding players={data.players} />}
          {activeView === "payments" && <Payments payments={data.payments} />}
          {activeView === "consent" && <ConsentForm />}
        </div>
      </main>
    </div>
  );
}

export default App;
