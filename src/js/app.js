/* App principal: pestañas, ediciones, modal y guía en vídeo.
   Script clásico: usa los globales de data.js, api.js, ui.js y playlist.js
   (cargados antes, en ese orden, al final de index.html). */

const $ = (s, r = document) => r.querySelector(s);
const gridFire = $("#grid-fire");
const gridLeaf = $("#grid-leaf");
const stripFire = $("#strip-fire");
const stripLeaf = $("#strip-leaf");
const statusFire = document.querySelector('[data-panel-status="fire"]');
const statusLeaf = document.querySelector('[data-panel-status="leaf"]');
const modalBackdrop = $("#modalBackdrop");
const modalBody = $("#modalBody");
const modalClose = $("#modalClose");

let store = []; // lista enriquecida con datos vivos
let lastFocus = null;

/* Pestañas independientes (sin scroll infinito). Debe ir antes de init()
   porque initTabs() lo usa durante el arranque. */
const TABS = ["pokedex", "ediciones", "mapa", "guia", "recursos"];

init();

async function init() {
  // Cada subsistema va protegido: si uno falla, el resto sigue funcionando.
  safe("nav", initNav);
  safe("tabs", initTabs);
  safe("dex", initPokedex);
  safe("grids", initGridEvents);
  safe("modal", initModal);
  safe("guide", initGuide);
  safe("skeletons", paintSkeletons);

  try {
    const { ok, fail } = await loadAll(ALL_EXCLUSIVES);
    store = ok;
    if (fail.length) {
      toast(`Sin conexión total: ${fail.length} mostrados con datos locales`);
      const msg = `Mostrando datos locales (sin conexión a PokéAPI) en ${fail.length} caso(s).`;
      statusFire.textContent = msg;
      statusLeaf.textContent = msg;
    }
    renderEditions();
  } catch (err) {
    console.error(err);
    store = ALL_EXCLUSIVES.map((p) => ({ ...p, name: p.slug, sprite: "" }));
    statusFire.textContent = "No se pudo contactar con PokéAPI. Mostrando datos locales.";
    statusLeaf.textContent = statusFire.textContent;
    renderEditions();
  }
}

/* ---------- Navegación móvil ---------- */
function safe(name, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[init:${name}]`, err);
  }
}

function initNav() {
  const btn = $("#navToggle");
  const menu = $("#navMenu");
  btn.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  });
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

/* ---------- Pestañas independientes (ver const TABS arriba) ---------- */
function initTabs() {
  // Enlaces y botones con data-tab (navegación, hero, propia tablist)
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (!t) return;
    e.preventDefault();
    activateTab(t.dataset.tab, { scrollTarget: t.dataset.scroll || null });
  });
  // Teclado en la tablist: flechas / inicio / fin
  $(".tabs").addEventListener("keydown", (e) => {
    const i = TABS.indexOf(document.activeElement?.dataset?.tab);
    if (i < 0) return;
    let j = null;
    if (e.key === "ArrowRight") j = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") j = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = TABS.length - 1;
    if (j === null) return;
    e.preventDefault();
    activateTab(TABS[j], { scroll: false });
    document.querySelector(`[role="tab"][data-tab="${TABS[j]}"]`).focus();
  });
  // Enlace profundo: #ediciones, #mapa... (por defecto, pokedex)
  const fromHash = location.hash.replace("#", "");
  activateTab(TABS.includes(fromHash) ? fromHash : "pokedex", { scroll: false });
}

function activateTab(name, opts = {}) {
  if (!TABS.includes(name)) return;
  for (const t of TABS) {
    const btn = document.querySelector(`[role="tab"][data-tab="${t}"]`);
    const panel = document.querySelector(`[data-panel="${t}"]`);
    if (!btn || !panel) continue;
    const on = t === name;
    btn.setAttribute("aria-selected", String(on));
    btn.tabIndex = on ? 0 : -1;
    panel.hidden = !on;
  }
  document.querySelectorAll('.site-nav a[data-tab]').forEach((a) =>
    a.classList.toggle("active", a.dataset.tab === name));
  try { history.replaceState(null, "", `#${name}`); } catch { /* file:// u otros contextos */ }
  if (opts.scroll === false) return;
  const target = opts.scrollTarget ? document.querySelector(opts.scrollTarget)
    : document.getElementById("tabsBar");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- Guía en vídeo: reproductor + lista ---------- */
function esc(s = "") {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function initGuide() {
  const eps = $("#playlistEps");
  const shorts = $("#playlistShorts");
  if (!eps || !shorts) return;
  $("#epCount").textContent = `(${EPISODES.length})`;
  $("#shortCount").textContent = `(${SHORTS.length})`;
  eps.innerHTML = EPISODES.map((v, i) => plItem(v, i + 1)).join("");
  shorts.innerHTML = SHORTS.map((v, i) => plItem(v, EPISODES.length + i + 1)).join("");
  document.querySelector(".playlist-wrap").addEventListener("click", (e) => {
    const b = e.target.closest("button.playlist-item");
    if (b) playVideo(b.dataset.id, b.dataset.title);
  });
  markActive(EPISODES[0].id);
}

function plItem(v, n) {
  return `<li><button class="playlist-item" data-id="${v.id}" data-title="${esc(v.title)}">
    <span class="pl-num">${n}</span><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg"
    alt="" loading="lazy" decoding="async" width="96" height="54" />
    <span class="pl-title">${esc(v.title)}</span></button></li>`;
}

function playVideo(id, title) {
  const all = [...EPISODES, ...SHORTS];
  const n = all.findIndex((v) => v.id === id) + 1;
  // Embed simple en dominio nocookie (sin muro de consentimiento de cookies).
  $("#ytPlayer").src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`;
  $("#nowPlaying").textContent = `${n} · ${title}`;
  const watch = $("#watchLink");
  if (watch) watch.href = `https://www.youtube.com/watch?v=${id}&list=${PLAYLIST_ID}`;
  markActive(id);
}

function markActive(id) {
  document.querySelectorAll(".playlist-item").forEach((b) => {
    if (b.dataset.id === id) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
}

/* ---------- Cuadrículas y recortes: detalle + favoritos ---------- */
function initGridEvents() {
  for (const grid of [gridFire, gridLeaf]) {
    grid.addEventListener("click", onGridClick);
  }
  for (const strip of [stripFire, stripLeaf]) {
    strip.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action='detail']");
      if (btn) await openModal(Number(btn.dataset.id));
    });
  }
}

async function onGridClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === "fav") {
    const favs = toggleFav(id);
    const isFav = favs.has(id);
    document.querySelectorAll(`button[data-action="fav"][data-id="${id}"]`).forEach((b) => {
      b.setAttribute("aria-pressed", String(isFav));
      if (b.classList.contains("fav-btn")) b.innerHTML = `★ ${isFav ? "Fav" : "Guardar"}`;
    });
    toast(isFav ? `${cap(nameOf(id))} guardado en favoritos ★` : `${cap(nameOf(id))} quitado de favoritos`);
    renderEditions();
  } else if (btn.dataset.action === "detail") {
    await openModal(id);
  }
}

