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
   Logos oficiais das marcas — paths SVG reais (viewBox 0 0 24 24),
   extraídos da biblioteca open-source Simple Icons (licença CC0,
   dados de marca mantidos e revisados pela comunidade — não são
   desenhos aproximados). fill="currentColor" já vem em cada path,
   então herdam automaticamente a cor e a transição de hover do CSS.
   ============================================================ */
var BRAND_LOGO_PATHS = {
  apple:
    '<path fill="currentColor" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>',
  samsung:
    '<path fill="currentColor" d="M19.8166 10.2808l.0459 2.6934h-.023l-.7793-2.6934h-1.2837v3.3925h.8481l-.0458-2.785h.023l.8366 2.785h1.2264v-3.3925zm-16.149 0l-.6418 3.427h.9284l.4699-3.1175h.0229l.4585 3.1174h.9169l-.6304-3.4269zm5.1805 0l-.424 2.6132h-.023l-.424-2.6132H6.5788l-.0688 3.427h.8596l.023-3.0832h.0114l.573 3.0831h.8711l.5731-3.083h.023l.0228 3.083h.8596l-.0802-3.4269zm-7.2664 2.4527c.0343.0802.0229.1949.0114.2522-.0229.1146-.1031.2292-.3324.2292-.2177 0-.3438-.126-.3438-.3095v-.3323H0v.2636c0 .7679.6074.9971 1.2493.9971.6189 0 1.1346-.2178 1.2149-.7794.0458-.298.0114-.4928 0-.5616-.1605-.722-1.467-.9283-1.5588-1.3295-.0114-.0688-.0114-.1375 0-.1834.023-.1146.1032-.2292.3095-.2292.2063 0 .321.126.321.3095v.2063h.8595v-.2407c0-.745-.6762-.8596-1.1576-.8596-.6074 0-1.1117.2063-1.2034.7564-.023.149-.0344.2866.0114.4585.1376.7106 1.364.9169 1.5358 1.3524m11.152 0c.0343.0803.0228.1834.0114.2522-.023.1146-.1032.2292-.3324.2292-.2178 0-.3438-.126-.3438-.3095v-.3323h-.917v.2636c0 .7564.596.9857 1.2379.9857.6189 0 1.1232-.2063 1.2034-.7794.0459-.298.0115-.4814 0-.5616-.1375-.7106-1.4327-.9284-1.5243-1.318-.0115-.0688-.0115-.1376 0-.1835.0229-.1146.1031-.2292.3094-.2292.1948 0 .321.126.321.3095v.2063h.848v-.2407c0-.745-.6647-.8596-1.146-.8596-.6075 0-1.1004.1948-1.192.7564-.023.149-.023.2866.0114.4585.1376.7106 1.341.9054 1.513 1.3524m2.8882.4585c.2407 0 .3094-.1605.3323-.2522.0115-.0343.0115-.0917.0115-.126v-2.533h.871v2.4642c0 .0688 0 .1948-.0114.2292-.0573.6419-.5616.8482-1.192.8482-.6303 0-1.1346-.2063-1.192-.8482 0-.0344-.0114-.1604-.0114-.2292v-2.4642h.871v2.533c0 .0458 0 .0916.0115.126 0 .0917.0688.2522.3095.2522m7.1518-.0344c.2522 0 .3324-.1605.3553-.2522.0115-.0343.0115-.0917.0115-.126v-.4929h-.3553v-.5043H24v.917c0 .0687 0 .1145-.0115.2292-.0573.6303-.596.8481-1.2034.8481-.6075 0-1.1461-.2178-1.2034-.8481-.0115-.1147-.0115-.1605-.0115-.2293v-1.444c0-.0574.0115-.172.0115-.2293.0802-.6419.596-.8482 1.2034-.8482s1.1347.2063 1.2034.8482c.0115.1031.0115.2292.0115.2292v.1146h-.8596v-.1948s0-.0803-.0115-.1261c-.0114-.0802-.0802-.2521-.3438-.2521-.2521 0-.321.1604-.3438.2521-.0115.0458-.0115.1032-.0115.1605v1.5702c0 .0458 0 .0916.0115.126 0 .0917.0917.2522.3323.2522"/>',
  motorola:
    '<path fill="currentColor" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12C24.002 5.375 18.632.002 12.007 0H12zm7.327 18.065s-.581-2.627-1.528-4.197c-.514-.857-1.308-1.553-2.368-1.532-.745 0-1.399.423-2.2 1.553-.469.77-.882 1.573-1.235 2.403 0 0-.29-.675-.63-1.343a8.038 8.038 0 0 0-.605-1.049c-.804-1.13-1.455-1.539-2.2-1.553-1.049-.021-1.854.675-2.364 1.528-.948 1.574-1.528 4.197-1.528 4.197h-.864l4.606-15.12 3.56 11.804.024.021.024-.021 3.56-11.804 4.61 15.113h-.862z"/>',
  google:
    '<path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>'
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
      // Card puramente tipográfico: sem <img>, a identidade visual vem da logo vetorial (SVG)
      // da marca ao lado do nome do modelo, mais o sistema de status por cor/texto.
      return (
        '<div class="device-card" data-device-id="' + d.id + '">' +
          (isNewModel(d.model) ? '<span class="device-new-badge">Novo</span>' : "") +
          '<div class="device-top">' +
            '<div class="device-top-id">' +
              brandBadge(d.brand, 30) +
              '<div><div class="device-brand">' + d.brand + '</div><div class="device-model">' + d.model + '</div></div>' +
            '</div>' +
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

// three.js agora carrega em modo async (ver index.html), então pode não estar pronto ainda
// quando este trecho executa. Em vez de depender da ordem dos <script>, tentamos algumas vezes
// com um pequeno intervalo; initHeroRig/initAngleDemo já são seguras (retornam cedo se THREE
// ainda não existir), então isso nunca trava o resto do site — só a cena 3D aparece um instante depois.
function tryInitThreeScenes(attemptsLeft){
  if (typeof THREE !== "undefined"){
    initHeroRig();
    initAngleDemo();
    return;
  }
  if (attemptsLeft <= 0) return; // three.js não carregou (bloqueio de rede, offline, etc.) — segue sem a cena 3D
  setTimeout(function(){ tryInitThreeScenes(attemptsLeft - 1); }, 300);
}
tryInitThreeScenes(20); // ~6s de tolerância, suficiente até para conexões móveis mais lentas

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

// 2b. Fallback por FAIXA de largura lógica (aproximado) — usado só para Apple, e só quando a
// resolução exata não está no HARDWARE_FINGERPRINT_MAP acima. O Safari nunca revela o modelo
// exato do iPhone (é bloqueado por privacidade), então mesmo essa faixa é uma aproximação; por
// isso o resultado ainda passa pelo cruzamento por palavras-chave no bloco C antes de virar um
// "match" — nunca declara compatibilidade com um modelo que não exista de fato em DEVICES.
var APPLE_WIDTH_FALLBACK_RANGES = [
  { maxWidth: 380, guess: "iPhone SE" },
  { maxWidth: 400, guess: "iPhone 15" },
  { maxWidth: 420, guess: "iPhone 15 Plus" },
  { maxWidth: 999, guess: "iPhone 15 Pro Max" }
];
function guessAppleModelByWidth(){
  var w = Math.min(window.screen.width, window.screen.height);
  for (var i = 0; i < APPLE_WIDTH_FALLBACK_RANGES.length; i++){
    if (w <= APPLE_WIDTH_FALLBACK_RANGES[i].maxWidth) return APPLE_WIDTH_FALLBACK_RANGES[i].guess;
  }
  return null;
}

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

// 5. Função Master de Identificação — matching case-insensitive e flexível por palavras-chave.
//
// CORREÇÃO DO BUG REAL: nas versões anteriores, o cruzamento por palavras-chave (bloco C) só
// rodava se um nome de modelo EXATO já tivesse sido resolvido pelo fingerprint de tela (12
// resoluções cadastradas) ou pelo código Android no user-agent (ex: "SM-S911"). Só que:
//   • o Safari nunca expõe o modelo exato do iPhone (bloqueio de privacidade da Apple), então
//     qualquer resolução fora da tabela retornava null direto, sem nem tentar o cruzamento;
//   • o Chrome moderno no Android vem REMOVENDO o código do modelo do user-agent por padrão
//     (User-Agent Reduction/Client Hints), então ANDROID_MODEL_CODE_MAP cada vez bate menos.
// Isso fazia a função desistir cedo demais. Agora, para Apple sem resolução exata cadastrada,
// usamos uma faixa aproximada (guessAppleModelByWidth) só para GERAR um candidato — que ainda
// precisa bater com um modelo real do DEVICES no bloco C abaixo antes de virar um resultado.
function findDeviceMatch(ua, brand){
  if (typeof DEVICES === "undefined") return null;

  var uaLower = String(ua || "").toLowerCase().trim();
  var matchedModelName = null;
  var gpu = getGPUInfo().toLowerCase();

  // A. Tentativa Primária: Hardware Fingerprinting exato (Especialmente preciso para Apple)
  var fingerprint = getHardwareFingerprint();
  if (HARDWARE_FINGERPRINT_MAP[fingerprint]) {
    // Cruza a informação extra da GPU se for um dispositivo Apple para evitar falsos positivos
    if (brand === "apple" || gpu.includes("apple")) {
       matchedModelName = HARDWARE_FINGERPRINT_MAP[fingerprint];
    } else if (brand !== "apple") {
       matchedModelName = HARDWARE_FINGERPRINT_MAP[fingerprint];
    }
  }

  // A2. Fallback por faixa aproximada — só Apple, só se a resolução exata não bateu acima.
  if (!matchedModelName && brand === "apple") {
    matchedModelName = guessAppleModelByWidth();
  }

  // B. Tentativa Secundária: Fallback via User-Agent (case-insensitive, padrão ouro para Android
  // — mas cada vez menos confiável em navegadores modernos que ocultam o código do modelo).
  if (!matchedModelName && (brand === "samsung" || brand === "google" || brand === "motorola")){
    for (var code in ANDROID_MODEL_CODE_MAP){
      if (uaLower.includes(code.toLowerCase())){
        matchedModelName = ANDROID_MODEL_CODE_MAP[code];
        break;
      }
    }
  }

  // C. Varredura no array DEVICES local — matching flexível por palavras-chave, com
  // .toLowerCase() e .trim() em ambas as pontas (nunca comparação rígida por .indexOf() bruto).
  // Resolve casos como "iPhone 15 Pro Max" detectado batendo com "iPhone 15, 15 Pro, 15 Pro Max"
  // cadastrado em DEVICES.
  if (matchedModelName) {
    var normalizedTarget = normalizeModelString(matchedModelName).trim();
    var keywords = normalizedTarget.split(" ").filter(Boolean);

    // Passagem 1 (estrita): exige que TODAS as palavras-chave detectadas apareçam
    // no texto do modelo cadastrado (ordem não importa, maiúsculas ignoradas).
    var foundByModel = DEVICES.filter(function(d){
      var modelNorm = normalizeModelString(d.model).trim();
      return keywords.every(function(kw){ return modelNorm.includes(kw); });
    });

    // Passagem 2 (flexível): se a estrita não achou nada, aceita quando pelo menos
    // todas as palavras-chave MENOS UMA baterem (cobre pequenas variações de escrita,
    // como "Pro Max" detectado vs. "Pro" cadastrado).
    if (!foundByModel.length && keywords.length > 1){
      foundByModel = DEVICES.filter(function(d){
        var modelNorm = normalizeModelString(d.model).trim();
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

  // Detecta se o usuário chegou aqui pelo QR Code do Desktop (?src=qr). Isso NUNCA altera o
  // resultado da detecção em si — o status exibido (compatível/pendente/não funciona/desconhecido)
  // continua sendo sempre o resultado real do fingerprint. Forçar uma mensagem "positiva" fixa aqui
  // seria enganoso: mostraria "compatível" para alguém com um aparelho que na verdade não funciona.
  // O que o parâmetro realmente melhora: pula o delay artificial do scroll (quem escaneou o QR já
  // decidiu ver a seção, não precisa esperar) e deixa isso explícito no texto do banner.
  var isFromQR = false;
  try { isFromQR = new URLSearchParams(window.location.search).get('src') === 'qr'; } catch (e) { isFromQR = false; }

  var BRAND_LABEL = { apple: "Apple", samsung: "Samsung", motorola: "Motorola", google: "Google" };
  var qrSuffix = isFromQR ? " <em>(detectado via QR Code)</em>" : "";

  var matchResult = findDeviceMatch(ua, brand);
  // findDeviceMatch pode retornar um array de compatíveis — seleção estável: sempre
  // usa o primeiro item da lista (mesma ordem do array DEVICES).
  var match = Array.isArray(matchResult) ? matchResult[0] : matchResult;

  if (match){
    var st = overallStatus(match);
    var label = (typeof STATUS_LABEL !== "undefined" && STATUS_LABEL[st]) ? STATUS_LABEL[st] : st;

    banner.className = "device-match-banner status-" + st;
    if (st === "ok") {
        banner.innerHTML = "<strong>O modelo " + match.model + " é compatível!</strong>" + qrSuffix + "<br>" + match.note;
    } else {
        banner.innerHTML = "<strong>Detectamos: " + match.brand + " " + match.model + "</strong>" + qrSuffix + "<br>Status atual: " + label + ". " + match.note;
    }

    if (searchInput) {
        searchInput.value = match.model;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

  } else if (brand !== "generic"){
    var brandLabel = BRAND_LABEL[brand] || (brand.charAt(0).toUpperCase() + brand.slice(1));
    banner.className = "device-match-banner status-unknown";
    banner.innerHTML =
      "<strong>Aparelho da linha " + brandLabel + " detectado!</strong>" + qrSuffix + "<br>" +
      "Use os filtros ou a busca abaixo para localizar seu modelo.";
  } else {
    banner.className = "device-match-banner status-unknown";
    banner.innerHTML = "Não conseguimos identificar automaticamente o seu aparelho. Use a busca abaixo para conferir o seu modelo.";
  }

  // Auto-scroll respeitando preferências de movimento. Quem veio do QR Code já tomou a decisão
  // de ver esta seção ao escanear — não faz sentido esperar o mesmo delay de uma visita orgânica.
  var scrollDelay = isFromQR ? 0 : 900;
  setTimeout(function(){
    var target = document.getElementById("celulares");
    if (target) target.scrollIntoView({ behavior: isReducedMotionPreferred ? "auto" : "smooth", block: "start" });
  }, scrollDelay);
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
  // Detecção mobile robusta: o user-agent é o sinal primário (mais confiável), mas somamos
  // sinais de toque como reforço — alguns navegadores in-app (ex: abrir o link direto da câmera
  // ao ler o QR Code) reportam navigator.maxTouchPoints de forma inconsistente (às vezes 0 ou 1
  // mesmo em telas touch reais), então não exigimos um valor mínimo alto para esse sinal.
  var hasCoarseTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
                 (hasCoarseTouch && window.innerWidth < 1024) ||
                 window.innerWidth < 768;

  var brand = 'generic';

  if (isMobile) {
    // Detecção case-insensitive por marca; padrões restritos para evitar falsos
    // positivos (ex: "xt" isolado casava com qualquer string contendo essas letras).
    // maxTouchPoints > 0 (em vez de > 1) porque alguns webviews de apps de câmera/QR
    // reportam esse valor de forma mais conservadora que o Safari/Chrome padrão.
    if (/iphone|ipad|ipod|mac/i.test(ua) && navigator.maxTouchPoints > 0) brand = 'apple';
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
  // hero-qr-mode acalma visualmente a cena 3D animada de fundo, para o cartão do QR Code
  // não competir com ela (era isso que deixava a tela "feia" — QR nítido sobre fundo calmo).
  if (!isMobile) {
    var heroElDesktop = document.querySelector('.hero');
    if (heroElDesktop) heroElDesktop.classList.add('hero-qr-mode');
    loadQRCodeLib();
  }
}

if (document.readyState === "loading"){
  document.addEventListener('DOMContentLoaded', initSmartHero);
} else {
  // DOM já pronto (script carregado tarde/async) — evita perder o evento.
  initSmartHero();
}
