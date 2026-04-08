"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════
   WORD INTELLIGENCE
   ═══════════════════════════════════════════ */

const HIGH_FREQ = new Set(["the","be","to","of","and","a","in","that","have","i","it","for","not","on","with","he","as","you","do","at","this","but","his","by","from","they","we","her","she","or","an","will","my","one","all","would","there","their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take","people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us","is","was","are","were","been","being","has","had","did","does","shall","should","may","might","must","am","said","each"]);

const FUNCTION_WORDS = new Set(["the","a","an","is","was","are","were","be","been","being","am","have","has","had","do","does","did","will","would","shall","should","may","might","can","could","must","of","to","in","for","on","with","at","by","from","as","into","through","during","before","after","above","below","between","under","again","further","then","once","that","this","these","those","it","its","and","but","or","nor","not","so","very","just","also","too","than","both","each","few","more","most","other","some","such","only","own","same","about","up","out","if","there","when","which","who","whom","what","where","why","how","all","any","every","no","here","yet","still"]);

const STRONG_FILLERS = new Set(["the","a","an","is","was","are","were","of","to","in","for","on","with","at","by","and","but","or","it","that","this","be","been"]);

function wordRarity(w: string) {
  const c = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!c) return 0;
  if (HIGH_FREQ.has(c)) return 0;
  if (FUNCTION_WORDS.has(c)) return 0.05;
  let s = 0.3;
  if (c.length > 6) s += 0.1;
  if (c.length > 8) s += 0.15;
  if (c.length > 10) s += 0.15;
  if (c.length > 12) s += 0.1;
  if (/[0-9]/.test(w)) s += 0.1;
  return Math.min(1, s);
}

function windowDensity(words: string[], idx: number, ws = 5) {
  const start = Math.max(0, idx - Math.floor(ws / 2));
  const end = Math.min(words.length, start + ws);
  const slice = words.slice(start, end);
  if (!slice.length) return 0;
  const ar = slice.reduce((s, w) => s + wordRarity(w), 0) / slice.length;
  const al = slice.reduce((s, w) => s + w.replace(/[^a-zA-Z]/g, "").length, 0) / slice.length;
  return ar * 0.6 + Math.min(al / 12, 1) * 0.4;
}

function getORP(word: string) {
  const len = word.replace(/[^a-zA-Z0-9]/g, "").length;
  if (len <= 1) return 0;
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

function getSmartDelay(word: string, idx: number, all: string[], base: number, decel: boolean, speedMod = 1) {
  let ms = base * speedMod;
  const c = word.replace(/[^a-zA-Z0-9]/g, "");
  if (c.length > 8) ms *= 1.25; else if (c.length > 6) ms *= 1.1;
  if (/[.!?]$/.test(word)) ms *= 1.7;
  else if (/[,;:]$/.test(word)) ms *= 1.3;
  else if (/[-–—]$/.test(word)) ms *= 1.15;
  ms *= 1 + wordRarity(word) * 0.5;
  if (decel) ms *= 1 + windowDensity(all, idx) * 0.6;
  return Math.round(ms);
}

function getWordBrightness(word: string, isAnchor: boolean) {
  if (isAnchor) return null;
  const c = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!c) return "#444";
  if (STRONG_FILLERS.has(c)) return "#555";
  if (FUNCTION_WORDS.has(c)) return "#6a6a6a";
  const r = wordRarity(word);
  const v = Math.min(195, 145 + Math.round(r * 50));
  return `rgb(${v},${v},${v})`;
}

function buildSentences(words: string[]) {
  const sents: { text: string; start: number; end: number }[] = [];
  let cur: string[] = [], si = 0;
  words.forEach((w, i) => {
    cur.push(w);
    if (/[.!?]$/.test(w)) {
      sents.push({ text: cur.join(" "), start: si, end: i });
      cur = []; si = i + 1;
    }
  });
  if (cur.length) sents.push({ text: cur.join(" "), start: si, end: words.length - 1 });
  return sents;
}

/* ═══════════════════════════════════════════
   SECTION CONFIGS
   ═══════════════════════════════════════════ */

type SectionType = "title" | "abstract" | "introduction" | "background" | "methods" | "results" | "discussion" | "conclusion" | "references" | "supplementary" | "other" | "ai_summary";

