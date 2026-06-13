import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CalendarDays, MapPin, Trophy, LayoutGrid, Clock, Search, Loader2, ChevronLeft, ChevronRight, RefreshCw, Radio } from "lucide-react";

// ─── Smart Time Configuration ─────────────────────────────────────────────
const ACTUAL_NOW = new Date();
const SIMULATED_NOW_UTC = new Date("2026-06-13T22:17:00Z"); 
const NOW = ACTUAL_NOW.getFullYear() < 2026 ? SIMULATED_NOW_UTC : ACTUAL_NOW;
// Strictly hardcoded to GMT+3 so the UI doesn't jump based on user browser
const TZ = "Europe/Istanbul"; 

// ─── Team Codes ───────────────────────────────────────────────────
const CODE_MAP = {
  "Mexico":"MEX","Canada":"CAN","United States":"USA","Brazil":"BRA","Argentina":"ARG","France":"FRA",
  "Germany":"GER","Spain":"ESP","England":"ENG","Portugal":"POR","Netherlands":"NED",
  "Belgium":"BEL","Italy":"ITA","Croatia":"CRO","Uruguay":"URU","Morocco":"MAR","Senegal":"SEN",
  "Japan":"JPN","South Korea":"KOR","Australia":"AUS","Turkey":"TUR","Switzerland":"SUI",
  "Colombia":"COL","Ecuador":"ECU","Paraguay":"PAR","South Africa":"RSA",
  "Bosnia and Herzegovina":"BIH","Qatar":"QAT","Scotland":"SCO","Curaçao":"CUW",
  "Cape Verde":"CPV","Haiti":"HAI","Saudi Arabia":"KSA","Algeria":"ALG","Austria":"AUT",
  "Jordan":"JOR","Iraq":"IRQ","Norway":"NOR","Czech Republic":"CZE","Wales":"WAL",
  "Ukraine":"UKR","Sweden":"SWE","Poland":"POL","Hungary":"HUN","Serbia":"SRB",
  "Nigeria":"NGA","Egypt":"EGY","Mali":"MLI","Ivory Coast":"CIV","Ghana":"GHA",
  "Cameroon":"CMR","Jamaica":"JAM","Panama":"PAN","Costa Rica":"CRC","New Zealand":"NZL",
  "Iran":"IRN","Tunisia":"TUN","Uzbekistan":"UZB","Democratic Republic of the Congo":"COD",
};

const getCode = (team) => {
  if (!team) return "TBD";
  if (/winner|runner|grp|match|3rd/i.test(team)) return "TBD";
  return CODE_MAP[team] || team.substring(0, 3).toUpperCase();
};

const STADIUM_MAP = {
  "1": { st: "Estadio Azteca", city: "Mexico City" },
  "2": { st: "Estadio Akron", city: "Guadalajara" },
  "3": { st: "Estadio BBVA", city: "Monterrey" },
  "4": { st: "BMO Field", city: "Toronto" },
  "5": { st: "BC Place", city: "Vancouver" },
  "6": { st: "Mercedes-Benz", city: "Atlanta" },
  "7": { st: "Gillette Stadium", city: "Boston" },
  "8": { st: "AT&T Stadium", city: "Dallas" },
  "9": { st: "NRG Stadium", city: "Houston" },
  "10": { st: "Arrowhead", city: "Kansas City" },
  "11": { st: "SoFi Stadium", city: "Los Angeles" },
  "12": { st: "Hard Rock", city: "Miami" },
  "13": { st: "MetLife Stadium", city: "New York/NJ" },
  "14": { st: "Lincoln Financial", city: "Philadelphia" },
  "15": { st: "Levi's Stadium", city: "SF Bay Area" },
  "16": { st: "Lumen Field", city: "Seattle" }
};

// ─── Formatting Helpers ─────────────────────────────────────────────
const fmt = (utc, opts) => utc ? new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts }).format(new Date(utc)) : "TBD";
const fmtTime   = (utc) => fmt(utc, { hour:"2-digit", minute:"2-digit", hour12:false });
const fmtDate   = (utc) => fmt(utc, { weekday:"short", month:"short", day:"numeric" });
const fmtDay    = (utc) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date(utc));

const stageName = (s) => ({
  "group-stage":"Group Stage", "round-of-32":"Round of 32", "round-of-16":"Round of 16",
  "quarter-finals":"Quarter-Finals", "semi-finals":"Semi-Finals", "final":"Final",
}[s] || s);

