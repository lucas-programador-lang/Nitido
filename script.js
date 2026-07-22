/* ============================================================
   NÍTIDO — script.js
   Depende de: three.js (global THREE) e data.js (TASKS, DEVICES, FAQS, CAT_LABELS)
   ============================================================ */
(function(){
"use strict";

var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function debounce(fn, wait){
  var t;
  return function(){
    var args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(function(){ fn.apply(ctx, args); }, wait);
  };
}

function esc(str){
  return String(str).replace(/[&<>"']/g, function(c){
    return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
  });
}

/* ============================================================
   Brand marks — simple original monogram badges (not the brands'
   official trademarked logos), colour-coded so the device list
   reads at a glance.
   ============================================================ */
var BRAND_META = {
  "Apple":    { letter: "A", color: "var(--silver)" },
  "Samsung":  { letter: "S", color: "var(--blue)" },
  "Google":   { letter: "G", color: "var(--green)" },
  "Motorola": { letter: "M", color: "var(--red)" }
};

function brandBadgeSvg(brand, size){
  size = size || 34;
  var meta = BRAND_META[brand] || { letter: (brand || "?").charAt(0).toUpperCase(), color: "var(--ink-dim)" };
  return (
    '<svg class="brand-badge" width="' + size + '" height="' + size + '" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="1" y="1" width="32" height="32" rx="9" fill="#12151a" stroke="' + meta.color + '" stroke-width="1.4" opacity="0.95"/>' +
      '<text x="17" y="22.5" text-anchor="middle" font-family="\'JetBrains Mono\', monospace" font-size="14" font-weight="700" fill="' + meta.color + '">' + esc(meta.letter) + '</text>' +
    '</svg>'
  );
}

/* Small phone illustration used on each device card. A flat, generic
   handset silhouette (no real product photo) whose screen glow and
   camera dot pick up the compatibility status colour. */
function phoneIllustrationSvg(status){
  var st = "st-" + status;
  return (
    '<svg class="phone-illustration" width="40" height="68" viewBox="0 0 40 68" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="1.5" y="1.5" width="37" height="65" rx="8" fill="#14161b" stroke="rgba(233,229,220,0.18)" stroke-width="1.3"/>' +
      '<rect class="phone-glow ' + st + '" x="6.5" y="7.5" width="27" height="46" rx="3"/>' +
      '<circle class="phone-lens ' + st + '" cx="20" cy="60.5" r="3"/>' +
    '</svg>'
  );
}

/* ============================================================
   Category icons — simple original line icons for the task
   library (broom / laundry basket / fork+knife / wrench).
   ============================================================ */
var CAT_ICON_PATHS = {
  tidy: '<line x1="16.5" y1="3.5" x2="8.5" y2="13.5"/><path d="M8.5 13.5 L4.5 20 M8.5 13.5 L6.5 21 M8.5 13.5 L9 21.2 M8.5 13.5 L11.3 20.2"/>',
  laundry: '<path d="M4.5 9.5 L6.3 20.5 H17.7 L19.5 9.5"/><line x1="4.5" y1="9.5" x2="19.5" y2="9.5"/><line x1="9.3" y1="9.5" x2="10.1" y2="20.5"/><line x1="14.7" y1="9.5" x2="13.9" y2="20.5"/>',
  kitchen: '<path d="M7 3 V10.5 M5.3 3 V7.8 a1.7 1.7 0 0 0 1.7 1.7 a1.7 1.7 0 0 0 1.7-1.7 V3"/><line x1="7" y1="10.5" x2="7" y2="21"/><path d="M17 3 c-2.2 3-2.2 5.8 0 8 v10"/>',
  misc: '<path d="M14.6 6.2a3.8 3.8 0 0 0-5 5l-5 5 2.9 2.9 5-5a3.8 3.8 0 0 0 5-5l-2.1 2.1-2-2z"/>'
};

function catIconSvg(cat, size){
  size = size || 15;
  var paths = CAT_ICON_PATHS[cat] || CAT_ICON_PATHS.misc;
  return (
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      paths +
    '</svg>'
  );
}

/* ---------------- Hero stats + summary cards: derive from data, don't hand-type ---------------- */
if (typeof DEVICES !== "undefined" && typeof TASKS !== "undefined"){
  var counts = { ok: 0, pending: 0, not_working: 0, unknown: 0 };
  DEVICES.forEach(function(d){ counts[overallStatus(d)]++; });

  var setText = function(id, val){ var el = document.getElementById(id); if (el) el.textContent = val; };
  setText("statDevicesOk", counts.ok);
  setText("statTasks", TASKS.length);
  setText("summaryOk", counts.ok);
  setText("summaryPending", counts.pending);
  setText("summaryBad", counts.not_working);
  setText("summaryUnknown", counts.unknown);
}

/* ---------------- Nav ---------------- */
var navToggle = document.getElementById("navToggle");
var navLinks = document.querySelector(".nav-links");
if (navToggle){
  navToggle.addEventListener("click", function(){
    var open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelectorAll(".nav-links a").forEach(function(a){
    a.addEventListener("click", function(){
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------------- Reveal on scroll ---------------- */
var revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !prefersReducedMotion){
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.isIntersecting){
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(function(el){ io.observe(el); });
} else {
  revealEls.forEach(function(el){ el.classList.add("is-visible"); });
}

/* ---------------- Hero stat count-up ---------------- */
var statEls = document.querySelectorAll(".stat-num");
if (statEls.length && !prefersReducedMotion && "IntersectionObserver" in window){
  var statIO = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (!entry.isIntersecting) return;
      statIO.unobserve(entry.target);
      var el = entry.target;
      var raw = el.textContent.trim();
      var match = raw.match(/(-?[\d.,]+)/);
      if (!match) return; // no numeric portion (e.g. "24/7") — leave as-is
      var prefix = raw.slice(0, match.index);
      var suffix = raw.slice(match.index + match[0].length);
      var target = parseFloat(match[0].replace(/\./g, "").replace(",", "."));
      if (isNaN(target)) return;
      var duration = 1100, start = null;
      function step(ts){
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(target * eased);
        el.textContent = prefix + current.toLocaleString("pt-BR") + suffix;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = raw;
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  statEls.forEach(function(el){ statIO.observe(el); });
}

/* ---------------- FAQ render + accordion ---------------- */
var faqList = document.getElementById("faqList");
if (faqList && typeof FAQS !== "undefined"){
  FAQS.forEach(function(faq){
    var item = document.createElement("div");
    item.className = "faq-item";
    item.innerHTML =
      '<button class="faq-q" aria-expanded="false">' +
        '<span>' + faq.q + '</span><span class="plus">+</span>' +
      '</button>' +
      '<div class="faq-a"><p>' + faq.a + '</p></div>';
    faqList.appendChild(item);
  });

  faqList.addEventListener("click", function(e){
    var btn = e.target.closest(".faq-q");
    if (!btn) return;
    var item = btn.closest(".faq-item");
    var answer = item.querySelector(".faq-a");
    var isOpen = item.classList.contains("is-open");
    // close all
    faqList.querySelectorAll(".faq-item").forEach(function(other){
      other.classList.remove("is-open");
      other.querySelector(".faq-q").setAttribute("aria-expanded","false");
      other.querySelector(".faq-a").style.maxHeight = null;
    });
    if (!isOpen){
      item.classList.add("is-open");
      btn.setAttribute("aria-expanded","true");
      answer.style.maxHeight = answer.scrollHeight + "px";
    }
  });

  // The open answer's max-height was frozen in px at click-time — recompute
  // it on resize so a reflow (orientation change, font swap) can't clip text.
  window.addEventListener("resize", function(){
    var openItem = faqList.querySelector(".faq-item.is-open");
    if (!openItem) return;
    var answer = openItem.querySelector(".faq-a");
    answer.style.maxHeight = answer.scrollHeight + "px";
  });
}

/* ---------------- Devices: render + filter (grouped by brand) ---------------- */
var deviceGrid = document.getElementById("deviceGrid");
var deviceSearch = document.getElementById("deviceSearch");
var deviceBrandFilter = document.getElementById("deviceBrandFilter");
var deviceStatusFilter = document.getElementById("deviceStatusFilter");
var deviceCount = document.getElementById("deviceCount");

var STATUS_LABEL = {
  ok: "Compatível com o MINUTE",
  pending: "Somente HUB",
  not_working: "Não funciona atualmente",
  unknown: "Sem confirmação da HUB"
};

// Fixed, sensible brand order so the grouped list doesn't reshuffle
// every time the filters change.
var BRAND_ORDER = ["Apple", "Samsung", "Google", "Motorola"];

function overallStatus(d){
  if (d.hub === "not_working" || d.minute === "not_working") return "not_working";
  if (d.minute === "ok") return d.hub === "unknown" ? "unknown" : "ok";
  if (d.minute === "pending") return "pending";
  return "unknown";
}

function deviceCardHtml(d){
  var st = overallStatus(d);
  return (
    '<div class="device-card">' +
      '<div class="device-card-top">' +
        brandBadgeSvg(d.brand) +
        '<div class="device-card-titles">' +
          '<div class="device-brand">' + esc(d.brand) + '</div>' +
          '<div class="device-model">' + esc(d.model) + '</div>' +
        '</div>' +
        '<div class="device-visual">' + phoneIllustrationSvg(st) + '</div>' +
      '</div>' +
      '<div class="device-status-row"><span class="status-pill ' + st + '">' + STATUS_LABEL[st] + '</span></div>' +
      '<p class="device-note">' + esc(d.note) + '</p>' +
      '<div class="device-sys">' + esc(d.system) + '</div>' +
    '</div>'
  );
}

function renderDevices(){
  if (!deviceGrid || typeof DEVICES === "undefined") return;
  var q = (deviceSearch.value || "").toLowerCase().trim();
  var brand = deviceBrandFilter.value;
  var status = deviceStatusFilter.value;

  var filtered = DEVICES.filter(function(d){
    var st = overallStatus(d);
    var matchesQ = !q || (d.brand + " " + d.model).toLowerCase().indexOf(q) !== -1;
    var matchesBrand = !brand || d.brand === brand;
    var matchesStatus = !status || st === status;
    return matchesQ && matchesBrand && matchesStatus;
  });

  deviceCount.textContent = filtered.length + " de " + DEVICES.length + " registros";

  if (!filtered.length){
    deviceGrid.innerHTML = '<div class="empty-state">Nenhum celular encontrado. Tente outro termo de busca.</div>';
    return;
  }

  // Group by brand (fixed order), so the grid reads as organised
  // sections instead of a shuffled list.
  var groups = {};
  filtered.forEach(function(d){
    (groups[d.brand] = groups[d.brand] || []).push(d);
  });
  var brandsPresent = BRAND_ORDER.filter(function(b){ return groups[b]; });
  // Any brand not in the fixed list still gets shown, appended at the end.
  Object.keys(groups).forEach(function(b){ if (brandsPresent.indexOf(b) === -1) brandsPresent.push(b); });

  deviceGrid.innerHTML = brandsPresent.map(function(b){
    var items = groups[b];
    var header =
      '<div class="group-header">' +
        '<span class="group-icon">' + brandBadgeSvg(b, 26) + '</span>' +
        '<span class="group-title">' + esc(b) + '</span>' +
        '<span class="group-count">' + items.length + ' modelo' + (items.length > 1 ? 's' : '') + '</span>' +
      '</div>';
    return header + items.map(deviceCardHtml).join("");
  }).join("");
}

if (deviceBrandFilter && typeof DEVICES !== "undefined"){
  var brands = Array.from(new Set(DEVICES.map(function(d){ return d.brand; }))).sort();
  brands.forEach(function(b){
    var opt = document.createElement("option");
    opt.value = b; opt.textContent = b;
    deviceBrandFilter.appendChild(opt);
  });
  var renderDevicesDebounced = debounce(renderDevices, 120);
  deviceSearch.addEventListener("input", renderDevicesDebounced);
  [deviceBrandFilter, deviceStatusFilter].forEach(function(el){
    el.addEventListener("change", renderDevices);
  });
  renderDevices();
}

/* ---------------- Tasks: render + search + category chips (grouped by category) ---------------- */
var taskGrid = document.getElementById("taskGrid");
var taskSearch = document.getElementById("taskSearch");
var taskCount = document.getElementById("taskCount");
var catChips = document.getElementById("catChips");
var activeCat = "";
var CATEGORY_ORDER = ["tidy", "laundry", "kitchen", "misc"];

function taskCardHtml(t){
  return (
    '<div class="task-card">' +
      '<div class="task-cat-row cat-' + t.cat + '">' + catIconSvg(t.cat) + '<span class="task-cat">' + CAT_LABELS[t.cat] + '</span></div>' +
      '<div class="task-pt">' + esc(t.pt) + '</div>' +
      '<div class="task-en">' + esc(t.en) + '</div>' +
      '<p class="task-desc">' + esc(t.desc) + '</p>' +
    '</div>'
  );
}

function renderTasks(){
  if (!taskGrid || typeof TASKS === "undefined") return;
  var q = (taskSearch.value || "").toLowerCase().trim();

  var filtered = TASKS.filter(function(t){
    var matchesQ = !q || t.en.toLowerCase().indexOf(q) !== -1 || t.pt.toLowerCase().indexOf(q) !== -1;
    var matchesCat = !activeCat || t.cat === activeCat;
    return matchesQ && matchesCat;
  });

  taskCount.textContent = filtered.length + " de " + TASKS.length + " tarefas";

  if (!filtered.length){
    taskGrid.innerHTML = '<div class="empty-state">Nenhuma tarefa encontrada. Tente pesquisar em inglês.</div>';
    return;
  }

  var groups = {};
  filtered.forEach(function(t){ (groups[t.cat] = groups[t.cat] || []).push(t); });
  var catsPresent = CATEGORY_ORDER.filter(function(c){ return groups[c]; });

  taskGrid.innerHTML = catsPresent.map(function(c){
    var items = groups[c];
    var header =
      '<div class="group-header">' +
        '<span class="group-icon cat-' + c + '">' + catIconSvg(c, 20) + '</span>' +
        '<span class="group-title">' + CAT_LABELS[c] + '</span>' +
        '<span class="group-count">' + items.length + ' tarefa' + (items.length > 1 ? 's' : '') + '</span>' +
      '</div>';
    return header + items.map(taskCardHtml).join("");
  }).join("");
}

function updateCatCounts(){
  if (typeof TASKS === "undefined") return;
  document.getElementById("count-all").textContent = TASKS.length;
  ["tidy","laundry","kitchen","misc"].forEach(function(cat){
    var el = document.getElementById("count-" + cat);
    if (el) el.textContent = TASKS.filter(function(t){ return t.cat === cat; }).length;
  });
}

if (taskGrid){
  updateCatCounts();
  renderTasks();
  taskSearch.addEventListener("input", debounce(renderTasks, 120));
  catChips.addEventListener("click", function(e){
    var chip = e.target.closest(".chip");
    if (!chip) return;
    catChips.querySelectorAll(".chip").forEach(function(c){ c.classList.remove("is-active"); });
    chip.classList.add("is-active");
    activeCat = chip.dataset.cat;
    renderTasks();
  });
}

/* ---------------- Calculadora de indicação ---------------- */
var lvl1Range = document.getElementById("lvl1Range");
var lvl2Range = document.getElementById("lvl2Range");
var hoursRange = document.getElementById("hoursRange");
var RATE_1 = 2.50, RATE_2 = 1.25, WEEKS = 4.33;

function fmtBRL(n){
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateCalc(){
  if (!lvl1Range) return;
  var l1 = parseInt(lvl1Range.value, 10);
  var l2 = parseInt(lvl2Range.value, 10);
  var hrs = parseInt(hoursRange.value, 10);

  document.getElementById("lvl1Out").textContent = l1;
  document.getElementById("lvl2Out").textContent = l2;
  document.getElementById("hoursOut").textContent = hrs + "h";

  var monthly1 = l1 * hrs * WEEKS * RATE_1;
  var monthly2 = l2 * hrs * WEEKS * RATE_2;
  var total = monthly1 + monthly2;
  var maxBar = Math.max(monthly1, monthly2, 1);

  document.getElementById("calcTotal").textContent = fmtBRL(total);
  document.getElementById("calcSub").textContent = "com " + l1 + " pessoa(s) no nível 1 e " + l2 + " no nível 2";
  document.getElementById("calcLvl1").textContent = fmtBRL(monthly1);
  document.getElementById("calcLvl2").textContent = fmtBRL(monthly2);
  document.getElementById("bar1").style.width = (monthly1 / maxBar * 100) + "%";
  document.getElementById("bar2").style.width = (monthly2 / maxBar * 100) + "%";
}

if (lvl1Range){
  [lvl1Range, lvl2Range, hoursRange].forEach(function(r){ r.addEventListener("input", updateCalc); });
  updateCalc();
}

/* ============================================================
   3D — Hero rig (phone floating at the HUB-recommended 45° angle)
   ============================================================ */
function initHeroRig(){
  var canvas = document.getElementById("rigCanvas");
  if (!canvas || typeof THREE === "undefined") return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  var isVisible = true;
  if ("IntersectionObserver" in window){
    new IntersectionObserver(function(entries){
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(canvas);
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.1, 7.5);

  var goldColor = 0xC9A227;
  var tealColor = 0x1FB6A6;

  // Floor grid, faint
  var grid = new THREE.GridHelper(30, 30, 0x2a2f38, 0x1a1e24);
  grid.position.y = -2.4;
  scene.add(grid);

  // Group: floating "phone" (rounded box) tilted 45 degrees, per HUB's recommendation
  var rigGroup = new THREE.Group();
  scene.add(rigGroup);

  var phoneGeo = new THREE.BoxGeometry(1.4, 2.9, 0.16);
  var phoneMat = new THREE.MeshStandardMaterial({ color: 0x14161b, metalness: 0.6, roughness: 0.25, emissive: 0x05070a });
  var phone = new THREE.Mesh(phoneGeo, phoneMat);
  rigGroup.add(phone);

  // Screen glow plane
  var screenGeo = new THREE.PlaneGeometry(1.18, 2.6);
  var screenMat = new THREE.MeshBasicMaterial({ color: goldColor, transparent: true, opacity: 0.16 });
  var screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = 0.082;
  rigGroup.add(screen);

  // Lens dot
  var lensGeo = new THREE.CircleGeometry(0.09, 32);
  var lensMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.9, roughness: 0.1, emissive: tealColor, emissiveIntensity: 0.4 });
  var lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(0, 1.15, 0.083);
  rigGroup.add(lens);

  // Thin edge frame (wireframe accent)
  var edges = new THREE.EdgesGeometry(phoneGeo);
  var frame = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: goldColor, transparent: true, opacity: 0.55 }));
  rigGroup.add(frame);

  // Orbiting ring (recording indicator)
  var ringGeo = new THREE.TorusGeometry(2.6, 0.012, 8, 90);
  var ringMat = new THREE.MeshBasicMaterial({ color: tealColor, transparent: true, opacity: 0.35 });
  var ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.4;
  scene.add(ring);

  var ring2 = ring.clone();
  ring2.scale.set(1.35, 1.35, 1.35);
  ring2.material = ringMat.clone();
  ring2.material.opacity = 0.18;
  ring2.rotation.x = Math.PI / 1.9;
  ring2.rotation.z = 0.4;
  scene.add(ring2);

  // Particles (dust in the recording space)
  var particleCount = 140;
  var positions = new Float32Array(particleCount * 3);
  for (var i = 0; i < particleCount; i++){
    positions[i*3] = (Math.random()-0.5) * 14;
    positions[i*3+1] = (Math.random()-0.5) * 8;
    positions[i*3+2] = (Math.random()-0.5) * 10;
  }
  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  var particleMat = new THREE.PointsMaterial({ color: 0xC9A227, size: 0.02, transparent: true, opacity: 0.5 });
  var particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Lights
  scene.add(new THREE.AmbientLight(0x445566, 0.9));
  var key = new THREE.PointLight(goldColor, 3.2, 20);
  key.position.set(3, 3, 4);
  scene.add(key);
  var rim = new THREE.PointLight(tealColor, 2.4, 20);
  rim.position.set(-4, -1, -3);
  scene.add(rim);

  // Base 45deg tilt, per "prenda o celular... inclinado cerca de 45 graus"
  var baseTilt = Math.PI / 4;
  rigGroup.rotation.z = baseTilt;

  var mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  window.addEventListener("mousemove", function(e){
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  function resize(){
    var w = canvas.parentElement.clientWidth;
    var h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  var clock = new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    if (!isVisible || document.hidden) return;
    var t = clock.getElapsedTime();

    targetX += (mouseX - targetX) * 0.03;
    targetY += (mouseY - targetY) * 0.03;

    rigGroup.rotation.y = Math.sin(t * 0.35) * 0.5 + targetX * 0.6;
    rigGroup.rotation.x = Math.cos(t * 0.25) * 0.08 + targetY * 0.3;
    rigGroup.position.y = Math.sin(t * 0.6) * 0.18;

    ring.rotation.z = t * 0.15;
    ring2.rotation.z = -t * 0.1;

    particles.rotation.y = t * 0.02;

    lens.material.emissiveIntensity = 0.35 + Math.sin(t * 2.2) * 0.25;

    renderer.render(scene, camera);
  }

  if (prefersReducedMotion){
    rigGroup.rotation.y = 0.3;
    renderer.render(scene, camera);
  } else {
    animate();
  }
}

/* ============================================================
   3D — Angle demo canvas (approval section): shows the 45° rule
   ============================================================ */
function initAngleDemo(){
  var canvas = document.getElementById("angleCanvas");
  if (!canvas || typeof THREE === "undefined") return;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  var isVisible = true;
  if ("IntersectionObserver" in window){
    new IntersectionObserver(function(entries){
      isVisible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(canvas);
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0.4, 6);

  var head = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x1c2028, roughness: 0.8 })
  );
  scene.add(head);

  var mountArm = new THREE.Group();
  mountArm.position.set(0, 0.75, 0.75);
  scene.add(mountArm);

  var phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.0, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0e1014, metalness: 0.7, roughness: 0.2 })
  );
  phone.position.set(0, 0.55, 0.2);
  mountArm.add(phone);
  mountArm.rotation.x = -Math.PI / 4; // 45 degrees down

  var edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(phone.geometry),
    new THREE.LineBasicMaterial({ color: 0xC9A227 })
  );
  phone.add(edges);

  // angle arc indicator
  var arcCurve = new THREE.EllipseCurve(0, 0, 1.3, 1.3, 0, Math.PI/4, false, 0);
  var arcPoints = arcCurve.getPoints(30);
  var arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints.map(function(p){ return new THREE.Vector3(0, p.y, p.x); }));
  var arc = new THREE.Line(arcGeo, new THREE.LineDashedMaterial({ color: 0x1FB6A6, dashSize: 0.06, gapSize: 0.05 }));
  arc.computeLineDistances();
  arc.position.set(0, 0.75, 0.75);
  scene.add(arc);

  scene.add(new THREE.AmbientLight(0x556677, 1.1));
  var l = new THREE.PointLight(0xC9A227, 2.6, 15);
  l.position.set(3, 3, 4);
  scene.add(l);

  function resize(){
    var w = canvas.parentElement.clientWidth;
    var h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  var clock = new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    if (!isVisible || document.hidden) return;
    var t = clock.getElapsedTime();
    head.rotation.y = Math.sin(t * 0.3) * 0.4;
    mountArm.rotation.y = Math.sin(t * 0.3) * 0.4;
    renderer.render(scene, camera);
  }
  if (prefersReducedMotion){
    renderer.render(scene, camera);
  } else {
    animate();
  }
}

/* ---------------- Boot ---------------- */
document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());
initHeroRig();
initAngleDemo();

})();