function nameOf(id) {
  return store.find((p) => p.id === id)?.name || String(id);
}

function paintSkeletons() {
  skeletonGrid(gridFire, 6);
  skeletonGrid(gridLeaf, 6);
  stripFire.textContent = "Cargando recortes…";
  stripLeaf.textContent = "Cargando recortes…";
  statusFire.textContent = "Cargando Pokémon desde PokéAPI…";
  statusLeaf.textContent = "Cargando Pokémon desde PokéAPI…";
}

/* Render directo: los 45 exclusivos en sus dos cuadros, sin filtros. */
function renderEditions() {
  if (!store.length) return;
  const favs = getFavs();
  const fire = store.filter((p) => p.edition === "fire").sort((a, b) => a.id - b.id);
  const leaf = store.filter((p) => p.edition === "leaf").sort((a, b) => a.id - b.id);

  gridFire.innerHTML = fire.map((p) => cardHTML(p, favs.has(p.id))).join("");
  gridLeaf.innerHTML = leaf.map((p) => cardHTML(p, favs.has(p.id))).join("");

  const allIds = new Set(store.map((p) => p.id));
  stripFire.innerHTML = stripHTML(fire, allIds);
  stripLeaf.innerHTML = stripHTML(leaf, allIds);

  statusFire.textContent = `${fire.length} de ${FIRE_RED.length} en Rojo Fuego`;
  statusLeaf.textContent = `${leaf.length} de ${LEAF_GREEN.length} en Verde Hoja`;
  renderDexList();
}

/* ---------- Pokédex: lista + ficha completa ---------- */
let selectedDexId = null;
const edMap = new Map(ALL_EXCLUSIVES.map((p) => [p.id, p.edition]));

/* Entrada unificada 1-251: tipos estáticos, edición si es exclusivo. */
function dexEntry(id) {
  const base = store.find((x) => x.id === id);
  const d = (typeof DEX_ALL !== "undefined" && DEX_ALL.find((x) => x.id === id)) || null;
  const slug = (d && d.slug) || (base && (base.slug || base.name)) || String(id);
  return {
    id,
    slug,
    name: slug,
    types: (base && base.types) || (typeof TYPES_ALL !== "undefined" && TYPES_ALL[id]) || [],
    edition: edMap.get(id) || (base && base.edition) || null,
    frlg: base && base.frlg,
  };
}

function initPokedex() {
  $("#dexList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-dex]");
    if (b) selectDex(Number(b.dataset.dex));
  });
  let t;
  $("#dexQ").addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(renderDexList, 200);
  });
  $("#dexGen").addEventListener("change", renderDexList);
}