const SECTION_CONFIGS: Record<SectionType, { color: string; icon: string; speedMod: number; label: string; default: boolean }> = {
  title: { color: "#ff3b30", icon: "◆", speedMod: 0.6, label: "TITLE", default: true },
  abstract: { color: "#ffaa33", icon: "◇", speedMod: 0.8, label: "ABSTRACT", default: true },
  introduction: { color: "#4cd964", icon: "▸", speedMod: 1.0, label: "INTRO", default: true },
  background: { color: "#5ac8fa", icon: "▹", speedMod: 1.0, label: "BACKGROUND", default: true },
  methods: { color: "#8e8e93", icon: "⚙", speedMod: 0.6, label: "METHODS", default: false },
  results: { color: "#7a8fff", icon: "◈", speedMod: 0.85, label: "RESULTS", default: true },
  discussion: { color: "#af52de", icon: "◎", speedMod: 1.0, label: "DISCUSSION", default: true },
  conclusion: { color: "#ff9500", icon: "★", speedMod: 0.9, label: "CONCLUSION", default: true },
  references: { color: "#444", icon: "※", speedMod: 1.0, label: "REFS", default: false },
  supplementary: { color: "#555", icon: "†", speedMod: 0.7, label: "SUPPL", default: false },
  other: { color: "#666", icon: "·", speedMod: 1.0, label: "OTHER", default: true },
  ai_summary: { color: "#ff3b30", icon: "⚡", speedMod: 0.7, label: "AI SUMMARY", default: true },
};

/* ═══════════════════════════════════════════
   PDF EXTRACTION
   ═══════════════════════════════════════════ */

/* eslint-disable @typescript-eslint/no-explicit-any */
async function loadPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  return new Promise<any>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve((window as any).pdfjsLib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function extractPdf(file: File) {
  const lib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map((it: any) => it.str).join(" "));
  }
  return { fullText: pages.join("\n\n"), numPages: pdf.numPages };
}

/* ═══════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════ */

function WordDisplay({ words, idx, chunk, showPrev, showDens }: { words: string[]; idx: number; chunk: number; showPrev: boolean; showDens: boolean }) {
  const ch = useMemo(() => idx >= words.length ? [] : words.slice(idx, Math.min(idx + chunk, words.length)), [words, idx, chunk]);
  const next = showPrev && chunk === 1 && idx + 1 < words.length ? words[idx + 1] : null;
  const prev = showPrev && chunk === 1 && idx > 0 ? words[idx - 1] : null;

  if (!ch.length) return <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#333" }}>▶ READY</div>;

  const fs = chunk === 1 ? "clamp(30px, 5vw, 52px)" : chunk === 2 ? "clamp(24px, 3.8vw, 40px)" : "clamp(20px, 3vw, 34px)";

  const rw = (word: string, key: string, ghost = false, side?: "l" | "r") => {
    const orp = getORP(word);
    let ai = 0;
    return (
      <span key={key} style={{ display: "inline-flex", opacity: ghost ? 0.18 : 1, filter: ghost ? "blur(0.5px)" : "none", fontSize: ghost ? "0.5em" : undefined, position: ghost ? "absolute" : "relative", ...(ghost && side === "l" ? { right: "calc(100% + 28px)" } : ghost && side === "r" ? { left: "calc(100% + 28px)" } : {}) }}>
        {word.split("").map((c, i) => {
          if (/[^a-zA-Z0-9]/.test(c)) return <span key={i} style={{ color: ghost ? "#282828" : "#3a3a3a", fontWeight: 300 }}>{c}</span>;
          const anc = ai === orp && !ghost;
          const br = getWordBrightness(word, anc);
          ai++;
          return <span key={i} style={{ color: anc ? "#ff3b30" : ghost ? "#333" : (br ?? undefined), fontWeight: anc ? 800 : 400, textShadow: anc ? "0 0 18px rgba(255,59,48,0.3)" : "none" }}>{c}</span>;
        })}
      </span>
    );
  };

  return (
    <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: fs, userSelect: "none", position: "relative" }}>
      <div style={{ position: "absolute", left: "50%", top: "10px", bottom: "10px", width: "1px", background: "rgba(255,59,48,0.05)" }} />
      {prev && rw(prev, "p", true, "l")}
      <div style={{ display: "inline-flex", gap: "0.3em", position: "relative" }}>
        {ch.map((w, i) => rw(w, `m${i}`))}
      </div>
      {next && rw(next, "n", true, "r")}
      {showDens && words.length > 0 && idx < words.length && (
        <div style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", width: "3px", height: "36px", background: "#0e0e0e", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ position: "absolute", bottom: 0, width: "100%", height: `${Math.round(windowDensity(words, idx) * 100)}%`, background: `hsl(${Math.round((1 - windowDensity(words, idx)) * 120)}, 55%, 35%)`, transition: "height 0.12s", borderRadius: "2px" }} />
        </div>
      )}
    </div>
  );
}

