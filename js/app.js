(function () {
  const yesBtn = document.getElementById("yes-btn");
  const noBtn = document.getElementById("no-btn");
  const noField = document.getElementById("no-field");
  const veil = document.getElementById("veil");
  const dateInput = document.getElementById("date-input");
  const datePreview = document.getElementById("date-preview");
  const confirmBtn = document.getElementById("confirm-btn");
  const dateForm = document.getElementById("date-form");
  const calMonth = document.getElementById("cal-month");
  const calGrid = document.getElementById("cal-grid");
  const calPrev = document.getElementById("cal-prev");
  const calNext = document.getElementById("cal-next");
  const chosenDate = document.getElementById("chosen-date");
  const garden = document.getElementById("garden");
  const closing = document.getElementById("closing");
  const screens = {
    ask: document.getElementById("screen-ask"),
    plan: document.getElementById("screen-plan"),
    finale: document.getElementById("screen-finale"),
  };

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedISO = "";
  let noLoose = false;
  let noBusy = false;

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function toISO(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function formatDate(iso) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function monthLabel(year, month) {
    return new Date(year, month, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  function showScreen(name) {
    veil.classList.add("is-on");
    window.setTimeout(
      () => {
        Object.entries(screens).forEach(([key, el]) => {
          const active = key === name;
          el.classList.toggle("is-active", active);
          if (active) {
            el.removeAttribute("hidden");
          } else {
            el.setAttribute("hidden", "");
          }
        });
        window.requestAnimationFrame(() => {
          veil.classList.remove("is-on");
          if (name === "plan") {
            celebrateYes();
          }
        });
      },
      reducedMotion ? 0 : 420
    );
  }

  function rectsOverlap(a, b, gap) {
    return !(
      a.right + gap < b.left ||
      a.left - gap > b.right ||
      a.bottom + gap < b.top ||
      a.top - gap > b.bottom
    );
  }

  let lastZone = "";
  let tourIndex = 0;

  function clampNo(x, y) {
    const w = noField.clientWidth;
    const h = noField.clientHeight;
    const btnW = noBtn.offsetWidth;
    const btnH = noBtn.offsetHeight;
    const pad = 10;
    return {
      x: Math.min(Math.max(x, pad), Math.max(pad, w - btnW - pad)),
      y: Math.min(Math.max(y, pad), Math.max(pad, h - btnH - pad)),
    };
  }

  function placeNo(x, y) {
    const pos = clampNo(x, y);
    noBtn.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  }

  function releaseNo() {
    if (noLoose) {
      return;
    }
    const current = noBtn.getBoundingClientRect();
    noBtn.style.animation = "none";
    noBtn.style.transition = "none";
    noBtn.style.transform = `translate3d(${current.left}px, ${current.top}px, 0)`;
    noField.appendChild(noBtn);
    noLoose = true;
    noBtn.getBoundingClientRect();
    noBtn.style.transition = "";
  }

  function hopNo(x, y, spin) {
    const start = noBtn.getBoundingClientRect();
    const dx = x - start.left;
    const dy = y - start.top;
    const midX = start.left + dx * 0.5 + (dx === 0 ? 40 : -dy * 0.18);
    const midY = start.top + dy * 0.35 - 70;
    const peakY = Math.max(6, midY);
    const peakX = clampNo(midX, peakY).x;

    noBtn.style.transition = "transform 0.22s cubic-bezier(.12,.9,.28,1)";
    noBtn.style.transform = `translate3d(${peakX}px, ${peakY}px, 0) rotate(${spin}deg) scale(1.16)`;

    window.setTimeout(() => {
      noBtn.style.transition = "transform 0.38s cubic-bezier(.16,1.4,.26,1)";
      noBtn.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${-spin * 0.2}deg) scale(1)`;
      window.setTimeout(() => {
        noBtn.style.transition = "transform 0.14s cubic-bezier(.2,.8,.2,1)";
        noBtn.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(0deg)`;
        noBusy = false;
      }, 380);
    }, 220);
  }

  function tourSpots(btnW, btnH) {
    const w = noField.clientWidth;
    const h = noField.clientHeight;
    const pad = 8;
    const cols = 4;
    const rows = 5;
    const maxX = Math.max(pad, w - btnW - pad);
    const maxY = Math.max(pad, h - btnH - pad);
    const spots = [];
    for (let row = 0; row < rows; row += 1) {
      const order = [];
      for (let col = 0; col < cols; col += 1) {
        order.push(row % 2 === 0 ? col : cols - 1 - col);
      }
      order.forEach((col) => {
        const x = pad + (col / (cols - 1)) * (maxX - pad);
        const y = pad + (row / (rows - 1)) * (maxY - pad);
        spots.push({
          id: `${row}-${col}`,
          x,
          y,
        });
      });
    }
    return spots;
  }

  function pickZone(btnW, btnH, fromX, fromY, avoidRect) {
    const yesRect = yesBtn.getBoundingClientRect();
    const titleRect = document.getElementById("ask-title").getBoundingClientRect();
    const spots = tourSpots(btnW, btnH);
    const total = spots.length;
    const start = (tourIndex + 3 + Math.floor(Math.random() * 5)) % total;

    for (let i = 0; i < total; i += 1) {
      const index = (start + i) % total;
      const spot = spots[index];
      if (spot.id === lastZone) {
        continue;
      }
      const pos = clampNo(spot.x, spot.y);
      const next = {
        left: pos.x,
        top: pos.y,
        right: pos.x + btnW,
        bottom: pos.y + btnH,
      };
      const farFromFinger =
        typeof fromX !== "number" ||
        Math.hypot(pos.x + btnW / 2 - fromX, pos.y + btnH / 2 - fromY) > 140;
      const farFromNow =
        !avoidRect ||
        Math.hypot(pos.x - avoidRect.left, pos.y - avoidRect.top) > 120;
      const clear =
        farFromFinger &&
        farFromNow &&
        !rectsOverlap(next, yesRect, 56) &&
        !rectsOverlap(next, titleRect, 16);
      if (clear) {
        lastZone = spot.id;
        tourIndex = index;
        return pos;
      }
    }

    lastZone = spots[start].id;
    tourIndex = start;
    return clampNo(spots[start].x, spots[start].y);
  }

  function dodgeNo(fromX, fromY) {
    if (!screens.ask.classList.contains("is-active")) {
      return false;
    }
    if (noBusy) {
      return true;
    }

    releaseNo();
    noBusy = true;

    const btnW = noBtn.offsetWidth;
    const btnH = noBtn.offsetHeight;
    const rect = noBtn.getBoundingClientRect();
    const pos = pickZone(btnW, btnH, fromX, fromY, rect);
    const spin = (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 28);

    if (reducedMotion) {
      placeNo(pos.x, pos.y);
      noBusy = false;
      return true;
    }
    hopNo(pos.x, pos.y, spin);
    return true;
  }

  function celebrateYes() {
    const burst = document.getElementById("burst");
    if (!burst) {
      return;
    }
    burst.innerHTML = "";
    const bits = ["❤️", "✨", "🥰", "🎉", "💕", "🌸", "⭐"];
    for (let i = 0; i < 16; i += 1) {
      const span = document.createElement("span");
      span.className = "burst-bit";
      span.textContent = bits[i % bits.length];
      const angle = (Math.PI * 2 * i) / 16 + 0.2;
      const dist = 36 + (i % 5) * 26;
      span.style.setProperty("--x", `${Math.cos(angle) * dist}px`);
      span.style.setProperty("--y", `${-20 + Math.sin(angle) * dist}px`);
      span.style.setProperty("--r", `${i % 2 === 0 ? 22 : -22}deg`);
      span.style.animationDelay = `${i * 0.035}s`;
      burst.appendChild(span);
    }
  }

  function tryNo(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      dodgeNo(event.clientX, event.clientY);
      return;
    }
    dodgeNo();
  }

  function nearNo(x, y) {
    const rect = noBtn.getBoundingClientRect();
    return (
      Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2)) <
      108
    );
  }

  function renderCalendar() {
    const first = new Date(viewYear, viewMonth, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayISO = toISO(today);
    const minView = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxView = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

    calMonth.textContent = monthLabel(viewYear, viewMonth);
    calPrev.disabled = first <= minView;
    calNext.disabled = first >= maxView;
    calGrid.innerHTML = "";

    for (let i = 0; i < startDay; i += 1) {
      const gap = document.createElement("span");
      gap.className = "cal-day is-empty";
      calGrid.appendChild(gap);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(viewYear, viewMonth, day);
      const iso = toISO(date);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cal-day";
      btn.textContent = String(day);
      btn.setAttribute("aria-label", formatDate(iso));

      if (date < today) {
        btn.classList.add("is-past");
        btn.disabled = true;
      } else {
        btn.classList.add("is-available");
      }
      if (iso === todayISO) {
        btn.classList.add("is-today");
      }
      if (iso === selectedISO) {
        btn.classList.add("is-selected");
        btn.setAttribute("aria-pressed", "true");
      }

      btn.addEventListener("click", () => selectDate(iso));
      calGrid.appendChild(btn);
    }
  }

  function selectDate(iso) {
    selectedISO = iso;
    dateInput.value = iso;
    datePreview.textContent = formatDate(iso);
    confirmBtn.disabled = false;
    renderCalendar();
  }

  function buildFlower() {
    garden.innerHTML = "";

    const plant = document.createElement("div");
    plant.className = "plant";

    const bloom = document.createElement("div");
    bloom.className = "bloom";
    bloom.innerHTML = '<div class="glow"></div><div class="disk"></div>';

    for (let i = 0; i < 16; i += 1) {
      const petal = document.createElement("div");
      petal.className = "daisy-petal";
      petal.style.setProperty("--a", `${i * 22.5}deg`);
      petal.style.setProperty("--d", `${1.7 + i * 0.05}s`);
      petal.style.setProperty("--wiggle", `${i % 2 === 0 ? 2.4 : -2.4}deg`);
      bloom.insertBefore(petal, bloom.querySelector(".disk"));
    }

    for (let i = 0; i < 12; i += 1) {
      const petal = document.createElement("div");
      petal.className = "daisy-petal inner";
      petal.style.setProperty("--a", `${i * 30 + 15}deg`);
      petal.style.setProperty("--d", `${2.3 + i * 0.05}s`);
      petal.style.setProperty("--wiggle", `${i % 2 === 0 ? 1.8 : -1.8}deg`);
      bloom.insertBefore(petal, bloom.querySelector(".disk"));
    }

    const tiny = document.createElement("div");
    tiny.className = "tiny-bloom";
    for (let i = 0; i < 6; i += 1) {
      const petal = document.createElement("div");
      petal.className = "tiny-petal";
      petal.style.setProperty("--a", `${i * 60}deg`);
      tiny.appendChild(petal);
    }
    tiny.insertAdjacentHTML("beforeend", '<div class="tiny-center"></div>');

    const stemWrap = document.createElement("div");
    stemWrap.className = "stem-wrap";
    stemWrap.innerHTML = `
      <svg class="stem-svg" viewBox="0 0 120 180" preserveAspectRatio="none">
        <defs>
          <linearGradient id="stem-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7ed36a" />
            <stop offset="100%" stop-color="#2f7a3a" />
          </linearGradient>
        </defs>
        <path class="side-stem" d="M38 92 C 22 78, 16 58, 22 40" />
        <path class="stem-path" d="M60 176 C 48 124, 72 88, 58 42 S 62 10, 60 4" />
      </svg>
      <div class="leaf leaf-a"></div>
      <div class="leaf leaf-b"></div>
      <div class="leaf leaf-c"></div>
    `;
    stemWrap.appendChild(tiny);

    for (let i = 0; i < 10; i += 1) {
      const mote = document.createElement("span");
      mote.className = "mote";
      const angle = (Math.PI * 2 * i) / 10;
      mote.style.setProperty("--x", `${Math.cos(angle) * (86 + (i % 3) * 12)}px`);
      mote.style.setProperty("--y", `${Math.sin(angle) * 58}px`);
      mote.style.setProperty("--d", `${3.6 + (i % 5) * 0.2}s`);
      bloom.appendChild(mote);
    }

    const grass = document.createElement("div");
    grass.className = "grass";

    plant.append(bloom, stemWrap, grass);
    garden.appendChild(plant);
  }

  function resetNo() {
    if (!noLoose) {
      return;
    }
    document.getElementById("actions").appendChild(noBtn);
    noBtn.removeAttribute("style");
    noLoose = false;
  }

  function startFinale(iso) {
    chosenDate.textContent = formatDate(iso);
    buildFlower();
    showScreen("finale");
    resetNo();
    window.setTimeout(() => {
      garden.classList.add("is-blooming");
      garden.closest("#gifts").classList.add("is-ready");
      if (reducedMotion) {
        closing.classList.add("is-visible");
        return;
      }
      window.setTimeout(() => closing.classList.add("is-visible"), 3600);
    }, reducedMotion ? 40 : 360);
  }

  renderCalendar();

  calPrev.addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderCalendar();
  });

  calNext.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderCalendar();
  });

  dateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedISO) {
      return;
    }
    startFinale(selectedISO);
  });

  yesBtn.addEventListener("click", () => {
    if (yesBtn.classList.contains("is-accepting")) {
      return;
    }
    yesBtn.classList.add("is-accepting");
    noBtn.classList.add("is-gone");
    resetNo();
    window.setTimeout(() => {
      showScreen("plan");
    }, reducedMotion ? 0 : 280);
  });

  noBtn.addEventListener("pointerdown", tryNo, { passive: false });
  noBtn.addEventListener("click", tryNo);
  noBtn.addEventListener("focus", () => tryNo());

  document.addEventListener("pointermove", (event) => {
    if (!screens.ask.classList.contains("is-active")) {
      return;
    }
    if (nearNo(event.clientX, event.clientY)) {
      dodgeNo(event.clientX, event.clientY);
    }
  });

  window.addEventListener("resize", () => {
    if (!noLoose || !screens.ask.classList.contains("is-active")) {
      return;
    }
    const rect = noBtn.getBoundingClientRect();
    placeNo(rect.left, rect.top);
  });
})();
