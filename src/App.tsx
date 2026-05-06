import {
  AlertTriangle,
  Ban,
  Banknote,
  Bell,
  BellOff,
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  Home,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Pencil,
  Plus,
  PoundSterling,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { PushCapability, PushSubscriptionRow } from "./lib/pushClient";
import {
  getPushCapability,
  listPushSubscriptions,
  subscribeToPush,
  unsubscribeFromPush,
  updatePushPrefs,
} from "./lib/pushClient";

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

// Pitch surface options. Title Case to match the Airtable singleSelect.
type PitchType = "Astro 4G" | "Grass";
const PITCH_TYPES: readonly PitchType[] = ["Astro 4G", "Grass"];

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
  pitchType?: PitchType | "";
  sessionFee?: number | null;
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

// Map each pathway option to a semantic tone. Three teal shades show the
// active pathways; "not currently with a team" gets warning amber as a soft
// nudge to follow up; "other / unsure" stays neutral.
function pathwayToneFor(value: string):
  | "pathway-1"
  | "pathway-2"
  | "pathway-3"
  | "warning"
  | "neutral" {
  switch (value) {
    case "Grassroots Football":
      return "pathway-1";
    case "Academy Football":
      return "pathway-2";
    case "School Football":
      return "pathway-3";
    case "Not Currently With a Team":
      return "warning";
    default:
      return "neutral";
  }
}

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
    date: "2026-05-08",
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
    date: "2026-05-12",
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
    date: "2026-05-16",
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

async function reinstatePlayer(id: string): Promise<Player> {
  const data = await patchPlayerAction<{ player: Player }>({
    id,
    action: "reinstate",
  });
  return data.player;
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

// PATCH a session row in Airtable via /sessions?id=… The backend prepends an
// audit line to Session Notes whenever a real change is made. Returns the
// updated session so the caller can splice it into local state.
async function rescheduleSessionRequest(payload: {
  sessionId: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  coach?: string;
}): Promise<{ ok: true; session: Session } | { ok: false; message: string }> {
  if (!apiAvailable) {
    // No backend in local preview — fake a success so the modal flow still
    // closes. We'll never write demo notes from here.
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      ok: false,
      message: "Backend unavailable in demo mode — reschedule was not persisted.",
    };
  }
  const { sessionId, ...body } = payload;
  const response = await fetch(
    apiPath(`/sessions?id=${encodeURIComponent(sessionId)}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // Explicitly tag the op so the backend routes to handleReschedule even
      // after the edit op was added — belt-and-braces over the legacy default.
      body: JSON.stringify({ ...body, op: "reschedule" }),
    },
  );
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok && json.session) {
    return { ok: true, session: json.session as Session };
  }
  const message =
    (typeof json.error === "string" && json.error) ||
    (typeof json.message === "string" && (json.message as string)) ||
    "Reschedule failed.";
  return { ok: false, message };
}

// DELETE /sessions?id=… — backend flips Status to Cancelled and writes a
// tagged audit line into Session Notes. We never hard-delete so attendance
// history stays intact.
async function cancelSessionRequest(payload: {
  sessionId: string;
  reason?: string;
  detail?: string;
  coach?: string;
}): Promise<{ ok: true; session: Session } | { ok: false; message: string }> {
  if (!apiAvailable) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      ok: false,
      message: "Backend unavailable in demo mode — cancel was not persisted.",
    };
  }
  const { sessionId, ...body } = payload;
  const response = await fetch(
    apiPath(`/sessions?id=${encodeURIComponent(sessionId)}`),
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok && json.session) {
    return { ok: true, session: json.session as Session };
  }
  const message =
    (typeof json.error === "string" && json.error) ||
    (typeof json.message === "string" && (json.message as string)) ||
    "Cancel failed.";
  return { ok: false, message };
}

// PATCH /sessions — full-row edit. Sends every editable field; the backend
// only patches what changed and logs an audit line if a significant field
// (date/start/end/location/pitch type) was touched. Silent edits (name, team,
// age group, coach, fee, notes) save without a Notes line.
async function editSessionRequest(payload: {
  sessionId: string;
  name?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  pitchType?: PitchType | "";
  sessionFee?: number | "";
  ageGroup?: string;
  team?: string;
  coach?: string;
  notes?: string;
  coachActor?: string;
}): Promise<{ ok: true; session: Session } | { ok: false; message: string }> {
  if (!apiAvailable) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      ok: false,
      message: "Backend unavailable in demo mode — edit was not persisted.",
    };
  }
  const { sessionId, ...rest } = payload;
  const response = await fetch(
    apiPath(`/sessions?id=${encodeURIComponent(sessionId)}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, op: "edit" }),
    },
  );
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok && json.session) {
    return { ok: true, session: json.session as Session };
  }
  const baseMessage =
    (typeof json.error === "string" && json.error) ||
    (typeof json.message === "string" && (json.message as string)) ||
    "Edit failed.";
  const detail = typeof json.detail === "string" ? (json.detail as string) : undefined;
  return {
    ok: false,
    message: detail ? `${baseMessage} (${detail})` : baseMessage,
  };
}