// ─── Local Match Logic ──────────────────────────────────────────────
const getMatchStatus = (kickoffUtc) => {
  const start = new Date(kickoffUtc).getTime();
  const current = NOW.getTime();
  const end = start + (115 * 60000); // approx 115 minutes duration

  if (current < start) return "upcoming";
  if (current >= start && current <= end) return "live";
  return "finished";
};

// ─── Fallback Data Generator ────────────────────────────────────────────
function buildFallback() {
  // Aligned fallback seed exactly with the API's Eastern Time (EDT, -04:00) hours 
  // so the UI doesn't jump or change when the API loads.
  const seed = [
    {n:1, k:"2026-06-11T13:00:00-04:00", grp:"A", h:"Mexico",       a:"South Africa",         st:"Estadio Azteca",   city:"Mexico City", hs: 2, as: 0},
    {n:2, k:"2026-06-11T20:00:00-04:00", grp:"A", h:"South Korea",  a:"Czech Republic",        st:"Estadio Akron",    city:"Guadalajara", hs: 2, as: 1},
    {n:3, k:"2026-06-12T15:00:00-04:00", grp:"B", h:"Canada",       a:"Bosnia and Herzegovina",st:"BMO Field",        city:"Toronto", hs: 1, as: 1},
    {n:4, k:"2026-06-12T18:00:00-04:00", grp:"D", h:"United States",a:"Paraguay",              st:"SoFi Stadium",     city:"Los Angeles", hs: 4, as: 1},
    {n:5, k:"2026-06-13T21:00:00-04:00", grp:"C", h:"Haiti",        a:"Scotland",              st:"Gillette Stadium", city:"Boston"},
    {n:6, k:"2026-06-13T21:00:00-04:00", grp:"D", h:"Australia",    a:"Turkey",                st:"BC Place",         city:"Vancouver"},
    {n:7, k:"2026-06-13T18:00:00-04:00", grp:"C", h:"Brazil",       a:"Morocco",               st:"MetLife Stadium",  city:"New York/NJ", hs: 1, as: 1}, // LIVE on SIMULATED_NOW
    {n:8, k:"2026-06-13T12:00:00-04:00", grp:"B", h:"Qatar",        a:"Switzerland",           st:"Levi's Stadium",   city:"SF Bay Area", hs: 1, as: 1},
    {n:9, k:"2026-06-14T19:00:00-04:00", grp:"E", h:"Ivory Coast",  a:"Ecuador",               st:"NRG Stadium",      city:"Houston"},
    {n:10,k:"2026-06-14T12:00:00-04:00", grp:"E", h:"Germany",      a:"Curaçao",               st:"AT&T Stadium",     city:"Dallas"},
  ];

  const stadia = ["MetLife Stadium","SoFi Stadium","AT&T Stadium","NRG Stadium","BC Place","BMO Field","Estadio Azteca","Hard Rock Stadium","Lincoln Financial","Gillette Stadium","Levi's Stadium","Lumen Field","Arrowhead Stadium","Estadio Akron"];
  const cities = ["New York/NJ","Los Angeles","Dallas","Houston","Vancouver","Toronto","Mexico City","Miami","Philadelphia","Boston","SF Bay Area","Seattle","Kansas City","Guadalajara"];
  const groups = "ABCDEFGHIJKL".split("");

  const matches = seed.map(s => ({
    matchNumber:s.n, kickoffUtc:s.k, stage:"group-stage", group:s.grp,
    homeTeam:s.h, awayTeam:s.a, stadium:s.st, hostCity:s.city,
    hs: s.hs, as: s.as
  }));

  for (let i = 11; i <= 72; i++) {
    const day = 14 + Math.floor((i-11)/4);
    const hour = [13,16,19,22][(i-1)%4];
    const mo = day > 30 ? "07" : "06";
    const d  = day > 30 ? String(day-30).padStart(2,"0") : String(day).padStart(2,"0");
    const grp = groups[(i-11)%12];
    const si = (i-11) % stadia.length;
    matches.push({
      // Explicitly set fallback hours to EDT (-04:00) so it matches API
      matchNumber:i, kickoffUtc:`2026-${mo}-${d}T${String(hour).padStart(2,"0")}:00:00-04:00`,
      stage:"group-stage", group:grp,
      homeTeam:`Group ${grp} #1`, awayTeam:`Group ${grp} #2`,
      stadium:stadia[si], hostCity:cities[si],
    });
  }

  const koStages = [
    {stage:"round-of-32",   count:16, startN:73,  baseDay:"2026-06-28"},
    {stage:"round-of-16",   count:8,  startN:89,  baseDay:"2026-07-04"},
    {stage:"quarter-finals",count:4,  startN:97,  baseDay:"2026-07-09"},
    {stage:"semi-finals",   count:2,  startN:101, baseDay:"2026-07-14"},
    {stage:"final",         count:1,  startN:104, baseDay:"2026-07-19"}, 
  ];
  
  koStages.forEach(({stage, count, startN, baseDay}) => {
    for (let i = 0; i < count; i++) {
      const d = new Date(`${baseDay}T20:00:00-04:00`);
      d.setDate(d.getDate() + Math.floor(i/2));
      matches.push({
        matchNumber:startN+i, kickoffUtc:d.toISOString(), stage,
        homeTeam:`Winner M${startN-count*2+i*2-1 || 'TBD'}`, 
        awayTeam:`Winner M${startN-count*2+i*2 || 'TBD'}`,
        stadium:stadia[i % stadia.length], hostCity:cities[i % cities.length],
      });
    }
  });

  return matches.map(m => {
    const status = getMatchStatus(m.kickoffUtc);
    let h = null, a = null, mins = null;
    
    if (status === "finished") {
      h = m.hs !== undefined ? m.hs : (m.matchNumber % 3);
      a = m.as !== undefined ? m.as : (m.matchNumber % 2);
    } else if (status === "live") {
      h = m.hs !== undefined ? m.hs : 0;
      a = m.as !== undefined ? m.as : 0;
      mins = Math.floor((NOW.getTime() - new Date(m.kickoffUtc).getTime()) / 60000);
    }
    
    return { ...m, status, homeScore: h, awayScore: a, minsPlayed: mins };
  });
}

