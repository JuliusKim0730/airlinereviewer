"use client";

import { useEffect, useState } from "react";

export const SERVICE_NAME = "내가 탄 비행기";

const SEEN_KEY = "alr.splashSeen";
const PLAY_MS = 3600;
const FADE_MS = 600;

type Phase = "deciding" | "playing" | "leaving" | "done";

function Cloud({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 200 100" aria-hidden="true">
      <circle cx="62" cy="62" r="30" />
      <circle cx="102" cy="46" r="38" />
      <circle cx="142" cy="62" r="28" />
      <rect x="60" y="56" width="84" height="36" rx="18" />
    </svg>
  );
}

function Plane() {
  return (
    <svg className="sp-plane" viewBox="0 0 180 100" aria-hidden="true">
      <g fill="#fff">
        <path d="M14 46 L150 44 Q174 46 176 50 Q174 54 150 56 L14 54 Z" />
        <path d="M78 47 L58 6 L74 6 L112 47 Z" />
        <path d="M78 53 L58 94 L74 94 L112 53 Z" />
        <path d="M16 47 L4 26 L14 26 L34 47 Z" />
        <path d="M16 53 L4 74 L14 74 L34 53 Z" />
      </g>
    </svg>
  );
}

/** Opening scene: a plane crosses the sky, cuts through a cloud, and the cloud becomes the logo. Plays once per session; tap to skip. */
export default function Splash() {
  const [phase, setPhase] = useState<Phase>("deciding");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage unavailable: play every time.
    }
    const start = setTimeout(() => setPhase(seen ? "done" : "playing"), 0);
    const end = seen ? undefined : setTimeout(() => setPhase("leaving"), PLAY_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, []);

  useEffect(() => {
    if (phase !== "leaving") return;
    const t = setTimeout(() => setPhase("done"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      className={`sp-splash ${phase === "leaving" ? "sp-leaving" : ""}`}
      onClick={() => setPhase("leaving")}
      role="presentation"
    >
      {phase !== "deciding" && (
        <>
          <Cloud className="sp-cloud sp-drift1" />
          <Cloud className="sp-cloud sp-drift2" />
          <Cloud className="sp-cloud sp-drift3" />
          <div className="sp-cluster">
            <Cloud className="sp-puff" />
            <Cloud className="sp-puff" />
            <Cloud className="sp-puff" />
          </div>
          <h1 className="sp-logo">{SERVICE_NAME}</h1>
          <p className="sp-tagline">내가 탄 비행기에서 시작하는 여행</p>
          <div className="sp-flight">
            <div className="sp-craft">
              <div className="sp-contrail" />
              <Plane />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
