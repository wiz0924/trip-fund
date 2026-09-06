"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Plus, X, Wallet, Users, Receipt, PieChart, LayoutGrid, Settings,
  TrendingUp, TrendingDown, AlertTriangle, Pencil, Trash2,
  Calendar, Anchor, LogOut, ShieldCheck, Eye, EyeOff, UserPlus,
  Camera, ChevronLeft, Home as HomeIcon,
} from "lucide-react";

/* ---------- brand tokens ---------- */
const COVER = "#16302E";
const COVER_2 = "#1F433F";
const PAPER = "#FBF6EC";
const CARD_BG = "#FFFDF8";
const BORDER = "#E7DDC9";
const INK = "#22271F";
const MUTED = "#7C7660";
const CORAL = "#E8734A";
const SAND = "#D9A441";
const FOREST = "#4C7A5B";
const DANGER = "#B5473A";
const WARN = "#C98A2E";

const ACCENTS = ["#E8734A", "#4C7A5B", "#3E6D8E", "#B5804A", "#8A5A7C", "#4A8580"];
function accentFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

/* ---------- helpers ---------- */
const peso = (n) =>
  "₱" + Math.round(n).toLocaleString("en-PH", { maximumFractionDigits: 0 });
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Weeks are numbered relative to the trip's own timeline (week 1 = the week
// the trip fund was created), not the ISO calendar week of the year.
function tripWeek(dateISO, anchorISO) {
  const d = new Date(dateISO + "T00:00:00");
  const a = new Date((anchorISO || dateISO) + "T00:00:00");
  const diffDays = Math.floor((d - a) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

function compressImage(file, maxDim = 1000, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) { reject(new Error("Please choose an image file.")); return; }
    if (file.size > 12 * 1024 * 1024) { reject(new Error("That image is too large. Try one under 12MB.")); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Couldn't read that image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function api(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong.");
  return json;
}

const CATEGORIES = [
  "Transportation", "Accommodation", "Food", "Activities",
  "Tickets/Entrance Fees", "Emergency", "Other",
];
const CAT_COLOR = {
  Transportation: "#3E6D8E", Accommodation: "#B5804A", Food: FOREST,
  Activities: "#8A5A7C", "Tickets/Entrance Fees": "#4A7A85",
  Emergency: DANGER, Other: "#8A8368",
};

/* ---------- small UI atoms ---------- */
const Card = ({ children, className = "", style }) => (
  <div className={`rounded-2xl border ${className}`} style={{ background: CARD_BG, borderColor: BORDER, ...style }}>{children}</div>
);

const Pill = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: { bg: "#F1EADA", color: MUTED },
    good: { bg: "#E4EEE0", color: "#3A5C40" },
    warn: { bg: "#FBEEDA", color: "#8A5A1E" },
    bad: { bg: "#F7E2DE", color: DANGER },
  };
  const t = tones[tone];
  return <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: t.bg, color: t.color }}>{children}</span>;
};

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" onClick={onClose}>
      <div
        className={`w-full ${wide ? "sm:max-w-lg" : "sm:max-w-md"} sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto`}
        style={{ background: PAPER }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: BORDER, background: PAPER }}>
          <h3 className="text-[17px] font-semibold font-display" style={{ color: INK }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5" style={{ color: MUTED }}><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Lightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/75 flex items-center justify-center p-6" onClick={onClose}>
      <img src={src} alt="Receipt" className="max-h-[85vh] max-w-full rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
      <button onClick={onClose} className="absolute top-5 right-5 text-white p-2 rounded-full bg-white/10"><X size={20} /></button>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label className="block mb-4">
    <span className="block text-sm font-medium mb-1.5" style={{ color: MUTED }}>{label}</span>
    {children}
  </label>
);

const inputCls =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-[#4C7A5B]/30 focus:border-[#4C7A5B]";
const inputStyle = { borderColor: "#D9CDAE", color: INK };

function PhotoField({ label, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showLight, setShowLight] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(""); setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      onChange(dataUrl);
    } catch (err2) {
      setErr(err2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field label={label}>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="Receipt preview" className="w-16 h-16 rounded-xl object-cover border cursor-pointer" style={{ borderColor: BORDER }} onClick={() => setShowLight(true)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: "#D9CDAE", color: MUTED }}>
              Replace<input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            <button type="button" onClick={() => onChange(null)} className="text-xs font-medium" style={{ color: DANGER }}>Remove photo</button>
          </div>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 cursor-pointer text-sm" style={{ borderColor: "#D9CDAE", color: MUTED }}>
          {busy ? <span>Processing…</span> : <><Camera size={16} /> Add a photo (optional)</>}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
        </label>
      )}
      {err && <p className="text-xs mt-1.5" style={{ color: DANGER }}>{err}</p>}
      {showLight && <Lightbox src={value} onClose={() => setShowLight(false)} />}
    </Field>
  );
}

function ProgressBar({ pct, color = FOREST }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "#EFE6D2" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, background: color }} />
    </div>
  );
}

const EmptyState = ({ text, action }) => (
  <Card className="p-8 text-center">
    <p className="text-sm mb-3" style={{ color: MUTED }}>{text}</p>
    {action}
  </Card>
);

