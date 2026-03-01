import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, Circle, Clock, Play, RotateCcw,
  AlertTriangle, Coffee, Timer, ChevronDown, ChevronRight,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────

interface Activity {
  id: string; name: string; plannedMinutes: number;
  phase: number; isBreak?: boolean; description?: string;
}
interface ActivityState {
  completed: boolean; actualStartTime: string; actualEndTime: string;
}

const ACTIVITIES: Activity[] = [
  { id: "welcome", name: "Bienvenida y presentación del taller", plannedMinutes: 8, phase: 1, description: "Qué vamos a hacer, reglas, dinámica de equipos" },
  { id: "mentimeter", name: "Mentimeter rápido", plannedMinutes: 7, phase: 1, description: "Romper el hielo, pulso inicial al grupo" },
  { id: "challenges", name: "Elección de retos por equipos", plannedMinutes: 5, phase: 1, description: "4 retos disponibles, cada equipo escoge" },
  { id: "research", name: "Investigación en Perplexity + post-its", plannedMinutes: 25, phase: 1, description: "Buscar hechos, datos, evidencias y anotarlos" },
  { id: "clustering", name: "Agrupación por frecuencia + selección", plannedMinutes: 15, phase: 1, description: "Clusterizar post-its, elegir problema principal" },
  { id: "empathy", name: "Mapa de empatía", plannedMinutes: 30, phase: 2, description: "Piensa, siente, ve, hace, dice + pains & gains" },
  { id: "break", name: "☕ DESCANSO", plannedMinutes: 15, phase: 2, isBreak: true, description: "Pausa para café y descanso" },
  { id: "hmw", name: "How Might We", plannedMinutes: 15, phase: 2, description: "Convertir insights en '¿Cómo podríamos…?'" },
  { id: "ideation", name: "Ideación de soluciones", plannedMinutes: 20, phase: 3, description: "Tech, no tech, Elon Musk, mi padre/madre" },
  { id: "pitch", name: "Construcción del pitch", plannedMinutes: 15, phase: 3, description: "Nombre, logo, clientes, propuesta de valor, diferenciación" },
  { id: "deliverables", name: "Creación de entregables con IA", plannedMinutes: 25, phase: 3, description: "Gamma PP, Lovable landing, HeyGen/guión 1 min" },
  { id: "polish", name: "Últimos retoques", plannedMinutes: 10, phase: 4, description: "Pulir entregables antes de presentar" },
  { id: "presentations", name: "Presentaciones (8 eq. × 3 min)", plannedMinutes: 24, phase: 4, description: "Cada equipo presenta su solución" },
  { id: "voting", name: "Votación y benchmarking", plannedMinutes: 10, phase: 4, description: "Mentimeter: cada equipo vota al mejor (no al suyo)" },
  { id: "closing", name: "Anuncio del ganador + cierre", plannedMinutes: 10, phase: 4, description: "Reflexión final y despedida" },
];

const PHASE_NAMES: Record<number, string> = {
  1: "Contexto e Investigación", 2: "Empatía y Reencuadre",
  3: "Ideación y Producción", 4: "Presentaciones y Cierre",
};
const PHASE_BG: Record<number, string> = { 1: "bg-blue-600", 2: "bg-amber-600", 3: "bg-emerald-600", 4: "bg-rose-600" };
const PHASE_LIGHT: Record<number, string> = { 1: "bg-blue-50 border-blue-300", 2: "bg-amber-50 border-amber-300", 3: "bg-emerald-50 border-emerald-300", 4: "bg-rose-50 border-rose-300" };
const PHASE_TXT: Record<number, string> = { 1: "text-blue-700", 2: "text-amber-700", 3: "text-emerald-700", 4: "text-rose-700" };

// ─── Helpers ─────────────────────────────────────────────────────────

function parseTime(s: string): Date | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const d = new Date(); d.setHours(+m[1], +m[2], 0, 0); return d;
}
const fmt = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60000);
const diffMin = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000);

// ─── App ─────────────────────────────────────────────────────────────