// POST /sessions — quick-five create. Mirrors how a coach types a session in
// WhatsApp: Date / Start / End / Location / Fee. Everything else has sensible
// defaults on the server side.
async function createSessionRequest(payload: {
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  pitchType?: PitchType;
  sessionFee?: number;
  name?: string;
  ageGroup?: string;
  team?: string;
  coach?: string;
}): Promise<{ ok: true; session: Session } | { ok: false; message: string }> {
  if (!apiAvailable) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      ok: false,
      message: "Backend unavailable in demo mode — session was not created.",
    };
  }
  const response = await fetch(apiPath("/sessions"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok && json.session) {
    return { ok: true, session: json.session as Session };
  }
  const baseMessage =
    (typeof json.error === "string" && json.error) ||
    (typeof json.message === "string" && (json.message as string)) ||
    "Create session failed.";
  const detail = typeof json.detail === "string" ? (json.detail as string) : undefined;
  return {
    ok: false,
    message: detail ? `${baseMessage} (${detail})` : baseMessage,
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
  scheduled: "Upcoming",
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

type KpiTone =
  | "neutral"
  | "success"
  | "warning"
  | "attention"
  | "danger"
  | "pathway-1"
  | "pathway-2"
  | "pathway-3"
  | "media";

function KpiCard({
  label,
  value,
  foot,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  foot: string;
  icon: typeof Users;
  tone?: KpiTone;
}) {
  return (
    <article
      className="kpi-card"
      data-tone={tone}
      data-testid={`card-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
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
  const [reinstateBusyId, setReinstateBusyId] = useState<string | null>(null);

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

  async function handleReinstate(player: Player) {
    if (!onPlayerUpdate) return;
    const ok = window.confirm(
      `Reinstate ${player.name}? This clears any leave or erasure request and sets their status back to Active.`,
    );
    if (!ok) return;
    setReinstateBusyId(player.id);
    setAckError("");
    try {
      const updated = await reinstatePlayer(player.id);
      onPlayerUpdate(updated);
    } catch (err) {
      setAckError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setReinstateBusyId(null);
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
        <KpiCard label="Players" value={players.length} foot="Squad total" icon={Users} tone="neutral" />
        <KpiCard label="Full consent" value={fullConsent} foot="Photo, video and review ready" icon={CheckCircle2} tone="success" />
        <KpiCard label="Limited consent" value={limited} foot="Internal-only or channel limits" icon={AlertTriangle} tone="warning" />
        <KpiCard label="Not recorded" value={notRecorded} foot="Awaiting parent form" icon={ClipboardCheck} tone="attention" />
        <KpiCard label="Withdrawn" value={withdrawn} foot="Media usage blocked" icon={X} tone="danger" />
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
            tone={pathwayToneFor(entry.value)}
          />
        ))}
        {pathwayUnset > 0 && (
          <KpiCard
            label="Pathway not set"
            value={pathwayUnset}
            foot="Existing players awaiting a pathway choice"
            icon={ClipboardList}
            tone="neutral"
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
                    <>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleAcknowledge(player)}
                        disabled={ackBusyId === player.id || reinstateBusyId === player.id}
                        data-testid={`button-ack-leave-${player.id}`}
                      >
                        <Check size={14} aria-hidden="true" />
                        {ackBusyId === player.id ? "Saving…" : "Got it"}
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => handleReinstate(player)}
                        disabled={ackBusyId === player.id || reinstateBusyId === player.id}
                        data-testid={`button-reinstate-${player.id}`}
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                        {reinstateBusyId === player.id ? "Saving…" : "Reinstate"}
                      </button>
                    </>
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
                <div className="action-needed-side">
                  <span className="action-needed-meta">
                    {player.erasureRequestedAt
                      ? new Date(player.erasureRequestedAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                        })
                      : ""}
                  </span>
                  {onPlayerUpdate && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleReinstate(player)}
                      disabled={reinstateBusyId === player.id}
                      data-testid={`button-reinstate-erase-${player.id}`}
                    >
                      <RotateCcw size={14} aria-hidden="true" />
                      {reinstateBusyId === player.id ? "Saving…" : "Reinstate"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cards-grid">
        <article className="card mini-card" data-tone="media-lavender">
          <Camera size={20} aria-hidden="true" />
          <h3>Session photos</h3>
          <p>{(() => {
            const n = players.filter((player) => player.photoConsent).length;
            return n === 1
              ? "1 player allows photos during sessions."
              : `${n} players allow photos during sessions.`;
          })()}</p>
        </article>
        <article className="card mini-card" data-tone="media-plum">
          <Camera size={20} aria-hidden="true" />
          <h3>Match photos</h3>
          <p>{(() => {
            const n = players.filter((player) => player.matchPhotoConsent).length;
            return n === 1
              ? "1 player allows photos during matches."
              : `${n} players allow photos during matches.`;
          })()}</p>
        </article>
        <article className="card mini-card" data-tone="media-indigo">
          <Video size={20} aria-hidden="true" />
          <h3>Coaching video review</h3>
          <p>{(() => {
            const n = players.filter((player) => player.videoConsent).length;
            return n === 1
              ? "1 player has permission for training analysis footage."
              : `${n} players have permission for training analysis footage.`;
          })()}</p>
        </article>
        <article className="card mini-card" data-tone="media-violet">
          <Video size={20} aria-hidden="true" />
          <h3>Match video</h3>
          <p>{(() => {
            const n = players.filter((player) => player.matchVideoConsent).length;
            return n === 1
              ? "1 player allows match footage for coach analysis."
              : `${n} players allow match footage for coach analysis.`;
          })()}</p>
        </article>
        <article className="card mini-card" data-tone={needsAction === 0 ? "media-rest" : "attention"}>
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

// Per-row coach action menu. Parents handle most of their own admin via the
// upcoming parent dashboard; the only coach-facing action that lives here
// today is a quiet fallback to mark a player as Left when a parent told the
// coach in person. Already-Left players just show a disabled hint.
function PlayerRowActions({
  player,
  onRequestMarkLeft,
  onPlayerUpdate,
}: {
  player: Player;
  onRequestMarkLeft: (player: Player) => void;
  onPlayerUpdate?: (player: Player) => void;
}) {
  const [reinstating, setReinstating] = useState(false);
  const [reinstateError, setReinstateError] = useState("");

  async function handleReinstate() {
    if (!onPlayerUpdate) return;
    const ok = window.confirm(
      `Reinstate ${player.name}? This clears any leave or erasure request and sets their status back to Active.`,
    );
    if (!ok) return;
    setReinstating(true);
    setReinstateError("");
    try {
      const updated = await reinstatePlayer(player.id);
      onPlayerUpdate(updated);
    } catch (err) {
      setReinstateError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setReinstating(false);
    }
  }

  // A player who has left the squad (or whose parent has asked for erasure)
  // gets a Reinstate action right here on the Players list. This is the
  // natural home for it because the coach is already looking at the player
  // and can see the "LEFT THE SQUAD" tag. Works for both parent-initiated
  // and coach-initiated leavers.
  if (player.status === "Left" || player.erasureRequested) {
    if (!onPlayerUpdate) {
      return (
        <span className="player-sub player-row-actions-empty">
          Player has left the squad
        </span>
      );
    }
    return (
      <div className="player-row-actions">
        <button
          type="button"
          className="link-button"
          onClick={handleReinstate}
          disabled={reinstating}
          data-testid={`button-reinstate-row-${player.id}`}
        >
          <RotateCcw size={14} aria-hidden="true" />
          {reinstating ? "Saving…" : "Reinstate"}
        </button>
        {reinstateError && (
          <span className="player-sub pathway-inline-error" data-testid={`text-reinstate-error-${player.id}`}>
            {reinstateError}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="player-row-actions">
      <details className="player-row-overflow">
        <summary>More…</summary>
        <p className="player-sub player-row-overflow-hint">
          Parents can leave the squad themselves from their parent dashboard. Use this only if a parent told you in person.
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
    </div>
  );
}

// Coach-confirmed leaver modal. Reason is required; notes are optional and
// useful when "Other" is picked. The modal closes itself after a successful
// save and the parent splices the now-Left player back into state.
const LEAVE_REASONS = [
  "Moved Area",
  "Joined Another Club",
  "Finished Age Group",
  "Parent Request",
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
          { value: "all", label: "All", tone: "neutral" },
          { value: "green", label: "Full consent", tone: "success" },
          { value: "amber", label: "Limited consent", tone: "warning" },
          { value: "red", label: "Withdrawn", tone: "danger" },
          { value: "grey", label: "No consent", tone: "muted" },
        ] as const).map(({ value, label, tone }) => (
          <button
            key={value}
            type="button"
            className={`filter-button ${filter === value ? "active" : ""}`}
            data-filter-tone={tone}
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
                      <div className="player-cell" data-consent-tone={player.consentStatus}>
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
                        onRequestMarkLeft={setLeavingPlayer}
                        onPlayerUpdate={onPlayerUpdate}
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
                <div className="player-card-head" data-consent-tone={player.consentStatus}>
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
                    onRequestMarkLeft={setLeavingPlayer}
                    onPlayerUpdate={onPlayerUpdate}
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
  initialScanType = "Arrival",
  onClose,
}: {
  session: Session;
  players: Player[];
  // Coach can override in-dialog, but we pre-select the phase-appropriate
  // scan type so the most likely action is one tap away. Defaults to
  // Arrival for callers that don't pass a phase (e.g. tests).
  initialScanType?: QrCheckinScanType;
  onClose: () => void;
}) {
  const [playerId, setPlayerId] = useState<string>(players[0]?.id ?? "");
  const [scanType, setScanType] = useState<QrCheckinScanType>(initialScanType);
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

// Coach-side reschedule modal. Lets you change date / start / end / location
// on a session. The backend writes an audit line to Session Notes whenever
// something actually changes. We don’t allow editing past sessions — those
// are historical records and editing them would corrupt the timeline.
function RescheduleDialog({
  session,
  coachName,
  onClose,
  onSaved,
}: {
  session: Session;
  coachName?: string;
  onClose: () => void;
  onSaved: (session: Session) => void;
}) {
  const [date, setDate] = useState(session.date);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [location, setLocation] = useState(session.location);
  const [stage, setStage] = useState<"edit" | "saving" | "error">("edit");
  const [errorMessage, setErrorMessage] = useState("");

  const dirty =
    date !== session.date ||
    startTime !== session.startTime ||
    endTime !== session.endTime ||
    location !== session.location;

  // Quick-pick chips for common reschedule moves — “bump by a week” is by
  // far the most common ask after a rained-off training session.
  function bumpDateByDays(days: number) {
    const base = new Date(`${date || session.date}T00:00:00`);
    if (Number.isNaN(base.getTime())) return;
    base.setDate(base.getDate() + days);
    setDate(base.toISOString().slice(0, 10));
  }

  async function save() {
    setStage("saving");
    setErrorMessage("");
    const result = await rescheduleSessionRequest({
      sessionId: session.id,
      date,
      startTime,
      endTime,
      location,
      coach: coachName,
    });
    if (result.ok) {
      onSaved(result.session);
      return;
    }
    setErrorMessage(result.message);
    setStage("error");
  }

  return (
    <div className="qr-modal-backdrop" role="dialog" aria-modal="true" aria-label="Reschedule session">
      <div className="qr-modal panel">
        <div className="toolbar">
          <div>
            <div className="page-kicker">Reschedule</div>
            <h2 className="page-title" style={{ fontSize: "var(--text-lg)" }}>{session.name}</h2>
            <div className="player-sub">
              {formatDate(session.date)} · {session.startTime}–{session.endTime} · {session.location}
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close reschedule">
            <X size={18} />
          </button>
        </div>

        <div className="form-section">
          <div className="form-grid">
            <label className="form-field">
              <span>Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-reschedule-date"
              />
            </label>
            <label className="form-field">
              <span>Start time</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                data-testid="input-reschedule-start"
              />
            </label>
            <label className="form-field">
              <span>End time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                data-testid="input-reschedule-end"
              />
            </label>
            <label className="form-field full">
              <span>Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                data-testid="input-reschedule-location"
              />
            </label>
          </div>

          <div className="filter-row" aria-label="Quick date bumps" style={{ marginTop: "var(--space-3)" }}>
            <button type="button" className="filter-button" onClick={() => bumpDateByDays(1)}>+1 day</button>
            <button type="button" className="filter-button" onClick={() => bumpDateByDays(2)}>+2 days</button>
            <button type="button" className="filter-button" onClick={() => bumpDateByDays(7)}>+1 week</button>
            <button type="button" className="filter-button" onClick={() => bumpDateByDays(14)}>+2 weeks</button>
          </div>

          {stage === "error" && errorMessage && (
            <div className="message error" data-testid="status-reschedule-error" style={{ marginTop: "var(--space-3)" }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              className="primary-button"
              disabled={!dirty || stage === "saving"}
              onClick={save}
              data-testid="button-reschedule-save"
            >
              {stage === "saving" ? "Saving…" : "Save changes"}
            </button>
            <button type="button" className="filter-button" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cancel modal. Step 1: pick a reason chip (or type a custom one). Step 2:
// confirm — fires the DELETE → backend flips Status to Cancelled. Step 3: a
// gentle "Reschedule instead?" pill appears alongside Done so the coach can
// rescue the session without leaving the modal. The Reschedule pivot reuses
// the same RescheduleDialog the row's old pill used to open.
const CANCEL_REASON_CHIPS: { label: string; emoji: string }[] = [
  { label: "Bad weather", emoji: "\u{1F326}" },
  { label: "Not enough players", emoji: "\u{1F465}" },
  { label: "Emergency", emoji: "\u{1F6A8}" },
  { label: "Unforeseen circumstances", emoji: "\u{1F937}" },
];

function CancelSessionDialog({
  session,
  coachName,
  onClose,
  onCancelled,
  onPivotToReschedule,
}: {
  session: Session;
  coachName?: string;
  onClose: () => void;
  onCancelled: (session: Session) => void;
  onPivotToReschedule: (session: Session) => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [customDetail, setCustomDetail] = useState("");
  const [stage, setStage] = useState<"choose" | "submitting" | "done" | "error">("choose");
  const [errorMessage, setErrorMessage] = useState("");
  const [updatedSession, setUpdatedSession] = useState<Session | null>(null);

  const canSubmit = Boolean(reason || customDetail.trim());

  async function submit() {
    setStage("submitting");
    setErrorMessage("");
    const result = await cancelSessionRequest({
      sessionId: session.id,
      reason: reason || undefined,
      detail: customDetail.trim() || undefined,
      coach: coachName,
    });
    if (result.ok) {
      setUpdatedSession(result.session);
      onCancelled(result.session);
      setStage("done");
      return;
    }
    setErrorMessage(result.message);
    setStage("error");
  }

  return (
    <div className="qr-modal-backdrop" role="dialog" aria-modal="true" aria-label="Cancel session">
      <div className="qr-modal panel">
        <div className="toolbar">
          <div>
            <div className="page-kicker">
              {stage === "done" ? "Session cancelled" : "Cancel session"}
            </div>
            <h2 className="page-title" style={{ fontSize: "var(--text-lg)" }}>{session.name}</h2>
            <div className="player-sub">
              {formatDate(session.date)} · {session.startTime}–{session.endTime} · {session.location}
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {(stage === "choose" || stage === "submitting" || stage === "error") && (
          <div className="form-section">
            <h3>What happened?</h3>
            <div className="reason-chip-row" aria-label="Cancellation reason">
              {CANCEL_REASON_CHIPS.map(({ label, emoji }) => (
                <button
                  key={label}
                  type="button"
                  className={`reason-chip ${reason === label ? "active" : ""}`}
                  onClick={() => setReason(label)}
                  data-testid={`button-cancel-reason-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span aria-hidden="true">{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <label className="form-field full" style={{ marginTop: "var(--space-3)" }}>
              <span>Anything to add for parents? (optional)</span>
              <input
                type="text"
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                placeholder="e.g. pitch waterlogged, will reopen tomorrow"
                data-testid="input-cancel-detail"
              />
            </label>

            {stage === "error" && errorMessage && (
              <div className="message error" data-testid="status-cancel-error" style={{ marginTop: "var(--space-3)" }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
              <button
                type="button"
                className="primary-button danger"
                disabled={!canSubmit || stage === "submitting"}
                onClick={submit}
                data-testid="button-cancel-confirm"
              >
                {stage === "submitting" ? "Cancelling…" : "Confirm cancellation"}
              </button>
              <button type="button" className="filter-button" onClick={onClose}>
                Keep session
              </button>
            </div>
          </div>
        )}

        {stage === "done" && updatedSession && (
          <div className="form-section">
            <div className="message success" data-testid="status-cancel-done">
              Cancellation recorded. Parents linked to this session will see it as cancelled.
            </div>
            <div className="genie-row" aria-label="Reschedule instead">
              <div>
                <div className="page-kicker">Change of plan?</div>
                <strong>Reschedule instead</strong>
                <div className="player-sub">
                  Pick a new date — the cancellation note stays in history, the
                  session moves forward.
                </div>
              </div>
              <button
                type="button"
                className="reschedule-button genie"
                onClick={() => onPivotToReschedule(updatedSession)}
                data-testid="button-pivot-to-reschedule"
              >
                <CalendarClock size={16} aria-hidden="true" />
                <span>Reschedule</span>
              </button>
            </div>
            <button type="button" className="filter-button" onClick={onClose} style={{ marginTop: "var(--space-3)" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick-five create modal. Mirrors the shape of an actual coach scheduling
// message in WhatsApp: Date / Start / End / Location / Fee. Name is optional;
// if the coach leaves it blank the backend derives "<Weekday> training" so
// the row still has a sensible label.
function CreateSessionDialog({
  coachName,
  onClose,
  onCreated,
}: {
  coachName?: string;
  onClose: () => void;
  onCreated: (session: Session) => void;
}) {
  // Default to next Saturday — most coaches schedule weekend matches first.
  const defaultDate = useMemo(() => {
    const d = new Date();
    const offset = (6 - d.getDay() + 7) % 7 || 7; // 1–7 days forward
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }, []);

  const [name, setName] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("17:00");
  const [endTime, setEndTime] = useState("18:15");
  const [location, setLocation] = useState("");
  const [pitchType, setPitchType] = useState<PitchType | "">("");
  const [feeText, setFeeText] = useState("");
  const [stage, setStage] = useState<"edit" | "saving" | "error">("edit");
  const [errorMessage, setErrorMessage] = useState("");

  // Show the weekday under the date so coaches can sanity-check the day they
  // picked matches what they meant (e.g. Hope writes "Tuesday 5/5/2026").
  const weekdayLabel = useMemo(() => {
    if (!date) return "";
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { weekday: "long" });
  }, [date]);

  async function save() {
    setStage("saving");
    setErrorMessage("");
    const fee = feeText.trim() ? Number(feeText.trim()) : undefined;
    if (fee !== undefined && (!Number.isFinite(fee) || fee < 0)) {
      setErrorMessage("Session fee must be a positive number.");
      setStage("error");
      return;
    }
    const result = await createSessionRequest({
      name: name.trim() || undefined,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      location: location.trim() || undefined,
      pitchType: pitchType || undefined,
      sessionFee: fee,
      coach: coachName,
    });
    if (result.ok) {
      onCreated(result.session);
      return;
    }
    setErrorMessage(result.message);
    setStage("error");
  }

  return (
    <div className="qr-modal-backdrop" role="dialog" aria-modal="true" aria-label="Schedule a session">
      <div className="qr-modal panel">
        <div className="toolbar">
          <div>
            <div className="page-kicker">New session</div>
            <h2 className="page-title" style={{ fontSize: "var(--text-lg)" }}>Schedule a session</h2>
            <div className="player-sub">
              Quick five — just the basics. You can fine-tune later.
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="form-section">
          <div className="form-grid">
            <label className="form-field full">
              <span>Session name (optional)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tuesday training, U11 vs Riverside"
                data-testid="input-create-name"
              />
            </label>
            <label className="form-field">
              <span>Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-create-date"
              />
              {weekdayLabel && (
                <span className="field-hint" data-testid="text-create-weekday">
                  {weekdayLabel}
                </span>
              )}
            </label>
            <label className="form-field">
              <span>Start time</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                data-testid="input-create-start"
              />
            </label>
            <label className="form-field">
              <span>End time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                data-testid="input-create-end"
              />
            </label>
            <label className="form-field full">
              <span>Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Colindale Football Centre, Great Strand, NW9 5PE"
                data-testid="input-create-location"
              />
            </label>
            {/* Pitch surface — surfaces directly under Location because the */}
            {/* venue and the surface are usually decided together. Two-button */}
            {/* segmented control reads faster than a dropdown for two options. */}
            <div className="form-field full">
              <span>Pitch type</span>
              <div className="pitch-type-row" role="radiogroup" aria-label="Pitch type">
                {PITCH_TYPES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={pitchType === option}
                    className={`pitch-type-chip ${pitchType === option ? "active" : ""}`}
                    data-pitch={option === "Astro 4G" ? "astro" : "grass"}
                    onClick={() => setPitchType(pitchType === option ? "" : option)}
                    data-testid={`button-create-pitch-${option === "Astro 4G" ? "astro-4g" : "grass"}`}
                  >
                    <span aria-hidden="true" className="pitch-type-dot" />
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="form-field">
              <span>Session fee (£)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.50"
                min="0"
                value={feeText}
                onChange={(e) => setFeeText(e.target.value)}
                placeholder="e.g. 20"
                data-testid="input-create-fee"
              />
            </label>
          </div>

          {stage === "error" && errorMessage && (
            <div className="message error" data-testid="status-create-error" style={{ marginTop: "var(--space-3)" }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
            <button
              type="button"
              className="primary-button"
              disabled={!date || stage === "saving"}
              onClick={save}
              data-testid="button-create-save"
            >
              {stage === "saving" ? "Creating…" : "Schedule it"}
            </button>
            <button type="button" className="filter-button" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// EditSessionDialog — full-shape edit modal. Mirrors CreateSessionDialog's
// form-grid but pre-populated, and includes Team/AgeGroup/Coach/Notes which
// the quick-five creator omits. The backend (editSession in _airtable.mjs)
// only logs an audit line for *significant* fields (Date, Start, End,
// Location, Pitch Type) — silent for everything else. Notes here replace
// only the body of the notes field; existing audit lines are preserved by
// the backend so the audit trail is never wiped.
function EditSessionDialog({
  session,
  coachName,
  readOnly = false,
  onClose,
  onSaved,
}: {
  session: Session;
  coachName?: string;
  // When true the dialog opens in view-only mode — inputs disabled, no Save
  // button, header copy reframed as "Session details". Used for completed
  // and cancelled sessions so the audit trail stays intact.
  readOnly?: boolean;
  onClose: () => void;
  onSaved: (session: Session) => void;
}) {
  const [name, setName] = useState(session.name ?? "");
  const [date, setDate] = useState(session.date);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [location, setLocation] = useState(session.location ?? "");
  const [pitchType, setPitchType] = useState<PitchType | "">(session.pitchType ?? "");
  const [feeText, setFeeText] = useState(
    typeof session.sessionFee === "number" ? String(session.sessionFee) : "",
  );
  const [team, setTeam] = useState(session.team ?? "");
  const [ageGroup, setAgeGroup] = useState(session.ageGroup ?? "");
  const [coach, setCoach] = useState(session.coach ?? "");
  // Strip any leading audit lines from the editable notes body — those are
  // managed by the backend. The coach should only see / edit the prose part.
  const initialNotesBody = useMemo(() => {
    const raw = session.notes ?? "";
    const match = raw.match(/^((?:\[[^\]]+\]\n?)*)([\s\S]*)$/);
    return (match?.[2] ?? raw).replace(/^\n+/, "");
  }, [session.notes]);
  const [notes, setNotes] = useState(initialNotesBody);
  const [stage, setStage] = useState<"edit" | "saving" | "error">("edit");
  const [errorMessage, setErrorMessage] = useState("");

  const weekdayLabel = useMemo(() => {
    if (!date) return "";
    const d = new Date(`${date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { weekday: "long" });
  }, [date]);

  async function save() {
    setStage("saving");
    setErrorMessage("");
    const trimmedFee = feeText.trim();
    let feeForPayload: number | "" | undefined;
    if (trimmedFee === "") {
      feeForPayload = "";
    } else {
      const parsed = Number(trimmedFee);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setErrorMessage("Session fee must be a positive number.");
        setStage("error");
        return;
      }
      feeForPayload = parsed;
    }
    const result = await editSessionRequest({
      sessionId: session.id,
      name: name.trim(),
      date,
      startTime,
      endTime,
      location: location.trim(),
      pitchType,
      sessionFee: feeForPayload,
      team: team.trim(),
      ageGroup: ageGroup.trim(),
      coach: coach.trim(),
      notes,
      coachActor: coachName,
    });
    if (result.ok) {
      onSaved(result.session);
      return;
    }
    setErrorMessage(result.message);
    setStage("error");
  }

  return (
    <div
      className="qr-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={readOnly ? "View session details" : "Edit session"}
    >
      <div className="qr-modal panel">
        <div className="toolbar">
          <div>
            <div className="page-kicker">{readOnly ? "Session details" : "Edit session"}</div>
            <h2 className="page-title" style={{ fontSize: "var(--text-lg)" }}>{session.name}</h2>
            <div className="player-sub">
              {formatDate(session.date)} · {session.startTime}–{session.endTime} · {session.location}
            </div>
            {readOnly && (
              <div className="session-readonly-banner" data-testid="text-edit-readonly">
                Read-only — this session has {session.state === "cancelled" ? "been cancelled" : "ended"}.
                Audit trail is locked.
              </div>
            )}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={readOnly ? "Close session details" : "Close edit session"}
          >
            <X size={18} />
          </button>
        </div>

        <div className="form-section">
          {/* fieldset disables every input/textarea/button inside in one go
              when the session is read-only — keeps the markup clean and
              guarantees we can't forget a field. */}
          <fieldset
            disabled={readOnly}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
          <div className="form-grid">
            <label className="form-field full">
              <span>Session name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tuesday training, U11 vs Riverside"
                data-testid="input-edit-name"
              />
            </label>
            <label className="form-field">
              <span>Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-testid="input-edit-date"
              />
              {weekdayLabel && (
                <span className="field-hint" data-testid="text-edit-weekday">
                  {weekdayLabel}
                </span>
              )}
            </label>
            <label className="form-field">
              <span>Start time</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                data-testid="input-edit-start"
              />
            </label>
            <label className="form-field">
              <span>End time</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                data-testid="input-edit-end"
              />
            </label>
            <label className="form-field full">
              <span>Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Colindale Football Centre, Great Strand, NW9 5PE"
                data-testid="input-edit-location"
              />
            </label>
            <div className="form-field full">
              <span>Pitch type</span>
              <div className="pitch-type-row" role="radiogroup" aria-label="Pitch type">
                {PITCH_TYPES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={pitchType === option}
                    className={`pitch-type-chip ${pitchType === option ? "active" : ""}`}
                    data-pitch={option === "Astro 4G" ? "astro" : "grass"}
                    onClick={() => setPitchType(pitchType === option ? "" : option)}
                    data-testid={`button-edit-pitch-${option === "Astro 4G" ? "astro-4g" : "grass"}`}
                  >
                    <span aria-hidden="true" className="pitch-type-dot" />
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="form-field">
              <span>Session fee (£)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.50"
                min="0"
                value={feeText}
                onChange={(e) => setFeeText(e.target.value)}
                placeholder="e.g. 20"
                data-testid="input-edit-fee"
              />
            </label>
            <label className="form-field">
              <span>Team</span>
              <input
                type="text"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="e.g. Hounslow Lions"
                data-testid="input-edit-team"
              />
            </label>
            <label className="form-field">
              <span>Age group</span>
              <input
                type="text"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                placeholder="e.g. U11"
                data-testid="input-edit-age"
              />
            </label>
            <label className="form-field full">
              <span>Coach</span>
              <input
                type="text"
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
                placeholder="e.g. Hope Bouhe"
                data-testid="input-edit-coach"
              />
            </label>
            <label className="form-field full">
              <span>Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional — kit reminders, parking notes, etc."
                data-testid="input-edit-notes"
              />
              <span className="field-hint">
                Existing audit history (rescheduled / cancelled / edited tags) is kept automatically.
              </span>
            </label>
          </div>

          </fieldset>

          {stage === "error" && errorMessage && (
            <div className="message error" data-testid="status-edit-error" style={{ marginTop: "var(--space-3)" }}>
              {errorMessage}
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
            {readOnly ? (
              <button
                type="button"
                className="primary-button"
                onClick={onClose}
                data-testid="button-edit-close"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!date || stage === "saving"}
                  onClick={save}
                  data-testid="button-edit-save"
                >
                  {stage === "saving" ? "Saving…" : "Save changes"}
                </button>
                <button type="button" className="filter-button" onClick={onClose}>Cancel</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Derive what state a session should DISPLAY as. The raw `state` field is
// what the coach last recorded — if a session was cancelled, that always
// wins. Otherwise, once the session date is in the past, a still-scheduled
// session is treated as completed. The raw data isn’t mutated; this just
// shapes what the dashboard shows.
// How long after the official end time we keep the session "actionable" on
// the coach dashboard — the Departure QR + the QR fallback code stay
// available so coaches can still mark late pickups. After this window the
// row flips to a passive Completed.
const SESSION_GRACE_MS = 60 * 60 * 1000; // 1 hour
// How long *before* the official start time we open the Arrival QR. Gives
// parents who arrive a touch early a way to scan straight in.
const CHECKIN_OPEN_LEAD_MS = 30 * 60 * 1000; // 30 min
// How long *before* the official end time we flip the primary action from
// the green Arrival QR to the blue Departure QR. A 15-min overlap with the
// tail of the session catches parents who collect early.
const DEPARTURE_LEAD_MS = 15 * 60 * 1000; // 15 min

// Resolve the session's start timestamp from `${date}T${startTime}`. Returns
// null when either field is missing or unparseable.
function sessionStartsAt(session: Session): Date | null {
  if (!session.date || !/^\d{2}:\d{2}$/.test(session.startTime || "")) return null;
  const d = new Date(`${session.date}T${session.startTime}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Resolve the session's end timestamp from `${date}T${endTime}`. Returns
// null when either field is missing or unparseable.
function sessionEndsAt(session: Session): Date | null {
  if (!session.date || !/^\d{2}:\d{2}$/.test(session.endTime || "")) return null;
  const d = new Date(`${session.date}T${session.endTime}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Which check-in phase is the session in right now?
//   "arrival"   — start−30 min ≤ now < end−15 min   (green QR)
//   "departure" — end−15 min   ≤ now < end+60 min   (blue QR + fallback code)
//   "none"      — outside both windows
// Cancelled sessions never enter any phase.
type CheckinPhase = "none" | "arrival" | "departure";
function checkinPhase(session: Session, now: Date): CheckinPhase {
  if (session.state === "cancelled") return "none";
  const startsAt = sessionStartsAt(session);
  const endsAt = sessionEndsAt(session);
  if (!startsAt || !endsAt) return "none";
  const t = now.getTime();
  const arrivalOpens = startsAt.getTime() - CHECKIN_OPEN_LEAD_MS;
  const departureOpens = endsAt.getTime() - DEPARTURE_LEAD_MS;
  const departureCloses = endsAt.getTime() + SESSION_GRACE_MS;
  if (t < arrivalOpens) return "none";
  if (t < departureOpens) return "arrival";
  if (t < departureCloses) return "departure";
  return "none";
}

function derivedSessionState(session: Session, now: Date): SessionState {
  if (session.state === "cancelled" || session.state === "completed") {
    return session.state;
  }
  // Roll a still-scheduled session to Completed once its end time has
  // passed. We use the actual end timestamp (not just the calendar date) so
  // a session that finished earlier today doesn't keep showing as Upcoming
  // until midnight. If we don't have a reliable end time, fall back to the
  // "end of session day" cutoff so the row still flips at midnight.
  const endsAt = sessionEndsAt(session);
  if (endsAt) {
    return endsAt.getTime() <= now.getTime() ? "completed" : "scheduled";
  }
  // Fallback: no end time recorded — keep the date-only rule (anything
  // dated yesterday or earlier rolls to Completed).
  const sessionDay = new Date(`${session.date}T00:00:00`);
  const todayDay = new Date(now.toDateString());
  return sessionDay < todayDay ? "completed" : "scheduled";
}

function Sessions({
  sessions,
  players,
  coachName,
  onSessionUpdate,
  onSessionCreated,
}: {
  sessions: Session[];
  players: Player[];
  coachName?: string;
  onSessionUpdate: (session: Session) => void;
  onSessionCreated: (session: Session) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | SessionState>("all");
  // The QR check-in dialog — we capture both the session and which scan type
  // to pre-select. Phase "departure" → Departure tab pre-selected; otherwise
  // (arrival or fall-through) Arrival is the default.
  const [checkinSession, setCheckinSession] = useState<{
    session: Session;
    initialScanType: QrCheckinScanType;
  } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Session | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // Editable row — click anywhere on the session name cell opens this modal.
  const [editTarget, setEditTarget] = useState<Session | null>(null);

  // Tick every minute so a session that's mid-flight rolls to Completed the
  // moment its end time passes — without the coach having to refresh the
  // tab. We bump a counter to force the memo below to recompute.
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setClockTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Build a map of sessionId → derived state once per render so we never
  // disagree with ourselves between KPI counts, filter chips, row pills,
  // and row tone echoes. A session rolls to Completed once its end time has
  // passed (not just at midnight), so the badge stays accurate during the
  // evening after a 17:15–19:30 training has finished.
  const stateById = useMemo(() => {
    const now = new Date();
    const map = new Map<string, SessionState>();
    sessions.forEach((s) => map.set(s.id, derivedSessionState(s, now)));
    return map;
    // clockTick is intentionally a dep — it forces recompute every minute so
    // the badge flips without needing a network refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, clockTick]);
  const stateOf = (s: Session): SessionState => stateById.get(s.id) ?? s.state;

  // Map of sessionId → current check-in phase ("arrival" | "departure" |
  // "none"). Drives which QR button colour and label the row shows, and which
  // scan type the QR dialog pre-selects. Recomputed every minute.
  const phaseById = useMemo(() => {
    const now = new Date();
    const map = new Map<string, CheckinPhase>();
    sessions.forEach((s) => map.set(s.id, checkinPhase(s, now)));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, clockTick]);
  const phaseOf = (s: Session): CheckinPhase => phaseById.get(s.id) ?? "none";

  // The row shows action controls when either:
  //   1. the session is still officially scheduled (cancel, edit, etc.), OR
  //   2. it's inside an active check-in phase (arrival or departure window).
  const isActionable = (s: Session): boolean =>
    stateOf(s) === "scheduled" || phaseOf(s) !== "none";

  const upcoming = sessions.filter((s) => stateOf(s) === "scheduled").length;
  const completed = sessions.filter((s) => stateOf(s) === "completed").length;
  const cancelled = sessions.filter((s) => stateOf(s) === "cancelled").length;

  const filtered = useMemo(() => {
    return sessions
      .filter((s) => {
        const matchesFilter = filter === "all" || stateOf(s) === filter;
        const matchesQuery = `${s.name} ${s.team} ${s.ageGroup} ${s.location} ${s.coach}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesFilter && matchesQuery;
      })
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));
    // stateOf is derived from stateById; including stateById in deps keeps it stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, sessions, stateById]);

  return (
    <>
      <section className="kpi-grid" aria-label="Session KPIs">
        <KpiCard label="Upcoming" value={upcoming} foot="Sessions still to come" icon={CalendarDays} tone="media" />
        <KpiCard label="Completed" value={completed} foot="Recent sessions delivered" icon={CheckCircle2} tone="success" />
        <KpiCard label="Cancelled" value={cancelled} foot="Cancelled or rained off" icon={X} tone="attention" />
        <KpiCard label="Total tracked" value={sessions.length} foot="All session records" icon={ClipboardCheck} tone="neutral" />
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
          {([
            { value: "all", label: "All", tone: "neutral" },
            { value: "scheduled", label: "Upcoming", tone: "media-lavender" },
            { value: "completed", label: "Completed", tone: "success" },
            { value: "cancelled", label: "Cancelled", tone: "attention" },
          ] as const).map(({ value, label, tone }) => (
            <button
              key={value}
              type="button"
              className={`filter-button ${filter === value ? "active" : ""}`}
              data-filter-tone={tone}
              onClick={() => setFilter(value)}
              data-testid={`button-session-filter-${value}`}
            >
              {label}
            </button>
          ))}
          {/* Spacer pushes the Schedule CTA to the right edge of the filter row */}
          <div className="filter-row-spacer" aria-hidden="true" />
          <button
            type="button"
            className="schedule-session-button"
            onClick={() => setShowCreate(true)}
            data-testid="button-schedule-session"
          >
            <Plus size={16} aria-hidden="true" />
            <span>Schedule a session</span>
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={32} aria-hidden="true" />
            <h3>No matching sessions</h3>
            <p>Try a different search or status filter. Demo data includes upcoming, completed and cancelled records.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Session details</th>
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
                {filtered.map((session) => {
                  // A session is locked once it has officially ended
                  // (badge = Completed) or has been cancelled. The row
                  // becomes view-only — the pencil swaps to a padlock and
                  // tapping the name opens the dialog in read-only mode so
                  // the audit trail stays intact.
                  const rowState = stateOf(session);
                  const isLocked = rowState === "completed" || rowState === "cancelled";
                  return (
                  <tr key={session.id} data-testid={`row-session-${session.id}`}>
                    <td data-session-tone={rowState} className="session-name-cell" data-label="Session details">
                      <button
                        type="button"
                        className={`session-row-name-button ${isLocked ? "is-locked" : ""}`}
                        onClick={() => setEditTarget(session)}
                        aria-label={isLocked ? `View details for ${session.name}` : `Edit ${session.name}`}
                        data-testid={`button-edit-${session.id}`}
                      >
                        <span className="session-row-name-stack">
                          <span className="player-name" data-testid={`text-session-name-${session.id}`}>
                            {session.name}
                          </span>
                          <span className="player-sub">{session.ageGroup}</span>
                        </span>
                        {isLocked ? (
                          <Lock size={14} aria-hidden="true" className="session-row-name-pencil session-row-name-lock" />
                        ) : (
                          <Pencil size={14} aria-hidden="true" className="session-row-name-pencil" />
                        )}
                      </button>
                    </td>
                    <td data-label="Date & time">
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
                    <td data-label="Location">
                      <div className="inline-meta">
                        <MapPin size={14} aria-hidden="true" />
                        <span>{session.location}</span>
                      </div>
                      {session.pitchType ? (
                        <span
                          className="pitch-type-tag"
                          data-pitch={session.pitchType === "Astro 4G" ? "astro" : "grass"}
                          data-testid={`tag-pitch-${session.id}`}
                        >
                          <span aria-hidden="true" className="pitch-type-dot" />
                          {session.pitchType}
                        </span>
                      ) : null}
                    </td>
                    <td data-label="Team">
                      <strong>{session.team}</strong>
                      <div className="player-sub">{session.ageGroup}</div>
                    </td>
                    <td data-label="Coach">{session.coach}</td>
                    <td data-label="Type / Status">
                      <SessionStateBadge state={stateOf(session)} />
                      <div className="player-sub">{sessionTypeLabel[session.type]}</div>
                      {/* Phase-aware countdown beneath the badge.
                            arrival   → "Arrival QR open"   (until end−15)
                            departure → "Departure QR open" (until end+60)
                          The badge itself stays truthful (Completed once end
                          time passes); this small line tells the coach how
                          much actionable time remains. */}
                      {(() => {
                        const phase = phaseOf(session);
                        if (phase === "none") return null;
                        const endsAt = sessionEndsAt(session);
                        if (!endsAt) return null;
                        const closesAt =
                          phase === "arrival"
                            ? new Date(endsAt.getTime() - DEPARTURE_LEAD_MS)
                            : new Date(endsAt.getTime() + SESSION_GRACE_MS);
                        const hh = String(closesAt.getHours()).padStart(2, "0");
                        const mm = String(closesAt.getMinutes()).padStart(2, "0");
                        const label =
                          phase === "arrival" ? "Arrival QR open" : "Departure QR open";
                        return (
                          <div
                            className={`session-grace-countdown session-grace-countdown--${phase}`}
                            data-testid={`text-grace-countdown-${session.id}`}
                          >
                            {label} until {hh}:{mm}
                          </div>
                        );
                      })()}
                    </td>
                    <td data-label="Notes">
                      <span className="notes-cell">{session.notes}</span>
                    </td>
                    <td data-label="Check-in">
                      {isActionable(session) ? (
                        <div className="session-row-actions">
                          {/* Phase-aware primary action.
                                arrival   → green "Arrival check-in"
                                departure → blue "Departure check-in"
                                none      → no QR button (only Cancel,
                                            for sessions that haven't reached
                                            their arrival window yet) */}
                          {phaseOf(session) === "arrival" && (
                            <button
                              type="button"
                              className="qr-check-button qr-check-button--in"
                              onClick={() =>
                                setCheckinSession({ session, initialScanType: "Arrival" })
                              }
                              data-testid={`button-checkin-arrival-${session.id}`}
                            >
                              <QrCode size={16} aria-hidden="true" />
                              <span>Arrival check-in</span>
                            </button>
                          )}
                          {phaseOf(session) === "departure" && (
                            <button
                              type="button"
                              className="qr-check-button qr-check-button--out"
                              onClick={() =>
                                setCheckinSession({ session, initialScanType: "Departure" })
                              }
                              data-testid={`button-checkin-departure-${session.id}`}
                            >
                              <QrCode size={16} aria-hidden="true" />
                              <span>Departure check-in</span>
                            </button>
                          )}
                          {/* Cancel only makes sense before the session has
                              officially ended — once we're in the departure
                              window the session has already happened, so we
                              hide it. */}
                          {stateOf(session) === "scheduled" && (
                            <button
                              type="button"
                              className="cancel-session-button"
                              onClick={() => setCancelTarget(session)}
                              aria-label={`Cancel ${session.name}`}
                              data-testid={`button-cancel-${session.id}`}
                            >
                              <Ban size={16} aria-hidden="true" />
                              <span>Cancel</span>
                            </button>
                          )}
                          {/* Departure-window helper: surface the fallback
                              code so a parent whose phone can't read the QR
                              can still be checked out manually. */}
                          {phaseOf(session) === "departure" && (
                            <div
                              className="session-grace-hint session-grace-hint--out"
                              data-testid={`text-grace-${session.id}`}
                            >
                              <span className="session-grace-kicker">Departure window</span>
                              {session.qrFallbackCode ? (
                                <span className="session-grace-code">
                                  Late pickup code: <strong>{session.qrFallbackCode}</strong>
                                </span>
                              ) : (
                                <span className="session-grace-code">
                                  Open the QR check-in modal to mark late pickups.
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="player-sub">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {checkinSession && (
        <QrCheckinDialog
          session={checkinSession.session}
          initialScanType={checkinSession.initialScanType}
          players={players}
          onClose={() => setCheckinSession(null)}
        />
      )}
      {cancelTarget && (
        <CancelSessionDialog
          session={cancelTarget}
          coachName={coachName}
          onClose={() => setCancelTarget(null)}
          onCancelled={(updated) => {
            onSessionUpdate(updated);
            // Don't auto-close — the dialog will pivot to a "Reschedule instead?"
            // step. The dialog will call onClose itself when the coach is done.
          }}
          onPivotToReschedule={(updated) => {
            // Coach changed their mind during the cancel flow. Close the cancel
            // modal and open the reschedule modal on the same session, with the
            // already-applied cancellation reverted by the reschedule's own
            // backend call (which sets a new date and audit line).
            setCancelTarget(null);
            setRescheduleTarget(updated);
          }}
        />
      )}
      {rescheduleTarget && (
        <RescheduleDialog
          session={rescheduleTarget}
          coachName={coachName}
          onClose={() => setRescheduleTarget(null)}
          onSaved={(updated) => {
            onSessionUpdate(updated);
            setRescheduleTarget(null);
          }}
        />
      )}
      {editTarget && (() => {
        // Open the dialog read-only when the session is locked (completed or
        // cancelled). Coach can still see all the details and the audit
        // trail, but nothing can be amended.
        const targetState = stateOf(editTarget);
        const targetReadOnly =
          targetState === "completed" || targetState === "cancelled";
        return (
          <EditSessionDialog
            session={editTarget}
            coachName={coachName}
            readOnly={targetReadOnly}
            onClose={() => setEditTarget(null)}
            onSaved={(updated) => {
              onSessionUpdate(updated);
              setEditTarget(null);
            }}
          />
        );
      })()}
      {showCreate && (
        <CreateSessionDialog
          coachName={coachName}
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            onSessionCreated(created);
            setShowCreate(false);
            // Auto-flip the filter to Upcoming so the new session is visible
            // immediately, since coaches always create future sessions.
            setFilter("scheduled");
          }}
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
        <KpiCard label="Attendance rate" value={`${attendanceRate}%`} foot="Present or late, across tracked sessions" icon={CheckCircle2} tone="neutral" />
        <KpiCard label="Present" value={counts.present} foot="On time or early" icon={CheckCircle2} tone="success" />
        <KpiCard label="Late" value={counts.late} foot="Arrived after session start" icon={Clock} tone="warning" />
        <KpiCard label="Absent" value={counts.absent} foot="No show, follow up with parent" icon={AlertTriangle} tone="attention" />
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
        <KpiCard label="Total due" value={formatCurrency(totals.totalDue)} foot="Sum of amounts due in demo data" icon={PoundSterling} tone="neutral" />
        <KpiCard label="Total paid" value={formatCurrency(totals.totalPaid)} foot="Amounts marked as received" icon={Banknote} tone="success" />
        <KpiCard label="Balance" value={formatCurrency(totals.balance)} foot="Outstanding across players" icon={ClipboardCheck} tone="warning" />
        <KpiCard label="Overdue" value={totals.overdue} foot={`${totals.unpaid} unpaid / part-paid`} icon={AlertTriangle} tone="danger" />
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

// Splits a stored ISO date (YYYY-MM-DD) into the three segments the user
// types. Empty / partial values are tolerated so we can mirror form state
// even mid-typing without throwing.
function splitIsoDate(value: string): { day: string; month: string; year: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return { day: "", month: "", year: "" };
  const [, year, month, day] = match;
  return { day, month, year };
}

// Recombines the three segments back into the ISO format the rest of the
// form (and Airtable) already expects. Returns an empty string while any
// segment is incomplete so existing classifyDateOfBirth/empty handling keeps
// working unchanged.
function joinIsoDate(day: string, month: string, year: string): string {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return "";
  return `${year}-${month}-${day}`;
}

// Cosmetic-only: turn the stored ISO date back into the British format the
// summary panel displays so parents see what they typed.
function formatIsoDateBritish(value: string): string {
  const { day, month, year } = splitIsoDate(value);
  if (!day || !month || !year) return value;
  return `${day}/${month}/${year}`;
}

interface DateOfBirthInputProps {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  testIdPrefix?: string;
}

// Three segmented inputs (Day / Month / Year) that auto-advance as the user
// types. The component is intentionally controlled — each keystroke is
// reflected back into the parent's form state via onChange so the existing
// validation pipeline (classifyDateOfBirth, summary, submit guard) keeps
// working unchanged.
function DateOfBirthInput({ value, onChange, invalid, testIdPrefix = "input-child-dob" }: DateOfBirthInputProps) {
  const initial = splitIsoDate(value);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  const dayRef = useRef<HTMLInputElement | null>(null);
  const monthRef = useRef<HTMLInputElement | null>(null);
  const yearRef = useRef<HTMLInputElement | null>(null);

  // Re-sync segments only when the parent's value diverges from what we'd
  // produce locally — e.g. after a successful submit clears the form. This
  // is the rare "sync to external prop" pattern the React docs sanction;
  // ignoring lint here is intentional and the dependency is the value alone.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const localJoined = joinIsoDate(day, month, year);
    if (localJoined === value) return;
    const next = splitIsoDate(value);
    setDay(next.day);
    setMonth(next.month);
    setYear(next.year);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  const emit = (nextDay: string, nextMonth: string, nextYear: string) => {
    onChange(joinIsoDate(nextDay, nextMonth, nextYear));
  };

  const handleSegmentChange = (
    segment: "day" | "month" | "year",
    raw: string,
  ) => {
    // Strip anything non-numeric so paste-from-elsewhere doesn't break things.
    const digits = raw.replace(/\D/g, "");
    if (segment === "day") {
      const trimmed = digits.slice(0, 2);
      setDay(trimmed);
      emit(trimmed, month, year);
      // Auto-advance once we have 2 digits, OR a single digit that can't be
      // the start of a valid day (4-9 → no 40-something day exists).
      if (trimmed.length === 2 || (trimmed.length === 1 && Number(trimmed) >= 4)) {
        monthRef.current?.focus();
        monthRef.current?.select();
      }
      return;
    }
    if (segment === "month") {
      const trimmed = digits.slice(0, 2);
      setMonth(trimmed);
      emit(day, trimmed, year);
      // Auto-advance on 2 digits, or a single digit that can't start a valid
      // month (2-9 → no 20-something month). 1 stays put because the user
      // might be typing 10/11/12.
      if (trimmed.length === 2 || (trimmed.length === 1 && Number(trimmed) >= 2)) {
        yearRef.current?.focus();
        yearRef.current?.select();
      }
      return;
    }
    const trimmed = digits.slice(0, 4);
    setYear(trimmed);
    emit(day, month, trimmed);
  };

  const handleKeyDown = (
    segment: "day" | "month" | "year",
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    const target = event.currentTarget;
    // Backspace on an empty segment hops to the previous one so the parent
    // can correct typos without reaching for the mouse.
    if (event.key === "Backspace" && target.value === "") {
      if (segment === "month") {
        event.preventDefault();
        dayRef.current?.focus();
        const v = dayRef.current?.value ?? "";
        dayRef.current?.setSelectionRange(v.length, v.length);
      } else if (segment === "year") {
        event.preventDefault();
        monthRef.current?.focus();
        const v = monthRef.current?.value ?? "";
        monthRef.current?.setSelectionRange(v.length, v.length);
      }
      return;
    }
    // Forward slash / dash / space are common date separators — treat them
    // as "jump to next field" for muscle memory.
    if (event.key === "/" || event.key === "-" || event.key === " ") {
      if (segment === "day") {
        event.preventDefault();
        monthRef.current?.focus();
        monthRef.current?.select();
      } else if (segment === "month") {
        event.preventDefault();
        yearRef.current?.focus();
        yearRef.current?.select();
      }
    }
  };

  return (
    <div
      className={`dob-segmented${invalid ? " dob-segmented-invalid" : ""}`}
      role="group"
      aria-label="Player date of birth"
    >
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        autoComplete="bday-day"
        placeholder="DD"
        maxLength={2}
        value={day}
        onChange={(event) => handleSegmentChange("day", event.target.value)}
        onKeyDown={(event) => handleKeyDown("day", event)}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Day"
        aria-invalid={invalid || undefined}
        data-testid={`${testIdPrefix}-day`}
        className="dob-segment dob-segment-dd"
      />
      <span aria-hidden="true" className="dob-separator">/</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        autoComplete="bday-month"
        placeholder="MM"
        maxLength={2}
        value={month}
        onChange={(event) => handleSegmentChange("month", event.target.value)}
        onKeyDown={(event) => handleKeyDown("month", event)}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Month"
        aria-invalid={invalid || undefined}
        data-testid={`${testIdPrefix}-month`}
        className="dob-segment dob-segment-mm"
      />
      <span aria-hidden="true" className="dob-separator">/</span>
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        autoComplete="bday-year"
        placeholder="YYYY"
        maxLength={4}
        value={year}
        onChange={(event) => handleSegmentChange("year", event.target.value)}
        onKeyDown={(event) => handleKeyDown("year", event)}
        onFocus={(event) => event.currentTarget.select()}
        aria-label="Year"
        aria-invalid={invalid || undefined}
        data-testid={`${testIdPrefix}-year`}
        className="dob-segment dob-segment-yyyy"
      />
    </div>
  );
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

        <section className="form-section" data-tone="neutral">
          <h2>Child and parent details</h2>
          <div className="form-grid form-grid--paired">
            <div className="form-pair">
              <label className="form-field">
                <span>Child full name *</span>
                <input value={form.childName} onChange={(event) => update("childName", event.target.value)} data-testid="input-child-name" />
              </label>
              <div className="form-field">
                <span className="form-field-label">Player date of birth *</span>
                <DateOfBirthInput
                  value={form.childDateOfBirth}
                  onChange={(next) => update("childDateOfBirth", next)}
                  invalid={Boolean(errors.childDateOfBirth)}
                />
                {errors.childDateOfBirth ? (
                  <span className="field-error" role="alert" data-testid="error-child-dob">
                    {errors.childDateOfBirth}
                  </span>
                ) : (
                  <span className="field-help">Used to set the child&apos;s age group automatically. Stored once on the player record.</span>
                )}
              </div>
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

        <section className="form-section" data-tone="media">
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

        <section className="form-section" data-tone="attention">
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

        <section className="form-section" data-tone="pathway-1">
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
                ? formatIsoDateBritish(form.childDateOfBirth)
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

// ---------------------------------------------------------------------------
// Parent portal (/portal)
//
// A self-contained route used by parents (not coaches) to sign in via magic
// link, view their children's profile + attendance, update consent toggles,
// change pathway, and request leave or data erasure. All API calls go
// through the dedicated parent-* Netlify functions which scope every read
// and write to the signed-in parent's email.
// ---------------------------------------------------------------------------

type ParentSummary = {
  email: string;
  players: Player[];
  sessions: Session[];
  attendance: AttendanceRecord[];
};

type ParentPortalView = "sign-in" | "check-email" | "verifying" | "overview" | "verify-error";

async function postParentAuth(action: string, body: Record<string, unknown> = {}) {
  const response = await fetch(apiPath("/parent-auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ action, ...body }),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { ok: response.ok, status: response.status, payload };
}

async function fetchParentSummary(): Promise<ParentSummary | null> {
  const response = await fetch(apiPath("/parent-data"), {
    method: "GET",
    credentials: "same-origin",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("Could not load parent data.");
  return (await response.json()) as ParentSummary;
}

async function patchParentAction(body: Record<string, unknown>) {
  const response = await fetch(apiPath("/parent-actions"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { ok: response.ok, status: response.status, payload };
}

// Tiny helper to grab `?token=...&email=...` from the magic-link URL the
// parent followed from their inbox. Falls back to empty strings when the
// query is absent so the sign-in form can render without crashing.
function readMagicLinkQuery(): { email: string; token: string } {
  if (typeof window === "undefined") return { email: "", token: "" };
  const params = new URLSearchParams(window.location.search);
  return {
    email: (params.get("email") || "").trim(),
    token: (params.get("token") || "").trim(),
  };
}

// Strip the magic-link query off the address bar after we've consumed the
// token, so a refresh doesn't re-trigger verification (the token will have
// been burned by then).
function clearMagicLinkQuery() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = "";
  window.history.replaceState({}, "", url.toString());
}

// Each consent flag the parent can toggle. The keys here correspond to the
// short names accepted by parent-actions.mjs (CONSENT_KEY_TO_FIELD).
const PARENT_CONSENT_TOGGLES: Array<{ key: string; label: string; help: string; field: keyof Player }> = [
  { key: "photo", label: "Photos \u2014 sessions", help: "Photographs taken at training sessions.", field: "photoConsent" },
  { key: "matchPhoto", label: "Photos \u2014 matches", help: "Photographs taken during matches and tournaments.", field: "matchPhotoConsent" },
  { key: "video", label: "Video \u2014 coaching review", help: "Footage used for coaching feedback only.", field: "videoConsent" },
  { key: "matchVideo", label: "Video \u2014 matches", help: "Match footage that may be shared with players and parents.", field: "matchVideoConsent" },
  { key: "highlights", label: "Highlight clips \u2014 reels", help: "Short edited clips used in highlight reels.", field: "highlightsConsent" },
  { key: "website", label: "Grass2Pro website", help: "Public profile or photos on the Grass2Pro website.", field: "websiteConsent" },
  { key: "social", label: "Social media", help: "Posts on Grass2Pro's social media channels.", field: "socialConsent" },
  { key: "press", label: "Press / partner media", help: "Sharing with partner clubs or press for showcase content.", field: "pressConsent" },
  { key: "internalReports", label: "Internal coaching reports", help: "Used inside Grass2Pro coaching reports only.", field: "internalReportsConsent" },
  { key: "emergencyContact", label: "Emergency contact sharing", help: "Sharing emergency contact details with team coaches.", field: "emergencyContactConsent" },
  { key: "medicalInformation", label: "Medical information sharing", help: "Sharing medical information with team coaches and first aiders.", field: "medicalInformationConsent" },
];

const PARENT_PATHWAY_OPTIONS = [
  "Grassroots Football",
  "Academy Football",
  "School Football",
  "Not Currently With a Team",
  "Other / Unsure",
];

const PARENT_LEAVE_REASONS = [
  "Moved Area",
  "Joined Another Club",
  "Finished Age Group",
  "Parent Request",
  "Other",
];

function ParentSignInScreen({ onRequestLink, status, error, lastEmail }: {
  onRequestLink: (email: string) => void;
  status: "idle" | "submitting";
  error: string;
  lastEmail: string;
}) {
  const [email, setEmail] = useState(lastEmail);
  return (
    <div className="portal-shell">
      <div className="portal-card">
        <div className="portal-brand">
          <span className="portal-brand-mark">G2P</span>
          <div>
            <div className="portal-brand-kicker">Grass2Pro</div>
            <div className="portal-brand-title">Parent portal</div>
          </div>
        </div>
        <h1 className="portal-heading">Sign in to your portal</h1>
        <p className="portal-sub">
          Enter the email address you used when filling in your child&apos;s consent form. We&apos;ll send you a link to sign in.
        </p>
        <form
          className="portal-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (status === "submitting") return;
            const trimmed = email.trim();
            if (!trimmed) return;
            onRequestLink(trimmed);
          }}
        >
          <label className="form-field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              required
              data-testid="input-portal-email"
            />
          </label>
          {error ? (
            <p className="field-error" role="alert" data-testid="text-portal-error">{error}</p>
          ) : (
            <p className="field-help">We&apos;ll only ever use this to send sign-in links.</p>
          )}
          <button
            type="submit"
            className="portal-primary-button"
            disabled={status === "submitting"}
            data-testid="button-portal-request-link"
          >
            {status === "submitting" ? "Sending\u2026" : "Send sign-in link"}
          </button>
        </form>
        <p className="portal-footnote">
          Are you a coach? <a href="/" data-testid="link-portal-to-coach">Open coach dashboard</a>.
        </p>
      </div>
    </div>
  );
}

function ParentCheckEmailScreen({ email, onResend }: { email: string; onResend: () => void }) {
  return (
    <div className="portal-shell">
      <div className="portal-card">
        <div className="portal-brand">
          <span className="portal-brand-mark">G2P</span>
          <div>
            <div className="portal-brand-kicker">Grass2Pro</div>
            <div className="portal-brand-title">Parent portal</div>
          </div>
        </div>
        <h1 className="portal-heading">Check your inbox</h1>
        <p className="portal-sub">
          If <strong data-testid="text-portal-email-sent">{email}</strong> is on file, we&apos;ve just sent a sign-in link.
          The link expires in 15 minutes and can only be used once.
        </p>
        <ul className="portal-tip-list">
          <li>Open the email on this device to keep things simple.</li>
          <li>Not seeing it? Check your spam folder or try again below.</li>
        </ul>
        <button type="button" className="portal-secondary-button" onClick={onResend} data-testid="button-portal-resend">
          Send another link
        </button>
      </div>
    </div>
  );
}

function ParentVerifyingScreen() {
  return (
    <div className="portal-shell">
      <div className="portal-card">
        <div className="portal-brand">
          <span className="portal-brand-mark">G2P</span>
          <div>
            <div className="portal-brand-kicker">Grass2Pro</div>
            <div className="portal-brand-title">Parent portal</div>
          </div>
        </div>
        <h1 className="portal-heading">Signing you in\u2026</h1>
        <p className="portal-sub">Just a moment while we verify your sign-in link.</p>
      </div>
    </div>
  );
}

function ParentVerifyErrorScreen({ message, onRestart }: { message: string; onRestart: () => void }) {
  return (
    <div className="portal-shell">
      <div className="portal-card">
        <div className="portal-brand">
          <span className="portal-brand-mark">G2P</span>
          <div>
            <div className="portal-brand-kicker">Grass2Pro</div>
            <div className="portal-brand-title">Parent portal</div>
          </div>
        </div>
        <h1 className="portal-heading">Sign-in link expired</h1>
        <p className="portal-sub">{message}</p>
        <button type="button" className="portal-primary-button" onClick={onRestart} data-testid="button-portal-restart">
          Send a new link
        </button>
      </div>
    </div>
  );
}

function ParentChildCard({
  player,
  attendance,
  sessions,
  onConsentToggle,
  onPathwayChange,
  onLeaveRequest,
  onErasureRequest,
}: {
  player: Player;
  attendance: AttendanceRecord[];
  sessions: Session[];
  onConsentToggle: (key: string, value: boolean) => Promise<void>;
  onPathwayChange: (value: string) => Promise<void>;
  onLeaveRequest: (reason: string, notes: string) => Promise<void>;
  onErasureRequest: () => Promise<void>;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveNotes, setLeaveNotes] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const childAttendance = attendance.filter((row) => row.playerId === player.id);
  const sessionLookup = new Map(sessions.map((session) => [session.id, session]));

  return (
    <article className="portal-child-card" data-testid={`card-portal-child-${player.id}`}>
      <header className="portal-child-head">
        <div>
          <div className="portal-child-name" data-testid={`text-portal-child-name-${player.id}`}>{player.name}</div>
          <div className="portal-child-meta">
            {player.ageGroup}
            {player.team ? ` \u00b7 ${player.team}` : ""}
            {player.position && player.position !== "N/A" ? ` \u00b7 ${player.position}` : ""}
          </div>
        </div>
        <span className={`portal-status portal-status-${player.consentStatus}`} data-testid={`badge-portal-status-${player.id}`}>
          {player.status}
        </span>
      </header>

      <section className="portal-section">
        <h2 className="portal-section-title">Football pathway</h2>
        <select
          className="portal-input"
          value={player.footballPathway || ""}
          onChange={(event) => {
            void onPathwayChange(event.target.value);
          }}
          data-testid={`select-portal-pathway-${player.id}`}
        >
          <option value="">Not set</option>
          {PARENT_PATHWAY_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </section>

      <section className="portal-section">
        <h2 className="portal-section-title">Consent</h2>
        <p className="portal-section-help">Toggle off anything you&apos;d rather not allow. Changes save instantly.</p>
        <ul className="portal-consent-list">
          {PARENT_CONSENT_TOGGLES.map((toggle) => {
            const enabled = Boolean(player[toggle.field]);
            const isPending = pendingKey === toggle.key;
            return (
              <li key={toggle.key} className="portal-consent-item">
                <div>
                  <div className="portal-consent-label">{toggle.label}</div>
                  <div className="portal-consent-help">{toggle.help}</div>
                </div>
                <label className="portal-switch" aria-label={toggle.label}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={isPending}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setPendingKey(toggle.key);
                      onConsentToggle(toggle.key, next).finally(() => setPendingKey(null));
                    }}
                    data-testid={`toggle-portal-consent-${toggle.key}-${player.id}`}
                  />
                  <span className="portal-switch-track" aria-hidden="true" />
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="portal-section">
        <h2 className="portal-section-title">Recent attendance</h2>
        {childAttendance.length === 0 ? (
          <p className="portal-empty">No attendance recorded in the last 7 days.</p>
        ) : (
          <ul className="portal-attendance-list">
            {childAttendance.map((row) => {
              const session = sessionLookup.get(row.sessionId);
              return (
                <li key={row.id} className="portal-attendance-item">
                  <div>
                    <div className="portal-attendance-name">{session?.name || "Session"}</div>
                    <div className="portal-attendance-meta">
                      {session?.date ? new Date(session.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "Date TBC"}
                      {session?.location ? ` \u00b7 ${session.location}` : ""}
                    </div>
                  </div>
                  <span className={`portal-attendance-status portal-attendance-${row.status}`}>{row.status}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <details
        className="portal-manage"
        open={manageOpen}
        onToggle={(event) => setManageOpen((event.target as HTMLDetailsElement).open)}
      >
        <summary className="portal-manage-summary" data-testid={`button-portal-manage-${player.id}`}>Manage your child's club membership</summary>
        <div className="portal-manage-body">
          <div className="portal-manage-section">
            <h3 className="portal-manage-title">Request to leave</h3>
            <p className="portal-manage-help">Lets your coach know your child is moving on. They&apos;ll see this on their dashboard.</p>
            <label className="form-field">
              <span>Reason</span>
              <select
                className="portal-input"
                value={leaveReason}
                onChange={(event) => setLeaveReason(event.target.value)}
                data-testid={`select-portal-leave-reason-${player.id}`}
              >
                <option value="">Select a reason</option>
                {PARENT_LEAVE_REASONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Notes (optional)</span>
              <textarea
                className="portal-input"
                rows={3}
                value={leaveNotes}
                onChange={(event) => setLeaveNotes(event.target.value)}
                data-testid={`input-portal-leave-notes-${player.id}`}
              />
            </label>
            <button
              type="button"
              className="portal-secondary-button"
              disabled={!leaveReason}
              onClick={() => {
                void onLeaveRequest(leaveReason, leaveNotes).then(() => {
                  setLeaveReason("");
                  setLeaveNotes("");
                });
              }}
              data-testid={`button-portal-submit-leave-${player.id}`}
            >
              Submit leave request
            </button>
          </div>

          <div className="portal-manage-section">
            <h3 className="portal-manage-title">Request data erasure</h3>
            <p className="portal-manage-help">
              Your coach will be notified to remove personal data we hold about your child. This action stays on record for safeguarding compliance.
            </p>
            {player.erasureRequested ? (
              <p className="portal-info" data-testid={`text-portal-erasure-pending-${player.id}`}>
                An erasure request is already on file. Your coach will follow up directly.
              </p>
            ) : (
              <button
                type="button"
                className="portal-danger-button"
                onClick={() => {
                  if (typeof window !== "undefined" && !window.confirm("Send a data erasure request for " + player.name + "?")) return;
                  void onErasureRequest();
                }}
                data-testid={`button-portal-request-erasure-${player.id}`}
              >
                Request erasure
              </button>
            )}
          </div>
        </div>
      </details>
    </article>
  );
}

// ----------------------------------------------------------------------
// Notifications card on the parent portal.
//
// Sits just below the children list. Three states drive the rendered UI:
//
//   1. Push not yet enabled on this device  →  show a single "Turn on
//      notifications" CTA. Clicking it requests permission, subscribes,
//      and reloads the device list.
//   2. Push enabled, this device shows up in the list  →  render the
//      live row with three pref toggles + master mute, and any other
//      devices the parent has below it.
//   3. iOS Safari outside Home Screen  →  show the iOS install hint;
//      no toggles render until the parent installs the PWA and reopens.
//
// The card never sets `setMessage` directly — we lift toast handling up
// to ParentOverviewScreen so the success/error banner positioning stays
// consistent with the rest of the portal.

type PushFlash = (tone: "info" | "success" | "error", text: string) => void;

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "";
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "";
  const diffMs = Date.now() - ts;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function PushPrefRow({
  subscription,
  busy,
  onTogglePref,
  onToggleActive,
  onUnsubscribe,
}: {
  subscription: PushSubscriptionRow;
  busy: boolean;
  onTogglePref: (
    key: keyof PushSubscriptionRow["prefs"],
    value: boolean,
  ) => Promise<void>;
  onToggleActive: (value: boolean) => Promise<void>;
  onUnsubscribe: () => Promise<void>;
}) {
  const lastUsed = formatRelativeTime(subscription.lastUsedAt);
  const prefs = subscription.prefs;

  return (
    <div
      className={`portal-push-device${subscription.isThisDevice ? " is-this-device" : ""}`}
      data-testid={`row-push-device-${subscription.id}`}
    >
      <div className="portal-push-device-head">
        <div className="portal-push-device-title">
          <span className="portal-push-device-name">
            {subscription.deviceLabel}
            {subscription.isThisDevice ? (
              <span className="portal-push-this-pill" aria-label="This device">
                This device
              </span>
            ) : null}
          </span>
          {lastUsed ? (
            <span className="portal-push-device-meta">Last used {lastUsed}</span>
          ) : null}
        </div>
        <label className="portal-toggle" data-testid={`toggle-push-active-${subscription.id}`}>
          <input
            type="checkbox"
            checked={subscription.active}
            disabled={busy}
            onChange={(event) => {
              void onToggleActive(event.target.checked);
            }}
          />
          <span className="portal-toggle-track" aria-hidden="true" />
          <span className="portal-toggle-label">{subscription.active ? "On" : "Muted"}</span>
        </label>
      </div>

      <div className="portal-push-prefs" aria-disabled={!subscription.active}>
        {[
          {
            key: "oneHourReminder" as const,
            title: "1-hour reminder",
            hint: "60 minutes before each session starts.",
          },
          {
            key: "checkInOpen" as const,
            title: "Check-in open",
            hint: "30 minutes before — the QR is live.",
          },
          {
            key: "pickupSoon" as const,
            title: "Pickup soon",
            hint: "30 minutes before the session ends.",
          },
        ].map((row) => (
          <label
            key={row.key}
            className="portal-push-pref-row"
            data-testid={`toggle-push-pref-${row.key}-${subscription.id}`}
          >
            <input
              type="checkbox"
              checked={prefs[row.key]}
              disabled={busy || !subscription.active}
              onChange={(event) => {
                void onTogglePref(row.key, event.target.checked);
              }}
            />
            <span className="portal-push-pref-text">
              <span className="portal-push-pref-title">{row.title}</span>
              <span className="portal-push-pref-hint">{row.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {subscription.isThisDevice ? (
        <div className="portal-push-device-actions">
          <button
            type="button"
            className="portal-link-button"
            onClick={() => {
              void onUnsubscribe();
            }}
            disabled={busy}
            data-testid={`button-push-remove-${subscription.id}`}
          >
            Remove this device
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ParentNotificationsCard({ flash }: { flash: PushFlash }) {
  const [capability, setCapability] = useState<PushCapability>(() => getPushCapability());
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);

  // Refresh runs the GET, awaits it, then commits state. We keep this stable
  // across renders so the visibility-change handler can reuse it without
  // re-binding. Note: we do NOT flip `loading` to true on subsequent calls
  // because the card already has data on screen and a brief disabled state
  // is enough — this also keeps us off the react-hooks/set-state-in-effect
  // rule which forbids synchronous setState before any await.
  const refresh = async () => {
    const result = await listPushSubscriptions();
    if (result.ok) {
      setSubscriptions(result.subscriptions);
    } else {
      // 401 (session expired) and other errors both fall through to an empty
      // list; the parent will see a sign-in prompt on next navigation.
      setSubscriptions([]);
    }
    setCapability(getPushCapability());
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listPushSubscriptions();
      if (cancelled) return;
      if (result.ok) setSubscriptions(result.subscriptions);
      else setSubscriptions([]);
      setCapability(getPushCapability());
      setLoading(false);
    })();
    // Permission can change while the page is open (e.g. user revokes it
    // in browser settings); revisit when the tab regains focus.
    const onVisibility = () => {
      if (document.visibilityState === "visible") setCapability(getPushCapability());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function handleEnable() {
    setEnabling(true);
    try {
      const result = await subscribeToPush();
      if (result.ok) {
        flash("success", "Notifications enabled on this device.");
        await refresh();
      } else if (result.reason === "permission-denied") {
        flash("error", "Permission was denied. You can re-enable it in your browser's site settings.");
        setCapability(getPushCapability());
      } else if (result.reason === "ios-needs-pwa") {
        flash("info", "On iPhone, please tap Share → Add to Home Screen, then open Grass2Pro from the home screen and try again.");
      } else {
        flash("error", "We couldn't turn on notifications. Please try again.");
      }
    } finally {
      setEnabling(false);
    }
  }

  async function withBusy(id: string, work: () => Promise<void>) {
    setBusyId(id);
    try {
      await work();
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePref(
    sub: PushSubscriptionRow,
    key: keyof PushSubscriptionRow["prefs"],
    value: boolean,
  ) {
    // Optimistic update so the toggle feels snappy.
    setSubscriptions((rows) =>
      rows.map((row) =>
        row.id === sub.id ? { ...row, prefs: { ...row.prefs, [key]: value } } : row,
      ),
    );
    const result = await updatePushPrefs(sub.id, { prefs: { [key]: value } });
    if (!result.ok) {
      flash("error", "We couldn't save that change. Please try again.");
      // Roll back by re-fetching the truth.
      await refresh();
    }
  }

  async function handleToggleActive(sub: PushSubscriptionRow, value: boolean) {
    setSubscriptions((rows) =>
      rows.map((row) => (row.id === sub.id ? { ...row, active: value } : row)),
    );
    const result = await updatePushPrefs(sub.id, { active: value });
    if (!result.ok) {
      flash("error", "We couldn't save that change. Please try again.");
      await refresh();
    }
  }

  async function handleUnsubscribeThisDevice() {
    const result = await unsubscribeFromPush();
    if (result.ok) {
      flash("success", "Notifications turned off on this device.");
    } else {
      flash("error", "We couldn't turn notifications off cleanly. Please try again.");
    }
    await refresh();
  }

  // ----- Render -----

  // Hide the whole card until we know if the parent has any devices on
  // file AND we know what the device can do. Avoids a flash of "Turn on"
  // when the parent already has push enabled.
  if (loading && subscriptions.length === 0) {
    return (
      <section className="portal-card portal-push-card" aria-busy="true">
        <header className="portal-push-card-head">
          <Bell className="portal-push-card-icon" aria-hidden="true" />
          <div>
            <h2>Notifications</h2>
            <p className="portal-push-card-sub">Loading your notification settings…</p>
          </div>
        </header>
      </section>
    );
  }

  const thisDeviceSub = subscriptions.find((sub) => sub.isThisDevice) || null;
  const otherDevices = subscriptions.filter((sub) => !sub.isThisDevice);
  const isIosNeedsPwa = capability.kind === "ios-needs-pwa";
  const isUnsupported = capability.kind === "unsupported";
  const isPermissionDenied = capability.kind === "permission-denied";
  const showEnableCta =
    !thisDeviceSub && !isIosNeedsPwa && !isUnsupported && !isPermissionDenied;

  return (
    <section className="portal-card portal-push-card" data-testid="card-push-prefs">
      <header className="portal-push-card-head">
        {thisDeviceSub?.active ? (
          <Bell className="portal-push-card-icon" aria-hidden="true" />
        ) : (
          <BellOff className="portal-push-card-icon" aria-hidden="true" />
        )}
        <div>
          <h2>Notifications</h2>
          <p className="portal-push-card-sub">
            Get reminders about your child&apos;s sessions on each device you use.
          </p>
        </div>
      </header>

      {isIosNeedsPwa ? (
        <div className="portal-push-hint portal-push-hint-info" data-testid="hint-push-ios">
          <strong>One quick step on iPhone:</strong>
          <p>
            Tap the Share icon in Safari, choose <em>Add to Home Screen</em>, then open Grass2Pro from your home screen. Apple only allows web notifications for installed apps.
          </p>
        </div>
      ) : null}

      {isUnsupported ? (
        <div className="portal-push-hint portal-push-hint-info" data-testid="hint-push-unsupported">
          <p>This browser doesn&apos;t support push notifications. Try the latest Chrome, Edge, Firefox, or Safari (16.4+).</p>
        </div>
      ) : null}

      {isPermissionDenied ? (
        <div className="portal-push-hint portal-push-hint-warn" data-testid="hint-push-denied">
          <strong>Notifications are blocked.</strong>
          <p>
            Open your browser&apos;s site settings for Grass2Pro and switch Notifications back to <em>Allow</em>, then refresh this page.
          </p>
        </div>
      ) : null}

      {showEnableCta ? (
        <div className="portal-push-enable">
          <p>
            We&apos;ll only send you reminders for your own children&apos;s sessions. Three quiet alerts at most: 1 hour before, when check-in opens, and when pickup is coming up.
          </p>
          <button
            type="button"
            className="portal-primary-button"
            onClick={() => {
              void handleEnable();
            }}
            disabled={enabling}
            data-testid="button-push-enable"
          >
            {enabling ? "Turning on…" : "Turn on notifications"}
          </button>
        </div>
      ) : null}

      {thisDeviceSub ? (
        <PushPrefRow
          subscription={thisDeviceSub}
          busy={busyId === thisDeviceSub.id}
          onTogglePref={(key, value) =>
            withBusy(thisDeviceSub.id, () => handleTogglePref(thisDeviceSub, key, value))
          }
          onToggleActive={(value) =>
            withBusy(thisDeviceSub.id, () => handleToggleActive(thisDeviceSub, value))
          }
          onUnsubscribe={() => withBusy(thisDeviceSub.id, handleUnsubscribeThisDevice)}
        />
      ) : null}

      {otherDevices.length > 0 ? (
        <div className="portal-push-other-devices">
          <h3 className="portal-push-other-devices-title">Other devices</h3>
          {otherDevices.map((sub) => (
            <PushPrefRow
              key={sub.id}
              subscription={sub}
              busy={busyId === sub.id}
              onTogglePref={(key, value) =>
                withBusy(sub.id, () => handleTogglePref(sub, key, value))
              }
              onToggleActive={(value) =>
                withBusy(sub.id, () => handleToggleActive(sub, value))
              }
              onUnsubscribe={async () => { /* only for this-device row */ }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ParentOverviewScreen({
  summary,
  onRefresh,
  onSignOut,
}: {
  summary: ParentSummary;
  onRefresh: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);

  function flash(tone: "info" | "success" | "error", text: string) {
    setMessage({ tone, text });
    if (typeof window !== "undefined") {
      window.setTimeout(() => setMessage(null), 4000);
    }
  }

  async function runAction(body: Record<string, unknown>, onSuccess?: () => void) {
    setWorking(true);
    try {
      const result = await patchParentAction(body);
      if (!result.ok) {
        const errorText = result.payload && typeof result.payload === "object" && "error" in result.payload
          ? String((result.payload as { error?: string }).error)
          : "We couldn't save that change. Please try again.";
        flash("error", errorText);
        return;
      }
      flash("success", "Saved.");
      onSuccess?.();
      await onRefresh();
    } catch (error) {
      console.error(error);
      flash("error", "Network error. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="portal-overview">
      <header className="portal-overview-head">
        <div>
          <div className="portal-brand-kicker">Grass2Pro parent portal</div>
          <h1 className="portal-overview-title">Welcome back</h1>
          <p className="portal-overview-sub" data-testid="text-portal-signed-in-as">Signed in as {summary.email}</p>
        </div>
        <button
          type="button"
          className="portal-secondary-button"
          onClick={() => {
            void onSignOut();
          }}
          data-testid="button-portal-sign-out"
        >
          Sign out
        </button>
      </header>

      {message ? (
        <div className={`portal-toast portal-toast-${message.tone}`} role="status" data-testid="text-portal-toast">
          {message.text}
        </div>
      ) : null}

      {summary.players.length === 0 ? (
        <div className="portal-card portal-empty-card">
          <h2>No children linked yet</h2>
          <p>
            We couldn&apos;t find a child registered to <strong>{summary.email}</strong>. Please contact your child&apos;s coach to confirm the email address on file.
          </p>
        </div>
      ) : (
        <div className="portal-child-list" aria-busy={working || undefined}>
          {summary.players.map((player) => (
            <ParentChildCard
              key={player.id}
              player={player}
              attendance={summary.attendance}
              sessions={summary.sessions}
              onConsentToggle={(key, value) => runAction({ playerId: player.id, action: "set-consent", key, value })}
              onPathwayChange={(value) => runAction({ playerId: player.id, action: "set-pathway", value })}
              onLeaveRequest={(reason, notes) => runAction({ playerId: player.id, action: "request-leave", reason, notes })}
              onErasureRequest={() => runAction({ playerId: player.id, action: "request-erasure" })}
            />
          ))}
        </div>
      )}

      {/* Notifications card sits below the children list. Only render once
          we know the parent has at least one linked child — otherwise the
          subscribe call would 409 because there's no Parents/Guardians row
          on file yet. */}
      {summary.players.length > 0 ? <ParentNotificationsCard flash={flash} /> : null}
    </div>
  );
}

function ParentPortal() {
  const [view, setView] = useState<ParentPortalView>("sign-in");
  const [signInStatus, setSignInStatus] = useState<"idle" | "submitting">("idle");
  const [signInError, setSignInError] = useState("");
  const [lastEmail, setLastEmail] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [summary, setSummary] = useState<ParentSummary | null>(null);

  const refresh = async () => {
    try {
      const next = await fetchParentSummary();
      if (!next) {
        setSummary(null);
        setView("sign-in");
        return;
      }
      setSummary(next);
      setView("overview");
    } catch (error) {
      console.error(error);
      setSignInError("Couldn't load your portal. Please sign in again.");
      setView("sign-in");
    }
  };

  // On mount: if the URL has a magic-link token, verify it. Otherwise check
  // for an existing session cookie so a refreshed tab stays signed in.
  useEffect(() => {
    let cancelled = false;
    const { token, email } = readMagicLinkQuery();
    async function bootstrap() {
      if (token && email) {
        setView("verifying");
        const result = await postParentAuth("verify-token", { token, email });
        clearMagicLinkQuery();
        if (cancelled) return;
        if (!result.ok) {
          const text = result.payload && typeof result.payload === "object" && "error" in result.payload
            ? String((result.payload as { error?: string }).error)
            : "Sign-in link is no longer valid.";
          setVerifyError(text);
          setView("verify-error");
          return;
        }
        await refresh();
        return;
      }
      // No magic-link query \u2014 try the existing session.
      const existing = await fetchParentSummary().catch(() => null);
      if (cancelled) return;
      if (existing) {
        setSummary(existing);
        setView("overview");
      } else {
        setView("sign-in");
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
    // We deliberately run this bootstrap once on mount.
  }, []);

  async function requestLink(email: string) {
    setSignInStatus("submitting");
    setSignInError("");
    setLastEmail(email);
    const result = await postParentAuth("request-link", { email });
    setSignInStatus("idle");
    if (!result.ok) {
      const text = result.payload && typeof result.payload === "object" && "error" in result.payload
        ? String((result.payload as { error?: string }).error)
        : "Something went wrong. Please try again.";
      setSignInError(text);
      return;
    }
    setView("check-email");
  }

  async function signOut() {
    await postParentAuth("sign-out");
    setSummary(null);
    setView("sign-in");
  }

  if (view === "sign-in") {
    return (
      <ParentSignInScreen
        onRequestLink={requestLink}
        status={signInStatus}
        error={signInError}
        lastEmail={lastEmail}
      />
    );
  }
  if (view === "check-email") {
    return (
      <ParentCheckEmailScreen
        email={lastEmail}
        onResend={() => {
          setView("sign-in");
        }}
      />
    );
  }
  if (view === "verifying") return <ParentVerifyingScreen />;
  if (view === "verify-error") {
    return (
      <ParentVerifyErrorScreen
        message={verifyError || "Please request a fresh sign-in link."}
        onRestart={() => {
          setVerifyError("");
          setView("sign-in");
        }}
      />
    );
  }
  if (!summary) return <LoadingState />;
  return <ParentOverviewScreen summary={summary} onRefresh={refresh} onSignOut={signOut} />;
}

// Detect whether the SPA should render the parent portal instead of the
// coach dashboard. We keep this dead simple \u2014 any path that starts with
// `/portal` (case-insensitive) routes through ParentPortal so /portal,
// /portal/, and /portal?token=... all work.
function shouldRenderParentPortal(): boolean {
  if (typeof window === "undefined") return false;
  return /^\/portal(\/|\?|$)/i.test(window.location.pathname + window.location.search);
}

// Top-level router: /portal renders the parent portal, everything else
// renders the coach dashboard. Wrapper component so the dashboard's hooks
// never run for parents (and parent portal hooks never run for coaches).
function AppRoot() {
  if (shouldRenderParentPortal()) return <ParentPortal />;
  return <CoachDashboard />;
}

function CoachDashboard() {
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
    let mounted = true;
    loadAdminData().then((payload) => {
      if (mounted) setData(payload);
    });
    return () => {
      mounted = false;
    };
  }, []);

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

  // Splice an updated session back into the dataset after a successful
  // reschedule so KPIs, filter chips and the row state all refresh without
  // a full reload.
  function applySessionUpdate(updated: Session) {
    setData((prev) => {
      if (!prev) return prev;
      const sessions = prev.sessions.map((s) => (s.id === updated.id ? updated : s));
      return { ...prev, sessions };
    });
  }

  // Add a freshly-created session to the dataset so it shows up in the table
  // immediately. Sort isn't preserved here — the Sessions component sorts by
  // date inside its render.
  function applySessionCreated(created: Session) {
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, sessions: [...prev.sessions, created] };
    });
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
          {activeView === "sessions" && (
            <Sessions
              sessions={data.sessions}
              players={data.players}
              coachName={data.coach?.name}
              onSessionUpdate={applySessionUpdate}
              onSessionCreated={applySessionCreated}
            />
          )}
          {activeView === "attendance" && <Attendance attendance={data.attendance} sessions={data.sessions} />}
          {activeView === "safeguarding" && <Safeguarding players={data.players} />}
          {activeView === "payments" && <Payments payments={data.payments} />}
          {activeView === "consent" && <ConsentForm />}
          <div className="coach-portal-note" role="note">
            Parents sign in here: <a href="/portal">grass2pro.com/portal</a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AppRoot;