// ─── API Integration ───────────────────────────────────────────
async function fetchMatchesAPI() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const r = await fetch("https://worldcup26.ir/get/games", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!r.ok) return null;
    const json = await r.json();
    const arr = json.games || json.matches || (Array.isArray(json) ? json : null);
    if (!arr || arr.length === 0) return null;

    return arr.map(g => {
      // Parse Scores safely
      const hs = (g.home_score === null || g.home_score === "null" || g.home_score === "") ? null : parseInt(g.home_score);
      const as = (g.away_score === null || g.away_score === "null" || g.away_score === "") ? null : parseInt(g.away_score);

      const stageMap = {
        "group": "group-stage", "r32": "round-of-32", "r16": "round-of-16",
        "qf": "quarter-finals", "sf": "semi-finals", "third": "third-place", "final": "final"
      };
      const stage = stageMap[g.type?.toLowerCase()] || "group-stage";

      let hTeam = g.home_team_name_en;
      let aTeam = g.away_team_name_en;
      if (!hTeam || hTeam === "TBD" || hTeam === "") hTeam = g.home_team_label || `TBD`;
      if (!aTeam || aTeam === "TBD" || aTeam === "") aTeam = g.away_team_label || `TBD`;

      // CRITICAL FIX: Date parser now treats API local_date as Eastern Time (-04:00) 
      // instead of UTC, preventing the times from jumping!
      let kickoffUtc = new Date().toISOString();
      if (g.local_date) {
        const [datePart, timePart] = g.local_date.split(" ");
        const [mo, da, ye] = (datePart || "").split("/");
        if (ye && mo && da && timePart) {
          kickoffUtc = `${ye}-${mo.padStart(2, '0')}-${da.padStart(2, '0')}T${timePart}:00-04:00`;
        }
      }

      // CRITICAL FIX: Completely decoupled Live & Finished status from our clock!
      // The app will now completely trust the API's fields.
      let status = "upcoming";
      if (g.finished === "TRUE" || g.time_elapsed === "finished") {
        status = "finished";
      } else if (g.time_elapsed === "live" || (g.time_elapsed && g.time_elapsed.includes("'"))) {
        status = "live";
      }

      const venue = STADIUM_MAP[g.stadium_id] || { st: `Stadium ${g.stadium_id}`, city: "TBD" };

      return {
        matchNumber: parseInt(g.id) || 0,
        kickoffUtc,
        stage,
        group: g.type === "group" ? g.group : null,
        homeTeam: hTeam,
        awayTeam: aTeam,
        stadium: venue.st,
        hostCity: venue.city,
        homeScore: hs,
        awayScore: as,
        status,
        minsPlayed: g.time_elapsed === "live" ? "Live" : (status === "live" ? g.time_elapsed : null)
      };
    });
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn("API Fetch Timeout/Error, falling back to local data.");
    return null;
  }
}

