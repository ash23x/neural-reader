"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const DEMO_WORDS = [
  "Your", "brain", "can", "absorb", "information",
  "far", "faster", "than", "your", "eyes",
  "can", "deliver", "it.", "We", "remove",
  "the", "bottleneck."
];

function DemoWord({ word, isActive }: { word: string; isActive: boolean }) {
  const getORP = (w: string) => {
    const len = w.replace(/[^a-zA-Z]/g, "").length;
    if (len <= 3) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    return 3;
  };

  const orp = getORP(word);
  let alphaIdx = 0;

  return (
    <span
      className={isActive ? "demo-word" : ""}
      style={{
        display: "inline-flex",
        fontSize: "clamp(36px, 6vw, 64px)",
        fontWeight: 400,
        letterSpacing: "0.01em",
        minHeight: "80px",
        alignItems: "center",
      }}
    >
      {word.split("").map((ch, i) => {
        const isPunc = /[^a-zA-Z0-9]/.test(ch);
        if (isPunc) return <span key={i} style={{ color: "#444" }}>{ch}</span>;
        const isAnchor = alphaIdx === orp;
        alphaIdx++;
        return (
          <span key={i} style={{
            color: isAnchor ? "#ff3b30" : "#b0b0b0",
            fontWeight: isAnchor ? 800 : 400,
            textShadow: isAnchor ? "0 0 24px rgba(255,59,48,0.35)" : "none",
            transition: "color 0.1s",
          }}>{ch}</span>
        );
      })}
    </span>
  );
}

