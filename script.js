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
function setupStatCountUp(){
  var statEls = document.querySelectorAll(".stat-num");
  if (statEls.length && !prefersReducedMotion && "IntersectionObserver" in window){
    var statIO = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!entry.isIntersecting) return;
        statIO.unobserve(entry.target);
        var el = entry.target;
        var raw = el.textContent.trim();
        var match = raw.match(/(-?[\d.,]+)/);
        if (!match) return; 
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
}
setupStatCountUp();
window.__setupStatCountUp = setupStatCountUp;

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

function placeholderImg(d){
  var label = encodeURIComponent(d.brand + "\n" + d.model.split(",")[0].split(" e ")[0]);
  var src = "https://placehold.co/480x320/131B27/6E6C8C?font=inter&text=" + label;
  return '<img class="device-photo" src="' + src + '" alt="Imagem ilustrativa — ' + d.brand + ' ' + d.model + '" loading="lazy" width="480" height="320">';
}

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
        '<div class="device-card" data-device-id="' + d.id + '">' +
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
  catch (e) {}
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

  var goldColor = 0xC9A24D;
  var tealColor = 0x2FD9B0;

  var grid = new THREE.GridHelper(30, 30, 0x232b38, 0x11161f);
  grid.position.y = -2.4;
  scene.add(grid);

  var rigGroup = new THREE.Group();
  scene.add(rigGroup);

  var phoneGeo = new THREE.BoxGeometry(1.4, 2.9, 0.16);
  var phoneMat = new THREE.MeshStandardMaterial({ color: 0x131a24, metalness: 0.6, roughness: 0.25, emissive: 0x05070b });
  var phone = new THREE.Mesh(phoneGeo, phoneMat);
  rigGroup.add(phone);

  var screenGeo = new THREE.PlaneGeometry(1.18, 2.6);
  var screenMat = new THREE.MeshBasicMaterial({ color: goldColor, transparent: true, opacity: 0.16 });
  var screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.z = 0.082;
  rigGroup.add(screen);

  var lensGeo = new THREE.CircleGeometry(0.09, 32);
  var lensMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.9, roughness: 0.1, emissive: tealColor, emissiveIntensity: 0.4 });
  var lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(0, 1.15, 0.083);
  rigGroup.add(lens);

  var edges = new THREE.EdgesGeometry(phoneGeo);
  var frame = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: goldColor, transparent: true, opacity: 0.55 }));
  rigGroup.add(frame);

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

  var particleCount = 140;
  var positions = new Float32Array(particleCount * 3);
  for (var i = 0; i < particleCount; i++){
    positions[i*3] = (Math.random()-0.5) * 14;
    positions[i*3+1] = (Math.random()-0.5) * 8;
    positions[i*3+2] = (Math.random()-0.5) * 10;
  }
  var particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  var particleMat = new THREE.PointsMaterial({ color: 0xC9A24D, size: 0.02, transparent: true, opacity: 0.5 });
  var particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  scene.add(new THREE.AmbientLight(0x3d4658, 0.9));
  var key = new THREE.PointLight(goldColor, 3.2, 20);
  key.position.set(3, 3, 4);
  scene.add(key);
  var rim = new THREE.PointLight(tealColor, 2.4, 20);
  rim.position.set(-4, -1, -3);
  scene.add(rim);

  var baseTilt = Math.PI / 4;
  rigGroup.rotation.z = baseTilt;

  var mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  if (!prefersReducedMotion){
    window.addEventListener("mousemove", function(e){
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
  }

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
    new THREE.MeshStandardMaterial({ color: 0x161c28, roughness: 0.8 })
  );
  scene.add(head);

  var mountArm = new THREE.Group();
  mountArm.position.set(0, 0.75, 0.75);
  scene.add(mountArm);

  var phone = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 1.0, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0d1017, metalness: 0.7, roughness: 0.2 })
  );
  phone.position.set(0, 0.55, 0.2);
  mountArm.add(phone);
  mountArm.rotation.x = -Math.PI / 4; 

  var edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(phone.geometry),
    new THREE.LineBasicMaterial({ color: 0xC9A24D })
  );
  phone.add(edges);

  var arcCurve = new THREE.EllipseCurve(0, 0, 1.3, 1.3, 0, Math.PI/4, false, 0);
  var arcPoints = arcCurve.getPoints(30);
  var arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints.map(function(p){ return new THREE.Vector3(0, p.y, p.x); }));
  var arc = new THREE.Line(arcGeo, new THREE.LineDashedMaterial({ color: 0x2FD9B0, dashSize: 0.06, gapSize: 0.05 }));
  arc.computeLineDistances();
  arc.position.set(0, 0.75, 0.75);
  scene.add(arc);

  scene.add(new THREE.AmbientLight(0x4a5568, 1.1));
  var l = new THREE.PointLight(0xC9A24D, 2.6, 15);
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

