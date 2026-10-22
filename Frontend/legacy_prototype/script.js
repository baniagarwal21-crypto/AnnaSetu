const $ = s => document.querySelector(s);
const r = i => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;

const CAT = {
  "Cooked rice and grains": { h: 6, f: 2.7 },
  "Dairy and paneer gravies": { h: 4, f: 4.2 },
  "Bakery items": { h: 24, f: 1.3 },
  "Fresh produce": { h: 48, f: .9 }
};

const S = {
  by: {
    "Cooked rice and grains": 410,
    "Dairy and paneer gravies": 180,
    "Bakery items": 260,
    "Fresh produce": 390
  },
  batch: null,
  log: [],
  ch: {},
  jobs: []
};

const NGO = [
  ["Robin Hood Army", 150, 120, 80],
  ["Feeding Hope Shelter", 430, 90, 60],
  ["Asha Community Kitchen", 470, 300, 200],
  ["Seva Food Bank", 120, 300, 300],
  ["Bal Sahara Home", 300, 60, 45]
];

const win = (c, t) => Math.max(.5, CAT[c].h * Math.pow(2, (25 - t) / 10));
const fmt = h => h < 1 ? Math.round(h * 60) + " min" : h.toFixed(1) + " h";
const urg = h => h < 2 ? ["crit", "Critical"] : h < 5 ? ["mod", "Moderate"] : ["ok", "Comfortable"];

const hash = s => {
  let h = 5381;
  for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h.toString(16).padStart(8, "0");
};

function addLog(t) {
  const p = S.log.length ? S.log[0].h : "00000000";
  S.log.unshift({ t, h: hash(p + t) });
  S.log = S.log.slice(0, 5);
}

const tot = () => {
  const k = Object.values(S.by).reduce((a, b) => a + b, 0);
  const c = Object.entries(S.by).reduce((a, [n, v]) => a + v * CAT[n].f, 0);
  return { k, c, m: Math.round(k / .4), rs: k * 70 };
};

function mk(id, cfg) {
  if (S.ch[id]) S.ch[id].destroy();
  const st = getComputedStyle(document.documentElement);
  Chart.defaults.color = st.getPropertyValue("--mut");
  Chart.defaults.borderColor = st.getPropertyValue("--bd");
  cfg.options = { ...cfg.options, responsive: true, maintainAspectRatio: false };
  S.ch[id] = new Chart($("#" + id), cfg);
}

const kp = (l, v, s) => `<div class="card"><div class="mut">${l}</div><div class="big">${v}</div><div class="mut">${s}</div></div>`;

function kpis() {
  const t = tot();
  if ($("#kpi")) {
    $("#kpi").innerHTML = 
      kp("Food rescued", t.k.toLocaleString("en-IN") + " kg", "This month") +
      kp("Meals provided", t.m.toLocaleString("en-IN"), "0.4 kg per meal") +
      kp("CO₂e avoided", Math.round(t.c).toLocaleString("en-IN") + " kg", "Landfill methane avoided") +
      kp("Value recovered", "₹" + t.rs.toLocaleString("en-IN"), "At ₹70 per kg");
  }

  if ($("#log")) {
    $("#log").innerHTML = S.log.map(l => `<div class="row"><span>${l.t}</span><code class="mut">${l.h}</code></div>`).join("") ||
      '<div class="mut" style="padding:8px 0">No hand-offs yet. Claim a batch in Dispatch.</div>';
  }
}

function fc() {
  const L = [], A = [], P = [], U = [];
  for (let i = 0; i < 14; i++) {
    const b = (i % 7 > 4) ? 230 : 430;
    const a = Math.round(b * (1 + (r(i) - .5) * .2));
    const p = Math.round(b * (1 + (r(i + 40) - .5) * .05));
    L.push("Day " + (i + 1));
    A.push(a);
    P.push(p);
    U.push(Math.round(p * 1.08));
  }
  return { L, A, P, U };
}

function show(v) {
  document.querySelectorAll(".view").forEach(e => e.classList.toggle("on", e.id === v));
  document.querySelectorAll("aside button[data-v]").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  draw(v);
}

