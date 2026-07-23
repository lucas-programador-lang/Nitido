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

/* ---------------- Devices: render + filter ---------------- */
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

function overallStatus(d){
  if (d.hub === "not_working" || d.minute === "not_working") return "not_working";
  if (d.minute === "ok") return d.hub === "unknown" ? "unknown" : "ok";
  if (d.minute === "pending") return "pending";
  return "unknown";
}

// A monogram badge, not a reproduction of anyone's trademark — a single
// initial in the site's own display font, inside the site's own ring style.
function brandBadge(brand, size){
  size = size || 40;
  var initial = brand.charAt(0).toUpperCase();
  return (
    '<svg class="brand-badge" width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="18.5" class="brand-badge-ring"/>' +
      '<text x="20" y="26" text-anchor="middle" class="brand-badge-letter">' + initial + '</text>' +
    '</svg>'
  );
}

// Real product photos aren't something this guide has the rights to serve,
// so this is an honest placeholder (placehold.co is a live service — the
// old Unsplash keyword-placeholder API this was based on was shut down and
// would just 404). Swap the src for a real photo per-model when you have one.
function placeholderImg(d){
  var label = encodeURIComponent(d.brand + "\n" + d.model.split(",")[0].split(" e ")[0]);
  var src = "https://placehold.co/480x320/161B22/6B7280?font=inter&text=" + label;
  return '<img class="device-photo" src="' + src + '" alt="Imagem ilustrativa — ' + d.brand + ' ' + d.model + '" loading="lazy" width="480" height="320">';
}

// Recency, not a fabricated price — these are simply the newest lines in the list.
var NEW_MODEL_MARKERS = ["iPhone 17", "Galaxy S25"];
function isNewModel(model){
  return NEW_MODEL_MARKERS.some(function(marker){ return model.indexOf(marker) !== -1; });
}

function renderDevices(){
  if (!deviceGrid || typeof DEVICES === "undefined") return;
  var q = (deviceSearch.value || "").toLowerCase().trim();
  var brandFilterVal = deviceBrandFilter.value;
  var status = deviceStatusFilter.value;

  var filtered = DEVICES.filter(function(d){
    var st = overallStatus(d);
    var matchesQ = !q || (d.brand + " " + d.model).toLowerCase().indexOf(q) !== -1;
    var matchesBrand = !brandFilterVal || d.brand === brandFilterVal;
    var matchesStatus = !status || st === status;
    return matchesQ && matchesBrand && matchesStatus;
  });

  deviceCount.textContent = filtered.length + " de " + DEVICES.length + " registros";

  if (!filtered.length){
    deviceGrid.innerHTML = '<div class="empty-state">Nenhum celular encontrado. Tente outro termo de busca.</div>';
    return;
  }

  // Group by brand, preserving each brand's first-appearance order in DEVICES
  // (rather than alphabetical) so the grouping matches the source data.
  var order = [], groups = {};
  filtered.forEach(function(d){
    if (!groups[d.brand]){ groups[d.brand] = []; order.push(d.brand); }
    groups[d.brand].push(d);
  });

  deviceGrid.innerHTML = order.map(function(brandName){
    var items = groups[brandName];
    var cards = items.map(function(d){
      var st = overallStatus(d);
      return (
        '<div class="device-card">' +
          (isNewModel(d.model) ? '<span class="device-new-badge">Novo</span>' : "") +
          placeholderImg(d) +
          '<div class="device-top">' +
            '<div><div class="device-brand">' + d.brand + '</div><div class="device-model">' + d.model + '</div></div>' +
            '<span class="status-pill ' + st + '">' + STATUS_LABEL[st] + '</span>' +
          '</div>' +
          '<p class="device-note">' + d.note + '</p>' +
          '<div class="device-sys">' + d.system + '</div>' +
        '</div>'
      );
    }).join("");
    return (
      '<div class="device-group" data-brand="' + brandName + '">' +
        '<div class="device-group-head">' +
          brandBadge(brandName) +
          '<span class="device-group-name">' + brandName + '</span>' +
          '<span class="device-group-count">' + items.length + ' modelo' + (items.length > 1 ? "s" : "") + '</span>' +
        '</div>' +
        '<div class="device-group-grid">' + cards + '</div>' +
      '</div>'
    );
  }).join("");
}

if (deviceBrandFilter && typeof DEVICES !== "undefined"){
  var brands = Array.from(new Set(DEVICES.map(function(d){ return d.brand; }))).sort();
  brands.forEach(function(b){
    var opt = document.createElement("option");
    opt.value = b; opt.textContent = b;
    deviceBrandFilter.appendChild(opt);
  });

  var brandNav = document.getElementById("brandNav");
  if (brandNav){
    brandNav.innerHTML = brands.map(function(b){
      return '<button type="button" class="brand-nav-item" data-brand="' + b + '">' + brandBadge(b, 26) + '<span>' + b + '</span></button>';
    }).join("");
    brandNav.addEventListener("click", function(e){
      var item = e.target.closest(".brand-nav-item");
      if (!item) return;
      var target = deviceGrid.querySelector('.device-group[data-brand="' + item.dataset.brand + '"]');
      if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    });
  }

  var renderDevicesDebounced = debounce(renderDevices, 120);
  deviceSearch.addEventListener("input", renderDevicesDebounced);
  [deviceBrandFilter, deviceStatusFilter].forEach(function(el){
    el.addEventListener("change", renderDevices);
  });
  renderDevices();
}