document.getElementById("year") && (document.getElementById("year").textContent = new Date().getFullYear());
initHeroRig();
initAngleDemo();
initTiltCards();

})();

/* =============================================
   PARTE 1 — DETECÇÃO AVANÇADA DE DISPOSITIVO (FINGERPRINTING) + BANNER
   ============================================= */

// Acessibilidade Global re-declarada pois a IIFE anterior isolou o seu escopo original
var isReducedMotionPreferred = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 1. Dicionário Híbrido: User-Agent clássico (Android ainda permite isso)
var ANDROID_MODEL_CODE_MAP = {
  "SM-S911": "Galaxy S23", "SM-S916": "Galaxy S23+", "SM-S918": "Galaxy S23 Ultra",
  "SM-S921": "Galaxy S24", "SM-S926": "Galaxy S24+", "SM-S928": "Galaxy S24 Ultra",
  "SM-A155": "Galaxy A15",
  "SM-A305": "Galaxy A30", "SM-A315": "Galaxy A31",
  "Pixel 6": "Pixel 6", "Pixel 7": "Pixel 7", "Pixel 8": "Pixel 8", "Pixel 9": "Pixel 9"
};

// 2. Hardware Fingerprint Map: Contorna o bloqueio de User-Agent do iOS 13+ e Edge cases
// Chave: {largura}_{altura}_{razão_pixels} (sempre ordenando menor x maior para prevenir bugs de orientação)
var HARDWARE_FINGERPRINT_MAP = {
  // Apple iPhones (mapeamento de resolução lógica)
  "390_844_3": "iPhone 13", // Cobre também 12 e 14 base
  "428_926_3": "iPhone 13 Pro Max", // Cobre 12 Pro Max e 14 Plus
  "393_852_3": "iPhone 14 Pro", // Cobre 15 base e 15 Pro
  "430_932_3": "iPhone 14 Pro Max", // Cobre 15 Pro Max e 15 Plus
  "375_812_3": "iPhone 11 Pro", // Cobre XS
  "414_896_2": "iPhone 11", // Cobre XR
  "414_896_3": "iPhone 11 Pro Max", // Cobre XS Max
  "375_667_2": "iPhone SE", // Cobre 2nd e 3rd gen, iPhone 8, 7, 6s
  "428_926_2": "iPhone 14 Plus", 
  
  // Alguns Androids Flagships Comuns (Fallback extra)
  "360_800_3": "Galaxy S22",
  "384_854_3": "Galaxy S23 Ultra", 
  "412_915_2.625": "Pixel 7"
};

// 3. Extrator de Assinatura WebGL (GPU) para refinamento e telemetria
function getGPUInfo() {
  try {
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown";
    }
  } catch (e) {}
  return "unknown";
}

// 4. Construtor do Fingerprint de Tela
function getHardwareFingerprint() {
  var w = Math.min(window.screen.width, window.screen.height);
  var h = Math.max(window.screen.width, window.screen.height);
  var ratio = window.devicePixelRatio || 1;
  return w + "_" + h + "_" + ratio;
}