/* ---------- derived calculations ---------- */
function useTripStats(trip) {
  return useMemo(() => {
    if (!trip) return null;
    const totalContrib = trip.contributions.reduce((s, c) => s + c.amount, 0);
    const totalExpense = trip.expenses.reduce((s, e) => s + e.amount, 0);
    const available = totalContrib - totalExpense;
    const remainingTarget = Math.max(0, trip.target - totalContrib);
    const pctTarget = trip.target > 0 ? (totalContrib / trip.target) * 100 : 0;

    const perMember = trip.members.map((m) => {
      const list = trip.contributions.filter((c) => c.memberId === m.id);
      const total = list.reduce((s, c) => s + c.amount, 0);
      const latest = list.reduce((a, c) => (!a || c.date > a ? c.date : a), null);
      return { ...m, total, count: list.length, latest, pct: m.goal ? Math.min(100, (total / m.goal) * 100) : null };
    });

    // Weekly allocation ledger: a member's total is applied to week 1's quota
    // first, then week 2's, and so on — so a late or extra payment automatically
    // covers any earlier shortfall before anything is banked as credit ahead.
    // Only meaningful once the trip has a configured weekly amount.
    const currentWeek = Math.max(1, tripWeek(todayISO(), trip.createdAt));
    const weeklyAmount = trip.weeklyAmount || 0;
    const memberLedger = trip.members.map((m) => {
      const total = perMember.find((p) => p.id === m.id)?.total || 0;
      if (!weeklyAmount) return { id: m.id, name: m.name, weeks: [], advance: 0 };
      let remaining = total;
      const weeksArr = [];
      for (let w = 1; w <= currentWeek; w++) {
        const owed = weeklyAmount;
        const paid = Math.min(remaining, owed);
        remaining -= paid;
        weeksArr.push({ week: w, owed, paid, status: paid >= owed ? "paid" : paid > 0 ? "partial" : "unpaid" });
      }
      return { id: m.id, name: m.name, weeks: weeksArr, advance: Math.max(0, remaining) };
    });

    const byCategory = CATEGORIES.map((cat) => ({
      category: cat,
      spent: trip.expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
      budget: trip.budgets?.[cat] || 0,
    })).filter((c) => c.spent > 0 || c.budget > 0);

    const weeks = {};
    trip.contributions.forEach((c) => {
      const w = tripWeek(c.date, trip.createdAt);
      weeks[w] = weeks[w] || {};
      weeks[w][c.memberId] = (weeks[w][c.memberId] || 0) + c.amount;
    });
    const weekNums = Object.keys(weeks).map(Number).sort((a, b) => b - a);

    const latestContribution = trip.contributions.reduce((a, c) => (!a || c.date > a.date ? c : a), null);
    const latestExpense = trip.expenses.reduce((a, e) => (!a || e.date > a.date ? e : a), null);

    const totalsPerWeek = weekNums.map((w) => Object.values(weeks[w]).reduce((s, v) => s + v, 0));
    const avgWeekly = totalsPerWeek.length ? totalsPerWeek.reduce((s, v) => s + v, 0) / totalsPerWeek.length : 0;
    const estWeeks = avgWeekly > 0 ? remainingTarget / avgWeekly : null;

    return { totalContrib, totalExpense, available, remainingTarget, pctTarget, perMember, byCategory, weeks, weekNums, latestContribution, latestExpense, avgWeekly, estWeeks, memberLedger, currentWeek, weeklyAmount };
  }, [trip]);
}

function tripTotals(trip) {
  const totalContrib = trip.contributions.reduce((s, c) => s + c.amount, 0);
  const totalExpense = trip.expenses.reduce((s, e) => s + e.amount, 0);
  return { totalContrib, totalExpense, available: totalContrib - totalExpense };
}

/* ========================================================================
   ROOT: session bootstrap + auth gate
   ======================================================================== */
export default function Root() {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await api("/api/auth/me");
        setUser(me.user);
        if (me.user) {
          const t = await api("/api/trips");
          setTrips(t.trips);
        }
      } catch (e) {
        setLoadError(e.message);
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  const login = async (username, password) => {
    const j = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    setUser(j.user);
    const t = await api("/api/trips");
    setTrips(t.trips);
  };
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    setTrips([]);
  };

  if (!booted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAPER }}>
        <Anchor size={26} style={{ color: FOREST }} className="animate-pulse" />
      </div>
    );
  }

  if (loadError && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: PAPER }}>
        <div>
          <p className="font-medium mb-2" style={{ color: DANGER }}>Couldn't connect</p>
          <p className="text-sm max-w-sm" style={{ color: MUTED }}>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={login} />;

  return <TripFundApp user={user} setUser={setUser} trips={trips} setTrips={setTrips} onLogout={logout} />;
}

/* ---------- Login ---------- */
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: PAPER }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: COVER }}>
            <Anchor size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold font-display" style={{ color: INK }}>Tigom ta brad</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Sign in to the barkada's trip fund</p>
        </div>
        <Card className="p-5">
          <form onSubmit={submit}>
            <Field label="Username">
              <input className={inputCls} style={inputStyle} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input type={showPw ? "text" : "password"} className={inputCls + " pr-10"} style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            {error && <p className="text-sm mb-3" style={{ color: DANGER }}>{error}</p>}
            <button disabled={busy} className="w-full text-white rounded-xl py-2.5 font-medium disabled:opacity-60" style={{ background: COVER }}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </Card>
        <p className="text-xs text-center mt-4" style={{ color: MUTED }}>
          Default admin account: <span className="font-medium">admin</span> / <span className="font-medium">admin123</span>
          <br />Change the password after signing in, from Settings.
        </p>
      </div>
    </div>
  );
}

/* ========================================================================
   MAIN APP (post-login)
   ======================================================================== */
