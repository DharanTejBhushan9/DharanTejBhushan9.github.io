/* Dharan Koncha · portfolio interactions. Vanilla JS, no dependencies.
   Progressive: the page reads fully without this file, and
   prefers-reduced-motion switches the motion off. User input is only ever
   written with textContent. */
(() => {
  "use strict";
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const goTo = (sel, block = "start") => {
    const t = typeof sel === "string" ? $(sel) : sel;
    if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block });
  };
  const flash = (n) => {
    n.classList.remove("flash");
    void n.offsetWidth; // restart the animation
    n.classList.add("flash");
    setTimeout(() => n.classList.remove("flash"), 1700);
  };
  const fmtTime = () => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", timeZoneName: "short",
      }).format(new Date());
    } catch (e) { return ""; }
  };
  const copy = (text) => {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((ok, fail) => {
      const t = el("textarea");
      t.value = text; t.setAttribute("readonly", "");
      t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.append(t); t.select();
      try { if (document.execCommand("copy")) ok(); else fail(new Error("copy")); }
      catch (e) { fail(e); } finally { t.remove(); }
    });
  };

  /* ---------------------------------------------------------- scroll progress */
  const bar = $(".progress");
  let barQueued = false;
  const onScroll = () => {
    if (barQueued || !bar) return;
    barQueued = true;
    requestAnimationFrame(() => {
      barQueued = false;
      const max = doc.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------- cursor ring */
  const cursor = $(".cursor");
  if (cursor && fine && !reduce) {
    let cx = -100, cy = -100, tx = -100, ty = -100, raf = 0;
    const follow = () => {
      cx += (tx - cx) * 0.25; cy += (ty - cy) * 0.25;
      cursor.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3 ? requestAnimationFrame(follow) : 0;
    };
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add("on");
      const t = e.target;
      cursor.classList.toggle("big", !!(t.closest && t.closest("a, button, summary, [role=tab]")));
      if (!raf) raf = requestAnimationFrame(follow);
    }, { passive: true });
    addEventListener("pointerdown", () => cursor.classList.add("press"));
    addEventListener("pointerup", () => cursor.classList.remove("press"));
    doc.addEventListener("mouseleave", () => cursor.classList.remove("on"));
  }

  /* ---------------------------------------------------------- magnetic buttons */
  if (fine && !reduce) {
    $$(".btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty("--mx", `${((e.clientX - r.left - r.width / 2) * 0.25).toFixed(1)}px`);
        b.style.setProperty("--my", `${((e.clientY - r.top - r.height / 2) * 0.35).toFixed(1)}px`);
      });
      b.addEventListener("pointerleave", () => { b.style.removeProperty("--mx"); b.style.removeProperty("--my"); });
    });
  }

  /* ---------------------------------------------------------- binary scramble
     Text resolves out of 0/1 glyphs. Screen readers get an sr-only copy while
     the visible glyphs are aria-hidden, then plain text is restored. */
  const scramble = (node, dur = 900) => new Promise((done) => {
    const text = node.dataset.text != null ? node.dataset.text : (node.dataset.text = node.textContent);
    if (reduce || node.dataset.busy) { done(); return; }
    node.dataset.busy = "1";
    const chars = Array.from(text);
    const at = chars.map((_, i) => Math.random() * 0.7 + 0.3 * (i / chars.length));
    const sr = el("span", "sr-only", text);
    const vis = el("span");
    vis.setAttribute("aria-hidden", "true");
    node.replaceChildren(sr, vis);
    const start = performance.now();
    const frame = (now) => {
      const t = clamp((now - start) / dur, 0, 1);
      const frag = document.createDocumentFragment();
      chars.forEach((c, i) => {
        if (c === " " || t >= at[i]) frag.append(c);
        else frag.append(el("span", "scramble-glyph", Math.random() < 0.5 ? "0" : "1"));
      });
      vis.replaceChildren(frag);
      if (t < 1) { requestAnimationFrame(frame); return; }
      node.textContent = text;
      delete node.dataset.busy;
      done();
    };
    requestAnimationFrame(frame);
  });

  /* ---------------------------------------------------------- hero name */
  const display = $(".display");
  const nameLines = display ? $$(".line", display) : [];
  let nameChars = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  Promise.all(nameLines.map((l, i) => wait(i * 180).then(() => scramble(l, 1100)))).then(() => {
    nameLines.forEach((l) => {
      const text = l.dataset.text != null ? l.dataset.text : l.textContent;
      l.replaceChildren(...Array.from(text, (c) => el("span", "ch", c)));
    });
    nameChars = display ? $$(".ch", display) : [];
  });

  const hero = $(".hero");
  if (hero && display && fine && !reduce) {
    const R = 220;
    let px = -1e4, py = -1e4, queued = false;
    const lift = () => {
      queued = false;
      nameChars.forEach((c) => {
        const r = c.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const p = Math.max(0, 1 - d / R);
        c.style.transform = p ? `translateY(${(-p * 0.16).toFixed(3)}em) rotate(${(-4 * p).toFixed(2)}deg)` : "";
        c.classList.toggle("lit", p > 0.5);
      });
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(lift); } };
    hero.addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; queue(); });
    hero.addEventListener("pointerleave", () => { px = py = -1e4; queue(); });
  }

  /* ---------------------------------------------------------- hero candlestick chart
     A random-walk demo series, clearly labelled as not real data. */
  const canvas = $("canvas.candles");
  const tip = $(".chart-tip");
  if (hero && canvas && tip && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const STEP = 18, BODY = 9, UP = "#12805c", DOWN = "#c2412d", INK = "#141414";
    // Only the actual text and controls block the crosshair; block-level
    // headings span the full width, so match their letters instead.
    const IGNORE = "a, button, input, label, .term, .lede, .status, .display .ch, .display .scramble-glyph";
    let W = 0, H = 0, candles = [], offset = 0, last = 100, lo = 0, hi = 0;
    let shock = 0, boost = 0, mouse = null, running = false, visible = true, raf = 0;
    const next = () => {
      const o = last;
      let drift = (Math.random() - 0.48) * 2.2;
      if (shock > 0) { drift = 2.2 + Math.random() * 2.4; shock -= 1; }
      const c = Math.max(20, o + drift);
      last = c;
      return { o, c, h: Math.max(o, c) + Math.random() * 1.6, l: Math.min(o, c) - Math.random() * 1.6 };
    };
    const xs = (i) => i * STEP - offset + STEP / 2;
    const f2 = (v) => v.toFixed(2);
    const crosshair = (x, k, prev) => {
      ctx.save();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = INK; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.moveTo(0, mouse.y); ctx.lineTo(W, mouse.y);
      ctx.stroke(); ctx.restore();
      const ch = ((k.c - prev) / prev) * 100;
      const up = ch >= 0;
      tip.innerHTML = `O ${f2(k.o)}  H ${f2(k.h)}\nL ${f2(k.l)}  C ${f2(k.c)}  ` +
        `<b class="${up ? "up" : "down"}">${up ? "▲ +" : "▼ "}${f2(ch)}%</b>` +
        "<small>demo series · not real data</small>";
      tip.hidden = false;
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      const tx = mouse.x + 18 + tw > W - 8 ? mouse.x - tw - 18 : mouse.x + 18;
      const ty = clamp(mouse.y + 18, 8, Math.max(8, H - th - 8));
      tip.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`;
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      if (!candles.length) return;
      let mn = Infinity, mx = -Infinity;
      candles.forEach((k) => { mn = Math.min(mn, k.l); mx = Math.max(mx, k.h); });
      if (hi === lo) { lo = mn; hi = mx; } else { lo += (mn - lo) * 0.06; hi += (mx - hi) * 0.06; }
      const pad = Math.max(1, (hi - lo) * 0.22), top = hi + pad, span = hi - lo + 2 * pad;
      const y = (v) => ((top - v) / span) * H;
      const hov = mouse ? clamp(Math.floor((mouse.x + offset) / STEP), 0, candles.length - 1) : -1;
      if (hov >= 0) { ctx.fillStyle = "rgba(18,128,92,.13)"; ctx.fillRect(xs(hov) - STEP / 2, 0, STEP, H); }
      candles.forEach((k, i) => {
        const x = xs(i), yt = y(Math.max(k.o, k.c));
        ctx.strokeStyle = ctx.fillStyle = k.c >= k.o ? UP : DOWN;
        ctx.globalAlpha = hov < 0 || i === hov ? 1 : 0.72;
        ctx.lineWidth = i === hov ? 2 : 1.2;
        ctx.beginPath(); ctx.moveTo(x, y(k.h)); ctx.lineTo(x, y(k.l)); ctx.stroke();
        ctx.fillRect(x - BODY / 2, yt, BODY, Math.max(1.5, y(Math.min(k.o, k.c)) - yt));
      });
      ctx.globalAlpha = 0.5; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 7, s = 0; i < candles.length; i++) {
        s = 0;
        for (let j = i - 7; j <= i; j++) s += candles[j].c;
        if (i === 7) ctx.moveTo(xs(i), y(s / 8)); else ctx.lineTo(xs(i), y(s / 8));
      }
      ctx.stroke(); ctx.globalAlpha = 1;
      if (hov >= 0) crosshair(xs(hov), candles[hov], hov ? candles[hov - 1].c : candles[hov].o);
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const need = Math.ceil(W / STEP) + 2;
      while (candles.length < need) candles.push(next());
      if (candles.length > need) candles = candles.slice(-need);
      draw();
    };
    const tick = () => {
      raf = 0;
      if (!running) return;
      offset += 0.35 + boost;
      boost = boost > 0.01 ? boost * 0.95 : 0;
      while (offset >= STEP) { offset -= STEP; candles.shift(); candles.push(next()); }
      draw();
      raf = requestAnimationFrame(tick);
    };
    const setRun = () => {
      const want = visible && !document.hidden && !reduce;
      if (want && !running) { running = true; raf = requestAnimationFrame(tick); }
      if (!want && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
    };
    const clearHover = () => {
      mouse = null; tip.hidden = true;
      document.body.classList.remove("on-chart");
      if (!running) draw();
    };
    hero.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || e.target.closest(IGNORE)) { if (mouse) clearHover(); return; }
      const r = hero.getBoundingClientRect();
      mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
      document.body.classList.add("on-chart");
      if (!running) draw();
    });
    hero.addEventListener("pointerleave", clearHover);
    hero.addEventListener("pointerdown", (e) => {
      if (e.target.closest(IGNORE)) return;
      if (!reduce) {
        const r = hero.getBoundingClientRect();
        const rip = el("span", "ripple");
        rip.style.left = `${e.clientX - r.left}px`; rip.style.top = `${e.clientY - r.top}px`;
        hero.append(rip);
        setTimeout(() => rip.remove(), 1000);
      }
      shock += 7;
      if (running) boost = 9;
      else { for (let i = 0; i < 7; i++) { candles.shift(); candles.push(next()); } draw(); }
    });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero);
    else addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRun(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", setRun);
    resize(); setRun();
  }

  /* ---------------------------------------------------------- reveal + heading scramble */
  const headings = $$("[data-scramble]").filter((n) => !n.closest(".display"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (e.target.classList.contains("reveal")) e.target.classList.add("in");
      else scramble(e.target, 800);
    }), { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach((n) => io.observe(n));
    headings.forEach((n) => io.observe(n));
  } else {
    $$(".reveal").forEach((n) => n.classList.add("in"));
  }
  if (fine && !reduce) headings.forEach((n) => n.addEventListener("pointerenter", () => scramble(n, 420)));

  /* ---------------------------------------------------------- candle confetti */
  const confetti = () => {
    if (reduce) return;
    const box = el("div", "confetti");
    box.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 46; i++) {
      const c = el("i");
      c.style.left = `${(Math.random() * 100).toFixed(1)}%`;
      c.style.height = `${Math.round(12 + Math.random() * 22)}px`;
      c.style.background = Math.random() > 0.3 ? "#2bd393" : "#c2412d";
      c.style.animationDuration = `${(1.6 + Math.random() * 1.6).toFixed(2)}s`;
      c.style.animationDelay = `${(Math.random() * 0.5).toFixed(2)}s`;
      c.style.setProperty("--r", `${Math.round((Math.random() - 0.5) * 540)}deg`);
      box.append(c);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 4000);
  };

  /* ---------------------------------------------------------- pipeline tabs (shared) */
  const tabs = $$('.pipe-stages [role="tab"]');
  const panelsBox = $(".pipe-panels");
  let tourStop = () => {};
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const p = document.getElementById(t.getAttribute("aria-controls"));
      if (p) p.hidden = !on;
    });
    if (focus) tab.focus();
  };

  /* ---------------------------------------------------------- terminal */
  const term = $("[data-term]");
  const form = $("[data-term-form]");
  const input = $("#term-cmd");
  const log = $("[data-term-log]");
  const screen = $("[data-term-screen]");
  const termHint = $("[data-term-hint]");
  if (term && form && input && log && screen) {
    const EMAIL = "konchadharantejbhushan@gmail.com";
    const RESUME = "Dharan-Koncha-Resume.pdf";
    const SECTIONS = {
      top: "#top", about: "#about", pipeline: "#pipeline", experience: "#experience",
      work: "#work", projects: "#work", skills: "#skills", contact: "#contact",
    };
    // The intro is static markup from index.html, so replaying it as HTML is safe.
    const intro = term.innerHTML.split("\n");
    const pre = term.closest("pre");
    const line = (cls, ...parts) => {
      const d = el("div", `ln ${cls}`);
      d.append(...parts);
      log.append(d);
      screen.scrollTop = screen.scrollHeight;
      return d;
    };
    const link = (href, text) => {
      const a = el("a", "", text);
      a.href = href;
      if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
      return a;
    };
    const ready = () => {
      term.innerHTML = intro.join("\n");
      form.hidden = false;
      if (termHint) termHint.hidden = false;
    };
    if (reduce) ready();
    else {
      let shown = 0;
      term.innerHTML = '<span class="caret"></span>';
      const type = () => {
        shown += 1;
        term.innerHTML = `${intro.slice(0, shown).join("\n")}\n<span class="caret"></span>`;
        if (shown < intro.length) setTimeout(type, 340); else ready();
      };
      setTimeout(type, 500);
    }
    const replay = () => intro.slice(1).forEach((h, i) => setTimeout(() => {
      line("out").innerHTML = h;
      screen.scrollTop = screen.scrollHeight;
    }, reduce ? 0 : i * 340));
    const CMDS = {
      help: () => {
        line("out", "whoami · about · skills · experience · projects · pipeline · contact");
        line("out", "resume · email · goto <section> · ls · time · clear · echo · hire");
      },
      whoami: () => line("out", "Dharan Koncha. Software Engineer in Dallas–Fort Worth. Full stack, serverless AWS, data and ML."),
      about: () => line("out", "I build HedgeWithAI end to end: market data in, checks, research, models, and the screen a trader looks at. MS CS, Michigan Tech."),
      skills: () => {
        line("out", "lang   python · typescript · javascript · sql · java");
        line("out", "web    react · angular · node.js · rxjs · websockets · django");
        line("out", "aws    lambda · dynamodb · s3 · eventbridge · sqs/ses · sagemaker");
        line("out", "data   etl · validation · backtesting · candlestick patterns");
        line("out", "ai     openai api · rag · sentiment · ai agents");
      },
      experience: () => {
        line("out", "2025 → now   Software Engineer · Nubes Opus (HedgeWithAI)");
        line("out", "2022         Administrator intern · Salesforce");
        line("out", "2020 → 2021  IT & Software intern · Reliable Agencies");
      },
      projects: () => [
        "HedgeWithAI         AI trading-intelligence platform",
        "research harness    ETL, validation and backtests by AI agents",
        "smart traffic       OpenCV + TensorFlow congestion control",
        "TechStatView        Django intranet, published 2023",
      ].forEach((t) => line("out", t)),
      pipeline: replay,
      contact: () => {
        line("out", "email     ", link(`mailto:${EMAIL}`, EMAIL));
        line("out", "linkedin  ", link("https://www.linkedin.com/in/dharantejk", "linkedin.com/in/dharantejk"));
        line("out", "github    ", link("https://github.com/DharanTejBhushan9", "github.com/DharanTejBhushan9"));
      },
      resume: () => { line("ok", "opening resume…"); window.open(RESUME, "_blank", "noopener"); },
      email: () => copy(EMAIL).then(() => line("ok", `copied ${EMAIL}`), () => line("out", EMAIL)),
      goto: (arg) => {
        if (!SECTIONS[arg]) { line("err", `no such section: ${arg || "(none)"}. try ${Object.keys(SECTIONS).join(" ")}`); return; }
        line("ok", `→ ${arg}`);
        goTo(SECTIONS[arg]);
      },
      ls: () => line("out", "about/  pipeline/  experience/  work/  skills/  contact/  Dharan-Koncha-Resume.pdf"),
      time: () => line("out", `${fmtTime() || "time unavailable"} in Dallas–Fort Worth`),
      clear: () => { log.replaceChildren(); if (pre) pre.hidden = true; },
      echo: (arg, raw) => line("out", raw),
      sudo: () => line("err", "permission denied. nice try, though."),
      hire: () => {
        line("ok", "excellent decision.");
        line("out", "let's talk: ", link(`mailto:${EMAIL}?subject=Let%27s%20talk`, EMAIL));
        confetti();
      },
    };
    CMDS.exp = CMDS.experience; CMDS.work = CMDS.projects; CMDS.cd = CMDS.goto;
    const hist = [];
    let hpos = 0;
    const run = (raw) => {
      const text = raw.trim();
      line("cmd", `$ ${text}`);
      if (!text) return;
      hist.push(text); hpos = hist.length;
      const parts = text.split(/\s+/);
      const name = parts[0].toLowerCase();
      const fn = Object.prototype.hasOwnProperty.call(CMDS, name) ? CMDS[name] : null;
      if (fn) fn((parts[1] || "").toLowerCase(), parts.slice(1).join(" "));
      else line("err", `command not found: ${parts[0]}. type help`);
    };
    form.addEventListener("submit", (e) => { e.preventDefault(); run(input.value); input.value = ""; });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (!hist.length) return;
        e.preventDefault();
        hpos = clamp(hpos + (e.key === "ArrowUp" ? -1 : 1), 0, hist.length);
        input.value = hist[hpos] || "";
        return;
      }
      if (e.key !== "Tab" || e.shiftKey || !input.value.trim()) return; // empty: let Tab move focus
      const v = input.value.replace(/^\s+/, "").toLowerCase();
      const sp = v.indexOf(" ");
      const cmd = sp < 0 ? v : v.slice(0, sp);
      const arg = sp < 0 ? null : v.slice(sp + 1).trim();
      const pool = arg === null ? Object.keys(CMDS) : (cmd === "goto" || cmd === "cd") ? Object.keys(SECTIONS) : [];
      const hits = pool.filter((k) => k.startsWith(arg === null ? cmd : arg));
      if (!hits.length) return;
      e.preventDefault();
      if (hits.length === 1) input.value = arg === null ? `${hits[0]} ` : `${cmd} ${hits[0]}`;
      else line("out", hits.join("  "));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || form.hidden) return;
      const t = e.target;
      if (t.closest && t.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      input.focus();
    });
    screen.addEventListener("click", (e) => {
      if (form.hidden || e.target.closest("a")) return;
      if (String(window.getSelection ? getSelection() : "")) return; // let people copy text
      input.focus({ preventScroll: true });
    });
  }

  /* ---------------------------------------------------------- ticker: scroll-driven tape */
  const ticker = $(".ticker");
  const track = $(".ticker-track");
  if (ticker && track && !reduce) {
    $$("li", track).forEach((li) => {
      const c = li.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      track.append(c);
    });
    ticker.classList.add("driven");
    let x = 0, vel = 0, dir = 1, lastY = scrollY, hover = false, shown = true, raf = 0;
    let half = track.scrollWidth / 2;
    const measure = () => { half = track.scrollWidth / 2 || 1; };
    const roll = () => {
      raf = 0;
      const dy = scrollY - lastY;
      lastY = scrollY;
      if (dy) dir = dy > 0 ? 1 : -1;
      vel += (Math.abs(dy) - vel) * 0.15;
      const speed = (0.6 + Math.min(vel * 0.8, 25)) * (hover ? 0.25 : 1) * dir;
      x = (x - speed) % half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
      ticker.classList.toggle("rev", dir < 0);
      if (shown && !document.hidden) raf = requestAnimationFrame(roll);
    };
    const wake = () => { if (shown && !document.hidden && !raf) { lastY = scrollY; raf = requestAnimationFrame(roll); } };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { shown = e.isIntersecting; wake(); }).observe(ticker);
    }
    ticker.addEventListener("pointerenter", () => { hover = true; });
    ticker.addEventListener("pointerleave", () => { hover = false; });
    document.addEventListener("visibilitychange", wake);
    addEventListener("resize", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    wake();
  }

  /* ---------------------------------------------------------- pipeline: keyboard + guided tour */
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => { tourStop(); select(t); });
    t.addEventListener("keydown", (e) => {
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      tourStop();
      select(tabs[(to + tabs.length) % tabs.length], true);
    });
  });
  const pipe = $(".pipe");
  const tourBtn = $("[data-tour]");
  const timer = $(".pipe-timer span");
  if (tabs.length && pipe && panelsBox && tourBtn && timer && !reduce && "IntersectionObserver" in window) {
    let playing = true, inView = false, hovering = false, id = 0;
    const label = () => { tourBtn.textContent = playing ? "pause tour" : "play tour"; };
    const schedule = () => {
      clearTimeout(id);
      timer.classList.remove("run");
      if (!playing || !inView || hovering || document.hidden) return;
      void timer.offsetWidth; // restart the fill bar
      timer.classList.add("run");
      id = setTimeout(() => {
        const now = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
        select(tabs[(now + 1) % tabs.length]);
        schedule();
      }, 4500);
    };
    // Any direct tab interaction ends autoplay for good; the button can restart it.
    tourStop = () => { if (!playing) return; playing = false; label(); schedule(); };
    tourBtn.hidden = false;
    tourBtn.addEventListener("click", () => { playing = !playing; label(); schedule(); });
    panelsBox.addEventListener("pointerenter", () => { hovering = true; schedule(); });
    panelsBox.addEventListener("pointerleave", () => { hovering = false; schedule(); });
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; schedule(); }, { threshold: 0.35 }).observe(pipe);
    document.addEventListener("visibilitychange", schedule);
    label();
  }

  /* ---------------------------------------------------------- cards: spotlight + tilt */
  if (fine && !reduce) {
    $$(".card").forEach((c) => {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.setProperty("--x", `${(px * 100).toFixed(1)}%`);
        c.style.setProperty("--y", `${(py * 100).toFixed(1)}%`);
        c.style.setProperty("--rx", `${((0.5 - py) * 7).toFixed(2)}deg`);
        c.style.setProperty("--ry", `${((px - 0.5) * 7).toFixed(2)}deg`);
      });
      c.addEventListener("pointerleave", () => { c.style.removeProperty("--rx"); c.style.removeProperty("--ry"); });
    });
  }

  /* ---------------------------------------------------------- skill explorer: where have I used X? */
  const explorer = $("[data-skill-explorer]");
  const result = $("[data-skill-result]");
  if (explorer && result) {
    const targets = $$("[data-skills]");
    const where = (s) => targets.filter((t) => t.dataset.skills.split(/\s+/).includes(s));
    const hint = () => {
      result.classList.remove("active");
      result.replaceChildren(el("p", "hint-line", "Pick a skill to see where I've used it."));
    };
    const jump = (t) => {
      if (t.getAttribute("role") === "tabpanel") {
        const tab = document.getElementById(t.getAttribute("aria-labelledby"));
        tourStop();
        if (tab) select(tab);
        goTo("#pipeline");
        if (panelsBox) flash(panelsBox);
      } else {
        goTo(t, "center");
        flash(t);
      }
      if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "-1");
      t.focus({ preventScroll: true }); // keyboard and screen-reader users land on it too
    };
    const show = (name, hits) => {
      const kids = [el("h3", "", name)];
      if (!hits.length) {
        kids.push(el("p", "hint-line", "In my toolkit, not featured on this page yet. Ask me about it."));
      } else {
        kids.push(el("p", "hint-line", `Used in ${hits.length} place${hits.length > 1 ? "s" : ""} on this page. Jump to one:`));
        const ul = el("ul", "used");
        hits.forEach((t) => {
          const b = el("button", "", t.dataset.label || t.id);
          b.type = "button";
          b.addEventListener("click", () => jump(t));
          const li = el("li");
          li.append(b);
          ul.append(li);
        });
        kids.push(ul);
      }
      result.replaceChildren(...kids);
      result.classList.remove("active");
      void result.offsetWidth;
      result.classList.add("active");
    };
    let current = null;
    $$("li[data-skill]", explorer).forEach((li) => {
      const skill = li.dataset.skill;
      const name = li.textContent.trim();
      const hits = where(skill);
      const b = el("button", "skill-btn", name);
      b.type = "button";
      b.dataset.skill = skill;
      b.setAttribute("aria-pressed", "false");
      if (hits.length) {
        const sup = el("sup", "", String(hits.length));
        sup.setAttribute("aria-hidden", "true");
        b.append(sup);
      }
      b.addEventListener("click", () => {
        current = current === skill ? null : skill;
        $$(".skill-btn", explorer).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.skill === current)));
        if (current) show(name, hits); else hint();
      });
      li.replaceChildren(b);
    });
    hint();
  }

  /* ---------------------------------------------------------- scrollspy */
  const navLinks = $$('.bar nav a[href^="#"]');
  if (navLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.removeAttribute("aria-current"));
      const a = byId.get(e.target.id);
      if (a) a.setAttribute("aria-current", "location");
    }), { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach((s) => spy.observe(s));
  }

  /* ---------------------------------------------------------- local time */
  const lt = $("[data-localtime]");
  const ltLine = $("[data-local-line]");
  const ltFoot = $("[data-localtime-foot]");
  const clock = () => {
    const t = fmtTime();
    if (!t) return;
    if (lt) { lt.textContent = t; if (ltLine) ltLine.hidden = false; }
    if (ltFoot) ltFoot.textContent = ` · ${t}`;
  };
  clock();
  setInterval(clock, 30000);

  /* ---------------------------------------------------------- copy email */
  const toast = $(".toast");
  let toastId = 0;
  const say = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    clearTimeout(toastId);
    toastId = setTimeout(() => { toast.textContent = ""; }, 2600);
  };
  $$("[data-copy]").forEach((b) => b.addEventListener("click", () => {
    const v = b.dataset.copy;
    copy(v).then(() => say(`Copied ${v}`), () => say(`Couldn't copy. The address is ${v}`));
  }));
})();