export default function LandingPage() {
  const [demoIdx, setDemoIdx] = useState(0);
  const [demoActive, setDemoActive] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDemoIdx(prev => {
        if (prev >= DEMO_WORDS.length - 1) return 0;
        return prev + 1;
      });
      setDemoActive(true);
    }, 350);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#070707", overflow: "hidden" }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "-30%", left: "30%",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(255,59,48,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Nav */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "24px 32px", maxWidth: "1200px", margin: "0 auto",
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.5em", color: "#444", fontWeight: 300 }}>
          R S V P
        </div>
        <Link href="/read" style={{
          fontSize: "10px", color: "#ff3b30", letterSpacing: "0.12em",
          textDecoration: "none", padding: "8px 20px",
          border: "1px solid #ff3b3033", borderRadius: "2px",
          transition: "all 0.2s",
        }}>
          OPEN READER →
        </Link>
      </nav>

      {/* Hero */}
      <main style={{
        maxWidth: "900px", margin: "0 auto", padding: "60px 32px 40px",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center",
      }}>
        {/* Live demo */}
        <div className="animate-fade-in" style={{
          width: "100%", maxWidth: "700px",
          background: "#0a0a0a", border: "1px solid #141414",
          borderRadius: "2px", padding: "24px 32px",
          marginBottom: "48px", position: "relative",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0,
            height: "2px", width: `${(demoIdx / (DEMO_WORDS.length - 1)) * 100}%`,
            background: "linear-gradient(90deg, #ff3b30, #ff6b5e)",
            transition: "width 0.3s",
          }} />
          <div style={{
            height: "80px", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <DemoWord word={DEMO_WORDS[demoIdx]} isActive={demoActive} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            borderTop: "1px solid #141414", paddingTop: "12px",
            fontSize: "9px", color: "#333", letterSpacing: "0.1em",
          }}>
            <span>{demoIdx + 1}/{DEMO_WORDS.length}</span>
            <span>170 WPM DEMO</span>
            <span>NEURAL ENGINE v4</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-in-delay-1" style={{
          fontSize: "clamp(28px, 5vw, 48px)",
          fontWeight: 300, lineHeight: 1.2,
          color: "#d0d0d0", marginBottom: "20px",
          letterSpacing: "-0.02em",
        }}>
          Read at the speed<br />
          your <span style={{ color: "#ff3b30", fontWeight: 600 }}>brain</span> actually works
        </h1>

        <p className="animate-fade-in-delay-2" style={{
          fontSize: "14px", color: "#555", lineHeight: 1.7,
          maxWidth: "540px", marginBottom: "40px",
        }}>
          RSVP eliminates eye movement — the bottleneck that limits reading to 250 WPM.
          Our neural engine adds psycholinguistic intelligence: density-weighted display,
          frequency-based timing, and AI-powered document analysis.
        </p>

        {/* CTA */}
        <Link href="/read" className="animate-fade-in-delay-3" style={{
          display: "inline-flex", alignItems: "center", gap: "10px",
          background: "#0e0e0e", border: "1px solid #ff3b3044",
          color: "#ff3b30", padding: "14px 40px",
          borderRadius: "2px", textDecoration: "none",
          fontSize: "13px", fontWeight: 600, letterSpacing: "0.15em",
          transition: "all 0.2s",
          boxShadow: "0 0 40px rgba(255,59,48,0.08)",
        }}>
          ▶ START READING — FREE
        </Link>

        <p className="animate-fade-in-delay-4" style={{
          fontSize: "10px", color: "#333", marginTop: "16px",
        }}>
          No signup. No tracking. Works in your browser.
        </p>
      </main>

      {/* Features */}
      <section style={{
        maxWidth: "1000px", margin: "60px auto 0", padding: "0 32px 80px",
      }}>
        <div className="animate-fade-in-delay-4" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}>
          {[
            {
              icon: "◆",
              title: "PSYCHOLINGUISTIC ENGINE",
              desc: "Information density weighting dims function words, brightens content. Word frequency timing gives rare words more processing time. Your visual cortex gets a hierarchy that matches cognitive priority.",
              color: "#ff3b30",
            },
            {
              icon: "⚡",
              title: "AI PAPER ANALYSIS",
              desc: "Upload a PDF. AI identifies sections, generates summaries, tags reading speed. Skip methods, blast through results. Read a 20-page paper in 4 minutes. Bring your own API key — your costs, your control.",
              color: "#ffaa33",
              pro: true,
            },
            {
              icon: "◎",
              title: "ADAPTIVE PACING",
              desc: "Auto-deceleration detects dense technical clusters and slows down. Smart pacing adjusts for punctuation, word length, and lexical access time. The engine breathes with the text.",
              color: "#4cd964",
            },
            {
              icon: "◇",
              title: "SECTION-AWARE READING",
              desc: "Scientific papers aren't uniform. Abstracts fly, methods crawl, discussions flow. Section speed modifiers let each part of the paper move at its natural pace.",
              color: "#7a8fff",
              pro: true,
            },
            {
              icon: "▸",
              title: "CONTEXT SCAFFOLDING",
              desc: "Peripheral word preview gives your visual cortex a head start. Sentence ghost maintains semantic framing. Your comprehension stays high even at 1000+ WPM.",
              color: "#9b59b6",
            },
            {
              icon: "★",
              title: "FILLER COMPRESSION",
              desc: "Strip function words entirely — 'the', 'of', 'was' — and let your brain fill them in. Up to 40% fewer words, same comprehension. Toggle between lite and hard filtering.",
              color: "#ff9500",
            },
          ].map(({ icon, title, desc, color, pro }) => (
            <div key={title} style={{
              background: "#0a0a0a", border: "1px solid #141414",
              borderRadius: "2px", padding: "20px 22px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ color, fontSize: "14px" }}>{icon}</span>
                <span style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#666" }}>{title}</span>
                {pro && (
                  <span style={{
                    fontSize: "7px", color: "#ffaa33", border: "1px solid #ffaa3344",
                    padding: "1px 6px", borderRadius: "2px", letterSpacing: "0.1em",
                    marginLeft: "auto",
                  }}>BYOK</span>
                )}
              </div>
              <p style={{ fontSize: "11px", color: "#555", lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: "center", padding: "32px",
        borderTop: "1px solid #0e0e0e",
      }}>
        <div style={{ fontSize: "9px", color: "#222", letterSpacing: "0.1em" }}>
          RSVP NEURAL READER · BUILT BY ONTOS LABS
        </div>
      </footer>
    </div>
  );
}
