/**
 * passlock.js — Drop-in password protection for any webpage
 * ─────────────────────────────────────────────────────────
 * Usage: <script src="passlock.js"></script>
 *
 * CONFIGURATION (edit below):
 */

const PASSLOCK_CONFIG = {
  password: "lock!",   // ← Your password here
  sessionKey: "passlock_auth",    // Session storage key (don't change unless needed)
  hint: "Ask Jayden.O",                       // Optional hint shown under input, e.g. "Hint: company name"
  title: "Either the password has changed or you don't belong here.",        // Title shown on the lock screen
  allowQueryParam: true,          // Allow ?password=... in URL to auto-unlock
  sessionPersistence: false,       // true = stays unlocked for the browser session (refresh-safe)
                                  // false = must re-enter password on every page load
};

/* ── DO NOT EDIT BELOW UNLESS YOU KNOW WHAT YOU'RE DOING ── */

(function () {
  "use strict";

  const cfg = PASSLOCK_CONFIG;

  /* ── 1. Check if already authenticated ── */
  function isAuthenticated() {
    if (!cfg.sessionPersistence) return false;
    return sessionStorage.getItem(cfg.sessionKey) === "granted";
  }

  /* ── 2. Try URL param unlock ── */
  function tryQueryParam() {
    if (!cfg.allowQueryParam) return false;
    const params = new URLSearchParams(window.location.search);
    const qp = params.get("password");
    if (qp !== null && qp === cfg.password) {
      if (cfg.sessionPersistence) {
        sessionStorage.setItem(cfg.sessionKey, "granted");
      }
      // Clean the URL so password isn't visible after unlock
      params.delete("password");
      const clean = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", clean);
      return true;
    }
    if (qp !== null && qp !== cfg.password) {
      // Wrong password via URL — will show wrong screen
      return "wrong";
    }
    return false;
  }

  /* ── 3. Inject styles ── */
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

      #passlock-overlay, #passlock-wrong {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Syne', sans-serif;
      }

      /* ── Lock Screen ── */
      #passlock-overlay {
        background: #0a0a0f;
        background-image:
          radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,60,255,0.25) 0%, transparent 60%),
          repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px),
          repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.02) 39px, rgba(255,255,255,0.02) 40px);
      }

      #passlock-box {
        width: min(420px, 90vw);
        padding: 48px 40px 44px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        box-shadow: 0 0 0 1px rgba(99,60,255,0.1), 0 32px 80px rgba(0,0,0,0.6);
        backdrop-filter: blur(20px);
        text-align: center;
        animation: passlock-rise 0.5s cubic-bezier(0.22,1,0.36,1) both;
      }

      @keyframes passlock-rise {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      #passlock-icon {
        width: 56px;
        height: 56px;
        margin: 0 auto 24px;
        background: linear-gradient(135deg, #6b3cf6, #a855f7);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 24px rgba(107,60,246,0.4);
      }

      #passlock-icon svg {
        width: 26px;
        height: 26px;
        fill: white;
      }

      #passlock-title {
        color: #fff;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.5px;
        margin: 0 0 6px;
      }

      #passlock-subtitle {
        color: rgba(255,255,255,0.35);
        font-size: 13px;
        margin: 0 0 32px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 400;
      }

      #passlock-input {
        width: 100%;
        padding: 14px 18px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        color: #fff;
        font-family: 'JetBrains Mono', monospace;
        font-size: 15px;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.2s, box-shadow 0.2s;
        letter-spacing: 0.05em;
      }

      #passlock-input::placeholder { color: rgba(255,255,255,0.2); }

      #passlock-input:focus {
        border-color: rgba(107,60,246,0.7);
        box-shadow: 0 0 0 3px rgba(107,60,246,0.15);
      }

      #passlock-input.shake {
        animation: passlock-shake 0.4s ease;
        border-color: rgba(239,68,68,0.7);
        box-shadow: 0 0 0 3px rgba(239,68,68,0.15);
      }

      @keyframes passlock-shake {
        0%,100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(5px); }
      }

      #passlock-hint {
        margin: 10px 0 0;
        color: rgba(255,255,255,0.25);
        font-size: 12px;
        font-family: 'JetBrains Mono', monospace;
        min-height: 16px;
      }

      #passlock-btn {
        display: block;
        width: 100%;
        margin-top: 20px;
        padding: 14px;
        background: linear-gradient(135deg, #6b3cf6, #a855f7);
        border: none;
        border-radius: 10px;
        color: #fff;
        font-family: 'Syne', sans-serif;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.03em;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
        box-shadow: 0 4px 20px rgba(107,60,246,0.35);
      }

      #passlock-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
        box-shadow: 0 8px 28px rgba(107,60,246,0.45);
      }

      #passlock-btn:active { transform: translateY(0); }

      /* ── Wrong Screen ── */
      #passlock-wrong {
        background: #0f0000;
        background-image: radial-gradient(ellipse 70% 50% at 50% 40%, rgba(220,20,20,0.18) 0%, transparent 70%);
        flex-direction: column;
        gap: 0;
        animation: passlock-wrong-in 0.35s cubic-bezier(0.22,1,0.36,1) both;
      }

      @keyframes passlock-wrong-in {
        from { opacity: 0; transform: scale(1.04); }
        to   { opacity: 1; transform: scale(1); }
      }

      #passlock-wrong-content {
        text-align: center;
        animation: passlock-wrong-shake 0.5s 0.15s ease both;
      }

      @keyframes passlock-wrong-shake {
        0%,100% { transform: translateX(0); }
        20% { transform: translateX(-14px); }
        40% { transform: translateX(14px); }
        60% { transform: translateX(-8px); }
        80% { transform: translateX(8px); }
      }

      #passlock-wrong-icon {
        font-size: 72px;
        line-height: 1;
        margin-bottom: 24px;
        display: block;
        animation: passlock-wrong-icon-pulse 2s ease-in-out infinite;
      }

      @keyframes passlock-wrong-icon-pulse {
        0%,100% { filter: drop-shadow(0 0 0px #ef4444); opacity: 1; }
        50%      { filter: drop-shadow(0 0 24px #ef4444); opacity: 0.85; }
      }

      #passlock-wrong-title {
        font-size: clamp(42px, 9vw, 88px);
        font-weight: 800;
        color: #ef4444;
        letter-spacing: -2px;
        line-height: 1;
        margin: 0 0 14px;
        text-shadow: 0 0 60px rgba(239,68,68,0.5);
      }

      #passlock-wrong-sub {
        color: rgba(255,255,255,0.3);
        font-size: 14px;
        font-family: 'JetBrains Mono', monospace;
        margin: 0 0 40px;
        letter-spacing: 0.05em;
      }

      #passlock-retry-btn {
        padding: 13px 36px;
        background: transparent;
        border: 1px solid rgba(239,68,68,0.4);
        border-radius: 10px;
        color: #ef4444;
        font-family: 'Syne', sans-serif;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
        text-transform: uppercase;
      }

      #passlock-retry-btn:hover {
        background: rgba(239,68,68,0.1);
        border-color: rgba(239,68,68,0.7);
        box-shadow: 0 0 24px rgba(239,68,68,0.15);
      }

      /* scanline effect on wrong screen */
      #passlock-wrong::after {
        content: '';
        position: fixed;
        inset: 0;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.08) 2px,
          rgba(0,0,0,0.08) 4px
        );
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  /* ── 4. Build Lock Screen ── */
  function buildLockScreen() {
    const overlay = document.createElement("div");
    overlay.id = "passlock-overlay";
    overlay.innerHTML = `
      <div id="passlock-box">
        <div id="passlock-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z"/>
          </svg>
        </div>
        <h1 id="passlock-title">${cfg.title}</h1>
        <p id="passlock-subtitle">Enter password to continue</p>
        <input
          id="passlock-input"
          type="password"
          placeholder="Password"
          autocomplete="current-password"
          spellcheck="false"
        />
        <p id="passlock-hint">${cfg.hint || ""}</p>
        <button id="passlock-btn">Unlock</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector("#passlock-input");
    const btn   = overlay.querySelector("#passlock-btn");

    function attempt() {
      if (input.value === cfg.password) {
        if (cfg.sessionPersistence) {
          sessionStorage.setItem(cfg.sessionKey, "granted");
        }
        overlay.style.transition = "opacity 0.3s";
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 300);
      } else {
        input.classList.remove("shake");
        void input.offsetWidth; // reflow to restart animation
        input.classList.add("shake");
        input.value = "";
        setTimeout(() => input.classList.remove("shake"), 500);
        showWrongScreen();
      }
    }

    btn.addEventListener("click", attempt);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attempt();
    });

    // Focus input after a tick
    setTimeout(() => input.focus(), 50);
  }

  /* ── 5. Build Wrong Screen ── */
  function showWrongScreen() {
    // Remove lock screen if present
    const existing = document.getElementById("passlock-overlay");
    if (existing) existing.remove();

    const wrong = document.createElement("div");
    wrong.id = "passlock-wrong";
    wrong.innerHTML = `
      <div id="passlock-wrong-content">
        <span id="passlock-wrong-icon">🔒</span>
        <div id="passlock-wrong-title">WRONG PASSWORD</div>
        <div id="passlock-wrong-sub">Access denied. This incident may be logged.</div>
        <button id="passlock-retry-btn">Try Again</button>
      </div>
    `;
    document.body.appendChild(wrong);

    wrong.querySelector("#passlock-retry-btn").addEventListener("click", () => {
      wrong.style.transition = "opacity 0.25s";
      wrong.style.opacity = "0";
      setTimeout(() => {
        wrong.remove();
        buildLockScreen();
      }, 250);
    });
  }

  /* ── 6. Init ── */
  function init() {
    injectStyles();

    if (isAuthenticated()) return; // Already unlocked this session

    const qResult = tryQueryParam();
    if (qResult === true) return;  // Correct password via URL
    if (qResult === "wrong") {
      showWrongScreen();
      return;
    }

    buildLockScreen();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();