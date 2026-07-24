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
if (navToggle && navLinks){
  navToggle.addEventListener("click", function(){
    var open = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinks.querySelectorAll("a").forEach(function(a){
    a.addEventListener("click", function(){
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------------- Smooth scroll para links internos (#âncora) ----------------
   Delegado uma única vez no documento — evita listeners duplicados por link
   e funciona mesmo para elementos injetados dinamicamente (ex: brandNav). */
document.addEventListener("click", function(e){
  var link = e.target.closest('a[href^="#"]');
  if (!link) return;
  var hash = link.getAttribute("href");
  if (!hash || hash === "#") return;
  var target;
  try { target = document.querySelector(hash); } catch (err) { target = null; }
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  if (history.pushState) history.pushState(null, "", hash);
}, false);

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
if (faqList && typeof FAQS !== "undefined" && !faqList.dataset.rendered){
  faqList.dataset.rendered = "true";
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

  window.addEventListener("resize", debounce(function(){
    var openItem = faqList.querySelector(".faq-item.is-open");
    if (!openItem) return;
    var answer = openItem.querySelector(".faq-a");
    answer.style.maxHeight = answer.scrollHeight + "px";
  }, 150));
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

/* ============================================================
   Logos oficiais das marcas — SVG vetorial (viewBox 24x24), com
   fill="currentColor" para herdar cor/hover do CSS automaticamente.
   Representações estilizadas em traço único; para peças de marketing
   oficiais, use sempre os brand kits originais de cada fabricante.
   ============================================================ */
var BRAND_LOGO_PATHS = {
  apple:
    '<path fill="currentColor" d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.87-1.99 1.55-3.014 1.55-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.145-1.64 3.243-1.68.03.13.05.29.05.45zM20.5 17.14c-.03.07-.463 1.58-1.518 3.12-.94 1.34-1.94 2.71-3.492 2.71-1.55 0-1.94-.9-3.734-.9-1.762 0-2.196.87-3.732.9-1.535.03-2.612-1.44-3.586-2.77-1.945-2.75-3.42-7.79-1.44-11.28.98-1.73 2.72-2.82 4.62-2.85 1.44-.03 2.79.97 3.665.97.87 0 2.53-1.2 4.27-1.02.727.03 2.77.29 4.09 2.22-.104.06-2.44 1.42-2.41 4.24.03 3.38 2.96 4.5 2.967 4.66z"/>',
  // Anel orbitando um núcleo — referência direta ao símbolo "Galaxy" usado nos aparelhos Samsung
  // (a marca corporativa Samsung é uma wordmark; aqui usamos o símbolo que efetivamente aparece nos celulares).
  samsung:
    '<ellipse cx="12" cy="12" rx="10.2" ry="4.1" transform="rotate(-24 12 12)" fill="none" stroke="currentColor" stroke-width="1.7"/>' +
    '<circle cx="12" cy="12" r="3.4" fill="currentColor"/>',
  // "Batwing" em duas pétalas convergindo num ponto central — a mesma construção geométrica
  // do símbolo clássico da Motorola (M estilizado em forma de asas).
  motorola:
    '<path fill="currentColor" d="M12 20.5C12 20.5 3.6 16.2 3.6 8.8C3.6 5.1 6.6 2.3 10.1 2.3c.66 0 1.28.07 1.86.2C10.3 7.9 10.7 14.4 12 20.5Z"/>' +
    '<path fill="currentColor" d="M12 20.5C12 20.5 20.4 16.2 20.4 8.8C20.4 5.1 17.4 2.3 13.9 2.3c-.66 0-1.28.07-1.86.2C13.7 7.9 13.3 14.4 12 20.5Z"/>',
  google:
    '<path fill="currentColor" d="M21.6 12.23c0-.68-.06-1.36-.19-2H12v3.78h5.4a4.62 4.62 0 01-2 3.04v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.32z"/>' +
    '<path fill="currentColor" d="M12 22c2.7 0 4.97-.89 6.63-2.42l-3.24-2.5c-.9.6-2.06.95-3.39.95-2.6 0-4.8-1.75-5.59-4.11H3.06v2.58A10 10 0 0012 22z"/>' +
    '<path fill="currentColor" d="M6.41 13.92a5.99 5.99 0 010-3.84V7.5H3.06a10 10 0 000 8.99l3.35-2.57z"/>' +
    '<path fill="currentColor" d="M12 5.98c1.47 0 2.79.5 3.83 1.49l2.87-2.87A9.62 9.62 0 0012 2a10 10 0 00-8.94 5.5l3.35 2.58C7.2 7.73 9.4 5.98 12 5.98z"/>'
};

function brandBadge(brand, size){
  size = size || 40;
  var key = String(brand || "").toLowerCase().trim();
  var logo = BRAND_LOGO_PATHS[key];
  var inner;
  if (logo){
    // Logo real posicionado e escalado dentro do círculo de 40x40 (viewBox nativo do ícone: 24x24)
    inner =
      '<circle cx="20" cy="20" r="18.5" class="brand-badge-ring"/>' +
      '<g transform="translate(9 9) scale(0.917)">' + logo + '</g>';
  } else {
    var initial = brand ? brand.charAt(0).toUpperCase() : "?";
    inner =
      '<circle cx="20" cy="20" r="18.5" class="brand-badge-ring"/>' +
      '<text x="20" y="26" text-anchor="middle" class="brand-badge-letter">' + initial + '</text>';
  }
  return (
    '<svg class="brand-badge" width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
      inner +
    '</svg>'
  );
}

// Gera a URL do placeholder estilizado (usado sempre que não há foto real cadastrada,
// e também como rede de segurança se uma foto real falhar ao carregar).
function placeholderSrc(d){
  var label = encodeURIComponent(d.brand + "\n" + d.model.split(",")[0].split(" e ")[0]);
  return "https://placehold.co/480x320/131B27/6E6C8C?font=inter&text=" + label;
}

// Renderiza a foto do aparelho. Se o objeto do dispositivo (definido em data.js) tiver um
// campo opcional `photo` com uma URL de imagem real, ela é usada; caso contrário (ou se a URL
// falhar ao carregar), cai automaticamente no placeholder estilizado — nunca quebra o layout.
function placeholderImg(d){
  var fallback = placeholderSrc(d);
  var hasRealPhoto = !!d.photo;
  var src = hasRealPhoto ? d.photo : fallback;
  var altText = "Foto do " + d.brand + " " + d.model;
  var onerrorAttr = hasRealPhoto
    ? ' onerror="this.onerror=null;this.src=\'' + fallback.replace(/'/g, "%27") + '\';"'
    : "";
  return '<img class="device-photo" src="' + src + '" alt="' + altText + '" loading="lazy" width="480" height="320"' + onerrorAttr + '>';
}

var NEW_MODEL_MARKERS = ["iPhone 17", "Galaxy S25"];
function isNewModel(model){
  var modelLower = String(model).toLowerCase();
  return NEW_MODEL_MARKERS.some(function(marker){ return modelLower.indexOf(marker.toLowerCase()) !== -1; });
}

function renderDevices(){
  if (!deviceGrid || typeof DEVICES === "undefined") return;
  var q = (deviceSearch && deviceSearch.value || "").toLowerCase().trim();
  var brandFilterVal = deviceBrandFilter ? deviceBrandFilter.value : "";
  var status = deviceStatusFilter ? deviceStatusFilter.value : "";

  var filtered = DEVICES.filter(function(d){
    var st = overallStatus(d);
    var matchesQ = !q || (d.brand + " " + d.model).toLowerCase().indexOf(q) !== -1;
    var matchesBrand = !brandFilterVal || d.brand === brandFilterVal;
    var matchesStatus = !status || st === status;
    return matchesQ && matchesBrand && matchesStatus;
  });

  if (deviceCount) deviceCount.textContent = filtered.length + " de " + DEVICES.length + " registros";

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

if (deviceGrid && deviceBrandFilter && deviceStatusFilter && deviceSearch && typeof DEVICES !== "undefined"){
  var brands = Array.from(new Set(DEVICES.map(function(d){ return d.brand; }))).sort();
  brands.forEach(function(b){
    var opt = document.createElement("option");
    opt.value = b; opt.textContent = b;
    deviceBrandFilter.appendChild(opt);
  });

  var brandNav = document.getElementById("brandNav");
  if (brandNav && !brandNav.dataset.bound){
    brandNav.dataset.bound = "true";
    brandNav.innerHTML = brands.map(function(b){
      return '<button type="button" class="brand-nav-item" data-brand="' + b + '">' + brandBadge(b, 26) + '<span>' + b + '</span></button>';
    }).join("");
    brandNav.addEventListener("click", function(e){
      var item = e.target.closest(".brand-nav-item");
      if (!item) return;
      var targetGroup = deviceGrid.querySelector('.device-group[data-brand="' + item.dataset.brand + '"]');
      if (targetGroup) targetGroup.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
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
  var q = (taskSearch && taskSearch.value || "").toLowerCase().trim();

  var filtered = TASKS.filter(function(t){
    var matchesQ = !q || t.en.toLowerCase().indexOf(q) !== -1 || t.pt.toLowerCase().indexOf(q) !== -1;
    var matchesCat = !activeCat || t.cat === activeCat;
    return matchesQ && matchesCat;
  });

  if (taskCount) taskCount.textContent = filtered.length + " de " + TASKS.length + " tarefas";

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
  var allEl = document.getElementById("count-all");
  if (allEl) allEl.textContent = TASKS.length;
  ["tidy","laundry","kitchen","misc"].forEach(function(cat){
    var el = document.getElementById("count-" + cat);
    if (el) el.textContent = TASKS.filter(function(t){ return t.cat === cat; }).length;
  });
}

if (taskGrid){
  updateCatCounts();
  renderTasks();
  if (taskSearch) taskSearch.addEventListener("input", debounce(renderTasks, 120));
  if (catChips && !catChips.dataset.bound){
    catChips.dataset.bound = "true";
    catChips.addEventListener("click", function(e){
      var chip = e.target.closest(".chip");
      if (!chip) return;
      catChips.querySelectorAll(".chip").forEach(function(c){ c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      activeCat = chip.dataset.cat || "";
      renderTasks();
    });
  }
  taskGrid.addEventListener("change", function(e){
    var checkbox = e.target.closest(".task-check input");
    if (!checkbox) return;
    var card = checkbox.closest(".task-card");
    if (!card) return;
    var id = parseInt(card.dataset.taskId, 10);
    if (checkbox.checked) doneTasks.add(id); else doneTasks.delete(id);
    saveDoneTasks(doneTasks);
    card.classList.toggle("is-done", checkbox.checked);
    var badge = card.querySelector(".task-status-badge");
    if (badge){
      badge.textContent = checkbox.checked ? "Concluído" : "Pendente";
      badge.className = "task-status-badge " + (checkbox.checked ? "done" : "pending");
    }
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
  if (!lvl1Range || !lvl2Range || !hoursRange) return;
  var l1 = parseInt(lvl1Range.value, 10);
  var l2 = parseInt(lvl2Range.value, 10);
  var hrs = parseInt(hoursRange.value, 10);

  var lvl1Out = document.getElementById("lvl1Out");
  var lvl2Out = document.getElementById("lvl2Out");
  var hoursOut = document.getElementById("hoursOut");
  if (lvl1Out) lvl1Out.textContent = l1;
  if (lvl2Out) lvl2Out.textContent = l2;
  if (hoursOut) hoursOut.textContent = hrs + "h";

  var monthly1 = l1 * hrs * WEEKS * RATE_1;
  var monthly2 = l2 * hrs * WEEKS * RATE_2;
  var total = monthly1 + monthly2;
  var maxBar = Math.max(monthly1, monthly2, 1);

  var calcTotal = document.getElementById("calcTotal");
  var calcSub = document.getElementById("calcSub");
  var calcLvl1 = document.getElementById("calcLvl1");
  var calcLvl2 = document.getElementById("calcLvl2");
  var bar1 = document.getElementById("bar1");
  var bar2 = document.getElementById("bar2");

  if (calcTotal) calcTotal.textContent = fmtBRL(total);
  if (calcSub) calcSub.textContent = "com " + l1 + " pessoa(s) no nível 1 e " + l2 + " no nível 2";
  if (calcLvl1) calcLvl1.textContent = fmtBRL(monthly1);
  if (calcLvl2) calcLvl2.textContent = fmtBRL(monthly2);
  if (bar1) bar1.style.width = (monthly1 / maxBar * 100) + "%";
  if (bar2) bar2.style.width = (monthly2 / maxBar * 100) + "%";
}

if (lvl1Range && lvl2Range && hoursRange){
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
  window.addEventListener("resize", debounce(resize, 100));
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
  window.addEventListener("resize", debounce(resize, 100));
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

var yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
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

// Helper de normalização usado pelo matching flexível de findDeviceMatch.
// Baixa a caixa e remove vírgulas/pontos, para que "iPhone 15 Pro Max" e
// "iPhone 15, 15 Pro, 15 Pro Max" virem strings comparáveis por palavra-chave.
function normalizeModelString(str){
  return String(str)
    .toLowerCase()
    .replace(/[,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 5. Função Master de Identificação — matching case-insensitive e flexível por
// palavras-chave. Toda comparação usa .toLowerCase() + .includes() (sem
// diferenciar maiúsculas/minúsculas), tanto na leitura do user-agent quanto
// no cruzamento com o array DEVICES.
function findDeviceMatch(ua, brand){
  if (typeof DEVICES === "undefined") return null;

  var uaLower = String(ua || "").toLowerCase();
  var matchedModelName = null;
  var gpu = getGPUInfo().toLowerCase();

  // A. Tentativa Primária: Hardware Fingerprinting (Especialmente preciso para Apple)
  var fingerprint = getHardwareFingerprint();
  if (HARDWARE_FINGERPRINT_MAP[fingerprint]) {
    // Cruza a informação extra da GPU se for um dispositivo Apple para evitar falsos positivos
    if (brand === "apple" || gpu.includes("apple")) {
       matchedModelName = HARDWARE_FINGERPRINT_MAP[fingerprint];
    } else if (brand !== "apple") {
       matchedModelName = HARDWARE_FINGERPRINT_MAP[fingerprint];
    }
  }

  // B. Tentativa Secundária: Fallback via User-Agent (case-insensitive, padrão ouro para Android)
  if (!matchedModelName && (brand === "samsung" || brand === "google" || brand === "motorola")){
    for (var code in ANDROID_MODEL_CODE_MAP){
      if (uaLower.includes(code.toLowerCase())){
        matchedModelName = ANDROID_MODEL_CODE_MAP[code];
        break;
      }
    }
  }

  // C. Varredura no array DEVICES local — matching flexível por palavras-chave
  // em vez de comparação rígida. Resolve casos como "iPhone 15 Pro Max" detectado no
  // hardware batendo com "iPhone 15, 15 Pro, 15 Pro Max" cadastrado em DEVICES.
  if (matchedModelName) {
    var normalizedTarget = normalizeModelString(matchedModelName);
    var keywords = normalizedTarget.split(" ").filter(Boolean);

    // Passagem 1 (estrita): exige que TODAS as palavras-chave detectadas apareçam
    // no texto do modelo cadastrado (ordem não importa, maiúsculas ignoradas).
    var foundByModel = DEVICES.filter(function(d){
      var modelNorm = normalizeModelString(d.model);
      return keywords.every(function(kw){ return modelNorm.includes(kw); });
    });

    // Passagem 2 (flexível): se a estrita não achou nada, aceita quando pelo menos
    // todas as palavras-chave MENOS UMA baterem (cobre pequenas variações de escrita).
    if (!foundByModel.length && keywords.length > 1){
      foundByModel = DEVICES.filter(function(d){
        var modelNorm = normalizeModelString(d.model);
        var hits = keywords.filter(function(kw){ return modelNorm.includes(kw); }).length;
        return hits >= keywords.length - 1;
      });
    }

    if (foundByModel.length) return foundByModel; // retorna um ARRAY de compatíveis
  }

  return null;
}

function renderDeviceMatchBanner(brand, ua){
  var banner = document.getElementById("celularesMatchBanner");
  var searchInput = document.getElementById("deviceSearch");
  if (!banner) return;

  var BRAND_LABEL = { apple: "Apple", samsung: "Samsung", motorola: "Motorola", google: "Google" };

  var matchResult = findDeviceMatch(ua, brand);
  // findDeviceMatch pode retornar um array de compatíveis — seleção estável: sempre
  // usa o primeiro item da lista (mesma ordem do array DEVICES).
  var match = Array.isArray(matchResult) ? matchResult[0] : matchResult;

  if (match){
    var st = overallStatus(match);
    var label = (typeof STATUS_LABEL !== "undefined" && STATUS_LABEL[st]) ? STATUS_LABEL[st] : st;

    banner.className = "device-match-banner status-" + st;
    if (st === "ok") {
        banner.innerHTML = "<strong>O modelo " + match.model + " é compatível!</strong><br>" + match.note;
    } else {
        banner.innerHTML = "<strong>Detectamos: " + match.brand + " " + match.model + "</strong><br>Status atual: " + label + ". " + match.note;
    }

    if (searchInput) {
        searchInput.value = match.model;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

  } else if (brand !== "generic"){
    var brandLabel = BRAND_LABEL[brand] || (brand.charAt(0).toUpperCase() + brand.slice(1));
    banner.className = "device-match-banner status-unknown";
    banner.innerHTML =
      "<strong>Aparelho da linha " + brandLabel + " detectado!</strong><br>" +
      "Confira a tabela abaixo para ver o status exato do seu modelo.";
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

/* ============================================================
   Hero dinâmico — estabilizado entre Desktop e Mobile.
   Toda manipulação de DOM é protegida por verificação de existência
   do elemento, e nenhum seletor exclusivo de Mobile roda em Desktop
   (e vice-versa).
   ============================================================ */
var qrLibLoading = false;

function renderQRCode(){
  var qrContainer = document.getElementById("qrContainer");
  if (!qrContainer || typeof QRCode === "undefined") return;
  qrContainer.innerHTML = "";
  new QRCode(qrContainer, {
    text: window.__qrUrl || window.location.href,
    width: 265,
    height: 265,
    colorDark: "#090A14",
    colorLight: "#FFFFFF"
  });
}

function loadQRCodeLib(){
  if (typeof QRCode !== "undefined"){
    renderQRCode();
    return;
  }
  if (qrLibLoading) return;
  qrLibLoading = true;

  var qrScript = document.createElement('script');
  qrScript.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
  qrScript.onload = function(){
    qrLibLoading = false;
    renderQRCode();
  };
  qrScript.onerror = function(){
    qrLibLoading = false;
    var qrContainer = document.getElementById("qrContainer");
    if (qrContainer) qrContainer.textContent = "Não foi possível carregar o QR Code agora. Recarregue a página.";
  };
  document.head.appendChild(qrScript);
}

function initSmartHero() {
  var heroDynamic = document.getElementById('heroDynamic');
  if (!heroDynamic) return;

  var ua = navigator.userAgent || '';
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
                 (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
                 window.innerWidth < 768; // Refinado para considerar iPads modernos e afins

  var brand = 'generic';

  if (isMobile) {
    // Detecção case-insensitive por marca; padrões restritos para evitar falsos
    // positivos (ex: "xt" isolado casava com qualquer string contendo essas letras).
    if (/iphone|ipad|ipod|mac/i.test(ua) && navigator.maxTouchPoints > 1) brand = 'apple';
    else if (/samsung|sm-/i.test(ua)) brand = 'samsung';
    else if (/motorola|\bmoto\b|\bxt\d{3,4}\b/i.test(ua)) brand = 'motorola';
    else if (/pixel|nexus/i.test(ua)) brand = 'google';
  }

  var elDevicesOk = document.getElementById('statDevicesOk');
  var elTasks = document.getElementById('statTasks');
  var currentDevicesOk = elDevicesOk ? elDevicesOk.textContent : '13';
  var currentTasksCount = elTasks ? elTasks.textContent : '84';

  var html = '';

  if (!isMobile) {
    var qrUrl = window.location.href.split('?')[0] + '?src=qr';
    html =
      '<p class="eyebrow">Recomendado: acesse pelo celular</p>' +
      '<h1 class="hero-title">Veja se o <span class="accent-serif">seu celular</span> é compatível</h1>' +
      '<div class="desktop-hint-banner">' +
        'A gravação para o MINUTE é feita pela câmera do celular. Você pode continuar ' +
        'navegando por aqui normalmente, ou escanear o QR Code abaixo para abrir este ' +
        'guia no seu celular e já ver o status do seu aparelho.' +
      '</div>' +
      '<p class="hero-sub" style="max-width:520px; margin:1.2rem auto 2rem;">' +
        'Aponte a câmera do celular para o QR Code abaixo para abrir o guia lá.' +
      '</p>' +
      '<div class="qr-container" id="qrContainer"></div>' +
      '<div class="hero-stats" style="margin-top: 2.8rem; opacity: 0.9;">' +
        '<div class="stat"><span class="stat-num" id="statDevicesOk">' + currentDevicesOk + '</span><span class="stat-label">celulares compatíveis com o MINUTE</span></div>' +
        '<div class="stat"><span class="stat-num" id="statTasks">' + currentTasksCount + '</span><span class="stat-label">tarefas traduzidas</span></div>' +
        '<div class="stat"><span class="stat-num">45°</span><span class="stat-label">inclinação recomendada pela HUB</span></div>' +
      '</div>';
    window.__qrUrl = qrUrl;
  } else {
    var title = 'Grave sua rotina.<br><span class="accent-serif">Deixe nítido</span> o que importa.';
    var sub = 'Confira se o seu celular grava no MINUTE, encontre a tradução exata de cada tarefa e aprenda o ângulo de 45° que a HUB recomenda.';
    var eyebrow = 'Guia independente · HUB &amp; MINUTE';

    switch (brand) {
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

    html =
      '<p class="eyebrow">' + eyebrow + '</p>' +
      '<h1 class="hero-title">' + title + '</h1>' +
      '<p class="hero-sub">' + sub + '</p>' +
      '<div class="hero-actions">' +
        '<a class="btn btn-cta btn-lg" href="https://ai.hub.xyz/r/HHZ3V5GH" target="_blank" rel="noopener">Criar minha conta na HUB</a>' +
        '<a class="btn btn-ghost btn-lg" href="#celulares">Ver compatibilidade →</a>' +
      '</div>' +
      '<div class="hero-stats">' +
        '<div class="stat"><span class="stat-num" id="statDevicesOk">' + currentDevicesOk + '</span><span class="stat-label">celulares compatíveis com o MINUTE</span></div>' +
        '<div class="stat"><span class="stat-num" id="statTasks">' + currentTasksCount + '</span><span class="stat-label">tarefas traduzidas</span></div>' +
        '<div class="stat"><span class="stat-num">45°</span><span class="stat-label">inclinação recomendada pela HUB</span></div>' +
      '</div>';
  }

  heroDynamic.innerHTML = html;
  heroDynamic.classList.add('visible');

  // Seletores exclusivos de Mobile só rodam em Mobile.
  if (isMobile) {
    var heroEl = document.querySelector('.hero');
    if (heroEl) heroEl.classList.add('hero-brand-' + brand);
    renderDeviceMatchBanner(brand, ua);
  }

  if (typeof window.__setupStatCountUp === 'function') {
    window.__setupStatCountUp();
  }

  // Seletor exclusivo de Desktop (QR Code) só roda em Desktop.
  if (!isMobile) {
    loadQRCodeLib();
  }
}

if (document.readyState === "loading"){
  document.addEventListener('DOMContentLoaded', initSmartHero);
} else {
  // DOM já pronto (script carregado tarde/async) — evita perder o evento.
  initSmartHero();
}