// 5. Função Master de Identificação
function findDeviceMatch(ua, brand){
  if (typeof DEVICES === "undefined") return null;

  var matchedModelName = null;
  var gpu = getGPUInfo().toLowerCase();

  // A. Tentativa Primária: Hardware Fingerprinting (Especialmente preciso para Apple)
  var fingerprint = getHardwareFingerprint();
  if (HARDWARE_FINGERPRINT_MAP[fingerprint]) {
    // Cruza a informação extra da GPU se for um dispositivo Apple para evitar falsos positivos
    if (brand === "apple" || gpu.indexOf("apple") !== -1) {
       matchedModelName = HARDWARE_FINGERPRINT_MAP[fingerprint];
    } else if (brand !== "apple") {
       matchedModelName = HARDWARE_FINGERPRINT_MAP[fingerprint];
    }
  }

  // B. Tentativa Secundária: Fallback via Regex User-Agent (Padrão ouro para Android)
  if (!matchedModelName && (brand === "samsung" || brand === "google" || brand === "motorola")){
    for (var code in ANDROID_MODEL_CODE_MAP){
      if (ua.indexOf(code) !== -1){
        matchedModelName = ANDROID_MODEL_CODE_MAP[code];
        break;
      }
    }
  }

  // C. Varredura no array DEVICES local usando o nome aproximado encontrado
  if (matchedModelName) {
     var foundByModel = DEVICES.filter(function(d){ return d.model.indexOf(matchedModelName) !== -1; });
     if (foundByModel.length) return foundByModel[0];
  }

  return null; 
}