function dexFiltered() {
  const q = ($("#dexQ").value || "").trim().toLowerCase();
  const gen = $("#dexGen").value;
  return DEX_ALL.filter((d) => {
    if (gen === "kanto" && d.id > 151) return false;
    if (gen === "johto" && d.id < 152) return false;
    if (!q) return true;
    const num = String(d.id) === q.replace(/^0+/, "") || `#${String(d.id).padStart(3, "0")}`.includes(q);
    return num || d.slug.includes(q) || displayName(d.slug).toLowerCase().includes(q);
  }).map((d) => dexEntry(d.id));
}

function renderDexList() {
  const list = dexFiltered();
  $("#dexList").innerHTML = dexListHTML(list, selectedDexId);
  $("#dexCount").textContent = `${list.length} de 251`;
  if (list.length && !list.some((p) => p.id === selectedDexId)) {
    selectDex(list[0].id, { scroll: false });
  }
}

/* Sección de obtención: RankedBoost > encuentros PokeAPI > cadena/especie. */
async function dexLocSection(p, evo) {
  const loc = LOC[p.id];
  if (loc && (loc.w.length || loc.e)) {
    const src = p.id > 151
      ? { url: `https://www.pokemon.com/es/pokedex/${p.slug}`, label: `Pokédex oficial · ${displayName(p.slug)}` }
      : null;
    return locationsHTML(p, src);
  }
  const enc = await fetchDexEncounters(p.id).catch(() => []);
  if (enc.length) return dexWildHTML(enc, p.slug);
  const findParent = (node) => {
    for (const c of (node && node.children) || []) {
      if (c.node.id === p.id) return { name: c.node.name, edge: c.edge };
      const r = findParent(c.node);
      if (r) return r;
    }
    return null;
  };
  const parent = evo ? findParent(evo) : null;
  if (parent) {
    return dexObtainHTML(`Evolución de <strong>${displayName(parent.name)}</strong> (${parent.edge}).`, p.slug);
  }
  try {
    const flags = await fetchSpeciesFlags(p.id);
    if (flags.baby) return dexObtainHTML("Crianza (huevo).", p.slug);
    if (flags.legendary || flags.mythical) {
      return dexObtainHTML("Encuentro especial o evento (no aparece de forma normal en estado salvaje).", p.slug);
    }
  } catch { /* sigue al genérico */ }
  return dexObtainHTML("No aparece salvaje en Rojo Fuego / Verde Hoja · se consigue por intercambio desde otros juegos.", p.slug);
}

async function selectDex(id, opts = {}) {
  selectedDexId = id;
  document.querySelectorAll("#dexList [data-dex]").forEach((b) => {
    const on = Number(b.dataset.dex) === id;
    b.classList.toggle("is-current", on);
    if (on) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
  const detail = $("#dexDetail");
  const p = dexEntry(id);
  detail.innerHTML = dexLoadingHTML(displayName(p.slug));
  try {
    const frlg = p.frlg || (await fetchFrlgMoves(id));
    const slugs = [...frlg.level.map((m) => m.slug), ...frlg.machine, ...frlg.tutor];
    const infos = await Promise.all(slugs.map((s) => fetchMoveDetail(s).catch(() => null)));
    const bySlug = new Map(infos.filter(Boolean).map((i) => [i.slug, i]));
    const moves = {
      level: frlg.level.map((m) => ({ ...m, info: bySlug.get(m.slug) || null })),
      machine: frlg.machine.map((s) => ({ slug: s, info: bySlug.get(s) || null })),
      tutor: frlg.tutor.map((s) => ({ slug: s, info: bySlug.get(s) || null })),
    };
    const evo = await fetchEvoChain(id).catch(() => null);
    detail.innerHTML = dexDetailHTML(p, evo, moves, await dexLocSection(p, evo));
  } catch {
    detail.innerHTML = dexErrorHTML();
  }
  if (opts.scroll !== false) detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------- Modal detalle ---------- */
function initModal() {
  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalBackdrop.hidden) closeModal();
  });
  modalBody.addEventListener("click", (e) => {
    const btn = e.target.closest('button[data-action="fav"]');
    if (!btn) return;
    const favs = toggleFav(Number(btn.dataset.id));
    toast(favs.has(Number(btn.dataset.id)) ? "Guardado en favoritos ★" : "Quitado de favoritos");
    renderEditions();
  });
}

async function openModal(id) {
  lastFocus = document.activeElement;
  modalBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  modalBody.innerHTML = "<p>Cargando detalle…</p>";
  modalClose.focus();
  try {
    let p = store.find((x) => x.id === id);
    if (!p?.stats) {
      const live = await fetchPokemon(id);
      p = { ...p, ...live };
    }
    modalBody.innerHTML = modalHTML(p, p.edition);
  } catch {
    modalBody.innerHTML = `<h2 id="modalName">Error</h2><p>No se pudo cargar el detalle del nº ${id}. Revisa tu conexión e inténtalo de nuevo.</p>`;
  }
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}