function TripFundApp({ user, setUser, trips, setTrips, onLogout }) {
  const isAdmin = user.role === "admin";
  const [activeTripId, setActiveTripId] = useState(null);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeTripId && !trips.find((t) => t.id === activeTripId)) {
      setActiveTripId(null);
      setTab("home");
    }
  }, [trips]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "settings") {
      api("/api/users").then((j) => setUsers(j.users)).catch((e) => setError(e.message));
    }
  }, [tab]);

  const trip = trips.find((t) => t.id === activeTripId) || null;
  const stats = useTripStats(trip);

  const withError = (fn) => async (...args) => {
    try {
      await fn(...args);
    } catch (e) {
      setError(e.message);
    }
  };

  const updateTrip = withError(async (id, fn) => {
    const current = trips.find((t) => t.id === id);
    const next = fn(current);
    setTrips(trips.map((t) => (t.id === id ? next : t))); // optimistic
    const j = await api(`/api/trips/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: next.name, destination: next.destination, startDate: next.startDate, endDate: next.endDate,
        description: next.description, target: next.target, weeklyAmount: next.weeklyAmount,
        data: { members: next.members, contributions: next.contributions, expenses: next.expenses, budgets: next.budgets },
      }),
    });
    setTrips((ts) => ts.map((t) => (t.id === id ? j.trip : t)));
  });

  const createTrip = withError(async (data) => {
    const j = await api("/api/trips", { method: "POST", body: JSON.stringify(data) });
    setTrips((ts) => [...ts, j.trip]);
    setActiveTripId(j.trip.id);
    setTab("dashboard");
  });

  const removeTrip = withError(async (id) => {
    await api(`/api/trips/${id}`, { method: "DELETE" });
    setTrips((ts) => ts.filter((t) => t.id !== id));
    setActiveTripId(null);
    setTab("home");
  });

  const openModal = (type, payload) => setModal({ type, payload });
  const closeModal = () => setModal(null);
  const openTrip = (id) => { setActiveTripId(id); setTab("dashboard"); };
  const goHome = () => { setActiveTripId(null); setTab("home"); };

  const tripNav = [
    { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { key: "members", label: "Members", icon: Users },
    { key: "contributions", label: "Contributions", icon: Wallet },
    { key: "expenses", label: "Expenses", icon: Receipt },
    { key: "reports", label: "Reports", icon: PieChart },
  ];

  return (
    <div className="min-h-screen font-sans pb-20 sm:pb-0 sm:flex" style={{ background: PAPER, color: INK }}>
      {/* desktop sidebar */}
      <aside className="hidden sm:flex flex-col w-64 shrink-0 p-4 text-white" style={{ background: COVER }}>
        <button onClick={goHome} className="flex items-center gap-2 px-2 mb-6 text-left">
          <Anchor size={20} />
          <span className="font-semibold font-display text-lg">Tigom ta brad</span>
        </button>

        <button onClick={goHome} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 ${tab === "home" ? "bg-white/15" : "hover:bg-white/5"}`}>
          <HomeIcon size={17} /> Home
        </button>

        {trip && (
          <>
            <div className="mt-3 mb-1 px-3 text-[11px] uppercase tracking-wide" style={{ color: "#8FAAA1" }}>Current trip</div>
            <div className="px-3 py-2 mb-2 rounded-xl bg-white/10">
              <p className="text-sm font-medium truncate">{trip.name}</p>
            </div>
            <nav className="space-y-1">
              {tripNav.map((n) => (
                <button key={n.key} onClick={() => setTab(n.key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${tab === n.key ? "bg-white/15" : "hover:bg-white/5"}`}>
                  <n.icon size={17} /> {n.label}
                </button>
              ))}
            </nav>
          </>
        )}

        <div className="flex-1" />
        <button onClick={() => setTab("settings")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-2 ${tab === "settings" ? "bg-white/15" : "hover:bg-white/5"}`}>
          <Settings size={17} /> Settings
        </button>
        <div className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <p className="text-xs px-2 mb-1" style={{ color: "#9FB6AC" }}>{user.name} · {user.role}</p>
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-white/5">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="sm:hidden sticky top-0 z-30 px-4 py-3 flex items-center justify-between text-white" style={{ background: COVER }}>
        <div className="flex items-center gap-2 min-w-0">
          {trip ? (
            <button onClick={goHome} className="p-1 -ml-1"><ChevronLeft size={20} /></button>
          ) : (
            <Anchor size={18} />
          )}
          <span className="font-medium font-display truncate">{trip ? trip.name : "Tigom ta brad"}</span>
        </div>
        <button onClick={onLogout} className="p-2 rounded-lg"><LogOut size={18} /></button>
      </div>

      <main className="flex-1 min-w-0 p-4 sm:p-8 max-w-4xl mx-auto w-full">
        {tab === "home" && (
          <HomeView trips={trips} user={user} isAdmin={isAdmin} openModal={openModal} onOpenTrip={openTrip} />
        )}
        {tab === "dashboard" && trip && (
          <Dashboard trip={trip} stats={stats} openModal={openModal} setTab={setTab} isAdmin={isAdmin} />
        )}
        {tab === "members" && trip && <MembersView trip={trip} stats={stats} openModal={openModal} isAdmin={isAdmin} updateTrip={updateTrip} />}
        {tab === "contributions" && trip && <ContributionsView trip={trip} updateTrip={updateTrip} openModal={openModal} isAdmin={isAdmin} />}
        {tab === "expenses" && trip && <ExpensesView trip={trip} updateTrip={updateTrip} openModal={openModal} isAdmin={isAdmin} />}
        {tab === "reports" && trip && <ReportsView trip={trip} stats={stats} />}
        {tab === "settings" && (
          <SettingsView user={user} users={users} setUsers={setUsers} isAdmin={isAdmin} setError={setError} />
        )}
      </main>

      {/* mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 flex justify-around py-2 z-30 border-t" style={{ background: CARD_BG, borderColor: BORDER }}>
        <button onClick={goHome} className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium" style={{ color: tab === "home" ? FOREST : MUTED }}>
          <HomeIcon size={19} />Home
        </button>
        {trip && tripNav.map((n) => (
          <button key={n.key} onClick={() => setTab(n.key)} className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium" style={{ color: tab === n.key ? FOREST : MUTED }}>
            <n.icon size={19} />{n.label}
          </button>
        ))}
        <button onClick={() => setTab("settings")} className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium" style={{ color: tab === "settings" ? FOREST : MUTED }}>
          <Settings size={19} />Settings
        </button>
      </nav>

      {error && <ErrorToast message={error} onClose={() => setError("")} />}

      {modal?.type === "newTrip" && (
        <TripFormModal onClose={closeModal} onSave={async (data) => { await createTrip(data); closeModal(); }} />
      )}
      {modal?.type === "editTrip" && (
        <TripFormModal
          initial={trip}
          onClose={closeModal}
          onSave={async (data) => { await updateTrip(trip.id, (t) => ({ ...t, ...data })); closeModal(); }}
          onDelete={async () => { closeModal(); await removeTrip(trip.id); }}
        />
      )}
      {modal?.type === "addMember" && (
        <MemberFormModal onClose={closeModal} onSave={async (data) => { await updateTrip(trip.id, (t) => ({ ...t, members: [...t.members, { id: uid(), ...data }] })); closeModal(); }} />
      )}
      {modal?.type === "editMember" && (
        <MemberFormModal initial={modal.payload} onClose={closeModal} onSave={async (data) => { await updateTrip(trip.id, (t) => ({ ...t, members: t.members.map((m) => (m.id === modal.payload.id ? { ...m, ...data } : m)) })); closeModal(); }} />
      )}
      {modal?.type === "addContribution" && (
        <ContributionFormModal members={trip.members} currentUser={user} onClose={closeModal} onSave={async (data) => { await updateTrip(trip.id, (t) => ({ ...t, contributions: [...t.contributions, { id: uid(), ...data }] })); closeModal(); }} />
      )}
      {modal?.type === "editContribution" && (
        <ContributionFormModal members={trip.members} currentUser={user} initial={modal.payload} onClose={closeModal} onSave={async (data) => { await updateTrip(trip.id, (t) => ({ ...t, contributions: t.contributions.map((c) => (c.id === modal.payload.id ? { ...c, ...data } : c)) })); closeModal(); }} />
      )}
      {modal?.type === "addExpense" && (
        <ExpenseFormModal members={trip.members} onClose={closeModal} onSave={async (data) => { await updateTrip(trip.id, (t) => ({ ...t, expenses: [...t.expenses, { id: uid(), ...data }] })); closeModal(); }} />
      )}
      {modal?.type === "editExpense" && (
        <ExpenseFormModal members={trip.members} initial={modal.payload} onClose={closeModal} onSave={async (data) => { await updateTrip(trip.id, (t) => ({ ...t, expenses: t.expenses.map((e) => (e.id === modal.payload.id ? { ...e, ...data } : e)) })); closeModal(); }} />
      )}
    </div>
  );
}

function ErrorToast({ message, onClose }) {
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-3 max-w-[90vw]" style={{ background: "#2E2320" }}>
      <span className="truncate">{message}</span>
      <button onClick={onClose} className="shrink-0"><X size={14} /></button>
    </div>
  );
}

/* ========================================================================
   HOME — trip overview / landing page
   ======================================================================== */
function HomeView({ trips, user, isAdmin, openModal, onOpenTrip }) {
  const totals = trips.reduce(
    (acc, t) => {
      const { totalContrib, available } = tripTotals(t);
      acc.saved += totalContrib;
      acc.available += available;
      return acc;
    },
    { saved: 0, available: 0 }
  );

  const upcoming = [...trips]
    .filter((t) => t.startDate && new Date(t.startDate) >= new Date(todayISO()))
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="rounded-3xl p-6 sm:p-9 mb-8 text-white" style={{ background: `linear-gradient(135deg, ${COVER}, ${COVER_2})` }}>
        <p className="text-sm mb-1" style={{ color: "#A9C2B7" }}>{greeting}, {user.name.split(" ")[0]}</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-5">Tigom ta, brad</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <p className="text-xs mb-1" style={{ color: "#9FB6AC" }}>Saved across all trips</p>
            <p className="text-2xl font-semibold font-display">{peso(totals.saved)}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: "#9FB6AC" }}>Available right now</p>
            <p className="text-2xl font-semibold font-display">{peso(totals.available)}</p>
          </div>
          {upcoming && (
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs mb-1" style={{ color: "#9FB6AC" }}>Next trip</p>
              <p className="text-2xl font-semibold font-display truncate">{upcoming.name}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl font-semibold">Your trips</h2>
        {isAdmin && (
          <button onClick={() => openModal("newTrip")} className="text-white px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5" style={{ background: CORAL }}>
            <Plus size={16} /> New trip
          </button>
        )}
      </div>

      {trips.length === 0 ? (
        <EmptyState
          text={isAdmin ? "No trips yet — start a shared fund for your next getaway." : "No trips yet. Ask an admin to create one."}
          action={isAdmin && (
            <button onClick={() => openModal("newTrip")} className="text-white px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2" style={{ background: COVER }}>
              <Plus size={16} /> Create a trip
            </button>
          )}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {trips.map((t) => <TripTicketCard key={t.id} trip={t} onClick={() => onOpenTrip(t.id)} />)}
        </div>
      )}
    </div>
  );
}

function TripTicketCard({ trip, onClick }) {
  const { totalContrib, available } = tripTotals(trip);
  const pct = trip.target > 0 ? Math.min(100, (totalContrib / trip.target) * 100) : 0;
  const accent = accentFor(trip.id);
  const daysUntil = trip.startDate ? Math.ceil((new Date(trip.startDate) - new Date()) / 86400000) : null;

  return (
    <button onClick={onClick} className="relative text-left rounded-2xl border overflow-hidden transition hover:shadow-md" style={{ background: CARD_BG, borderColor: BORDER }}>
      <div className="h-1.5" style={{ background: accent }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-lg truncate" style={{ color: INK }}>{trip.name}</h3>
            {trip.destination && <p className="text-sm truncate" style={{ color: MUTED }}>{trip.destination}</p>}
          </div>
          {daysUntil !== null && daysUntil >= 0 && (
            <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ml-2" style={{ background: "#F1EADA", color: MUTED }}>
              {daysUntil === 0 ? "Today" : `${daysUntil}d`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px" style={{ borderTop: `1.5px dashed ${BORDER}` }} />
        </div>

        <div className="flex items-center justify-between text-sm mb-1.5">
          <span style={{ color: MUTED }}>Available</span>
          <span className="font-semibold" style={{ color: available < 0 ? DANGER : INK }}>{peso(available)}</span>
        </div>
        {trip.target > 0 && (
          <>
            <ProgressBar pct={pct} color={accent} />
            <p className="text-xs mt-1.5" style={{ color: MUTED }}>{peso(totalContrib)} of {peso(trip.target)} saved · {pct.toFixed(0)}%</p>
          </>
        )}
        <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: MUTED }}>
          <Users size={13} /> {trip.members.length} member{trip.members.length !== 1 ? "s" : ""}
        </div>
      </div>
    </button>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({ trip, stats, openModal, setTab, isAdmin }) {
  const s = stats;
  const fundStatus = s.available < 0 ? "bad" : s.available < s.totalExpense * 0.15 && s.totalExpense > 0 ? "warn" : "good";
  const fundLabel = s.available < 0 ? "Deficit — over budget" : fundStatus === "warn" ? "Running low" : "Funds healthy";
  const daysUntil = trip.startDate ? Math.ceil((new Date(trip.startDate) - new Date()) / 86400000) : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div><h1 className="text-2xl font-semibold font-display">{trip.name}</h1><p className="text-sm" style={{ color: MUTED }}>{trip.destination}</p></div>
        {isAdmin && <button onClick={() => openModal("editTrip")} className="p-2 rounded-lg hover:bg-black/5" style={{ color: MUTED }}><Settings size={18} /></button>}
      </div>
      <div className="flex items-center gap-2 text-sm mb-6 mt-2 flex-wrap" style={{ color: MUTED }}>
        <Calendar size={14} /><span>{fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}</span>
        {daysUntil !== null && daysUntil >= 0 && <Pill>{daysUntil === 0 ? "Trip is today" : `${daysUntil} days until the trip`}</Pill>}
        <Pill tone={fundStatus}>{fundLabel}</Pill>
      </div>
      {trip.description && <p className="text-sm mb-6" style={{ color: "#5B5546" }}>{trip.description}</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Contributions" value={peso(s.totalContrib)} icon={TrendingUp} color={FOREST} />
        <StatCard label="Total Expenses" value={peso(s.totalExpense)} icon={TrendingDown} color={SAND} />
        <StatCard label="Available Funds" value={peso(s.available)} icon={s.available < 0 ? AlertTriangle : Wallet} color={s.available < 0 ? DANGER : FOREST} />
        <StatCard label="Savings Target" value={peso(trip.target)} icon={PieChart} color="#8A5A7C" />
        <StatCard label="Remaining Target" value={peso(s.remainingTarget)} icon={Wallet} color={SAND} />
        <StatCard label="Members" value={trip.members.length} icon={Users} color="#3E6D8E" />
      </div>
      <Card className="p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: MUTED }}>Progress toward savings goal</span>
          <span className="text-sm font-semibold">{peso(s.totalContrib)} / {peso(trip.target)}</span>
        </div>
        <ProgressBar pct={s.pctTarget} color={accentFor(trip.id)} />
        <div className="flex items-center justify-between mt-1.5 text-xs" style={{ color: MUTED }}>
          <span>{s.pctTarget.toFixed(0)}% funded</span>
          {s.estWeeks !== null && s.remainingTarget > 0 && <span>~{s.estWeeks.toFixed(1)} weeks left at current pace</span>}
        </div>
      </Card>
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <Card className="p-4">
          <p className="text-xs mb-1" style={{ color: MUTED }}>Latest contribution</p>
          {s.latestContribution ? <p className="text-sm font-medium">{trip.members.find((m) => m.id === s.latestContribution.memberId)?.name || "—"} · {peso(s.latestContribution.amount)} · {fmtDate(s.latestContribution.date)}</p> : <p className="text-sm" style={{ color: MUTED }}>No contributions yet</p>}
        </Card>
        <Card className="p-4">
          <p className="text-xs mb-1" style={{ color: MUTED }}>Latest expense</p>
          {s.latestExpense ? <p className="text-sm font-medium">{s.latestExpense.name} · {peso(s.latestExpense.amount)} · {fmtDate(s.latestExpense.date)}</p> : <p className="text-sm" style={{ color: MUTED }}>No expenses yet</p>}
        </Card>
      </div>
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openModal("addContribution")} className="text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5" style={{ background: FOREST }}><Plus size={16} /> Add contribution</button>
          <button onClick={() => openModal("addExpense")} className="border px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5" style={{ borderColor: "#D9CDAE", color: INK }}><Plus size={16} /> Record expense</button>
          <button onClick={() => setTab("reports")} className="border px-4 py-2 rounded-xl text-sm font-medium" style={{ borderColor: "#D9CDAE", color: INK }}>View report</button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "1A" }}><Icon size={15} style={{ color }} /></div>
        <span className="text-xs" style={{ color: MUTED }}>{label}</span>
      </div>
      <p className="text-lg font-semibold font-display">{value}</p>
    </Card>
  );
}

/* ---------- Members ---------- */
function MembersView({ trip, stats, updateTrip, openModal, isAdmin }) {
  const removeMember = (id) => {
    if (!confirm("Remove this member? Their contribution history stays but they'll no longer appear as active.")) return;
    updateTrip(trip.id, (t) => ({ ...t, members: t.members.filter((m) => m.id !== id) }));
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold font-display">Members</h2>
        {isAdmin && <button onClick={() => openModal("addMember")} className="text-white px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5" style={{ background: FOREST }}><Plus size={16} /> Add member</button>}
      </div>
      <div className="space-y-3">
        {stats.perMember.map((m) => {
          const ledger = stats.memberLedger.find((l) => l.id === m.id);
          const thisWeek = ledger?.weeks[ledger.weeks.length - 1];
          return (
          <Card key={m.id} className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0" style={{ background: accentFor(m.id) }}>
                {m.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{m.name}</p>
                <p className="text-xs" style={{ color: MUTED }}>{m.count} contribution{m.count !== 1 ? "s" : ""} · last {m.latest ? fmtDate(m.latest) : "—"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">{peso(m.total)}</p>
                {m.goal ? <p className="text-xs" style={{ color: MUTED }}>of {peso(m.goal)} goal</p> : null}
              </div>
            </div>
            {m.pct !== null && (<><ProgressBar pct={m.pct} color="#3E6D8E" /><p className="text-xs mt-1" style={{ color: MUTED }}>{m.pct.toFixed(0)}% contributed · {peso(Math.max(0, m.goal - m.total))} remaining</p></>)}
            {thisWeek && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {thisWeek.status === "paid" && <Pill tone="good">Caught up this week</Pill>}
                {thisWeek.status === "partial" && <Pill tone="warn">{peso(thisWeek.paid)} of {peso(thisWeek.owed)} this week</Pill>}
                {thisWeek.status === "unpaid" && <Pill tone="bad">Not yet paid this week</Pill>}
                {ledger.advance > 0 && <Pill tone="good">+{peso(ledger.advance)} banked ahead</Pill>}
              </div>
            )}
            {isAdmin && (
              <div className="flex gap-3 mt-2">
                <button onClick={() => openModal("editMember", m)} className="text-xs flex items-center gap-1 hover:underline" style={{ color: MUTED }}><Pencil size={12} /> Edit</button>
                <button onClick={() => removeMember(m.id)} className="text-xs flex items-center gap-1 hover:underline" style={{ color: DANGER }}><Trash2 size={12} /> Remove</button>
              </div>
            )}
          </Card>
          );
        })}
        {stats.perMember.length === 0 && <EmptyState text="No members yet." />}
      </div>
    </div>
  );
}

/* ---------- Contributions ---------- */
function ContributionsView({ trip, updateTrip, openModal, isAdmin }) {
  const [filterMember, setFilterMember] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const del = (id) => {
    if (!confirm("Delete this contribution? Totals will update automatically.")) return;
    updateTrip(trip.id, (t) => ({ ...t, contributions: t.contributions.filter((c) => c.id !== id) }));
  };
  const list = [...trip.contributions].filter((c) => !filterMember || c.memberId === filterMember).sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-semibold font-display">Contributions</h2>
        {isAdmin && <button onClick={() => openModal("addContribution")} className="text-white px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5" style={{ background: FOREST }}><Plus size={16} /> Add contribution</button>}
      </div>
      <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} className={inputCls + " mb-4 max-w-xs"} style={inputStyle}>
        <option value="">All members</option>
        {trip.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <div className="space-y-2">
        {list.map((c) => {
          const member = trip.members.find((m) => m.id === c.memberId);
          return (
            <Card key={c.id} className="p-3.5 flex items-center justify-between gap-3">
              {c.photo && (
                <img src={c.photo} alt="Receipt" className="w-11 h-11 rounded-lg object-cover shrink-0 cursor-pointer border" style={{ borderColor: BORDER }} onClick={() => setLightbox(c.photo)} />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{member?.name || "Unknown"} · {peso(c.amount)}</p>
                <p className="text-xs truncate" style={{ color: MUTED }}>{fmtDate(c.date)} · Week {tripWeek(c.date, trip.createdAt)} {c.notes && `· ${c.notes}`} {c.createdBy && `· added by ${c.createdBy}`}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openModal("editContribution", c)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: MUTED }}><Pencil size={14} /></button>
                  <button onClick={() => del(c.id)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: DANGER }}><Trash2 size={14} /></button>
                </div>
              )}
            </Card>
          );
        })}
        {list.length === 0 && <EmptyState text="No contributions match. Add one to get started." />}
      </div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

/* ---------- Expenses ---------- */
function ExpensesView({ trip, updateTrip, openModal, isAdmin }) {
  const [lightbox, setLightbox] = useState(null);
  const del = (id) => {
    if (!confirm("Delete this expense? Totals will update automatically.")) return;
    updateTrip(trip.id, (t) => ({ ...t, expenses: t.expenses.filter((e) => e.id !== id) }));
  };
  const list = [...trip.expenses].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold font-display">Expenses</h2>
        {isAdmin && <button onClick={() => openModal("addExpense")} className="text-white px-3.5 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5" style={{ background: FOREST }}><Plus size={16} /> Record expense</button>}
      </div>
      <div className="space-y-2">
        {list.map((e) => (
          <Card key={e.id} className="p-3.5 flex items-center justify-between gap-3">
            {e.photo && (
              <img src={e.photo} alt="Receipt" className="w-11 h-11 rounded-lg object-cover shrink-0 cursor-pointer border" style={{ borderColor: BORDER }} onClick={() => setLightbox(e.photo)} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLOR[e.category] }} /><p className="font-medium text-sm truncate">{e.name} · {peso(e.amount)}</p></div>
              <p className="text-xs truncate ml-4" style={{ color: MUTED }}>{e.category} · {fmtDate(e.date)} {e.paidBy && `· paid by ${e.paidBy}`}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openModal("editExpense", e)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: MUTED }}><Pencil size={14} /></button>
                <button onClick={() => del(e.id)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: DANGER }}><Trash2 size={14} /></button>
              </div>
            )}
          </Card>
        ))}
        {list.length === 0 && <EmptyState text="No expenses recorded yet." />}
      </div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

/* ---------- Reports ---------- */
function ReportsView({ trip, stats }) {
  const exportCSV = () => {
    const rows = [["Type", "Name/Member", "Amount", "Date", "Category/Notes"]];
    trip.contributions.forEach((c) => {
      const m = trip.members.find((mm) => mm.id === c.memberId);
      rows.push(["Contribution", m?.name || "", c.amount, c.date, c.notes || ""]);
    });
    trip.expenses.forEach((e) => rows.push(["Expense", e.name, e.amount, e.date, e.category]));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${trip.name.replace(/\s+/g, "_")}_report.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold font-display">Financial report</h2>
        <button onClick={exportCSV} className="border px-3.5 py-2 rounded-xl text-sm font-medium" style={{ borderColor: "#D9CDAE", color: INK }}>Export CSV</button>
      </div>
      <Card className="p-5 mb-5">
        <h3 className="font-medium mb-3">Summary</h3>
        <SummaryRow label="Total contributed" value={peso(stats.totalContrib)} />
        <SummaryRow label="Total spent" value={peso(stats.totalExpense)} />
        <SummaryRow label="Available funds" value={peso(stats.available)} bold />
        <SummaryRow label="Savings target" value={peso(trip.target)} />
        <SummaryRow label="Remaining target" value={peso(stats.remainingTarget)} />
      </Card>
      <Card className="p-5 mb-5">
        <h3 className="font-medium mb-3">Contributions per member</h3>
        {stats.perMember.length === 0 && <p className="text-sm" style={{ color: MUTED }}>No members yet.</p>}
        {stats.perMember.map((m) => <SummaryRow key={m.id} label={m.name} value={`${peso(m.total)} (${m.count})`} />)}
      </Card>
      {stats.byCategory.length > 0 && (
        <Card className="p-5 mb-5">
          <h3 className="font-medium mb-3">Expenses by category</h3>
          {stats.byCategory.map((c) => (
            <div key={c.category} className="mb-3">
              <div className="flex justify-between text-sm mb-1"><span>{c.category}</span><span>{peso(c.spent)}{c.budget ? ` / ${peso(c.budget)}` : ""}</span></div>
              {c.budget > 0 && <ProgressBar pct={(c.spent / c.budget) * 100} color={CAT_COLOR[c.category]} />}
            </div>
          ))}
        </Card>
      )}
      <Card className="p-5 mb-5">
        <h3 className="font-medium mb-3">Weekly overview</h3>
        {stats.weeklyAmount > 0 ? (
          <>
            <p className="text-xs mb-3" style={{ color: MUTED }}>
              Week 1 starts when this trip fund was created · {peso(stats.weeklyAmount)} expected per member each week.
              A late or extra payment covers the oldest unpaid week first; anything left over is banked as credit toward next week.
            </p>
            {Array.from({ length: stats.currentWeek }, (_, i) => stats.currentWeek - i).map((w) => (
              <div key={w} className="mb-3 last:mb-0">
                <p className="text-sm font-medium mb-1.5">Week {w}{w === stats.currentWeek ? " (current)" : ""}</p>
                <div className="space-y-1">
                  {stats.memberLedger.map((m) => {
                    const wk = m.weeks[w - 1];
                    return (
                      <div key={m.id} className="flex justify-between text-xs">
                        <span style={{ color: "#5B5546" }}>{m.name}</span>
                        {wk.status === "paid" && <span style={{ color: "#3A5C40" }}>Paid</span>}
                        {wk.status === "partial" && <span style={{ color: WARN }}>{peso(wk.paid)} of {peso(wk.owed)}</span>}
                        {wk.status === "unpaid" && <span style={{ color: DANGER }}>Not yet paid</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {stats.memberLedger.some((m) => m.advance > 0) && (
              <div className="mt-4 pt-3 border-t" style={{ borderColor: BORDER }}>
                <p className="text-xs font-medium mb-1.5" style={{ color: MUTED }}>Banked credit for future weeks</p>
                {stats.memberLedger.filter((m) => m.advance > 0).map((m) => (
                  <div key={m.id} className="flex justify-between text-xs mb-1">
                    <span style={{ color: "#5B5546" }}>{m.name}</span>
                    <span style={{ color: "#3A5C40" }}>+{peso(m.advance)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs mb-3" style={{ color: MUTED }}>
              Week 1 starts the week this trip fund was created. Set a weekly amount in Edit trip to track who's caught up automatically.
            </p>
            {stats.weekNums.slice(0, 6).map((w) => (
              <div key={w} className="mb-3 last:mb-0">
                <p className="text-sm font-medium mb-1.5">Week {w}</p>
                <div className="space-y-1">
                  {trip.members.map((m) => {
                    const paid = stats.weeks[w][m.id];
                    return <div key={m.id} className="flex justify-between text-xs"><span style={{ color: "#5B5546" }}>{m.name}</span>{paid ? <span style={{ color: "#3A5C40" }}>{peso(paid)} · Paid</span> : <span style={{ color: DANGER }}>Not yet paid</span>}</div>;
                  })}
                </div>
              </div>
            ))}
            {stats.weekNums.length === 0 && <p className="text-sm" style={{ color: MUTED }}>No weekly data yet.</p>}
          </>
        )}
      </Card>
    </div>
  );
}

const SummaryRow = ({ label, value, bold }) => (
  <div className="flex justify-between py-1.5 text-sm"><span style={{ color: MUTED }}>{label}</span><span className={bold ? "font-semibold" : ""}>{value}</span></div>
);

/* ---------- Settings / account management ---------- */
function SettingsView({ user, users, setUsers, isAdmin, setError }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState("");

  const changeOwnPassword = async (e) => {
    e.preventDefault();
    setPwMsg("");
    try {
      await api("/api/auth/password", { method: "POST", body: JSON.stringify(pwForm) });
      setPwForm({ current: "", next: "" });
      setPwMsg("Password updated.");
    } catch (err) {
      setPwMsg(err.message);
    }
  };

  const removeUser = async (id) => {
    if (id === user.id) return;
    if (!confirm("Remove this account?")) return;
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold font-display mb-5">Settings</h2>
      <Card className="p-5 mb-5">
        <h3 className="font-medium mb-3 flex items-center gap-2"><ShieldCheck size={16} style={{ color: FOREST }} /> Change your password</h3>
        <form onSubmit={changeOwnPassword}>
          <Field label="Current password"><input type="password" className={inputCls} style={inputStyle} value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} required /></Field>
          <Field label="New password"><input type="password" className={inputCls} style={inputStyle} value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} required /></Field>
          {pwMsg && <p className="text-sm mb-3" style={{ color: MUTED }}>{pwMsg}</p>}
          <button className="text-white rounded-xl px-4 py-2 text-sm font-medium" style={{ background: COVER }}>Update password</button>
        </form>
      </Card>
      {isAdmin && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2"><Users size={16} style={{ color: FOREST }} /> Accounts</h3>
            <button onClick={() => setModalOpen(true)} className="text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1" style={{ background: FOREST }}><UserPlus size={14} /> Add account</button>
          </div>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#F1EADA" }}>
                <div><p className="text-sm font-medium">{u.name} <span className="font-normal" style={{ color: MUTED }}>· @{u.username}</span></p><p className="text-xs" style={{ color: MUTED }}>{u.role}</p></div>
                {u.id !== user.id && <button onClick={() => removeUser(u.id)} className="text-xs hover:underline" style={{ color: DANGER }}>Remove</button>}
              </div>
            ))}
          </div>
        </Card>
      )}
      {modalOpen && (
        <UserFormModal
          existingUsernames={users.map((u) => u.username.toLowerCase())}
          onClose={() => setModalOpen(false)}
          onSave={async (data) => {
            try {
              const j = await api("/api/users", { method: "POST", body: JSON.stringify(data) });
              setUsers([...users, j.user]);
              setModalOpen(false);
            } catch (err) {
              setError(err.message);
            }
          }}
        />
      )}
    </div>
  );
}

function UserFormModal({ existingUsernames, onClose, onSave }) {
  const [f, setF] = useState({ name: "", username: "", password: "", role: "member" });
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.username.trim() || f.password.length < 4) { setErr("Fill in all fields; password needs at least 4 characters."); return; }
    if (existingUsernames.includes(f.username.trim().toLowerCase())) { setErr("That username is already taken."); return; }
    onSave(f);
  };
  return (
    <Modal title="Add account" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Name"><input className={inputCls} style={inputStyle} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Username"><input className={inputCls} style={inputStyle} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required /></Field>
        <Field label="Password"><input type="password" className={inputCls} style={inputStyle} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></Field>
        <Field label="Role">
          <select className={inputCls} style={inputStyle} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="member">Member</option><option value="admin">Admin</option>
          </select>
        </Field>
        {err && <p className="text-sm mb-3" style={{ color: DANGER }}>{err}</p>}
        <button className="w-full text-white rounded-xl py-2.5 font-medium mt-1" style={{ background: COVER }}>Create account</button>
      </form>
    </Modal>
  );
}

/* ---------- Forms ---------- */
function TripFormModal({ initial, onClose, onSave, onDelete }) {
  const [f, setF] = useState({
    name: initial?.name || "", destination: initial?.destination || "",
    startDate: initial?.startDate || todayISO(), endDate: initial?.endDate || todayISO(),
    description: initial?.description || "", target: initial?.target ?? 0, weeklyAmount: initial?.weeklyAmount ?? 0,
  });
  const submit = (e) => { e.preventDefault(); if (!f.name.trim()) return; onSave({ ...f, target: Number(f.target) || 0, weeklyAmount: Number(f.weeklyAmount) || 0 }); };
  return (
    <Modal title={initial ? "Edit trip" : "Create a trip"} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Trip name"><input className={inputCls} style={inputStyle} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Destination"><input className={inputCls} style={inputStyle} value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><input type="date" className={inputCls} style={inputStyle} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label="End date"><input type="date" className={inputCls} style={inputStyle} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
        </div>
        <Field label="Description (optional)"><textarea className={inputCls} style={inputStyle} rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Savings target (₱)"><input type="number" min="0" className={inputCls} style={inputStyle} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></Field>
          <Field label="Weekly amount (₱, optional)"><input type="number" min="0" className={inputCls} style={inputStyle} value={f.weeklyAmount} onChange={(e) => setF({ ...f, weeklyAmount: e.target.value })} /></Field>
        </div>
        <button className="w-full text-white rounded-xl py-2.5 font-medium mt-2" style={{ background: COVER }}>{initial ? "Save changes" : "Create trip"}</button>
      </form>
      {initial && onDelete && (
        <div className="mt-6 pt-4 border-t" style={{ borderColor: BORDER }}>
          <p className="text-xs font-medium mb-2" style={{ color: DANGER }}>Danger zone</p>
          <button
            onClick={() => { if (confirm(`Delete trip "${initial.name}"? This can't be undone.`)) onDelete(); }}
            className="text-sm flex items-center gap-1.5"
            style={{ color: DANGER }}
          >
            <Trash2 size={14} /> Delete this trip
          </button>
        </div>
      )}
    </Modal>
  );
}

function MemberFormModal({ initial, onClose, onSave }) {
  const [f, setF] = useState({ name: initial?.name || "", goal: initial?.goal ?? "" });
  const submit = (e) => { e.preventDefault(); if (!f.name.trim()) return; onSave({ name: f.name, goal: f.goal === "" ? undefined : Number(f.goal) }); };
  return (
    <Modal title={initial ? "Edit member" : "Add member"} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Name"><input className={inputCls} style={inputStyle} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="Contribution goal (₱, optional)"><input type="number" min="0" className={inputCls} style={inputStyle} value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></Field>
        <button className="w-full text-white rounded-xl py-2.5 font-medium mt-2" style={{ background: FOREST }}>{initial ? "Save changes" : "Add member"}</button>
      </form>
    </Modal>
  );
}

function ContributionFormModal({ members, initial, currentUser, onClose, onSave }) {
  const [f, setF] = useState({
    memberId: initial?.memberId || members[0]?.id || "", amount: initial?.amount ?? "",
    date: initial?.date || todayISO(), notes: initial?.notes || "", createdBy: initial?.createdBy || currentUser?.name || "Admin",
    photo: initial?.photo || null,
  });
  const submit = (e) => { e.preventDefault(); const amt = Number(f.amount); if (!f.memberId || !(amt > 0)) return; onSave({ ...f, amount: amt }); };
  return (
    <Modal title={initial ? "Edit contribution" : "Add contribution"} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Member">
          <select className={inputCls} style={inputStyle} value={f.memberId} onChange={(e) => setF({ ...f, memberId: e.target.value })}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₱)"><input type="number" min="0.01" step="0.01" className={inputCls} style={inputStyle} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
          <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        <Field label="Notes (optional)"><input className={inputCls} style={inputStyle} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <PhotoField label="Receipt / proof of payment" value={f.photo} onChange={(v) => setF({ ...f, photo: v })} />
        <button className="w-full text-white rounded-xl py-2.5 font-medium mt-2" style={{ background: FOREST }}>{initial ? "Save changes" : "Add contribution"}</button>
      </form>
    </Modal>
  );
}

function ExpenseFormModal({ members, initial, onClose, onSave }) {
  const [f, setF] = useState({
    name: initial?.name || "", amount: initial?.amount ?? "", date: initial?.date || todayISO(),
    category: initial?.category || CATEGORIES[0], notes: initial?.notes || "", paidBy: initial?.paidBy || "",
    photo: initial?.photo || null,
  });
  const submit = (e) => { e.preventDefault(); const amt = Number(f.amount); if (!f.name.trim() || !(amt > 0)) return; onSave({ ...f, amount: amt }); };
  return (
    <Modal title={initial ? "Edit expense" : "Record expense"} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Expense name"><input className={inputCls} style={inputStyle} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₱)"><input type="number" min="0.01" step="0.01" className={inputCls} style={inputStyle} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
          <Field label="Date"><input type="date" className={inputCls} style={inputStyle} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        </div>
        <Field label="Category">
          <select className={inputCls} style={inputStyle} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Paid by (optional)">
          <select className={inputCls} style={inputStyle} value={f.paidBy} onChange={(e) => setF({ ...f, paidBy: e.target.value })}>
            <option value="">—</option>
            {members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
        </Field>
        <Field label="Notes (optional)"><input className={inputCls} style={inputStyle} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <PhotoField label="Receipt photo" value={f.photo} onChange={(v) => setF({ ...f, photo: v })} />
        <button className="w-full text-white rounded-xl py-2.5 font-medium mt-2" style={{ background: FOREST }}>{initial ? "Save changes" : "Record expense"}</button>
      </form>
    </Modal>
  );
}