function CtxGhost({ words, idx, sents }: { words: string[]; idx: number; sents: { start: number; end: number }[] }) {
  const s = useMemo(() => sents.find(s => idx >= s.start && idx <= s.end), [sents, idx]);
  if (!s) return <div style={{ height: "32px" }} />;
  const sw = words.slice(s.start, s.end + 1);
  const ri = idx - s.start;
  return (
    <div style={{ height: "32px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "0 16px" }}>
      <div style={{ fontSize: "10px", color: "#222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
        {sw.map((w, i) => <span key={i} style={{ color: i === ri ? "#4a4a4a" : i < ri ? "#1e1e1e" : "#161616", fontWeight: i === ri ? 600 : 400 }}>{w}{i < sw.length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: "50px" }}>
      <div style={{ fontSize: "15px", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: accent || "#808080" }}>{value}</div>
      <div style={{ fontSize: "7px", color: "#333", letterSpacing: "0.15em", marginTop: "1px" }}>{label}</div>
    </div>
  );
}

function Chip({ active, onClick, color, label }: { active: boolean; onClick: () => void; color: string; label: string }) {
  return (
    <button onClick={onClick} style={{ background: active ? "#0e0e0e" : "#080808", border: `1px solid ${active ? color + "44" : "#141414"}`, color: active ? color : "#2a2a2a", padding: "3px 8px", borderRadius: "2px", cursor: "pointer", fontFamily: "inherit", fontSize: "8px", fontWeight: active ? 600 : 400, letterSpacing: "0.05em" }}>{label}</button>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */

interface Section { type: string; heading: string; content: string; summary: string; speed_note: string; }
interface PaperData { paper_title: string; ai_summary: string; sections: Section[]; }
interface SecMap { startIdx: number; endIdx: number; type: string; heading: string; }

const V = { HOME: 0, ANALYZING: 1, SECTIONS: 2, READING: 3 } as const;

export default function ReaderPage() {
  const [view, setView] = useState<number>(V.HOME);
  const [sourceText, setSourceText] = useState("");
  const [inputText, setInputText] = useState("");
  const [paperData, setPaperData] = useState<PaperData | null>(null);
  const [secEnabled, setSecEnabled] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<{ name: string; pages: number; chars: number } | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const [words, setWords] = useState<string[]>([]);
  const [sents, setSents] = useState<{ start: number; end: number; text: string }[]>([]);
  const [secMap, setSecMap] = useState<SecMap[]>([]);
  const [curIdx, setCurIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wpm, setWpm] = useState(400);
  const [prog, setProg] = useState(0);
  const [eWpm, setEWpm] = useState(0);
  const [focus, setFocus] = useState(false);
  const [chunk, setChunk] = useState(1);
  const [filter, setFilter] = useState(0);
  const [smart, setSmart] = useState(true);
  const [decel, setDecel] = useState(true);
  const [preview, setPreview] = useState(true);
  const [context, setContext] = useState(true);
  const [density, setDensity] = useState(true);
  const [showCfg, setShowCfg] = useState(false);
  const [delay, setDelay] = useState(0);
  const [curSec, setCurSec] = useState<SecMap | null>(null);

  const toRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iRef = useRef(0);
  const wRef = useRef<string[]>([]);
  const pRef = useRef(false);
  const wrRef = useRef(0);
  const stRef = useRef<number | null>(null);
  const smRef = useRef<SecMap[]>([]);

  // PDF upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setView(V.ANALYZING); setError(null);
    try {
      setStatus("Extracting text from PDF...");
      const { fullText, numPages } = await extractPdf(file);
      setPdfInfo({ name: file.name, pages: numPages, chars: fullText.length });
      if (fullText.trim().length < 100) throw new Error("PDF has too little extractable text.");

      if (apiKey) {
        setStatus("AI analyzing paper structure...");
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey, text: fullText }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed");
        setPaperData(data);
        const en: Record<string, boolean> = { ai_summary: true };
        data.sections.forEach((_: Section, i: number) => {
          const cfg = SECTION_CONFIGS[(_.type as SectionType)] || SECTION_CONFIGS.other;
          en[i] = cfg.default;
        });
        setSecEnabled(en);
        setView(V.SECTIONS);
      } else {
        // No API key — load as plain text
        setSourceText(fullText);
        buildQueue([{ type: "other", heading: file.name, content: fullText, summary: "", speed_note: "" }], null);
        setView(V.READING);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
      setView(V.HOME);
    }
  };

  // Paste text
  const handlePaste = () => {
    if (!inputText.trim()) return;
    setSourceText(inputText.trim());
    buildQueue([{ type: "other", heading: "Pasted Text", content: inputText.trim(), summary: "", speed_note: "" }], null);
    setView(V.READING);
  };

  // Build reading queue
  const buildQueue = useCallback((sections: Section[], aiSummary: string | null) => {
    let all: string[] = [];
    const sm: SecMap[] = [];
    const fs = filter === 2 ? FUNCTION_WORDS : filter === 1 ? STRONG_FILLERS : null;

    if (aiSummary) {
      const sw = aiSummary.split(/\s+/).filter(s => s.length > 0);
      const f = fs ? sw.filter(w => !fs.has(w.replace(/[^a-zA-Z]/g, "").toLowerCase())) : sw;
      if (f.length) { sm.push({ startIdx: all.length, endIdx: all.length + f.length - 1, type: "ai_summary", heading: "AI Summary" }); all = all.concat(f); }
    }

    sections.forEach(sec => {
      if (!sec.content?.trim()) return;
      const sw = sec.content.split(/\s+/).filter(s => s.length > 0);
      const f = fs ? sw.filter(w => !fs.has(w.replace(/[^a-zA-Z]/g, "").toLowerCase())) : sw;
      if (!f.length) return;
      sm.push({ startIdx: all.length, endIdx: all.length + f.length - 1, type: sec.type, heading: sec.heading });
      all = all.concat(f);
    });

    setWords(all); wRef.current = all;
    setSents(buildSentences(all));
    setSecMap(sm); smRef.current = sm;
    setCurIdx(0); iRef.current = 0;
    setProg(0); wrRef.current = 0;
    stRef.current = null; setEWpm(0); setDelay(0);
  }, [filter]);

  const startReading = () => {
    if (!paperData) return;
    const en = paperData.sections.filter((_: Section, i: number) => secEnabled[i]);
    buildQueue(en, secEnabled.ai_summary ? paperData.ai_summary : null);
    setView(V.READING);
  };

  // Rebuild on filter change
  useEffect(() => {
    if (view !== V.READING) return;
    if (paperData) {
      const en = paperData.sections.filter((_: Section, i: number) => secEnabled[i]);
      buildQueue(en, secEnabled.ai_summary ? paperData.ai_summary : null);
    } else if (sourceText) {
      buildQueue([{ type: "other", heading: "Text", content: sourceText, summary: "", speed_note: "" }], null);
    }
  }, [filter]);

  // Track section
  useEffect(() => {
    const s = smRef.current.find(s => curIdx >= s.startIdx && curIdx <= s.endIdx);
    setCurSec(s || null);
  }, [curIdx]);

  // Playback
  const stop = useCallback(() => {
    pRef.current = false;
    if (toRef.current) { clearTimeout(toRef.current); toRef.current = null; }
    setPlaying(false);
  }, []);

  const tick = useCallback(() => {
    if (!pRef.current) return;
    const w = wRef.current, idx = iRef.current;
    if (idx >= w.length) { pRef.current = false; setPlaying(false); setProg(100); return; }
    const base = 60000 / wpm;
    const sec = smRef.current.find(s => idx >= s.startIdx && idx <= s.endIdx);
    const sm = sec ? (SECTION_CONFIGS[sec.type as SectionType]?.speedMod || 1) : 1;
    let d: number;
    if (smart) {
      const ch = w.slice(idx, Math.min(idx + chunk, w.length));
      d = Math.max(...ch.map((word, i) => getSmartDelay(word, idx + i, w, base, decel, sm)));
      if (chunk > 1) d *= 1 + (chunk - 1) * 0.25;
    } else {
      d = base * sm;
      if (chunk > 1) d *= chunk * 0.65;
    }
    setDelay(d);
    toRef.current = setTimeout(() => {
      const ni = Math.min(idx + chunk, w.length);
      iRef.current = ni; wrRef.current += chunk;
      setCurIdx(ni); setProg(Math.min(100, (ni / w.length) * 100));
      if (stRef.current) { const el = (Date.now() - stRef.current) / 60000; if (el > 0.01) setEWpm(Math.round(wrRef.current / el)); }
      tick();
    }, d);
  }, [wpm, chunk, smart, decel]);

  const play = useCallback(() => {
    if (!wRef.current.length) return;
    if (iRef.current >= wRef.current.length) { iRef.current = 0; setCurIdx(0); setProg(0); wrRef.current = 0; }
    pRef.current = true; setPlaying(true);
    if (!stRef.current) stRef.current = Date.now();
    tick();
  }, [tick]);

  useEffect(() => { if (pRef.current) { if (toRef.current) clearTimeout(toRef.current); tick(); } }, [wpm, smart, chunk, decel, tick]);
  useEffect(() => () => { if (toRef.current) clearTimeout(toRef.current); }, []);

  const pp = useCallback(() => { if (playing) stop(); else play(); }, [playing, stop, play]);
  const reset = useCallback(() => { stop(); setCurIdx(0); iRef.current = 0; setProg(0); stRef.current = null; setEWpm(0); wrRef.current = 0; setDelay(0); }, [stop]);
  const skip = useCallback((d: number) => { const n = Math.max(0, Math.min(wRef.current.length - 1, iRef.current + d)); iRef.current = n; setCurIdx(n); setProg((n / wRef.current.length) * 100); }, []);
  const jumpSec = (i: number) => { const s = smRef.current[i]; if (s) { iRef.current = s.startIdx; setCurIdx(s.startIdx); setProg((s.startIdx / wRef.current.length) * 100); } };

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const m: Record<string, () => void> = {
        Space: pp, ArrowRight: () => skip(chunk * 5), ArrowLeft: () => skip(-chunk * 5),
        ArrowUp: () => setWpm(w => Math.min(2500, w + 50)), ArrowDown: () => setWpm(w => Math.max(50, w - 50)),
        KeyF: () => setFocus(f => !f), Escape: () => { stop(); setFocus(false); },
      };
      if (m[e.code] && view === V.READING) { e.preventDefault(); m[e.code](); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [view, pp, skip, chunk, stop]);

  const showUI = !focus || !playing;
  const eta = eWpm > 0 ? Math.round(((words.length - curIdx) / eWpm) * 60) : 0;
  const etaD = eta > 60 ? `${Math.floor(eta / 60)}m${eta % 60}s` : `${eta}s`;
  const sc = curSec ? SECTION_CONFIGS[curSec.type as SectionType] || SECTION_CONFIGS.other : null;

  /* ═══ HOME ═══ */
  if (view === V.HOME) {
    return (
      <div style={{ minHeight: "100vh", background: "#070707", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: "32px" }}>
        <Link href="/" style={{ fontSize: "11px", letterSpacing: "0.5em", color: "#444", textDecoration: "none" }}>R S V P</Link>
        <div style={{ fontSize: "9px", color: "#282828", letterSpacing: "0.1em" }}>NEURAL READING ENGINE v4</div>

        {error && <div style={{ background: "#1a1010", border: "1px solid #2a1515", borderRadius: "2px", padding: "12px 20px", color: "#ff6b5e", fontSize: "11px", maxWidth: "500px", textAlign: "center" }}>{error}</div>}

        {/* API Key toggle */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <button onClick={() => setShowKeyInput(!showKeyInput)} style={{
            background: apiKey ? "#0a100a" : "#0e0e0e",
            border: `1px solid ${apiKey ? "#254025" : "#1a1a1a"}`,
            color: apiKey ? "#4cd964" : "#555",
            padding: "8px 20px", borderRadius: "2px", cursor: "pointer",
            fontFamily: "inherit", fontSize: "9px", letterSpacing: "0.1em",
          }}>
            {apiKey ? "⚡ AI ENABLED" : "⚡ ENABLE AI ANALYSIS (BYOK)"}
          </button>
          {showKeyInput && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                style={{
                  background: "#080808", border: "1px solid #1a1a1a", borderRadius: "2px",
                  color: "#888", padding: "6px 12px", fontFamily: "inherit", fontSize: "10px",
                  width: "280px", outline: "none",
                }}
              />
              <span style={{ fontSize: "8px", color: "#333" }}>Never stored. Per-session only.</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
          {/* PDF */}
          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
            background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "2px",
            padding: "32px 40px", cursor: "pointer", minWidth: "200px", position: "relative",
          }}>
            <div style={{ fontSize: "28px", color: "#ff3b30" }}>⬆</div>
            <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em" }}>UPLOAD PDF</div>
            <div style={{ fontSize: "8px", color: "#333" }}>{apiKey ? "AI analysis enabled" : "Basic mode — add API key for AI"}</div>
            <input type="file" accept=".pdf" onChange={handleUpload} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
          </label>

          {/* Paste */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "2px", padding: "20px 24px", minWidth: "280px", maxWidth: "400px" }}>
            <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em" }}>PASTE TEXT</div>
            <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Paste any text..." style={{ width: "100%", height: "80px", background: "#070707", border: "1px solid #161616", borderRadius: "2px", color: "#888", fontFamily: "inherit", fontSize: "10px", lineHeight: 1.6, padding: "10px", resize: "none", outline: "none", boxSizing: "border-box" }} />
            <button onClick={handlePaste} style={{ background: "#0e0e0e", border: "1px solid #1a1a1a", color: "#4cd964", padding: "6px 20px", borderRadius: "2px", cursor: "pointer", fontFamily: "inherit", fontSize: "10px", letterSpacing: "0.1em" }}>LOAD & READ</button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ ANALYZING ═══ */
  if (view === V.ANALYZING) {
    return (
      <div style={{ minHeight: "100vh", background: "#070707", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px" }}>
        <div style={{ width: "40px", height: "40px", border: "2px solid #1a1a1a", borderTopColor: "#ff3b30", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: "11px", color: "#666", letterSpacing: "0.1em" }}>{status}</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ═══ SECTIONS ═══ */
  if (view === V.SECTIONS && paperData) {
    const tw = paperData.sections.filter((_: Section, i: number) => secEnabled[i]).reduce((s: number, sec: Section) => s + (sec.content?.split(/\s+/).length || 0), 0) + (secEnabled.ai_summary && paperData.ai_summary ? paperData.ai_summary.split(/\s+/).length : 0);
    return (
      <div style={{ minHeight: "100vh", background: "#070707", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 16px", gap: "20px" }}>
        <div style={{ textAlign: "center", maxWidth: "700px" }}>
          <div style={{ fontSize: "9px", color: "#333", letterSpacing: "0.12em", marginBottom: "6px" }}>PAPER ANALYZED</div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#c0c0c0", margin: 0, lineHeight: 1.4 }}>{paperData.paper_title}</h2>
          {pdfInfo && <div style={{ fontSize: "9px", color: "#333", marginTop: "6px" }}>{pdfInfo.name} · {pdfInfo.pages} pages</div>}
        </div>

        {paperData.ai_summary && (
          <div style={{ maxWidth: "700px", width: "100%", background: "#0c0808", border: "1px solid #1a1212", borderRadius: "2px", padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <span style={{ color: "#ff3b30", fontSize: "12px" }}>⚡</span>
              <span style={{ fontSize: "8px", color: "#ff3b30", letterSpacing: "0.12em" }}>AI SUMMARY</span>
              <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                <input type="checkbox" checked={!!secEnabled.ai_summary} onChange={e => setSecEnabled(p => ({ ...p, ai_summary: e.target.checked }))} style={{ accentColor: "#ff3b30" }} />
                <span style={{ fontSize: "8px", color: "#555" }}>INCLUDE</span>
              </label>
            </div>
            <div style={{ fontSize: "11px", color: "#888", lineHeight: 1.6 }}>{paperData.ai_summary}</div>
          </div>
        )}

        <div style={{ maxWidth: "700px", width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ fontSize: "8px", color: "#333", letterSpacing: "0.12em" }}>SELECT SECTIONS · {tw} words · ~{Math.round(tw / wpm)}m at {wpm} WPM</div>
          {paperData.sections.map((sec: Section, i: number) => {
            const cfg = SECTION_CONFIGS[sec.type as SectionType] || SECTION_CONFIGS.other;
            return (
              <div key={i} onClick={() => setSecEnabled(p => ({ ...p, [i]: !p[i] }))} style={{ background: secEnabled[i] ? "#0c0c0c" : "#080808", border: `1px solid ${secEnabled[i] ? cfg.color + "33" : "#131313"}`, borderRadius: "2px", padding: "10px 14px", opacity: secEnabled[i] ? 1 : 0.5, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="checkbox" checked={!!secEnabled[i]} onChange={() => {}} style={{ accentColor: cfg.color }} />
                  <span style={{ fontSize: "10px", color: cfg.color }}>{cfg.icon}</span>
                  <span style={{ fontSize: "11px", color: secEnabled[i] ? "#aaa" : "#555", fontWeight: 500 }}>{sec.heading}</span>
                  <span style={{ fontSize: "8px", color: "#333", marginLeft: "auto" }}>{(sec.content?.split(/\s+/).length || 0)}w · {cfg.label}</span>
                </div>
                {sec.summary && <div style={{ fontSize: "9px", color: "#444", marginTop: "6px", marginLeft: "28px", lineHeight: 1.5 }}>{sec.summary}</div>}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "4px" }}>
          {[200, 300, 400, 500, 700, 1000].map(s => (
            <button key={s} onClick={() => setWpm(s)} style={{ background: wpm === s ? "#161010" : "#0a0a0a", border: `1px solid ${wpm === s ? "#2a1515" : "#151515"}`, color: wpm === s ? "#ff3b30" : "#383838", padding: "5px 12px", borderRadius: "2px", cursor: "pointer", fontFamily: "inherit", fontSize: "9px", fontWeight: wpm === s ? 700 : 400 }}>{s}</button>
          ))}
        </div>

        <button onClick={startReading} style={{ background: "#0e0e0e", border: "1px solid #2a1515", color: "#ff3b30", padding: "12px 48px", borderRadius: "2px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em" }}>▶ START READING</button>
        <button onClick={() => { setView(V.HOME); setPaperData(null); }} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontFamily: "inherit", fontSize: "9px" }}>← BACK</button>
      </div>
    );
  }

  /* ═══ READING ═══ */
  return (
    <div style={{ minHeight: "100vh", background: "#070707", display: "flex", flexDirection: "column", alignItems: "center", padding: focus && playing ? "0" : "24px 14px", justifyContent: focus && playing ? "center" : "flex-start" }}>
      {showUI && curSec && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", opacity: playing ? 0.4 : 0.8 }}>
          <span style={{ color: sc?.color, fontSize: "10px" }}>{sc?.icon}</span>
          <span style={{ fontSize: "8px", color: sc?.color, letterSpacing: "0.1em" }}>{sc?.label}</span>
          <span style={{ fontSize: "9px", color: "#3a3a3a" }}>{curSec.heading}</span>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: focus && playing ? "100%" : "760px", background: focus && playing ? "transparent" : "#0a0a0a", border: focus && playing ? "none" : `1px solid ${sc ? sc.color + "18" : "#131313"}`, borderRadius: "2px", padding: focus && playing ? "0 16px" : "16px 24px 10px", marginBottom: showUI ? "14px" : 0, position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, height: "2px", width: `${prog}%`, background: sc ? `linear-gradient(90deg, ${sc.color}, ${sc.color}88)` : "linear-gradient(90deg, #ff3b30, #ff6b5e)", transition: "width 0.04s" }} />
        {showUI && secMap.length > 1 && (
          <div style={{ position: "absolute", top: "4px", left: 0, right: 0, height: "2px", display: "flex" }}>
            {secMap.map((s, i) => {
              const c = SECTION_CONFIGS[s.type as SectionType]?.color || "#444";
              return <div key={i} onClick={() => jumpSec(i)} style={{ position: "absolute", left: `${(s.startIdx / words.length) * 100}%`, width: `${((s.endIdx - s.startIdx) / words.length) * 100}%`, height: "2px", background: curSec === s ? c + "55" : c + "15", cursor: "pointer" }} title={s.heading} />;
            })}
          </div>
        )}
        <WordDisplay words={words} idx={Math.min(curIdx, words.length - 1)} chunk={chunk} showPrev={preview && chunk === 1} showDens={density} />
        {context && !(focus && playing) && <CtxGhost words={words} idx={curIdx} sents={sents} />}
        {showUI && (
          <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "6px", borderTop: "1px solid #131313", paddingTop: "12px", marginTop: "4px" }}>
            <Stat label="POS" value={`${Math.min(curIdx + 1, words.length)}/${words.length}`} />
            <Stat label="TARGET" value={wpm} />
            <Stat label="ACTUAL" value={eWpm || "—"} accent={eWpm > wpm * 0.9 ? "#4cd964" : eWpm > 0 ? "#ffaa33" : undefined} />
            <Stat label="ETA" value={eta > 0 ? etaD : "—"} />
            <Stat label="DELAY" value={`${delay}ms`} accent={delay > 300 ? "#ff6b5e" : delay > 180 ? "#ffaa33" : "#4cd964"} />
          </div>
        )}
      </div>

      {showUI && (
        <div style={{ width: "100%", maxWidth: "760px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { l: "↺", a: reset, c: "#555", w: "38px" },
              { l: playing ? "■" : "▶", a: pp, c: playing ? "#ff3b30" : "#b0b0b0", w: "60px", b: true },
              { l: "◉", a: () => setFocus(!focus), c: focus ? "#ffcc00" : "#555", w: "38px" },
              { l: "⚙", a: () => setShowCfg(!showCfg), c: showCfg ? "#7a8fff" : "#555", w: "38px" },
              { l: "←", a: () => { setView(paperData ? V.SECTIONS : V.HOME); stop(); }, c: "#555", w: "38px" },
            ].map(({ l, a, c, w, b }) => (
              <button key={l} onClick={a} style={{ background: "#0c0c0c", border: "1px solid #181818", color: c, width: w, padding: "9px 0", borderRadius: "2px", cursor: "pointer", fontFamily: "inherit", fontSize: b ? "14px" : "13px", fontWeight: b ? 700 : 400 }}>{l}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 2px" }}>
            <span style={{ fontSize: "8px", color: "#282828" }}>50</span>
            <input type="range" min={50} max={2500} step={10} value={wpm} onChange={e => setWpm(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontSize: "8px", color: "#282828" }}>2500</span>
          </div>
          <div style={{ display: "flex", gap: "3px", justifyContent: "center", flexWrap: "wrap" }}>
            {[200, 300, 400, 500, 700, 1000, 1500, 2000].map(s => (
              <button key={s} onClick={() => setWpm(s)} style={{ background: wpm === s ? "#140e0e" : "#090909", border: `1px solid ${wpm === s ? "#221515" : "#131313"}`, color: wpm === s ? "#ff3b30" : "#2a2a2a", padding: "3px 8px", borderRadius: "2px", cursor: "pointer", fontFamily: "inherit", fontSize: "8px", fontWeight: wpm === s ? 700 : 400 }}>{s}</button>
            ))}
          </div>
          {secMap.length > 1 && (
            <div style={{ display: "flex", gap: "3px", justifyContent: "center", flexWrap: "wrap" }}>
              {secMap.map((s, i) => {
                const cfg = SECTION_CONFIGS[s.type as SectionType] || SECTION_CONFIGS.other;
                return <button key={i} onClick={() => jumpSec(i)} style={{ background: curSec === s ? "#111" : "#090909", border: `1px solid ${curSec === s ? cfg.color + "44" : "#151515"}`, color: curSec === s ? cfg.color : "#2a2a2a", padding: "3px 8px", borderRadius: "2px", cursor: "pointer", fontFamily: "inherit", fontSize: "7px", fontWeight: curSec === s ? 600 : 400 }}>{cfg.icon} {cfg.label}</button>;
              })}
            </div>
          )}
          {showCfg && (
            <div style={{ background: "#090909", border: "1px solid #131313", borderRadius: "2px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <Row l="WORDS">{[1, 2, 3].map(n => <Chip key={n} active={chunk === n} onClick={() => setChunk(n)} color="#7a8fff" label={String(n)} />)}</Row>
              <Row l="FILTER">{[{ n: 0, l: "OFF" }, { n: 1, l: "LITE" }, { n: 2, l: "HARD" }].map(({ n, l }) => <Chip key={n} active={filter === n} onClick={() => setFilter(n)} color="#4cd964" label={l} />)}</Row>
              <Row l="ENGINE"><Chip active={smart} onClick={() => setSmart(!smart)} color="#ffaa33" label="SMART" /><Chip active={decel} onClick={() => setDecel(!decel)} color="#ffaa33" label="DECEL" /></Row>
              <Row l="VISUAL"><Chip active={preview} onClick={() => setPreview(!preview)} color="#9b59b6" label="PREVIEW" /><Chip active={context} onClick={() => setContext(!context)} color="#9b59b6" label="CONTEXT" /><Chip active={density} onClick={() => setDensity(!density)} color="#9b59b6" label="DENSITY" /></Row>
            </div>
          )}
          {!playing && <div style={{ textAlign: "center", fontSize: "7px", color: "#1a1a1a", letterSpacing: "0.08em" }}>SPACE play · ←→ skip · ↑↓ speed · F focus · ESC exit</div>}
        </div>
      )}
      {focus && playing && <div style={{ position: "fixed", bottom: "14px", left: "50%", transform: "translateX(-50%)", fontSize: "7px", color: "#181818", letterSpacing: "0.12em" }}>ESC EXIT · ↑↓ SPEED · SPACE PAUSE</div>}
    </div>
  );
}

function Row({ l, children }: { l: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}><span style={{ fontSize: "7px", color: "#333", letterSpacing: "0.1em", minWidth: "56px" }}>{l}</span><div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>{children}</div></div>;
}