export default function App() {
  const [startInput, setStartInput] = useState("09:00");
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [states, setStates] = useState<Record<string, ActivityState>>({});
  const [now, setNow] = useState(new Date());
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const handleStart = () => {
    const p = parseTime(startInput); if (!p) return;
    setStartTime(p); setStarted(true);
    const init: Record<string, ActivityState> = {};
    ACTIVITIES.forEach(a => { init[a.id] = { completed: false, actualStartTime: "", actualEndTime: "" }; });
    setStates(init);
  };

  const handleReset = () => { setStarted(false); setStartTime(null); setStates({}); setCollapsed({}); };

  const getSchedule = useCallback(() => {
    if (!startTime) return {} as Record<string, { start: Date; end: Date }>;
    const sched: Record<string, { start: Date; end: Date }> = {};
    let cur = new Date(startTime);
    for (const a of ACTIVITIES) {
      const st = states[a.id];
      if (st?.completed && st.actualStartTime && st.actualEndTime) {
        const s = parseTime(st.actualStartTime), e = parseTime(st.actualEndTime);
        if (s && e) { sched[a.id] = { start: s, end: e }; cur = new Date(e); continue; }
      }
      if (st?.completed && st.actualStartTime) {
        const s = parseTime(st.actualStartTime);
        if (s) { const e = addMin(s, a.plannedMinutes); sched[a.id] = { start: s, end: e }; cur = new Date(e); continue; }
      }
      const e = addMin(cur, a.plannedMinutes);
      sched[a.id] = { start: new Date(cur), end: e }; cur = new Date(e);
    }
    return sched;
  }, [startTime, states]);

  const toggleComplete = (id: string) => {
    setStates(prev => {
      const c = prev[id]; if (!c) return prev;
      if (c.completed) return { ...prev, [id]: { ...c, completed: false } };
      return { ...prev, [id]: { ...c, completed: true, actualEndTime: c.actualEndTime || fmt(now) } };
    });
  };

  const updateTime = (id: string, field: "actualStartTime" | "actualEndTime", val: string) => {
    setStates(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
  };

  const schedule = getSchedule();
  const completedCount = ACTIVITIES.filter(a => states[a.id]?.completed).length;
  const totalPlanned = ACTIVITIES.reduce((s, a) => s + a.plannedMinutes, 0);
  const completedMin = ACTIVITIES.filter(a => states[a.id]?.completed).reduce((s, a) => s + a.plannedMinutes, 0);
  const last = ACTIVITIES[ACTIVITIES.length - 1];
  const estEnd = schedule[last.id]?.end;
  const origEnd = startTime ? addMin(startTime, totalPlanned) : null;
  const drift = estEnd && origEnd ? diffMin(origEnd, estEnd) : 0;
  const curIdx = ACTIVITIES.findIndex(a => !states[a.id]?.completed);
  const curAct = curIdx >= 0 ? ACTIVITIES[curIdx] : null;

  // ─── Start screen ──────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-zinc-200 overflow-hidden">
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center">
              <Timer className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Workshop Timer</h1>
            <p className="text-sm text-zinc-500 mt-1">Design Thinking · 4h · 8 equipos</p>
          </div>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Hora de inicio</label>
              <div className="flex gap-2">
                <input type="time" value={startInput} onChange={e => setStartInput(e.target.value)}
                  className="flex-1 h-11 rounded-lg border border-zinc-300 px-3 text-lg font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                <button onClick={handleStart}
                  className="h-11 px-5 rounded-lg bg-zinc-900 text-white font-medium flex items-center gap-2 hover:bg-zinc-800 active:scale-95 transition-all">
                  <Play className="w-4 h-4" /> Iniciar
                </button>
              </div>
            </div>
            <div className="border-t border-zinc-100 pt-4 text-sm text-zinc-500 space-y-1">
              <p className="font-medium text-zinc-700">Resumen:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                <span>Actividades:</span><span className="font-medium text-zinc-900">{ACTIVITIES.length}</span>
                <span>Duración:</span><span className="font-medium text-zinc-900">{totalPlanned} min</span>
                <span>Descanso:</span><span className="font-medium text-zinc-900">15 min</span>
                <span>Presentaciones:</span><span className="font-medium text-zinc-900">8 × 3 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main view ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
                <Timer className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-zinc-900">Workshop Timer</p>
                <p className="text-[11px] text-zinc-500">{fmt(now)} · Inicio {startTime ? fmt(startTime) : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {drift !== 0 && (
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  drift > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {drift > 0 ? "+" : ""}{drift}m
                </span>
              )}
              <span className="text-xs font-mono text-zinc-400">{completedCount}/{ACTIVITIES.length}</span>
              <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-zinc-100 transition">
                <RotateCcw className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-900 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / ACTIVITIES.length) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Current activity banner */}
      {curAct && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className={`rounded-xl border-2 p-3 ${PHASE_LIGHT[curAct.phase]}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <div className={`w-2 h-2 rounded-full ${PHASE_BG[curAct.phase]} animate-pulse`} />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${PHASE_TXT[curAct.phase]}`}>Ahora</span>
              {schedule[curAct.id] && (
                <span className="text-[11px] text-zinc-500 ml-auto font-mono">
                  {fmt(schedule[curAct.id].start)} – {fmt(schedule[curAct.id].end)}
                </span>
              )}
            </div>
            <p className="font-semibold text-zinc-900 text-sm">{curAct.name}</p>
            {curAct.description && <p className="text-xs text-zinc-600 mt-0.5">{curAct.description}</p>}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="max-w-2xl mx-auto px-4 py-3 space-y-4">
        {[1, 2, 3, 4].map(phase => {
          const acts = ACTIVITIES.filter(a => a.phase === phase);
          const done = acts.every(a => states[a.id]?.completed);
          const mins = acts.reduce((s, a) => s + a.plannedMinutes, 0);
          const pStart = schedule[acts[0]?.id]?.start;
          const pEnd = schedule[acts[acts.length - 1]?.id]?.end;
          const isCollapsed = collapsed[phase] && done;

          return (
            <div key={phase}>
              <button onClick={() => done && setCollapsed(p => ({ ...p, [phase]: !p[phase] }))}
                className={`w-full flex items-center gap-2 mb-1.5 ${done ? "cursor-pointer" : "cursor-default"}`}>
                <span className={`h-6 px-2.5 rounded-md text-[11px] font-bold text-white ${PHASE_BG[phase]}`}>
                  H{phase}
                </span>
                <span className="text-sm font-semibold text-zinc-700">{PHASE_NAMES[phase]}</span>
                <span className="text-[11px] text-zinc-400 font-mono ml-auto">
                  {mins}m{pStart && pEnd ? ` · ${fmt(pStart)}–${fmt(pEnd)}` : ""}
                </span>
                {done && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-zinc-300" /> : <ChevronDown className="w-4 h-4 text-zinc-300" />}
                  </>
                )}
              </button>

              {!isCollapsed && (
                <div className="space-y-1.5">
                  {acts.map(activity => {
                    const st = states[activity.id];
                    const sc = schedule[activity.id];
                    const isCurrent = curAct?.id === activity.id;

                    return (
                      <div key={activity.id}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 transition-all ${
                          st?.completed ? "bg-zinc-50 border-zinc-200 opacity-60"
                            : activity.isBreak ? "bg-amber-50 border-amber-200"
                            : isCurrent ? "bg-white border-zinc-300 shadow-sm"
                            : "bg-white border-zinc-200"
                        }`}>
                        {/* Check */}
                        <button onClick={() => toggleComplete(activity.id)} className="mt-0.5 shrink-0 active:scale-90 transition">
                          {st?.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            : activity.isBreak ? <Coffee className="w-5 h-5 text-amber-500" />
                            : <Circle className="w-5 h-5 text-zinc-300" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-sm font-medium ${st?.completed ? "line-through text-zinc-400" : "text-zinc-900"}`}>
                              {activity.name}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 border border-zinc-200 rounded px-1.5 py-0.5">
                              {activity.plannedMinutes}m
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-xs text-zinc-500 mt-0.5">{activity.description}</p>
                          )}
                          {sc && (
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {fmt(sc.start)} → {fmt(sc.end)}
                              </span>
                            </div>
                          )}

                          {/* Time inputs */}
                          {!activity.isBreak && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-zinc-400 uppercase">Inicio</span>
                                <input type="time" value={st?.actualStartTime || ""}
                                  onChange={e => updateTime(activity.id, "actualStartTime", e.target.value)}
                                  className="h-7 w-[5.5rem] text-xs font-mono px-1.5 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-zinc-400 uppercase">Fin</span>
                                <input type="time" value={st?.actualEndTime || ""}
                                  onChange={e => updateTime(activity.id, "actualEndTime", e.target.value)}
                                  className="h-7 w-[5.5rem] text-xs font-mono px-1.5 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                              </div>
                              {st?.actualStartTime && st?.actualEndTime && (() => {
                                const s = parseTime(st.actualStartTime), e = parseTime(st.actualEndTime);
                                if (s && e) {
                                  const d = diffMin(s, e), delta = d - activity.plannedMinutes;
                                  return (
                                    <span className={`text-[10px] font-mono font-bold ${
                                      delta > 0 ? "text-red-500" : delta < 0 ? "text-emerald-600" : "text-zinc-400"
                                    }`}>
                                      {d}m ({delta > 0 ? "+" : ""}{delta})
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom stats */}
      <div className="max-w-2xl mx-auto px-4 pt-2 pb-6">
        <div className="border-t border-zinc-200 pt-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Hecho", value: `${Math.round((completedMin / totalPlanned) * 100)}%` },
              { label: "Restante", value: `${totalPlanned - completedMin}m` },
              { label: "Fin est.", value: estEnd ? fmt(estEnd) : "—" },
              { label: "Desv.", value: `${drift > 0 ? "+" : ""}${drift}m`,
                color: drift > 5 ? "text-red-600" : drift > 0 ? "text-amber-600" : drift < 0 ? "text-emerald-600" : "" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-lg border border-zinc-200 py-2.5 px-1">
                <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{label}</p>
                <p className={`text-base font-bold text-zinc-900 font-mono ${color || ""}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
      }
