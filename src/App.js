import { useState, useEffect, useRef, useCallback } from "react";

// ─── Persistent Storage Helpers ────────────────────────────────────────────
const db = {
  async get(key) {
    try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; } catch { return null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val), true); } catch {}
  },
};

// ─── Constants ──────────────────────────────────────────────────────────────
const AVATARS = ["🏎️","🚗","🚕","🛻","🚙","🏍️","🚓","🚑","🚒","🛺"];
const SCREEN = { SPLASH: "SPLASH", REGISTER: "REGISTER", LOBBY: "LOBBY", CONFIG: "CONFIG", RACE: "RACE", RESULTS: "RESULTS", DASHBOARD: "DASHBOARD" };
const COLORS = {
  bg: "linear-gradient(135deg, #0a0015 0%, #0d0030 40%, #000a20 100%)",
  panel: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.12)",
  accent1: "#bf00ff",
  accent2: "#00d4ff",
  accent3: "#ff006e",
  neon: "#39ff14",
};

// ─── CSS Injection ──────────────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--accent1:#bf00ff;--accent2:#00d4ff;--accent3:#ff006e;--neon:#39ff14}
body{background:#0a0015;font-family:'Rajdhani',sans-serif;color:#fff;overflow:hidden;height:100vh}
.orb{font-family:'Orbitron',monospace}
.glass{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.12);border-radius:16px}
.glass-dark{background:rgba(0,0,0,0.4);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:16px}
.btn-neon{cursor:pointer;background:linear-gradient(135deg,rgba(191,0,255,0.2),rgba(0,212,255,0.2));border:1px solid rgba(0,212,255,0.5);border-radius:12px;color:#fff;font-family:'Orbitron',monospace;font-size:13px;padding:12px 28px;transition:all .25s;letter-spacing:2px;text-transform:uppercase}
.btn-neon:hover{background:linear-gradient(135deg,rgba(191,0,255,0.5),rgba(0,212,255,0.5));box-shadow:0 0 25px rgba(0,212,255,0.4);transform:translateY(-2px)}
.btn-neon:active{transform:scale(.97)}
.btn-danger{border-color:rgba(255,0,110,0.5);background:linear-gradient(135deg,rgba(255,0,110,0.2),rgba(191,0,255,0.2))}
.btn-danger:hover{background:linear-gradient(135deg,rgba(255,0,110,0.5),rgba(191,0,255,0.5));box-shadow:0 0 25px rgba(255,0,110,0.4)}
.btn-go{border-color:rgba(57,255,20,0.7);background:linear-gradient(135deg,rgba(57,255,20,0.2),rgba(0,212,255,0.2));font-size:18px;padding:16px 48px}
.btn-go:hover{background:linear-gradient(135deg,rgba(57,255,20,0.4),rgba(0,212,255,0.4));box-shadow:0 0 40px rgba(57,255,20,0.5);transform:translateY(-3px)}
.input-field{background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-family:'Rajdhani',sans-serif;font-size:16px;padding:12px 16px;width:100%;transition:border-color .2s;outline:none}
.input-field:focus{border-color:rgba(0,212,255,0.6);box-shadow:0 0 15px rgba(0,212,255,0.15)}
.input-field::placeholder{color:rgba(255,255,255,0.3)}
select.input-field option{background:#0d0030;color:#fff}
.road-stripe{animation:roadMove 0.3s linear infinite}
@keyframes roadMove{0%{transform:translateY(0)}100%{transform:translateY(40px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes glow{0%,100%{text-shadow:0 0 10px currentColor}50%{text-shadow:0 0 30px currentColor,0 0 60px currentColor}}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes checkered{0%{background-position:0 0}100%{background-position:40px 40px}}
@keyframes speedLine{from{transform:translateX(-100%)}to{transform:translateX(200%)}}
@keyframes raceCar{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-4px) rotate(1deg)}}
.slide-up{animation:slideUp 0.4s ease forwards}
.glow-text{animation:glow 2s ease-in-out infinite}
.speed-flash{animation:pulse 0.15s ease infinite}
`;
document.head.appendChild(style);

// ─── Road Animation Component ────────────────────────────────────────────────
function Road({ speed = 0, direction = "vertical", active = false }) {
  const stripes = 8;
  const isVert = direction === "vertical";
  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      background: "linear-gradient(180deg, #0a0010 0%, #1a0030 50%, #0a0010 100%)",
      overflow: "hidden", borderRadius: 12,
    }}>
      {/* Road surface */}
      <div style={{
        position: "absolute", inset: 0,
        background: isVert
          ? "linear-gradient(180deg, #1a1a2e, #16213e, #0f3460)"
          : "linear-gradient(90deg, #1a1a2e, #16213e, #0f3460)",
      }} />
      {/* Lane markings */}
      {Array.from({ length: stripes }).map((_, i) => (
        <div key={i} className={active ? "road-stripe" : ""} style={{
          position: "absolute",
          animationDuration: active ? `${Math.max(0.05, 0.3 - speed * 0.001)}s` : "none",
          ...(isVert ? {
            left: "50%", width: 4, height: "12%",
            top: `${i * 12.5 - 5}%`, transform: "translateX(-50%)",
            background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.6), transparent)",
          } : {
            top: "50%", height: 4, width: "12%",
            left: `${i * 12.5 - 5}%`, transform: "translateY(-50%)",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
          }),
          borderRadius: 2,
        }} />
      ))}
      {/* Speed lines */}
      {active && speed > 5 && Array.from({ length: Math.min(12, Math.floor(speed)) }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${Math.random() * 90 + 5}%`,
          left: "-20%",
          width: `${20 + Math.random() * 30}%`,
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(0,212,255,${0.3 + Math.random() * 0.4}), transparent)`,
          animation: `speedLine ${0.2 + Math.random() * 0.3}s linear ${Math.random() * 0.3}s infinite`,
        }} />
      ))}
      {/* Checkered finish line hint */}
      <div style={{
        position: "absolute", ...(isVert ? { bottom: 8, left: 0, right: 0, height: 12 } : { right: 8, top: 0, bottom: 0, width: 12 }),
        backgroundImage: "repeating-conic-gradient(#fff 0% 25%, transparent 0% 50%)",
        backgroundSize: "8px 8px",
        opacity: 0.3, borderRadius: 2,
      }} />
    </div>
  );
}

// ─── SpeedMeter ──────────────────────────────────────────────────────────────
function SpeedMeter({ speedIPS, maxIPS = 40 }) {
  const mph = (speedIPS * 3600 / 63360).toFixed(1);
  const pct = Math.min(100, (speedIPS / maxIPS) * 100);
  const color = pct > 80 ? COLORS.accent3 : pct > 50 ? COLORS.accent1 : COLORS.accent2;
  return (
    <div className="glass" style={{ padding: "16px 20px", textAlign: "center", minWidth: 160 }}>
      <div className="orb" style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 20px ${color}` }}>
        {speedIPS.toFixed(1)}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, marginBottom: 8 }}>IN/SEC</div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", marginBottom: 8 }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: `linear-gradient(90deg, ${COLORS.accent2}, ${color})`, transition: "width 0.1s", boxShadow: `0 0 8px ${color}` }} />
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{mph} <span style={{ color: COLORS.accent2 }}>mph</span></div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function SwipeRacer() {
  const [screen, setScreen] = useState(SCREEN.SPLASH);
  const [player, setPlayer] = useState(null);
  const [raceConfig, setRaceConfig] = useState({ direction: "vertical", type: "timed", mode: "solo", duration: 10, distance: 500 });
  const [raceState, setRaceState] = useState(null);
  const [raceResult, setRaceResult] = useState(null);
  const [allPlayers, setAllPlayers] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [myHistory, setMyHistory] = useState([]);

  // Load persistent data
  useEffect(() => {
    (async () => {
      const players = await db.get("players") || {};
      const lb = await db.get("leaderboard") || [];
      setAllPlayers(players);
      setLeaderboard(lb);
    })();
  }, []);

  const savePlayer = async (p) => {
    const updated = { ...allPlayers, [p.handle]: p };
    setAllPlayers(updated);
    await db.set("players", updated);
    setPlayer(p);
  };

  const saveResult = async (result) => {
    const lb = await db.get("leaderboard") || [];
    lb.unshift(result);
    const trimmed = lb.slice(0, 100);
    setLeaderboard(trimmed);
    await db.set("leaderboard", trimmed);
    const hist = myHistory.concat([result]).slice(-20);
    setMyHistory(hist);
    const key = `history_${result.handle}`;
    const existing = await db.get(key) || [];
    await db.set(key, [result, ...existing].slice(0, 50));
  };

  const loadMyHistory = async (handle) => {
    const h = await db.get(`history_${handle}`) || [];
    setMyHistory(h);
  };

  // ── Screens ────────────────────────────────────────────────────────────────
  if (screen === SCREEN.SPLASH) return <SplashScreen onStart={() => setScreen(SCREEN.REGISTER)} />;
  if (screen === SCREEN.REGISTER) return (
    <RegisterScreen
      allPlayers={allPlayers}
      onRegister={async (p) => {
        await savePlayer(p);
        await loadMyHistory(p.handle);
        setScreen(SCREEN.LOBBY);
      }}
    />
  );
  if (screen === SCREEN.LOBBY) return (
    <LobbyScreen
      player={player}
      leaderboard={leaderboard}
      myHistory={myHistory}
      onRace={() => setScreen(SCREEN.CONFIG)}
      onDashboard={() => setScreen(SCREEN.DASHBOARD)}
      onLogout={() => { setPlayer(null); setScreen(SCREEN.REGISTER); }}
    />
  );
  if (screen === SCREEN.CONFIG) return (
    <ConfigScreen
      config={raceConfig}
      onChange={setRaceConfig}
      onStart={() => { setRaceState({ status: "countdown" }); setScreen(SCREEN.RACE); }}
      onBack={() => setScreen(SCREEN.LOBBY)}
    />
  );
  if (screen === SCREEN.RACE) return (
    <RaceScreen
      player={player}
      config={raceConfig}
      onFinish={async (result) => {
        const full = { ...result, handle: player.handle, avatar: player.avatar, config: raceConfig, date: new Date().toISOString() };
        await saveResult(full);
        setRaceResult(full);
        setScreen(SCREEN.RESULTS);
      }}
      onBack={() => setScreen(SCREEN.CONFIG)}
    />
  );
  if (screen === SCREEN.RESULTS) return (
    <ResultsScreen
      result={raceResult}
      player={player}
      onRaceAgain={() => setScreen(SCREEN.RACE)}
      onLobby={() => setScreen(SCREEN.LOBBY)}
    />
  );
  if (screen === SCREEN.DASHBOARD) return (
    <DashboardScreen
      player={player}
      leaderboard={leaderboard}
      myHistory={myHistory}
      onBack={() => setScreen(SCREEN.LOBBY)}
    />
  );
}

// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen({ onStart }) {
  return (
    <div style={{ background: COLORS.bg, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Animated background orbs */}
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: `${150 + i * 80}px`, height: `${150 + i * 80}px`,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${i % 2 === 0 ? "rgba(191,0,255,0.15)" : "rgba(0,212,255,0.1)"}, transparent 70%)`,
          left: `${10 + i * 18}%`, top: `${10 + i * 15}%`,
          animation: `spin ${8 + i * 3}s linear infinite`,
          filter: "blur(20px)",
        }} />
      ))}
      <div className="slide-up" style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ fontSize: 72, marginBottom: 8 }}>🏎️</div>
        <h1 className="orb glow-text" style={{ fontSize: "clamp(36px,8vw,72px)", fontWeight: 900, background: "linear-gradient(135deg, #bf00ff, #00d4ff, #ff006e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 4, marginBottom: 12 }}>
          SWIPE RACER
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, letterSpacing: 4, marginBottom: 48, textTransform: "uppercase" }}>
          The Ultimate Finger Speed Challenge
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
          {["⚡ Real-time Speed", "🏆 Leaderboards", "👥 Multiplayer"].map(f => (
            <span key={f} className="glass" style={{ padding: "8px 16px", fontSize: 12, color: "rgba(255,255,255,0.7)", letterSpacing: 1 }}>{f}</span>
          ))}
        </div>
        <button className="btn-neon btn-go" onClick={onStart}>START ENGINE</button>
      </div>
    </div>
  );
}

// ─── Register Screen ──────────────────────────────────────────────────────────
function RegisterScreen({ allPlayers, onRegister }) {
  const [handle, setHandle] = useState("");
  const [avatar, setAvatar] = useState("🏎️");
  const [color, setColor] = useState("#00d4ff");
  const [returning, setReturning] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = () => {
    const h = handle.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
    if (!h || h.length < 2) { setErr("Handle must be 2+ alphanumeric chars"); return; }
    if (h.length > 16) { setErr("Max 16 characters"); return; }
    const existing = allPlayers[h];
    const p = existing ? existing : { handle: h, avatar, color, created: new Date().toISOString(), races: 0, bestSpeed: 0 };
    if (!existing) p.avatar = avatar;
    onRegister(p);
  };

  const existingKeys = Object.keys(allPlayers);

  return (
    <div style={{ background: COLORS.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="glass slide-up" style={{ width: "100%", maxWidth: 440, padding: 36 }}>
        <h2 className="orb" style={{ fontSize: 22, textAlign: "center", marginBottom: 8, color: COLORS.accent2 }}>
          {returning ? "WELCOME BACK" : "CREATE RACER"}
        </h2>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 28 }}>
          {returning ? "Select your racer below" : "Register your racing handle"}
        </p>

        {existingKeys.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 8 }}>RETURNING RACERS</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {existingKeys.slice(0, 6).map(k => (
                <button key={k} className="glass" onClick={() => { setHandle(k); setAvatar(allPlayers[k].avatar || "🏎️"); setReturning(true); }}
                  style={{ cursor: "pointer", padding: "8px 14px", border: `1px solid ${handle === k ? COLORS.accent2 : "rgba(255,255,255,0.1)"}`, borderRadius: 10, background: handle === k ? "rgba(0,212,255,0.15)" : "transparent", color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{allPlayers[k].avatar}</span> {k}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, display: "block", marginBottom: 6 }}>RACING HANDLE</label>
          <input className="input-field orb" placeholder="e.g. SPEEDDEMON_99" value={handle}
            onChange={e => { setHandle(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "")); setErr(""); }}
            maxLength={16} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, display: "block", marginBottom: 8 }}>CHOOSE AVATAR</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {AVATARS.map(a => (
              <button key={a} onClick={() => setAvatar(a)} style={{
                width: 44, height: 44, borderRadius: 10, border: `2px solid ${avatar === a ? COLORS.accent1 : "rgba(255,255,255,0.1)"}`,
                background: avatar === a ? "rgba(191,0,255,0.2)" : "rgba(255,255,255,0.03)",
                fontSize: 22, cursor: "pointer", boxShadow: avatar === a ? `0 0 15px ${COLORS.accent1}` : "none",
              }}>{a}</button>
            ))}
          </div>
        </div>

        {err && <div style={{ color: COLORS.accent3, fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "rgba(255,0,110,0.1)", borderRadius: 8 }}>⚠ {err}</div>}

        <button className="btn-neon" style={{ width: "100%" }} onClick={handleSubmit}>
          {returning ? "ENTER RACE ▶" : "CREATE RACER ▶"}
        </button>
      </div>
    </div>
  );
}

// ─── Lobby Screen ─────────────────────────────────────────────────────────────
function LobbyScreen({ player, leaderboard, myHistory, onRace, onDashboard, onLogout }) {
  const top5 = leaderboard
    .filter(r => r.maxSpeed)
    .sort((a, b) => b.maxSpeed - a.maxSpeed)
    .slice(0, 5);

  const myBest = myHistory.length ? Math.max(...myHistory.map(r => r.maxSpeed || 0)) : 0;

  return (
    <div style={{ background: COLORS.bg, height: "100vh", display: "flex", flexDirection: "column", padding: 20, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 className="orb" style={{ fontSize: 20, background: "linear-gradient(90deg,#bf00ff,#00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SWIPE RACER</h1>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>RACING LEAGUE</div>
        </div>
        <div className="glass" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px" }}>
          <span style={{ fontSize: 28 }}>{player.avatar}</span>
          <div>
            <div className="orb" style={{ fontSize: 14, color: COLORS.accent2 }}>{player.handle}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{myHistory.length} RACES</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, overflowX: "auto" }}>
        {[
          { label: "BEST SPEED", val: `${myBest.toFixed(1)} in/s`, icon: "⚡" },
          { label: "TOP MPH", val: `${(myBest * 3600 / 63360).toFixed(2)}`, icon: "🏎️" },
          { label: "RACES RUN", val: myHistory.length, icon: "🏁" },
        ].map(s => (
          <div key={s.label} className="glass" style={{ flex: "0 0 auto", padding: "14px 18px", minWidth: 130 }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div className="orb" style={{ fontSize: 18, color: COLORS.accent2, fontWeight: 700 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top Racers */}
      <div className="glass-dark" style={{ flex: 1, padding: 16, overflowY: "auto", marginBottom: 16, borderRadius: 16 }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 12 }}>🏆 TOP RACERS</div>
        {top5.length === 0 && <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: 20 }}>No races yet. Be the first!</div>}
        {top5.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < top5.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <span className="orb" style={{ width: 24, color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.3)", fontSize: 13 }}>#{i + 1}</span>
            <span style={{ fontSize: 20 }}>{r.avatar}</span>
            <div style={{ flex: 1 }}>
              <div className="orb" style={{ fontSize: 13, color: "#fff" }}>{r.handle}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{new Date(r.date).toLocaleDateString()}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="orb" style={{ fontSize: 16, color: COLORS.neon, textShadow: `0 0 8px ${COLORS.neon}` }}>{r.maxSpeed?.toFixed(1)}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>in/sec</div>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn-neon btn-go" style={{ flex: 2 }} onClick={onRace}>🏁 RACE NOW</button>
        <button className="btn-neon" style={{ flex: 1 }} onClick={onDashboard}>📊 STATS</button>
        <button className="btn-neon btn-danger" style={{ flex: 1 }} onClick={onLogout}>EXIT</button>
      </div>
    </div>
  );
}

// ─── Config Screen ────────────────────────────────────────────────────────────
function ConfigScreen({ config, onChange, onStart, onBack }) {
  const set = (k, v) => onChange({ ...config, [k]: v });
  return (
    <div style={{ background: COLORS.bg, height: "100vh", display: "flex", flexDirection: "column", padding: 20, justifyContent: "center" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, marginBottom: 20, textAlign: "left" }}>← Back</button>
      <h2 className="orb" style={{ fontSize: 24, textAlign: "center", color: COLORS.accent2, marginBottom: 4 }}>RACE SETUP</h2>
      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 28 }}>Configure your race parameters</p>

      <div className="glass slide-up" style={{ maxWidth: 440, margin: "0 auto", width: "100%", padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, display: "block", marginBottom: 8 }}>SWIPE DIRECTION</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[{ val: "vertical", label: "↕ Vertical", icon: "⬆️" }, { val: "horizontal", label: "↔ Horizontal", icon: "➡️" }].map(d => (
              <button key={d.val} onClick={() => set("direction", d.val)} style={{
                padding: "14px", borderRadius: 12, border: `1px solid ${config.direction === d.val ? COLORS.accent2 : "rgba(255,255,255,0.1)"}`,
                background: config.direction === d.val ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.03)",
                color: "#fff", cursor: "pointer", fontSize: 15, fontFamily: "'Rajdhani',sans-serif",
                boxShadow: config.direction === d.val ? `0 0 20px rgba(0,212,255,0.2)` : "none",
              }}>{d.icon} {d.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, display: "block", marginBottom: 8 }}>RACE TYPE</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[{ val: "timed", label: "⏱ Timed" }, { val: "distance", label: "📏 Distance" }].map(t => (
              <button key={t.val} onClick={() => set("type", t.val)} style={{
                padding: "14px", borderRadius: 12, border: `1px solid ${config.type === t.val ? COLORS.accent1 : "rgba(255,255,255,0.1)"}`,
                background: config.type === t.val ? "rgba(191,0,255,0.15)" : "rgba(255,255,255,0.03)",
                color: "#fff", cursor: "pointer", fontSize: 15, fontFamily: "'Rajdhani',sans-serif",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {config.type === "timed" ? (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, display: "block", marginBottom: 8 }}>DURATION (SECONDS)</label>
            <select className="input-field" value={config.duration} onChange={e => set("duration", +e.target.value)}>
              {[5, 10, 15, 20, 30, 60].map(d => <option key={d} value={d}>{d}s</option>)}
            </select>
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, display: "block", marginBottom: 8 }}>TARGET SWIPES</label>
            <select className="input-field" value={config.distance} onChange={e => set("distance", +e.target.value)}>
              {[50, 100, 200, 500].map(d => <option key={d} value={d}>{d} swipes</option>)}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, display: "block", marginBottom: 8 }}>MODE</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[{ val: "solo", label: "👤 Solo" }, { val: "practice", label: "🎯 Practice" }].map(m => (
              <button key={m.val} onClick={() => set("mode", m.val)} style={{
                padding: "14px", borderRadius: 12, border: `1px solid ${config.mode === m.val ? COLORS.neon : "rgba(255,255,255,0.1)"}`,
                background: config.mode === m.val ? "rgba(57,255,20,0.1)" : "rgba(255,255,255,0.03)",
                color: "#fff", cursor: "pointer", fontSize: 15, fontFamily: "'Rajdhani',sans-serif",
              }}>{m.label}</button>
            ))}
          </div>
        </div>

        <button className="btn-neon btn-go" style={{ width: "100%" }} onClick={onStart}>
          🏁 START RACE
        </button>
      </div>
    </div>
  );
}

// ─── Race Screen ──────────────────────────────────────────────────────────────
function RaceScreen({ player, config, onFinish, onBack }) {
  const [phase, setPhase] = useState("countdown"); // countdown|racing|finished
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(config.duration);
  const [elapsed, setElapsed] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [speedHistory, setSpeedHistory] = useState([]);
  const touchRef = useRef(null);
  const lastTouchRef = useRef(null);
  const lastTimeRef = useRef(null);
  const speedSumRef = useRef(0);
  const speedCountRef = useRef(0);
  const raceStartRef = useRef(null);
  const timerRef = useRef(null);
  const raceAreaRef = useRef(null);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) { setPhase("racing"); raceStartRef.current = Date.now(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  // Race timer
  useEffect(() => {
    if (phase !== "racing") return;
    timerRef.current = setInterval(() => {
      const el = (Date.now() - raceStartRef.current) / 1000;
      setElapsed(el);
      if (config.type === "timed") {
        const left = config.duration - el;
        setTimeLeft(Math.max(0, left));
        if (left <= 0) { clearInterval(timerRef.current); finish(el); }
      }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const finish = (finalElapsed) => {
    setPhase("finished");
    const avg = speedCountRef.current > 0 ? speedSumRef.current / speedCountRef.current : 0;
    setTimeout(() => {
      onFinish({
        swipeCount: swipeCount,
        maxSpeed: maxSpeed,
        avgSpeed: avg,
        duration: finalElapsed,
        speedHistory: speedHistory.slice(-20),
      });
    }, 800);
  };

  // Touch handlers
  const onTouchStart = useCallback((e) => {
    if (phase !== "racing") return;
    e.preventDefault();
    const t = e.touches[0];
    lastTouchRef.current = { x: t.clientX, y: t.clientY };
    lastTimeRef.current = Date.now();
  }, [phase]);

  const onTouchMove = useCallback((e) => {
    if (phase !== "racing" || !lastTouchRef.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const now = Date.now();
    const dt = (now - lastTimeRef.current) / 1000;
    if (dt < 0.01) return;

    const dx = Math.abs(t.clientX - lastTouchRef.current.x);
    const dy = Math.abs(t.clientY - lastTouchRef.current.y);
    const dist = config.direction === "vertical" ? dy : dx;

    // Convert pixels to inches (assume ~160 PPI)
    const distInches = dist / 160;
    const speedIPS = distInches / dt;

    if (speedIPS > 0.1 && speedIPS < 200) {
      setCurrentSpeed(speedIPS);
      setMaxSpeed(prev => Math.max(prev, speedIPS));
      speedSumRef.current += speedIPS;
      speedCountRef.current++;
      setAvgSpeed(speedSumRef.current / speedCountRef.current);
      setSpeedHistory(prev => [...prev.slice(-50), speedIPS]);
      setSwipeCount(prev => {
        const next = prev + 1;
        if (config.type === "distance" && next >= config.distance) {
          clearInterval(timerRef.current);
          const el = (Date.now() - raceStartRef.current) / 1000;
          finish(el);
        }
        return next;
      });
    }

    lastTouchRef.current = { x: t.clientX, y: t.clientY };
    lastTimeRef.current = now;
  }, [phase, config, maxSpeed]);

  // Mouse support for desktop
  const mouseRef = useRef({ down: false });
  const onMouseDown = (e) => {
    if (phase !== "racing") return;
    mouseRef.current = { down: true, x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onMouseMove = (e) => {
    if (!mouseRef.current.down || phase !== "racing") return;
    const now = Date.now();
    const dt = (now - mouseRef.current.t) / 1000;
    if (dt < 0.02) return;
    const dx = Math.abs(e.clientX - mouseRef.current.x);
    const dy = Math.abs(e.clientY - mouseRef.current.y);
    const dist = config.direction === "vertical" ? dy : dx;
    const speedIPS = (dist / 160) / dt;
    if (speedIPS > 0.1 && speedIPS < 200) {
      setCurrentSpeed(speedIPS);
      setMaxSpeed(prev => Math.max(prev, speedIPS));
      speedSumRef.current += speedIPS;
      speedCountRef.current++;
      setAvgSpeed(speedSumRef.current / speedCountRef.current);
      setSpeedHistory(prev => [...prev.slice(-50), speedIPS]);
      setSwipeCount(prev => {
        const next = prev + 1;
        if (config.type === "distance" && next >= config.distance) {
          clearInterval(timerRef.current);
          const el = (Date.now() - raceStartRef.current) / 1000;
          finish(el);
        }
        return next;
      });
    }
    mouseRef.current = { down: true, x: e.clientX, y: e.clientY, t: now };
  };
  const onMouseUp = () => { mouseRef.current.down = false; };

  const progress = config.type === "timed"
    ? 1 - timeLeft / config.duration
    : Math.min(1, swipeCount / config.distance);

  const mph = (currentSpeed * 3600 / 63360).toFixed(2);

  return (
    <div style={{ background: COLORS.bg, height: "100vh", display: "flex", flexDirection: "column", userSelect: "none" }}>
      {/* HUD */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 22 }}>{player.avatar}</span>
          <div className="orb" style={{ fontSize: 13, color: COLORS.accent2 }}>{player.handle}</div>
        </div>
        {config.type === "timed" ? (
          <div className="orb" style={{ fontSize: 28, color: timeLeft < 3 ? COLORS.accent3 : "#fff", textShadow: timeLeft < 3 ? `0 0 20px ${COLORS.accent3}` : "none" }}>
            {timeLeft.toFixed(1)}s
          </div>
        ) : (
          <div className="orb" style={{ fontSize: 22, color: COLORS.accent2 }}>
            {swipeCount}/{config.distance}
          </div>
        )}
        <button onClick={onBack} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "rgba(255,255,255,0.5)", padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>QUIT</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "rgba(255,255,255,0.05)" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${COLORS.accent1}, ${COLORS.accent2})`, transition: "width 0.1s", boxShadow: `0 0 8px ${COLORS.accent2}` }} />
      </div>

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div style={{ textAlign: "center" }}>
            <div className="orb glow-text" style={{ fontSize: 120, fontWeight: 900, color: countdown > 1 ? COLORS.accent2 : COLORS.neon, lineHeight: 1 }}>
              {countdown === 0 ? "GO!" : countdown}
            </div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, letterSpacing: 4, marginTop: 8 }}>
              {config.direction === "vertical" ? "SWIPE UP & DOWN" : "SWIPE LEFT & RIGHT"}
            </div>
          </div>
        </div>
      )}

      {/* Race area */}
      <div ref={raceAreaRef} style={{ flex: 1, position: "relative", display: "flex", gap: 12, padding: 12 }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>

        {/* Road */}
        <div style={{ flex: 1, borderRadius: 12, overflow: "hidden", boxShadow: phase === "racing" && currentSpeed > 5 ? `0 0 30px rgba(0,212,255,0.3)` : "none" }}>
          <Road speed={currentSpeed} direction={config.direction} active={phase === "racing"} />
        </div>

        {/* Speed panel */}
        <div style={{ width: 120, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
          <SpeedMeter speedIPS={currentSpeed} maxIPS={40} />
          <div className="glass" style={{ padding: "12px", textAlign: "center" }}>
            <div className="orb" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 4 }}>MAX</div>
            <div className="orb" style={{ fontSize: 20, color: COLORS.neon, textShadow: `0 0 10px ${COLORS.neon}` }}>{maxSpeed.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>in/sec</div>
          </div>
          <div className="glass" style={{ padding: "12px", textAlign: "center" }}>
            <div className="orb" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 4 }}>AVG</div>
            <div className="orb" style={{ fontSize: 20, color: COLORS.accent1 }}>{avgSpeed.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>in/sec</div>
          </div>
          <div className="glass" style={{ padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 4 }}>SWIPES</div>
            <div className="orb" style={{ fontSize: 24, color: COLORS.accent2 }}>{swipeCount}</div>
          </div>
        </div>
      </div>

      {/* Mini speed graph */}
      <div style={{ height: 48, padding: "0 12px 8px", display: "flex", alignItems: "flex-end", gap: 1 }}>
        {speedHistory.slice(-30).map((s, i) => {
          const h = Math.min(40, (s / 40) * 40);
          return <div key={i} style={{ flex: 1, height: h, background: `hsl(${180 + (s / 40) * 120},100%,60%)`, borderRadius: "2px 2px 0 0", opacity: 0.6 + (i / 30) * 0.4 }} />;
        })}
      </div>

      {/* Touch hint */}
      {phase === "racing" && swipeCount === 0 && (
        <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
          <div style={{ display: "inline-block", padding: "12px 24px", background: "rgba(0,0,0,0.6)", borderRadius: 30, color: "rgba(255,255,255,0.6)", fontSize: 14, backdropFilter: "blur(8px)", animation: "pulse 1.5s ease infinite" }}>
            {config.direction === "vertical" ? "👆 Swipe UP & DOWN fast!" : "👈 Swipe LEFT & RIGHT fast!"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────
function ResultsScreen({ result, player, onRaceAgain, onLobby }) {
  if (!result) return null;
  const mph = (result.maxSpeed * 3600 / 63360).toFixed(3);
  const avgMph = (result.avgSpeed * 3600 / 63360).toFixed(3);

  const medals = result.maxSpeed > 20 ? "🥇" : result.maxSpeed > 10 ? "🥈" : "🥉";
  const grade = result.maxSpeed > 30 ? "S" : result.maxSpeed > 20 ? "A" : result.maxSpeed > 10 ? "B" : result.maxSpeed > 5 ? "C" : "D";
  const gradeColor = { S: COLORS.neon, A: "#FFD700", B: COLORS.accent2, C: COLORS.accent1, D: "rgba(255,255,255,0.4)" }[grade];

  return (
    <div style={{ background: COLORS.bg, height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-conic-gradient(rgba(255,255,255,0.02) 0% 25%, transparent 0% 50%)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

      <div className="glass slide-up" style={{ width: "100%", maxWidth: 400, padding: 32, textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{medals}</div>
        <h2 className="orb" style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", letterSpacing: 4, marginBottom: 4 }}>RACE COMPLETE</h2>
        <div className="orb" style={{ fontSize: 64, fontWeight: 900, color: gradeColor, textShadow: `0 0 30px ${gradeColor}`, lineHeight: 1.1, marginBottom: 20 }}>
          {grade}
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "MAX SPEED", val: `${result.maxSpeed.toFixed(2)}`, unit: "in/sec", color: COLORS.neon },
            { label: "TOP MPH", val: mph, unit: "mph", color: COLORS.accent2 },
            { label: "AVG SPEED", val: `${result.avgSpeed.toFixed(2)}`, unit: "in/sec", color: COLORS.accent1 },
            { label: "AVG MPH", val: avgMph, unit: "mph", color: COLORS.accent3 },
            { label: "TOTAL SWIPES", val: result.swipeCount, unit: "swipes", color: "#FFD700" },
            { label: "DURATION", val: result.duration.toFixed(2), unit: "seconds", color: "rgba(255,255,255,0.6)" },
          ].map(s => (
            <div key={s.label} className="glass-dark" style={{ padding: "14px 10px" }}>
              <div className="orb" style={{ fontSize: 20, color: s.color, fontWeight: 700 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>{s.unit}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Mini speed chart */}
        {result.speedHistory && result.speedHistory.length > 0 && (
          <div style={{ height: 40, display: "flex", alignItems: "flex-end", gap: 1, marginBottom: 20, padding: "0 4px" }}>
            {result.speedHistory.map((s, i) => {
              const max = Math.max(...result.speedHistory);
              const h = max > 0 ? (s / max) * 36 : 2;
              return <div key={i} style={{ flex: 1, height: h, background: `hsl(${180 + (s / max) * 120},100%,60%)`, borderRadius: "2px 2px 0 0" }} />;
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-neon btn-go" style={{ flex: 2 }} onClick={onRaceAgain}>🔄 RACE AGAIN</button>
          <button className="btn-neon" style={{ flex: 1 }} onClick={onLobby}>🏠 LOBBY</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
function DashboardScreen({ player, leaderboard, myHistory, onBack }) {
  const [tab, setTab] = useState("personal");

  const myBest = myHistory.length ? Math.max(...myHistory.map(r => r.maxSpeed || 0)) : 0;
  const myAvg = myHistory.length ? myHistory.reduce((a, r) => a + (r.avgSpeed || 0), 0) / myHistory.length : 0;
  const totalSwipes = myHistory.reduce((a, r) => a + (r.swipeCount || 0), 0);

  const globalSorted = [...leaderboard].sort((a, b) => b.maxSpeed - a.maxSpeed).slice(0, 20);
  const myRank = globalSorted.findIndex(r => r.handle === player.handle) + 1;

  return (
    <div style={{ background: COLORS.bg, height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.5)", padding: "6px 12px", cursor: "pointer", fontSize: 13 }}>← Back</button>
        <h2 className="orb" style={{ fontSize: 18, color: COLORS.accent2 }}>PERFORMANCE DASHBOARD</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, padding: "12px 16px 0" }}>
        {[{ key: "personal", label: "MY STATS" }, { key: "global", label: "LEADERBOARD" }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "10px 20px", background: "none", border: "none", cursor: "pointer",
            color: tab === t.key ? COLORS.accent2 : "rgba(255,255,255,0.4)",
            borderBottom: `2px solid ${tab === t.key ? COLORS.accent2 : "transparent"}`,
            fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: 2, transition: "all .2s",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "personal" && (
          <>
            {/* Summary stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "BEST", val: myBest.toFixed(1), unit: "in/s", color: COLORS.neon },
                { label: "AVG", val: myAvg.toFixed(1), unit: "in/s", color: COLORS.accent2 },
                { label: "RANK", val: myRank || "–", unit: "global", color: "#FFD700" },
              ].map(s => (
                <div key={s.label} className="glass" style={{ padding: "14px 10px", textAlign: "center" }}>
                  <div className="orb" style={{ fontSize: 22, color: s.color, fontWeight: 700 }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{s.unit}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 1.5 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="glass-dark" style={{ padding: 16, marginBottom: 10, borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 12 }}>RECENT RACES</div>
              {myHistory.length === 0 && <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 20 }}>No races yet</div>}
              {myHistory.slice(0, 15).map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < myHistory.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }} className="orb">{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#fff" }}>{r.config?.type === "timed" ? `${r.config.duration}s race` : `${r.config?.distance} swipes`}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{new Date(r.date).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="orb" style={{ fontSize: 15, color: COLORS.neon }}>{r.maxSpeed?.toFixed(1)}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>in/sec peak</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "global" && (
          <div className="glass-dark" style={{ borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "rgba(0,0,0,0.3)", display: "grid", gridTemplateColumns: "36px 1fr 80px 70px", gap: 8, fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5 }}>
              <span>#</span><span>RACER</span><span style={{ textAlign: "right" }}>SPEED</span><span style={{ textAlign: "right" }}>MPH</span>
            </div>
            {globalSorted.length === 0 && <div style={{ color: "rgba(255,255,255,0.3)", textAlign: "center", padding: 30 }}>No data yet</div>}
            {globalSorted.map((r, i) => {
              const isMe = r.handle === player.handle;
              return (
                <div key={i} style={{
                  padding: "12px 16px", display: "grid", gridTemplateColumns: "36px 1fr 80px 70px", gap: 8, alignItems: "center",
                  background: isMe ? "rgba(0,212,255,0.08)" : "transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  borderLeft: isMe ? `3px solid ${COLORS.accent2}` : "3px solid transparent",
                }}>
                  <span className="orb" style={{ fontSize: 13, color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.3)" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{r.avatar}</span>
                    <span className="orb" style={{ fontSize: 12, color: isMe ? COLORS.accent2 : "#fff" }}>{r.handle}</span>
                  </div>
                  <div className="orb" style={{ textAlign: "right", fontSize: 15, color: COLORS.neon }}>{r.maxSpeed?.toFixed(1)}<span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginLeft: 2 }}>i/s</span></div>
                  <div className="orb" style={{ textAlign: "right", fontSize: 13, color: COLORS.accent2 }}>{(r.maxSpeed * 3600 / 63360).toFixed(3)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