// FASTAPI ML MODEL FETCH
async function loadTomorrowPlan() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    const res = await fetch("http://127.0.0.1:8000/api/v1/forecast/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr })
    });

    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    if (data.predictions) {
      const lunch = data.predictions.lunch;
      const totalMeals = data.predictions.breakfast.expected_students + 
                         data.predictions.lunch.expected_students + 
                         data.predictions.dinner.expected_students;

      if ($("#plan")) $("#plan").textContent = `${lunch.expected_students} students (Lunch)`;
      if ($("#plan2")) $("#plan2").textContent = `Total daily forecast: ${totalMeals} meals. Recommended cook quantity for Lunch: ${lunch.recommended_cook_kg} kg (Includes 8% safety margin).`;
    }
  } catch (err) {
    if ($("#plan")) $("#plan").textContent = "1,340 meals";
    if ($("#plan2")) $("#plan2").textContent = "Forecast 1,240 plus 8% safety margin. Tomorrow is a weekday with an exam schedule.";
  }
}

// LEAFLET MAP RENDER
let mapInstance = null;
function renderLeafletMap() {
  const mapContainer = document.getElementById("leaflet-map");
  if (!mapContainer) return;

  if (mapInstance !== null) {
    mapInstance.remove();
  }

  if (typeof L === 'undefined') return;

  mapInstance = L.map('leaflet-map').setView([28.7532, 77.4975], 12);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  L.marker([28.7532, 77.4975]).addTo(mapInstance)
    .bindPopup("<b>Anna-Setu Kitchen</b><br>KIET Hostel Mess").openPopup();

  const ngos = [
    { name: "Robin Hood Army", lat: 28.6692, lng: 77.4538 },
    { name: "Feeding Hope Shelter", lat: 28.6986, lng: 77.4211 },
    { name: "Seva Food Bank", lat: 28.7041, lng: 77.4325 }
  ];

  ngos.forEach(ngo => {
    L.marker([ngo.lat, ngo.lng]).addTo(mapInstance)
      .bindPopup(`<b>${ngo.name}</b><br>Eligible Recipient`);
  });
}

function draw(v) {
  if (v === "dash") {
    kpis();
    const d = fc();
    mk("c1", {
      type: "line",
      data: {
        labels: d.L,
        datasets: [
          { label: "Actual", data: d.A, borderColor: "#e0a21b", tension: .3 },
          { label: "Forecast", data: d.P, borderColor: "#1f7a4d", borderDash: [5, 4], tension: .3 },
          { label: "Upper band", data: d.U, borderColor: "#7fb89c", pointRadius: 0, tension: .3 }
        ]
      }
    });
  }
  if (v === "kit") {
    loadTomorrowPlan();
    sw();
  }
  if (v === "dis") {
    disp();
    setTimeout(() => { renderLeafletMap(); }, 200);
  }
  if (v === "drv") drv();
  if (v === "esg") {
    const t = tot();
    if ($("#ek")) {
      $("#ek").innerHTML = kp("Food diverted", t.k + " kg", "From landfill") +
        kp("Net CO₂e avoided", Math.round(t.c) + " kg", "Per-category factors") +
        kp("Surplus redistributed", "83%", "Of all surplus logged");
    }

    if ($("#ind")) {
      $("#ind").innerHTML = [
        "Principle 6 · waste managed: " + t.k + " kg",
        "Hand-offs verified by one-time code",
        "Audit chain: " + S.log.length + " recent entries intact"
      ].map(x => `<div class="row">${x}</div>`).join("");
    }

    mk("c3", {
      type: "bar",
      data: {
        labels: Object.keys(S.by),
        datasets: [{ data: Object.entries(S.by).map(([n, v]) => Math.round(v * CAT[n].f)), backgroundColor: "#1f7a4d" }]
      },
      options: { plugins: { legend: { display: false } } }
    });
  }
  if (v === "pro") {
    mk("c2", {
      type: "bar",
      data: {
        labels: ["Packing jam", "Changeover", "Boiler fault", "Material wait", "Cleaning"],
        datasets: [{ data: [142, 96, 74, 51, 38], backgroundColor: ["#c0392b", "#e0a21b", "#e0a21b", "#7fb89c", "#7fb89c"] }]
      },
      options: { indexAxis: "y", plugins: { legend: { display: false } } }
    });
    anomaly(true);
  }
}