/* ---------------- Tasks: render + search + category chips ---------------- */
var taskGrid = document.getElementById("taskGrid");
var taskSearch = document.getElementById("taskSearch");
var taskCount = document.getElementById("taskCount");
var catChips = document.getElementById("catChips");
var activeCat = "";

var CAT_ICON = {
  tidy:    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 19l5.5-10.5"/><path d="M9 8.5L15 3l3.5 3.5L12.5 12"/><path d="M5 19l2.5-1"/></svg>',
  laundry: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.6"/><circle cx="7.3" cy="6" r=".9" fill="currentColor" stroke="none"/></svg>',
  kitchen: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4.5 11.5a7.5 7.5 0 0115 0"/><path d="M4 11.5h16v2.2a1.8 1.8 0 01-1.8 1.8H5.8A1.8 1.8 0 014 13.7z"/><path d="M12 3.5v4"/></svg>',
  misc:    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true"><circle cx="5.5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18.5" cy="12" r="1.6" fill="currentColor"/></svg>'
};

var TASK_DONE_KEY = "nitido_tasks_done_v1";
function loadDoneTasks(){
  try { return new Set(JSON.parse(localStorage.getItem(TASK_DONE_KEY)) || []); }
  catch (e) { return new Set(); }
}
function saveDoneTasks(set){
  try { localStorage.setItem(TASK_DONE_KEY, JSON.stringify(Array.from(set))); }
  catch (e) { /* storage unavailable (private mode, quota) — fail silently */ }
}
var doneTasks = loadDoneTasks();

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

  taskGrid.innerHTML = filtered.map(function(t){
    var isDone = doneTasks.has(t.id);
    return (
      '<div class="task-card' + (isDone ? " is-done" : "") + '" data-task-id="' + t.id + '">' +
        '<div class="task-card-top">' +
          '<div class="task-cat"><span class="task-cat-icon">' + CAT_ICON[t.cat] + '</span>' + CAT_LABELS[t.cat] + '</div>' +
          '<label class="task-check">' +
            '<input type="checkbox" ' + (isDone ? "checked" : "") + ' aria-label="Marcar como concluída">' +
            '<span class="task-check-box" aria-hidden="true"></span>' +
          '</label>' +
        '</div>' +
        '<div class="task-pt">' + t.pt + '</div>' +
        '<div class="task-en">' + t.en + '</div>' +
        '<p class="task-desc">' + t.desc + '</p>' +
        '<span class="task-status-badge ' + (isDone ? "done" : "pending") + '">' + (isDone ? "Concluído" : "Pendente") + '</span>' +
      '</div>'
    );
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
  taskGrid.addEventListener("change", function(e){
    var checkbox = e.target.closest(".task-check input");
    if (!checkbox) return;
    var card = checkbox.closest(".task-card");
    var id = parseInt(card.dataset.taskId, 10);
    if (checkbox.checked) doneTasks.add(id); else doneTasks.delete(id);
    saveDoneTasks(doneTasks);
    card.classList.toggle("is-done", checkbox.checked);
    var badge = card.querySelector(".task-status-badge");
    badge.textContent = checkbox.checked ? "Concluído" : "Pendente";
    badge.className = "task-status-badge " + (checkbox.checked ? "done" : "pending");
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

/* ============================================================
   3D tilt — cards follow the cursor with a subtle perspective
   rotation. Delegated on document so it survives re-renders from
   the device/task filters, which replace those cards' innerHTML.
   ============================================================ */
function initTiltCards(){
  var canTilt = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !prefersReducedMotion;
  if (!canTilt) return;

  var TILT_SELECTOR = ".device-card, .task-card, .step-card, .approval-card, .summary-card";
  var MAX_DEG = 6;
  var active = null;

  document.addEventListener("mousemove", function(e){
    var card = e.target.closest(TILT_SELECTOR);
    if (card !== active){
      if (active){ active.style.transform = ""; active.classList.remove("is-tilting"); }
      active = card;
      if (active) active.classList.add("is-tilting");
    }
    if (!card) return;
    var r = card.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    var rx = (py * -MAX_DEG).toFixed(2);
    var ry = (px * MAX_DEG).toFixed(2);
    card.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) translateY(-4px) translateZ(0)";
  }, { passive: true });

  document.addEventListener("mouseleave", function(){
    if (active){ active.style.transform = ""; active.classList.remove("is-tilting"); active = null; }
  }, true);
}

/* ---------------- Boot ---------------- */
document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());
initHeroRig();
initAngleDemo();
initTiltCards();

})();