function renderDeviceMatchBanner(brand, ua){
  var banner = document.getElementById("celularesMatchBanner");
  var searchInput = document.getElementById("deviceSearch");
  if (!banner) return;

  var match = findDeviceMatch(ua, brand);

  if (match){
    var st = overallStatus(match); // Assume que overallStatus e STATUS_LABEL continuam globais/acessíveis ou definidos antes
    var label = (typeof STATUS_LABEL !== "undefined" && STATUS_LABEL[st]) ? STATUS_LABEL[st] : st;
    
    // Regra 4 Cumprida: Mensagem exata injetada no DOM.
    banner.className = "device-match-banner status-" + st;
    if (st === "ok") {
        banner.innerHTML = "<strong>O modelo " + match.model + " é compatível!</strong><br>" + match.note;
    } else {
        banner.innerHTML = "<strong>Detectamos: " + match.brand + " " + match.model + "</strong><br>Status atual: " + label + ". " + match.note;
    }

    // Regra 4 Cumprida: Preenchimento automático do input de busca que despacha o evento input
    if (searchInput) {
        searchInput.value = match.model;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

  } else if (brand !== "generic"){
    banner.className = "device-match-banner status-unknown";
    banner.innerHTML =
      "Detectamos um aparelho " + brand.charAt(0).toUpperCase() + brand.slice(1) +
      ", mas o navegador (ou hardware mascarado) não informa o modelo exato com segurança. " +
      "Use a busca abaixo para confirmar o seu modelo manualmente.";
  } else {
    banner.className = "device-match-banner status-unknown";
    banner.innerHTML = "Não conseguimos identificar automaticamente o seu aparelho. Use a busca abaixo para conferir o seu modelo.";
  }

  // Auto-scroll respeitando preferências de movimento
  setTimeout(function(){
    var target = document.getElementById("celulares");
    if (target) target.scrollIntoView({ behavior: isReducedMotionPreferred ? "auto" : "smooth", block: "start" });
  }, 900);
}

function initSmartHero() {
  const heroDynamic = document.getElementById('heroDynamic');
  if (!heroDynamic) return;

  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || 
                   (window.maxTouchPoints && window.maxTouchPoints > 2) || 
                   window.innerWidth < 768; // Refinado para considerar iPads modernos e afins

  let brand = 'generic';

  if (isMobile) {
    if (/iPhone|iPad|iPod|Mac/.test(ua) && window.maxTouchPoints > 1) brand = 'apple';
    else if (/Samsung|SM-/.test(ua)) brand = 'samsung';
    else if (/Motorola|XT|Moto/.test(ua)) brand = 'motorola';
    else if (/Pixel|Nexus/.test(ua)) brand = 'google';
  }

  var elDevicesOk = document.getElementById('statDevicesOk');
  var elTasks = document.getElementById('statTasks');
  var currentDevicesOk = elDevicesOk ? elDevicesOk.textContent : '13';
  var currentTasksCount = elTasks ? elTasks.textContent : '84';

  let html = '';

  if (!isMobile) {
    var qrUrl = window.location.href.split('?')[0] + '?src=qr';
    html = `
      <p class="eyebrow">Recomendado: acesse pelo celular</p>
      <h1 class="hero-title">Veja se o <span class="accent-serif">seu celular</span> é compatível</h1>
      <div class="desktop-hint-banner">
        A gravação para o MINUTE é feita pela câmera do celular. Você pode continuar
        navegando por aqui normalmente, ou escanear o QR Code abaixo para abrir este
        guia no seu celular e já ver o status do seu aparelho.
      </div>
      <p class="hero-sub" style="max-width:520px; margin:1.2rem auto 2rem;">
        Aponte a câmera do celular para o QR Code abaixo para abrir o guia lá.
      </p>
      <div class="qr-container" id="qrContainer"></div>
      <div class="hero-stats" style="margin-top: 2.8rem; opacity: 0.9;">
        <div class="stat"><span class="stat-num" id="statDevicesOk">${currentDevicesOk}</span><span class="stat-label">celulares compatíveis com o MINUTE</span></div>
        <div class="stat"><span class="stat-num" id="statTasks">${currentTasksCount}</span><span class="stat-label">tarefas traduzidas</span></div>
        <div class="stat"><span class="stat-num">45°</span><span class="stat-label">inclinação recomendada pela HUB</span></div>
      </div>
    `;
    window.__qrUrl = qrUrl;
  } else {
    let title = 'Grave sua rotina.<br><span class="accent-serif">Deixe nítido</span> o que importa.';
    let sub = 'Confira se o seu celular grava no MINUTE, encontre a tradução exata de cada tarefa e aprenda o ângulo de 45° que a HUB recomenda.';
    let eyebrow = 'Guia independente · HUB &amp; MINUTE';

    switch(brand) {
      case 'apple':
        title = 'Guia para o seu <span class="accent-serif">iPhone</span>';
        sub = 'Veja logo abaixo o status de compatibilidade da sua linha de iPhone no MINUTE.';
        eyebrow = 'Detectado: Apple';
        break;
      case 'samsung':
        title = 'Guia para o seu <span class="accent-serif">Galaxy</span>';
        sub = 'Veja logo abaixo o status de compatibilidade do seu modelo Galaxy no MINUTE.';
        eyebrow = 'Detectado: Samsung';
        break;
      case 'motorola':
        title = 'Guia para a sua <span class="accent-serif">Motorola</span>';
        sub = 'Veja logo abaixo o status de compatibilidade do seu modelo Motorola no MINUTE.';
        eyebrow = 'Detectado: Motorola';
        break;
      case 'google':
        title = 'Guia para o seu <span class="accent-serif">Pixel</span>';
        sub = 'Veja logo abaixo o status de compatibilidade do seu Pixel no MINUTE.';
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
        <div class="stat"><span class="stat-num" id="statDevicesOk">${currentDevicesOk}</span><span class="stat-label">celulares compatíveis com o MINUTE</span></div>
        <div class="stat"><span class="stat-num" id="statTasks">${currentTasksCount}</span><span class="stat-label">tarefas traduzidas</span></div>
        <div class="stat"><span class="stat-num">45°</span><span class="stat-label">inclinação recomendada pela HUB</span></div>
      </div>
    `;
  }

  heroDynamic.innerHTML = html;
  heroDynamic.classList.add('visible');

  if (isMobile) {
    document.querySelector('.hero').classList.add(`hero-brand-${brand}`);
    renderDeviceMatchBanner(brand, ua);
  }

  if (typeof window.__setupStatCountUp === 'function') {
    window.__setupStatCountUp();
  }

  if (!isMobile) {
    const qrScript = document.createElement('script');
    qrScript.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    qrScript.onload = () => {
      var qrContainer = document.getElementById("qrContainer");
      if (qrContainer) {
        new QRCode(qrContainer, {
          text: window.__qrUrl || window.location.href,
          width: 265,
          height: 265,
          colorDark: "#090A14",
          colorLight: "#FFFFFF"
        });
      }
    };
    qrScript.onerror = () => {
      var qrContainer = document.getElementById("qrContainer");
      if (qrContainer) qrContainer.textContent = "Não foi possível carregar o QR Code agora. Recarregue a página.";
    };
    document.head.appendChild(qrScript);
  }
}

document.addEventListener('DOMContentLoaded', initSmartHero);
