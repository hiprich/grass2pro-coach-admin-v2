import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Home,
  Menu,
  Moon,
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

type AdminData = {
  coach: Coach;
  players: Player[];
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

const demoData: AdminData = {
  coach: {
    id: "rec_demo_coach",
    name: "Kobby Mensah",
    role: "Grassroots coach admin",
    credential: "FA Level 1 | DBS checked",
    email: "coach@grass2pro.com",
  },
  players: [
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
  ],
  sidebar: [
    { id: "overview", label: "Overview", count: 5, icon: "home" },
    { id: "players", label: "Players", count: 5, icon: "users" },
    { id: "safeguarding", label: "Safeguarding", count: 2, icon: "shield" },
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
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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
    return await response.json();
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
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-label="Grass2Pro logo" role="img">
      <rect x="5" y="5" width="38" height="38" rx="10" fill="currentColor" opacity="0.12" />
      <path d="M13 16h20c4 0 7 3 7 7s-3 7-7 7h-8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 18 17 30h16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15" cy="16" r="3" fill="currentColor" />
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
    safeguarding: "Safeguarding",
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
          {activeView === "safeguarding" && <Safeguarding players={data.players} />}
          {activeView === "consent" && <ConsentForm />}
        </div>
      </main>
    </div>
  );
}

export default App;