/* =============================================
   PERSONALIZAÇÃO INTELIGENTE - BANNER PRINCIPAL
   ============================================= */
function initSmartHero() {
  const heroDynamic = document.getElementById('heroDynamic');
  if (!heroDynamic) return;

  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || 
                   window.innerWidth < 768;

  let brand = 'generic';

  if (isMobile) {
    if (/iPhone|iPad|iPod/.test(ua)) brand = 'apple';
    else if (/Samsung|SM-/.test(ua)) brand = 'samsung';
    else if (/Motorola|XT|Moto/.test(ua)) brand = 'motorola';
    else if (/Pixel|Nexus/.test(ua)) brand = 'google';
  }

  let html = '';

  if (!isMobile) {
    // === MODO DESKTOP ===
    html = `
      <p class="eyebrow" style="color:#C9A227;">EXCLUSIVO PARA CELULAR</p>
      <h1 class="hero-title">Acesso Ultra Premium</h1>
      <p class="hero-sub" style="max-width:520px; margin:1.8rem auto 2.4rem;">
        Acesse este site usando a câmera do seu celular para detectar a compatibilidade 
        do seu aparelho e liberar seu acesso Ultra Premium.
      </p>
      <div class="qr-container" id="qrContainer"></div>
      <div class="hero-stats" style="margin-top: 2.8rem; opacity: 0.9;">
        <div class="stat"><span class="stat-num" id="statDevicesOk">13</span><span class="stat-label">celulares compatíveis com o MINUTE</span></div>
        <div class="stat"><span class="stat-num" id="statTasks">84</span><span class="stat-label">tarefas traduzidas</span></div>
        <div class="stat"><span class="stat-num">45°</span><span class="stat-label">inclinação recomendada pela HUB</span></div>
      </div>
    `;
  } else {
    // === MODO MOBILE ===
    let title = 'Grave sua rotina.<br><span class="accent-serif">Deixe nítido</span> o que importa.';
    let sub = 'Confira se o seu celular grava no MINUTE, encontre a tradução exata de cada tarefa e aprenda o ângulo de 45° que a HUB recomenda.';
    let eyebrow = 'Guia independente · HUB &amp; MINUTE';

    switch(brand) {
      case 'apple':
        title = 'Proteção Ultra Premium para o seu <span class="accent-serif">iPhone</span>';
        sub = 'Capinhas, películas, suportes e acessórios Apple compatíveis com o MINUTE.';
        eyebrow = 'Detectado: iPhone';
        break;
      case 'samsung':
        title = 'Galaxy Ultra Experience';
        sub = 'Acessórios premium para linha Galaxy — compatibilidade confirmada no MINUTE.';
        eyebrow = 'Detectado: Samsung';
        break;
      case 'motorola':
        title = 'Motorola Ready';
        sub = 'Suportes e acessórios otimizados para sua Motorola no MINUTE.';
        eyebrow = 'Detectado: Motorola';
        break;
      case 'google':
        title = 'Pixel Perfect';
        sub = 'Acessórios para Google Pixel com gravação estável no MINUTE.';
        eyebrow = 'Detectado: Google Pixel';
        break;
    }

    html = `
      <p class="eyebrow">${eyebrow}</p>
      <h1 class="hero-title">${title}</h1>
      <p class="hero-sub">${sub}</p>
      <div class="hero-actions">
        <a class="btn btn-cta btn-lg" href="https://ai.hub.xyz/r/HHZ3V5GH" target="_blank" rel="noopener">Criar minha conta na HUB</a>
        <a class="btn btn-ghost btn-lg" href="#celulares">Ver compatibilidade →</a>
      </div>
      <div class="hero-stats">
        <div class="stat"><span class="stat-num" id="statDevicesOk">13</span><span class="stat-label">celulares compatíveis com o MINUTE</span></div>
        <div class="stat"><span class="stat-num" id="statTasks">84</span><span class="stat-label">tarefas traduzidas</span></div>
        <div class="stat"><span class="stat-num">45°</span><span class="stat-label">inclinação recomendada pela HUB</span></div>
      </div>
    `;
  }

  heroDynamic.innerHTML = html;
  heroDynamic.classList.add('visible');

  // Aplica cor da marca no mobile
  if (isMobile) {
    document.querySelector('.hero').classList.add(`hero-brand-${brand}`);
  }

  // Gera QR Code no desktop
  if (!isMobile) {
    const qrScript = document.createElement('script');
    qrScript.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    qrScript.onload = () => {
      new QRCode(document.getElementById("qrContainer"), {
        text: window.location.href,
        width: 265,
        height: 265,
        colorDark: "#0A0C0F",
        colorLight: "#FFFFFF"
      });
    };
    document.head.appendChild(qrScript);
  }
}

// Executa
document.addEventListener('DOMContentLoaded', initSmartHero);