function sw() {
  if (!$("#fc") || !$("#ft")) return;
  const c = $("#fc").value, t = +$("#ft").value;
  if ($("#ftv")) $("#ftv").textContent = t;
  const h = win(c, t), u = urg(h);
  if ($("#fw")) $("#fw").innerHTML = `${fmt(h)} <span class="tag ${u[0]}">${u[1]}</span>`;
}

function disp() {
  const b = S.batch;
  if (!b) {
    if ($("#dmsg")) $("#dmsg").innerHTML = "";
    if ($("#dgrid")) $("#dgrid").innerHTML = '<div class="card">Nothing waiting. Post a surplus batch from Kitchen.</div>';
    return;
  }
  const left = Math.max(0, b.h - (Date.now() - b.t) / 36e5), u = urg(left), C = 2 * Math.PI * 44, pc = Math.min(1, left / 8);
  const rk = NGO.map(([n, x, y, cap]) => {
    const km = Math.hypot(x - 300, y - 190) / 30, mins = km / 25 * 60, ok = mins < left * 60 && cap >= Math.min(b.k, 20);
    return { n, x, y, cap, km, mins, ok, s: ok ? .4 * (1 - km / 12) + .3 * Math.min(1, cap / b.k) + .3 * Math.min(1, (left * 60 - mins) / (left * 60)) : -1 };
  }).sort((a, z) => z.s - a.s);

  if ($("#dmsg")) $("#dmsg").innerHTML = "";
  if ($("#dgrid")) {
    $("#dgrid").innerHTML = `<div class="card"><h3>${b.n} · ${b.k} kg</h3>
    <svg viewBox="0 0 110 110" width="150" role="img" aria-label="Safe window left: ${fmt(left)}">
      <circle cx="55" cy="55" r="44" fill="none" stroke="var(--bd)" stroke-width="9"/>
      <circle cx="55" cy="55" r="44" fill="none" stroke="${u[0] == "crit" ? "var(--bad)" : u[0] == "mod" ? "var(--ac2)" : "var(--ac)"}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C * pc} ${C}" transform="rotate(-90 55 55)"/>
      <text x="55" y="53" text-anchor="middle" style="font:700 17px Georgia">${fmt(left)}</text>
      <text x="55" y="70" text-anchor="middle">safe window</text>
    </svg>
    <div id="leaflet-map" style="height: 380px; width: 100%; border-radius: 8px; margin-top: 8px;"></div>
    </div>
    <div class="card"><h3>Ranked recipients</h3>
    ${rk.map((k, i) => `<div class="row"><div><b>${k.n}</b><div class="mut">${k.km.toFixed(1)} km · ${Math.round(k.mins)} min drive · takes ${k.cap} kg</div></div>${k.ok ? `<button class="btn" data-c="${i}">Claim</button>` : '<span class="tag">Cannot reach in time</span>'}</div>`).join("")}</div>`;
  }

  document.querySelectorAll("[data-c]").forEach(e => e.onclick = () => {
    const k = rk[+e.dataset.c], q = Math.min(b.k, k.cap), otp = String(100000 + Math.floor(Math.random() * 9e5));
    S.jobs.push({ kit: 0, ng: NGO.findIndex(a => a[0] === k.n), kg: q, c: b.c, dl: Math.round(left * 60), otp });
    addLog(`${k.n} reserved ${q} kg`);
    S.batch = null;
    disp();
    if ($("#dmsg")) $("#dmsg").innerHTML = `<div class="card" style="margin-bottom:14px;border-color:var(--ac)"><h3>Reserved for ${k.n}</h3>Hand-off code <b style="font:700 28px Georgia">${otp}</b><div class="mut">The receiver gives this code to the driver at delivery. A trip was added under Driver trips, and the kg count once it is delivered.</div></div>`;
  });
}

