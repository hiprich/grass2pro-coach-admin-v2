import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  Home,
  MapPin,
  Menu,
  Moon,
  PoundSterling,
  Search,
  ShieldCheck,
  Sun,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

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
  consentStatus: ConsentStatus;
  photoConsent: boolean;
  videoConsent: boolean;
  websiteConsent: boolean;
  socialConsent: boolean;
  highlightsConsent: boolean;
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
  ageGroup: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  relationship: string;
  permissions: Record<string, boolean>;
  usageDetails: string;
  storageDuration: string;
  withdrawalProcessAcknowledged: boolean;
  childConsulted: boolean;
  parentalResponsibility: boolean;
  notes: string;
};

const demoPlayers: Player[] = [
  {
    id: "ply_01",
    name: "Jayden Cole",
    ageGroup: "U11",
    team: "Grass2Pro West",
    position: "CM",
    status: "Active",
    guardianName: "M. Cole",
    consentStatus: "green",
    photoConsent: true,
    videoConsent: true,
    websiteConsent: true,
    socialConsent: false,
    highlightsConsent: true,
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
    consentStatus: "amber",
    photoConsent: true,
    videoConsent: true,
    websiteConsent: false,
    socialConsent: false,
    highlightsConsent: false,
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
    consentStatus: "grey",
    photoConsent: false,
    videoConsent: false,
    websiteConsent: false,
    socialConsent: false,
    highlightsConsent: false,
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
    consentStatus: "red",
    photoConsent: false,
    videoConsent: false,
    websiteConsent: false,
    socialConsent: false,
    highlightsConsent: false,
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
    consentStatus: "green",
    photoConsent: true,
    videoConsent: true,
    websiteConsent: false,
    socialConsent: false,
    highlightsConsent: true,
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
    help: "Still images captured at matches, training and player development sessions.",
  },
  {
    id: "videoTraining",
    label: "Video for coaching review",
    help: "Match or training footage used by authorised Grass2Pro coaches for analysis.",
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

async function loadAdminData(): Promise<AdminData> {
  if (!apiBase) return demoData;

  try {
    const response = await fetch(apiPath("/admin-data"));
    if (!response.ok) throw new Error("Admin data unavailable");
    const payload = (await response.json()) as Partial<AdminData>;
    return {
      ...demoData,
      ...payload,
      sessions: payload.sessions ?? demoData.sessions,
      attendance: payload.attendance ?? demoData.attendance,
      payments: payload.payments ?? demoData.payments,
      sidebar: payload.sidebar ?? demoData.sidebar,
      players: payload.players ?? demoData.players,
      coach: payload.coach ?? demoData.coach,
    } as AdminData;
  } catch {
    return demoData;
  }
}

async function submitConsent(payload: ConsentPayload) {
  if (!apiBase) {
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
    const message = await response.text();
    throw new Error(message || "Consent submission failed");
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

function ConsentBadge({ status }: { status: ConsentStatus }) {
  const label = {
    green: "Green consent",
    amber: "Limited consent",
    red: "Withdrawn",
    grey: "Not recorded",
  }[status];

  return (
    <span className={`consent-badge consent-${status}`} data-testid={`badge-consent-${status}`}>
      {status === "green" && <CheckCircle2 size={14} aria-hidden="true" />}
      {status === "amber" && <AlertTriangle size={14} aria-hidden="true" />}
      {status === "red" && <X size={14} aria-hidden="true" />}
      {status === "grey" && <ClipboardCheck size={14} aria-hidden="true" />}
      {label}
    </span>
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
          <strong>Consent controls media only</strong>
          <p>Players without media consent stay fully included. The consent status badge only controls filming, editing and publishing workflows.</p>
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

function Overview({ data }: { data: AdminData }) {
  const players = data.players;
  const fullConsent = players.filter((player) => player.consentStatus === "green").length;
  const limited = players.filter((player) => player.consentStatus === "amber").length;
  const needsAction = players.filter((player) => player.consentStatus === "grey" || player.consentStatus === "red").length;
  const averageProgress = Math.round(players.reduce((sum, player) => sum + player.progressScore, 0) / Math.max(players.length, 1));

  return (
    <>
      <section className="hero-panel" aria-labelledby="overview-title">
        <article className="panel hero-copy">
          <div className="page-kicker">Airtable-backed prototype</div>
          <h1 id="overview-title" className="page-title">
            Coach control room for player media, consent and progress.
          </h1>
          <p>
            The dashboard reads coach and player records from secure serverless endpoints, keeps Airtable credentials off the browser, and makes consent state visible before media is filmed or published.
          </p>
          <div className="status-row">
            <span className="status-chip">Updated {new Date(data.updatedAt).toLocaleDateString("en-GB")}</span>
            <span className="status-chip">Secure API-ready frontend</span>
            <span className="status-chip">Airtable schema ready</span>
          </div>
        </article>
        <article className="panel hero-copy">
          <div className="page-kicker">Safeguarding workflow</div>
          <h2>Consent gates publishing, not participation.</h2>
          <p>Red or grey consent states block media usage actions while keeping players visible in the squad list for coaching and match-day planning.</p>
          <div className="status-row">
            <ConsentBadge status="green" />
            <ConsentBadge status="amber" />
            <ConsentBadge status="red" />
            <ConsentBadge status="grey" />
          </div>
        </article>
      </section>
      <section className="kpi-grid" aria-label="Player KPIs">
        <KpiCard label="Players" value={players.length} foot="Loaded from Players table" icon={Users} />
        <KpiCard label="Full consent" value={fullConsent} foot="Photo, video and review ready" icon={CheckCircle2} />
        <KpiCard label="Limited consent" value={limited} foot="Internal-only or channel limits" icon={AlertTriangle} />
        <KpiCard label="Avg progress" value={`${averageProgress}%`} foot="Coach review score" icon={ClipboardCheck} />
      </section>
      <section className="cards-grid">
        <article className="card mini-card">
          <Camera size={20} aria-hidden="true" />
          <h3>Photo permissions</h3>
          <p>{players.filter((player) => player.photoConsent).length} players currently allow session or match photos.</p>
        </article>
        <article className="card mini-card">
          <Video size={20} aria-hidden="true" />
          <h3>Video review</h3>
          <p>{players.filter((player) => player.videoConsent).length} players have permission for coach analysis footage.</p>
        </article>
        <article className="card mini-card">
          <ShieldCheck size={20} aria-hidden="true" />
          <h3>Needs follow-up</h3>
          <p>{needsAction} records need parent follow-up before any public media usage.</p>
        </article>
      </section>
    </>
  );
}

function PlayerList({ players }: { players: Player[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ConsentStatus>("all");

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesFilter = filter === "all" || player.consentStatus === filter;
      const matchesQuery = `${player.name} ${player.team} ${player.ageGroup} ${player.guardianName}`.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, players, query]);

  return (
    <section className="panel player-table-card" aria-labelledby="players-title">
      <div className="toolbar">
        <div>
          <div className="page-kicker">Players table</div>
          <h2 id="players-title" className="page-title">
            Squad consent and KPIs
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
        {(["all", "green", "amber", "red", "grey"] as const).map((status) => (
          <button
            key={status}
            type="button"
            className={`filter-button ${filter === status ? "active" : ""}`}
            onClick={() => setFilter(status)}
            data-testid={`button-filter-${status}`}
          >
            {status === "all" ? "All" : status}
          </button>
        ))}
      </div>
      {filteredPlayers.length === 0 ? (
        <div className="empty-state">
          <ShieldCheck size={32} aria-hidden="true" />
          <h3>No matching player records</h3>
          <p>Try a different search or consent filter. Players stay listed even when media consent is missing.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Team</th>
                <th>Consent</th>
                <th>Permissions</th>
                <th>Review due</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                <tr key={player.id} data-testid={`row-player-${player.id}`}>
                  <td>
                    <div className="player-cell">
                      <span className="player-avatar">{initials(player.name)}</span>
                      <span>
                        <span className="player-name" data-testid={`text-player-name-${player.id}`}>
                          {player.name}
                        </span>
                        <span className="player-sub">
                          {player.position} · Guardian {player.guardianName}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <strong>{player.team}</strong>
                    <div className="player-sub">{player.ageGroup}</div>
                  </td>
                  <td>
                    <ConsentBadge status={player.consentStatus} />
                    <div className="player-sub">{player.status}</div>
                  </td>
                  <td>
                    <div className="player-sub">
                      Photo {player.photoConsent ? "yes" : "no"} · Video {player.videoConsent ? "yes" : "no"} · Social {player.socialConsent ? "yes" : "no"}
                    </div>
                  </td>
                  <td>{new Date(player.reviewDue).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td>
                  <td>
                    <div className="progress-track" aria-label={`${player.progressScore}% progress`}>
                      <div className="progress-fill" style={{ width: `${player.progressScore}%` }} />
                    </div>
                    <div className="player-sub">{player.progressScore}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Sessions({ sessions }: { sessions: Session[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | SessionState>("all");

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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
  const redGrey = players.filter((player) => player.consentStatus === "red" || player.consentStatus === "grey");
  return (
    <section className="form-layout">
      <article className="panel hero-copy">
        <div className="page-kicker">Safeguarding tab</div>
        <h1 className="page-title">Media safety rules</h1>
        <p>
          The workflow blocks public use when consent is not recorded or has been withdrawn. It also reminds coaches that filming must never happen in toilets, changing areas, medical treatment spaces or any private context.
        </p>
        <div className="cards-grid">
          <article className="card mini-card">
            <ShieldCheck size={20} aria-hidden="true" />
            <h3>Authorised capture</h3>
            <p>Only organisation-approved devices and authorised coaches should capture or store player media.</p>
          </article>
          <article className="card mini-card">
            <X size={20} aria-hidden="true" />
            <h3>No private spaces</h3>
            <p>Changing rooms, toilets and first-aid treatment areas are always blocked media zones.</p>
          </article>
          <article className="card mini-card">
            <Users size={20} aria-hidden="true" />
            <h3>No exclusion</h3>
            <p>Players without consent are included in football activity; only media usage is restricted.</p>
          </article>
        </div>
      </article>
      <aside className="summary-box">
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

function ConsentForm() {
  const [form, setForm] = useState<ConsentPayload>({
    childName: "",
    ageGroup: "U11",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    relationship: "Parent",
    permissions: Object.fromEntries(permissionOptions.map((option) => [option.id, false])),
    usageDetails:
      "Grass2Pro may use approved photos or videos for private coaching review, parent progress reports, controlled website pages, or agreed highlight clips depending on the permissions selected below.",
    storageDuration:
      "Media and consent records are reviewed at least yearly and normally retained for the current season plus one additional season unless safeguarding, legal or account requirements require a different period.",
    withdrawalProcessAcknowledged: false,
    childConsulted: false,
    parentalResponsibility: false,
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const update = (key: keyof ConsentPayload, value: string | boolean | Record<string, boolean>) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectedCount = Object.values(form.permissions).filter(Boolean).length;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    if (!form.childName || !form.parentName || !form.parentEmail || !form.parentalResponsibility || !form.withdrawalProcessAcknowledged) {
      setStatus("error");
      setMessage("Please complete the required child, parent and acknowledgement fields before submitting.");
      return;
    }

    try {
      await submitConsent(form);
      setStatus("success");
      setMessage("Consent record submitted. Airtable will store the audit trail when environment variables are configured.");
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
            Capture granular parent permissions for photo, video and usage channels. Consent can be withdrawn later, and the record is designed to be auditable in Airtable.
          </p>
        </div>

        <section className="form-section">
          <h2>Child and parent details</h2>
          <div className="form-grid">
            <label className="form-field">
              <span>Child full name *</span>
              <input value={form.childName} onChange={(event) => update("childName", event.target.value)} data-testid="input-child-name" />
            </label>
            <label className="form-field">
              <span>Age group</span>
              <select value={form.ageGroup} onChange={(event) => update("ageGroup", event.target.value)} data-testid="select-age-group">
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
            <label className="form-field">
              <span>Relationship</span>
              <input value={form.relationship} onChange={(event) => update("relationship", event.target.value)} data-testid="input-relationship" />
            </label>
            <label className="form-field">
              <span>Email *</span>
              <input type="email" value={form.parentEmail} onChange={(event) => update("parentEmail", event.target.value)} data-testid="input-parent-email" />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input value={form.parentPhone} onChange={(event) => update("parentPhone", event.target.value)} data-testid="input-parent-phone" />
            </label>
          </div>
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
              </span>
            </label>
          </div>
          <label className="form-field full">
            <span>Safeguarding or consent notes</span>
            <textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} data-testid="textarea-notes" />
          </label>
        </section>

        {message && <div className={`message ${status === "success" ? "success" : "error"}`} data-testid="status-form-message">{message}</div>}

        <button className="primary-button" type="submit" disabled={status === "submitting"} data-testid="button-submit-consent">
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
            <span>Parent</span>
            <strong>{form.parentName || "Not entered"}</strong>
          </div>
          <div className="summary-item">
            <span>Permissions</span>
            <strong>{selectedCount}</strong>
          </div>
          <div className="summary-item">
            <span>Status</span>
            <strong>{selectedCount > 0 ? "Active consent" : "No media consent"}</strong>
          </div>
        </div>
        <p>
          Airtable should keep the submitted timestamp, IP context if collected by Netlify, signer details, selected permissions, storage period and withdrawal state.
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

function App() {
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
          {activeView === "overview" && <Overview data={data} />}
          {activeView === "players" && <PlayerList players={data.players} />}
          {activeView === "sessions" && <Sessions sessions={data.sessions} />}
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