// ─── UI Components ─────────────────────────────────────────────

function FIFA26Logo() {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center font-black italic tracking-tighter transform -skew-x-6 shrink-0">
      <span className="absolute text-3xl text-emerald-400 z-10 translate-x-[-4px] translate-y-[-2px] mix-blend-screen drop-shadow-lg">2</span>
      <span className="absolute text-3xl text-purple-500 z-0 translate-x-[6px] translate-y-[4px] mix-blend-screen drop-shadow-lg">6</span>
      <span className="absolute text-xl text-white z-20">🏆</span>
    </div>
  );
}

function MatchCard({ m }) {
  const isLive = m.status === "live";
  const isFinished = m.status === "finished";
  const hasScore = m.homeScore !== null && m.awayScore !== null;
  const hw = hasScore && m.homeScore > m.awayScore;
  const aw = hasScore && m.awayScore > m.homeScore;

  return (
    <div className={`relative flex flex-col gap-0 rounded-2xl p-5 overflow-hidden transition-all duration-300
      ${isLive ? 'bg-zinc-900 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20' : 
        isFinished ? 'bg-zinc-950/80 border border-zinc-800 opacity-90' : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:-translate-y-1'}`}
    >
      {/* Top Graphic Border */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${isLive ? 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500' : isFinished ? 'bg-zinc-800' : 'bg-gradient-to-r from-purple-600 to-cyan-500'}`} />

      {/* Header */}
      <div className="flex justify-between items-center mb-4 mt-1">
        <div className="flex gap-2 items-center">
          <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
            M{m.matchNumber}
          </span>
          {m.group && (
            <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">Grp {m.group}</span>
          )}
        </div>
        
        {isLive ? (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE {m.minsPlayed ? `${m.minsPlayed}'` : ''}
          </div>
        ) : isFinished ? (
          <span className="bg-zinc-800/50 text-zinc-400 text-[10px] font-bold px-2 py-1 rounded-full tracking-wider border border-zinc-700/50">FT</span>
        ) : (
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
            <Clock size={12} /> {fmtTime(m.kickoffUtc)}
          </div>
        )}
      </div>

      {/* Teams & Score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-4">
        {/* Home */}
        <div className="flex flex-col items-end gap-1.5 text-right">
          <span className="text-2xl font-black text-zinc-400 tracking-widest">{getCode(m.homeTeam)}</span>
          <span className={`text-sm leading-tight max-w-[100px] ${hw ? 'font-black text-white' : isFinished ? 'font-medium text-zinc-500' : 'font-bold text-zinc-200'}`}>
            {m.homeTeam || "TBD"}
          </span>
        </div>

        {/* Score Area */}
        <div className="text-center min-w-[70px]">
          {hasScore ? (
            <div className={`text-3xl font-black tabular-nums tracking-tighter flex justify-center gap-1.5
              ${isLive ? 'text-emerald-400' : 'text-white'}`}>
              <span className={isFinished && aw && !hw ? 'text-zinc-500' : ''}>{m.homeScore}</span>
              <span className="text-zinc-600">-</span>
              <span className={isFinished && hw && !aw ? 'text-zinc-500' : ''}>{m.awayScore}</span>
            </div>
          ) : (
            <div className="text-zinc-600 font-black text-sm bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-inner">
              VS
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-start gap-1.5 text-left">
          <span className="text-2xl font-black text-zinc-400 tracking-widest">{getCode(m.awayTeam)}</span>
          <span className={`text-sm leading-tight max-w-[100px] ${aw ? 'font-black text-white' : isFinished ? 'font-medium text-zinc-500' : 'font-bold text-zinc-200'}`}>
            {m.awayTeam || "TBD"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-zinc-800/60 flex justify-between items-center gap-2 mt-auto">
        <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] sm:text-xs truncate">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{m.stadium}, {m.hostCity}</span>
        </div>
        <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-wider shrink-0">{stageName(m.stage)}</span>
      </div>
    </div>
  );
}

function BracketMatch({ m }) {
  const isFinished = m.status === "finished";
  const hasScore = m.homeScore !== null && m.awayScore !== null;
  const hw = hasScore && m.homeScore > m.awayScore;
  const aw = hasScore && m.awayScore > m.homeScore;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden w-44 shadow-lg shrink-0 text-sm flex flex-col">
      <div className="bg-zinc-950/50 text-[10px] text-zinc-500 font-bold px-2 py-1 flex justify-between border-b border-zinc-800">
        <span>M{m.matchNumber}</span>
        <span>{fmtDate(m.kickoffUtc)}</span>
      </div>
      {[
        { team: m.homeTeam, score: m.homeScore, win: hw },
        { team: m.awayTeam, score: m.awayScore, win: aw },
      ].map((side, i) => (
        <div key={i} className={`flex justify-between items-center px-2 py-1.5 border-zinc-800 ${i===0 ? 'border-b' : ''} ${side.win ? 'bg-emerald-900/20' : ''}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-black text-zinc-400 w-7 shrink-0 tracking-wider">{getCode(side.team)}</span>
            <span className={`truncate max-w-[80px] text-xs ${side.win ? 'text-white font-bold' : isFinished ? 'text-zinc-500' : 'text-zinc-300'}`}>
              {side.team}
            </span>
          </div>
          <span className={`font-black ml-1 text-xs ${side.win ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {(isFinished || m.status === "live") && hasScore ? side.score : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Application ─────────────────────────────────────────────────

export default function App() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("daily");
  const [search, setSearch] = useState("");
  const [activeDay, setActiveDay] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const loadData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    
    // 1. Try to fetch live data from APIs
    let data = await fetchMatchesAPI();

    // 2. Fallback to our rock-solid simulated data if API fails or has no games yet
    if (!data || data.length === 0) {
      data = buildFallback();
    }

    setMatches(data);
    setLastUpdated(new Date());
    setLoading(false);
    if (manual) setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    // Auto refresh every 30 seconds for live updates
    const t = setInterval(() => loadData(), 30000);
    return () => clearInterval(t);
  }, [loadData]);

  const sorted = useMemo(() => [...matches].sort((a,b) => new Date(a.kickoffUtc) - new Date(b.kickoffUtc)), [matches]);
  
  const uniqueDays = useMemo(() => {
    const s = new Set(sorted.map(m => fmtDay(m.kickoffUtc)));
    return [...s];
  }, [sorted]);

  useEffect(() => {
    if (uniqueDays.length && !activeDay) {
      const todayStr = fmtDay(NOW.toISOString());
      // Default to today if matches exist, otherwise first day
      setActiveDay(uniqueDays.includes(todayStr) ? todayStr : uniqueDays[0]);
    }
  }, [uniqueDays, activeDay]);

  const dailyMatches = useMemo(() => sorted.filter(m => {
    if (fmtDay(m.kickoffUtc) !== activeDay) return false;
    const q = search.toLowerCase();
    return !q || [m.homeTeam, m.awayTeam, m.stadium, m.hostCity].some(v => v?.toLowerCase().includes(q));
  }), [sorted, activeDay, search]);

  const koStages = ["round-of-32", "round-of-16", "quarter-finals", "semi-finals", "final"];
  const koByStage = useMemo(() => {
    const map = {};
    koStages.forEach(s => { map[s] = sorted.filter(m => m.stage === s); });
    return map;
  }, [sorted]);

  // ─── Group Standings Calculator ───
  const groupStandings = useMemo(() => {
    const groups = {};
    // Initialize 12 groups (A through L)
    "ABCDEFGHIJKL".split("").forEach(g => { groups[g] = {}; });

    sorted.filter(m => m.stage === "group-stage" && m.group).forEach(m => {
      const g = m.group;
      if (!groups[g]) groups[g] = {};

      // Ignore placeholder names for future un-drawn matches
      const isPlaceholder = (t) => !t || /Group [A-L] #\d/i.test(t);

      if (!isPlaceholder(m.homeTeam)) {
        if (!groups[g][m.homeTeam]) groups[g][m.homeTeam] = { name: m.homeTeam, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
      }
      if (!isPlaceholder(m.awayTeam)) {
        if (!groups[g][m.awayTeam]) groups[g][m.awayTeam] = { name: m.awayTeam, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
      }

      const hasScore = m.homeScore !== null && m.awayScore !== null;
      if ((m.status === "finished" || m.status === "live") && hasScore && !isPlaceholder(m.homeTeam) && !isPlaceholder(m.awayTeam)) {
        const hs = m.homeScore;
        const as = m.awayScore;
        const ht = groups[g][m.homeTeam];
        const at = groups[g][m.awayTeam];
        
        // Update stats
        ht.p += 1; at.p += 1;
        ht.gf += hs; ht.ga += as;
        at.gf += as; at.ga += hs;
        ht.gd += (hs - as); at.gd += (as - hs);

        // Win/Loss/Draw
        if (hs > as) {
          ht.w += 1; ht.pts += 3; at.l += 1;
        } else if (as > hs) {
          at.w += 1; at.pts += 3; ht.l += 1;
        } else {
          ht.d += 1; ht.pts += 1; at.d += 1; at.pts += 1;
        }
      }
    });

    const result = {};
    Object.keys(groups).forEach(g => {
      // Sort standings by: Points, then Goal Difference, then Goals For
      result[g] = Object.values(groups[g]).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
      });
      // Pad any missing teams in incomplete groups to always show 4 slots
      while (result[g].length < 4) {
        result[g].push({ name: `TBD`, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0, isTbd: true });
      }
    });
    return result;
  }, [sorted]);

  const totalMatches = matches.length;
  const finishedCount = matches.filter(m => m.status === "finished").length;
  const liveCount = matches.filter(m => m.status === "live").length;
  const upcomingCount = matches.filter(m => m.status === "upcoming").length;

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-white">
      <Loader2 size={48} className="text-purple-500 animate-spin" />
      <p className="text-cyan-400 font-bold tracking-widest text-sm animate-pulse">LOADING LIVE DATA...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-purple-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <FIFA26Logo />
              <div>
                <h1 className="font-black text-xl tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                  WC26 TRACKER
                </h1>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                  World Cup 2026 • Live Updates • GMT+3
                </p>
              </div>
            </div>
            
            {/* Mobile Nav Toggle / Refresh */}
            <div className="flex sm:hidden items-center gap-2">
               <button onClick={() => loadData(true)} className="p-2 bg-zinc-900 rounded-lg text-cyan-400 border border-zinc-800">
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
               </button>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            {/* Live Indicator */}
            {liveCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold animate-pulse whitespace-nowrap">
                <Radio size={12} /> {liveCount} LIVE
              </div>
            )}
            
            {/* Nav Tabs */}
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-full sm:w-auto">
              {[
                { id: "daily", label: "Matches", icon: <CalendarDays size={14}/> },
                { id: "groups", label: "Groups", icon: <LayoutGrid size={14}/> },
                { id: "bracket", label: "Bracket", icon: <Trophy size={14}/> }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setPage(tab.id)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
                    ${page === tab.id ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Desktop Refresh */}
            <button onClick={() => loadData(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-cyan-400 text-xs font-bold hover:bg-zinc-800 transition-colors">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { l: "Total Matches", v: totalMatches, c: "text-cyan-400" },
            { l: "Played", v: finishedCount, c: "text-zinc-300" },
            { l: "Live Now", v: liveCount, c: "text-emerald-400 animate-pulse" },
            { l: "Upcoming", v: upcomingCount, c: "text-purple-400" }
          ].map(s => (
            <div key={s.l} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 flex flex-col justify-center items-center text-center">
              <span className={`text-2xl sm:text-3xl font-black ${s.c} drop-shadow-sm`}>{s.v}</span>
              <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider mt-1">{s.l}</span>
            </div>
          ))}
        </div>

        {/* ── DAILY VIEW ── */}
        {page === "daily" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Day Nav */}
            <div className="flex items-center gap-2 mb-6 w-full">
              <button 
                onClick={() => { const idx = uniqueDays.indexOf(activeDay); if (idx > 0) setActiveDay(uniqueDays[idx-1]); }}
                disabled={uniqueDays.indexOf(activeDay) === 0}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 shrink-0"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex gap-2 overflow-x-auto hide-scrollbar flex-1 pb-1">
                {uniqueDays.map(d => {
                  const isActive = d === activeDay;
                  const isToday = d === fmtDay(NOW.toISOString());
                  return (
                    <button 
                      key={d} 
                      onClick={() => setActiveDay(d)}
                      className={`shrink-0 px-4 py-2 rounded-lg border text-xs font-bold transition-all
                        ${isActive ? 'bg-zinc-100 text-zinc-950 border-zinc-100 shadow-md scale-[1.02]' : 
                          isToday ? 'bg-zinc-800 border-zinc-700 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80'}`}
                    >
                      {isToday && <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>}
                      {new Intl.DateTimeFormat("en-US", { month:"short", day:"numeric", timeZone: TZ }).format(new Date(d+"T12:00:00Z"))}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => { const idx = uniqueDays.indexOf(activeDay); if (idx < uniqueDays.length-1) setActiveDay(uniqueDays[idx+1]); }}
                disabled={uniqueDays.indexOf(activeDay) === uniqueDays.length - 1}
                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 shrink-0"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <CalendarDays className="text-purple-500" />
                {activeDay ? fmtDate(activeDay+"T12:00:00Z") : "—"}
              </h2>
              
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search teams or venues..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm font-medium text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>

            {/* Matches Grid */}
            {dailyMatches.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center">
                <span className="text-4xl mb-3 opacity-50">🏟️</span>
                <p className="text-zinc-400 font-bold">No matches scheduled for this date.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {dailyMatches.map(m => <MatchCard key={m.matchNumber} m={m} />)}
              </div>
            )}
          </div>
        )}

        {/* ── GROUPS VIEW ── */}
        {page === "groups" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <LayoutGrid className="text-emerald-400" /> Group Standings
              </h2>
              <p className="text-sm text-zinc-500 mt-1 font-medium">Top 2 advance automatically. Top 8 third-place teams also advance.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.keys(groupStandings).sort().map(grp => (
                <div key={grp} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="bg-zinc-950/80 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                    <span className="font-black text-cyan-400 tracking-widest text-sm">GROUP {grp}</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-900/50 text-zinc-500 font-bold border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2 w-6 text-center">#</th>
                        <th className="px-2 py-2">Team</th>
                        <th className="px-1 py-2 text-center" title="Played">P</th>
                        <th className="px-1 py-2 text-center" title="Goal Difference">GD</th>
                        <th className="px-3 py-2 text-center font-black text-white" title="Points">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {groupStandings[grp].map((team, idx) => (
                        <tr key={team.name + idx} className={`${idx < 2 ? 'bg-emerald-900/10' : idx === 2 ? 'bg-zinc-800/40' : ''}`}>
                          <td className={`px-3 py-2.5 text-center font-bold ${idx < 2 ? 'text-emerald-400' : idx === 2 ? 'text-cyan-400' : 'text-zinc-600'}`}>{idx + 1}</td>
                          <td className="px-2 py-2.5 font-bold text-zinc-200 flex items-center gap-2">
                            <span className="w-7 text-[10px] font-black text-zinc-400 tracking-wider text-center shrink-0">{getCode(team.isTbd ? null : team.name)}</span>
                            <span className="truncate max-w-[90px]">{team.isTbd ? "TBD" : team.name}</span>
                          </td>
                          <td className="px-1 py-2.5 text-center text-zinc-400">{team.p}</td>
                          <td className="px-1 py-2.5 text-center text-zinc-400">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                          <td className="px-3 py-2.5 text-center font-black text-white text-sm">{team.pts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BRACKET VIEW ── */}
        {page === "bracket" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Trophy className="text-emerald-400" /> Knockout Stage
              </h2>
              <p className="text-sm text-zinc-500 mt-1 font-medium">Swipe horizontally to view the full tournament tree.</p>
            </div>

            {/* Bracket Container */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 overflow-x-auto hide-scrollbar">
              <div className="flex gap-8 min-w-max pb-4">
                {koStages.map((stage) => {
                  const stageMatches = koByStage[stage] || [];
                  return (
                    <div key={stage} className="flex flex-col gap-4">
                      <div className="text-center bg-zinc-950 border border-zinc-800 rounded-lg py-2 sticky top-0 z-10 shadow-md">
                        <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">{stageName(stage)}</span>
                      </div>
                      
                      <div className="flex flex-col justify-around flex-1 gap-4">
                        {stageMatches.map(m => (
                          <BracketMatch key={m.matchNumber} m={m} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}