function tk() {
  const U = [["Cold room", 3, 5, "cold"], ["Hot-hold counter", 67, 0, "hot"], ["Dry store", 26, 0, "dry"]];
  if ($("#units")) {
    $("#units").innerHTML = U.map((u, i) => {
      const t = u[1] + (r(Date.now() / 2000 + i) - .5) * (u[3] == "cold" ? 5 : 4) + (u[3] == "cold" && Math.floor(Date.now() / 16000) % 3 == 0 ? 2.5 : 0);
      const g = Math.round(120 + r(i + Date.now() / 5000) * (i == 0 ? 260 : 110));
      const bad = (u[3] == "cold" && t > 5) || (u[3] == "hot" && t < 60) || g > 300;
      return `<div class="card"><h3>${u[0]}</h3><div class="big">${t.toFixed(1)} °C</div><div class="mut">Gas ${g} ppm</div><span class="tag ${bad ? "crit" : "ok"}">${bad ? (g > 300 ? "Spoilage gas high" : "Out of safe range") : "Within range"}</span></div>`;
    }).join("");
  }
}

function anomaly(init) {
  const A = [["Line 2 motor", "Energy 38% above normal for this load", "High"], ["Mixer 1", "Raw material loss 4.1% against 2.5% standard", "Medium"]];
  if (!init) A.unshift(["Boiler 1", "Temperature swing outside 3σ at " + new Date().toLocaleTimeString("en-IN"), "High"]);
  if ($("#anom")) $("#anom").innerHTML = A.map(a => `<tr><td><b>${a[0]}</b><div class="mut">${a[1]}</div></td><td><span class="tag ${a[2] == "High" ? "crit" : "mod"}">${a[2]}</span></td></tr>`).join("");
}

const KIT = [[300, 190, "Main canteen"], [90, 80, "Hostel mess"], [520, 330, "Factory unit"]];
const ROLE = {
  kitchen: { n: "Kitchen manager", v: ["dash", "kit", "dis", "iot", "esg"] },
  ngo: { n: "NGO coordinator", v: ["dash", "dis", "esg"] },
  driver: { n: "Driver", v: ["drv"] },
  plant: { n: "Plant manager", v: ["dash", "pro", "iot", "esg"] },
  auditor: { n: "Auditor", v: ["dash", "esg"] }
};

S.jobs = [
  { kit: 1, ng: 3, kg: 60, c: "Bakery items", dl: 150, otp: "482913" },
  { kit: 2, ng: 2, kg: 45, c: "Cooked rice and grains", dl: 75, otp: "205771" },
  { kit: 0, ng: 4, kg: 30, c: "Fresh produce", dl: 300, otp: "773104" }
];

function loginUI() {
  const lgContainer = $("#lg") || document.getElementById("lg");
  const loginOverlay = $("#login") || document.getElementById("login");

  if (lgContainer) {
    lgContainer.innerHTML = Object.entries(ROLE).map(([k, o]) => 
      `<button class="btn" data-r="${k}" style="width: 100%; padding: 10px; margin-top: 6px; cursor: pointer;">${o.n}</button>`
    ).join("");
  }

  if (loginOverlay) {
    loginOverlay.style.display = "flex";
  }

  document.querySelectorAll("[data-r]").forEach(b => {
    b.onclick = () => {
      const o = ROLE[b.dataset.r];
      if (loginOverlay) loginOverlay.style.display = "none";
      if ($("#who")) $("#who").textContent = "Signed in as " + o.n;
      document.querySelectorAll("aside button[data-v]").forEach(x => {
        x.style.display = o.v.includes(x.dataset.v) ? "" : "none";
      });
      show(o.v[0]);
    };
  });
}

function plan() {
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) / 30, sp = 25 / 60, dep = [300, 190], J = S.jobs.map((j, i) => ({ ...j, i, p: 0, d: 0 }));
  let pos = dep, t = 0, load = 0, km = 0;
  const st = [];

  for (let n = 0; n < J.length * 2; n++) {
    let b = null;
    J.forEach(j => {
      if (j.d) return;
      if (!j.p && load + j.kg > 150) return;
      const g = j.p ? [NGO[j.ng][1], NGO[j.ng][2]] : [KIT[j.kit][0], KIT[j.kit][1]];
      const dd = dist(pos, g), s = dd + (j.dl - t) / 30;
      if (!b || s < b.s) b = { j, g, dd, s };
    });
    if (!b) break;
    const pick = !b.j.p;
    t += b.dd / sp;
    km += b.dd;
    pos = b.g;
    if (pick) { b.j.p = 1; load += b.j.kg; } else { b.j.d = 1; load -= b.j.kg; }
    st.push({ j: b.j, g: b.g, pick, eta: Math.round(t), late: !pick && t > b.j.dl });
  }

  km += dist(pos, dep);
  const base = S.jobs.reduce((a, j) => {
    const k = KIT[j.kit], n = NGO[j.ng], g = [n[1], n[2]];
    return a + dist(dep, k) + dist(k, g) + dist(g, dep);
  }, 0);

  return { st, km, base, left: J.filter(j => !j.d).length };
}

function drv() {
  const el = $("#dr");
  if (!el) return;
  if (!S.jobs.length) {
    el.innerHTML = '<div class="card">No trips waiting. Claims made in Dispatch appear here.</div>';
    return;
  }
  const p = plan(), pts = [[300, 190], ...p.st.map(s => s.g), [300, 190]];
  el.innerHTML = `<div class="grid"><div class="card"><h3>Planned route</h3>
  <div class="big">${p.km.toFixed(1)} km</div>
  <div class="mut">${Math.round((1 - p.km / p.base) * 100)}% shorter than ${p.base.toFixed(1)} km with one trip per pickup. Capacity 150 kg, 25 km/h.${p.left ? ` ${p.left} job(s) need a second vehicle.` : ""}</div>
  <svg viewBox="0 0 600 380" width="100%" style="background:var(--bg);border-radius:8px;margin-top:8px" role="img" aria-label="Route map">
    <polyline points="${pts.map(a => a[0] + "," + a[1]).join(" ")}" fill="none" stroke="var(--ac)" stroke-width="2.5"/>
    ${p.st.map((s, i) => `<circle cx="${s.g[0]}" cy="${s.g[1]}" r="11" fill="${s.pick ? "var(--ac2)" : "var(--ac)"}"/><text x="${s.g[0]}" y="${s.g[1] + 4}" text-anchor="middle" style="fill:#fff;font-weight:700">${i + 1}</text>`).join("")}
  </svg></div>
  <div class="card"><h3>Stops</h3>
  ${p.st.map((s, i) => {
    const j = s.j, n = NGO[j.ng][0];
    return `<div class="row" style="align-items:flex-start"><div><b>${i + 1}.${s.pick ? "Pick up " + j.kg + " kg at " + KIT[j.kit][2] : "Deliver to " + n}</b>
    <div class="mut">Arrive in about ${s.eta} min · ${j.c}${s.late ? " · too late" : ""}</div>
    ${s.pick ? "" : `<div class="mut">Demo code: ${j.otp}</div>`}</div>
    ${s.pick ? "" : `<span><input style="width:90px" placeholder="Code" id="o${j.i}" aria-label="Code for ${n}"> <button class="btn" data-d="${j.i}">Confirm</button></span>`}</div>`;
  }).join("")}</div></div>`;

  document.querySelectorAll("[data-d]").forEach(b => b.onclick = () => {
    const i = +b.dataset.d, j = S.jobs[i];
    if ($("#o" + i).value !== j.otp) {
      $("#o" + i).style.borderColor = "var(--bad)";
      return;
    }
    S.by[j.c] += j.kg;
    addLog(NGO[j.ng][0] + " received " + j.kg + " kg (code verified)");
    S.jobs.splice(i, 1);
    drv();
  });
}

addLog("Posted 120 kg bakery items");
addLog("Seva Food Bank received 120 kg");
S.batch = { n: "Paneer pulao", k: 40, c: "Dairy and paneer gravies", h: win("Dairy and paneer gravies", 32), t: Date.now() };

tk();
setInterval(() => {
  if ($("#iot") && $("#iot").classList.contains("on")) tk();
}, 2000);

window.addEventListener("DOMContentLoaded", () => {
  loginUI();
  show("dash");
});