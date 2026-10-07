/* UI: render de tarjetas, modal, toast, favoritos y filtros.
   Script clásico: usa los globales de data.js y api.js (ver orden en index.html). */
const FAV_KEY = "frlg:favs:v1";

function getFavs() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function toggleFav(id) {
  const favs = getFavs();
  const key = Number(id);
  if (favs.has(key)) favs.delete(key);
  else favs.add(key);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  } catch { /* file:// u otros contextos sin almacenamiento */ }
  return favs;
}

function cap(name = "") {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function dex(n) {
  return `#${String(n).padStart(3, "0")}`;
}

function typeChips(types = []) {
  return types
    .map((t) => `<span class="type-chip type-${t}">${TYPE_ES[t] || cap(t)}</span>`)
    .join("");
}

function skeletonGrid(ul, n = 6) {
  ul.innerHTML = Array.from({ length: n }, () => `<li class="skeleton" aria-hidden="true"></li>`).join("");
}

function ballInnerHTML() {
  return `<span class="ball-half ball-half--top" aria-hidden="true"></span>
    <span class="ball-half ball-half--bottom" aria-hidden="true"></span>
    <span class="ball-center" aria-hidden="true"><span aria-hidden="true"></span></span>
    <span class="ball-flash" aria-hidden="true"></span>`;
}

function cardHTML(p, isCaught) {
  const img = p.sprite || artworkUrl(p.id);
  const name = cap(p.name || p.slug);
  const caught = !!isCaught;
  return `
    <li>
      <article class="poke-card${caught ? " is-caught" : ""}" data-id="${p.id}">
        <div class="poke-media">
          <img src="${img}" alt="Arte oficial de ${name}" width="80" height="80"
               loading="lazy" decoding="async"
               onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png'" />
          <button class="poke-ball${caught ? " is-caught" : ""}" data-caught="${p.id}"
            aria-pressed="${caught ? "true" : "false"}"
            aria-label="Marcar a ${name} como capturado"
            title="${caught ? "¡Capturado! Toca para liberar" : "Marcar como capturado"}">${ballInnerHTML()}</button>
          ${caught ? `<span class="caught-ribbon">✓ Capturado</span>` : ""}
        </div>
        <div class="poke-body">
          <span class="poke-dex">${dex(p.id)} · ${p.edition === "fire" ? "Rojo Fuego" : "Verde Hoja"}</span>
          <h3 class="poke-name">${name}</h3>
          <div class="poke-types">${typeChips(p.types)}</div>
          <div class="poke-actions">
            <button class="btn btn--dark btn--icon" data-action="detail" data-id="${p.id}" aria-label="Ver detalle de ${name}">Detalle</button>
          </div>
        </div>
      </article>
    </li>`;
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

function modalHTML(p, edition) {
  const img = p.sprite || artworkUrl(p.id);
  const caught = getCaught().has(p.id);
  const stats = (p.stats || [])
    .map(
      (s) => `
      <div class="stat-row">
        <span>${statEs(s.name)}</span>
        <span class="stat-bar"><span style="width:${Math.min(100, s.value / 1.6)}%"></span></span>
        <strong>${s.value}</strong>
      </div>`
    )
    .join("");
  return `
    <div class="modal-top">
      <img src="${img}" alt="Arte oficial de ${cap(p.name)}" width="130" height="130" />
      <div>
        <p class="poke-dex" style="margin:0">${dex(p.id)} · ${edition === "fire" ? "🔥 Rojo Fuego (exclusivo)" : "🍃 Verde Hoja (exclusivo)"}</p>
        <h2 id="modalName" style="margin:2px 0 6px; text-transform:capitalize">${cap(p.name)}</h2>
        <div class="poke-types">${typeChips(p.types)}</div>
      </div>
    </div>
    <dl style="display:flex;gap:16px;flex-wrap:wrap;margin:14px 0 6px">
      <div><dt>Altura</dt><dd style="margin:0;font-weight:800">${p.height ?? "—"} m</dd></div>
      <div><dt>Peso</dt><dd style="margin:0;font-weight:800">${p.weight ?? "—"} kg</dd></div>
      <div><dt>Exp. base</dt><dd style="margin:0;font-weight:800">${p.baseExp ?? "—"}</dd></div>
    </dl>
    <p style="margin:6px 0"><strong>Habilidades:</strong> ${(p.abilities || []).map(cap).join(", ") || "—"}</p>
    ${locationsHTML(p)}
    <h3 style="margin:12px 0 6px">Estadísticas base</h3>
    ${stats || "<p>Sin datos de estadísticas.</p>"}
    <div class="modal-actions">
      <a class="btn btn--dark" target="_blank" rel="noopener" href="https://www.pokemon.com/es/pokedex/${p.name}">Ficha en Pokémon.com</a>
      <button class="btn btn--subtle catch-btn" data-action="caught" data-id="${p.id}"
        aria-pressed="${caught ? "true" : "false"}"><span class="mini-ball" aria-hidden="true"></span>${caught ? "¡Capturado! ✓" : "Marcar capturado"}</button>
    </div>`;
}

/* Recorte local de la tabla japonesa aportada por el usuario.
   Mitad superior -> fire (22), mitad inferior -> leaf (23). */
function cutoutUrl(edition, id, slug) {
  return `src/assets/cutouts/${edition}/${String(id).padStart(3, "0")}-${slug}.png`;
}

/* Tira de recortes para la cabecera de cada panel. activeIds = visibles según filtros. */
function stripHTML(list, activeIds) {
  return list
    .map((p) => {
      const dim = activeIds.has(p.id) ? "" : " is-dim";
      const label = `${cap(p.name || p.slug)} ${dex(p.id)}`;
      return `<button class="cutout-btn${dim}" data-action="detail" data-id="${p.id}"
        aria-label="Ver ficha de ${label}" title="${label}">
        <img src="${cutoutUrl(p.edition, p.id, p.slug)}" alt="${label}, recorte de la guía"
             width="54" height="54" loading="lazy" decoding="async"
             onerror="this.onerror=null;this.src='${artworkUrl(p.id)}'" />
      </button>`;
    })
    .join("");
}

/* Nombre para mostrar (casos especiales: Nidoran, Farfetch'd...). */
function displayName(slug = "") {
  if (!slug) return "";
  return NAME_FIX[slug] || cap(slug);
}

/* ---------- Pokédex: lista + ficha completa ---------- */

/* Capturados (tracker del usuario, persistente en este navegador). */
const CAUGHT_KEY = "frlg:caught:v1";

function getCaught() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CAUGHT_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function toggleCaught(id) {
  const caught = getCaught();
  const key = Number(id);
  if (caught.has(key)) caught.delete(key);
  else caught.add(key);
  try {
    localStorage.setItem(CAUGHT_KEY, JSON.stringify([...caught]));
  } catch { /* file:// u otros contextos sin almacenamiento */ }
  return caught;
}

/* Lista estilo pokemon.com: arte oficial grande, nº, nombre, tipos y edición. */
function dexListHTML(list, selectedId, caught) {
  const done = caught || new Set();
  return list
    .map((p) => {
      const cur = p.id === selectedId;
      const got = done.has(p.id);
      const ed = p.edition === "fire" ? "🔥" : p.edition === "leaf" ? "🍃" : "";
      const name = displayName(p.slug);
      return `<li class="dex-cell${got ? " is-caught" : ""}"><button class="dex-card${cur ? " is-current" : ""}" data-dex="${p.id}"
        ${cur ? 'aria-current="true"' : ""} aria-label="Ver ficha de ${name}${got ? " (capturado)" : ""}">
        <img src="${artworkUrl(p.id)}" alt="" loading="lazy" decoding="async" width="88" height="88" />
        <span class="dex-card-num">${dex(p.id)}</span>
        <span class="dex-card-name">${name}${ed ? ` <span class="dex-item-ed">${ed}</span>` : ""}</span>
        <span class="dex-card-types">${typeChips(p.types)}</span>
      </button><button class="dex-ball${got ? " is-caught" : ""}" data-caught="${p.id}" aria-pressed="${got ? "true" : "false"}"
        aria-label="Marcar a ${name} como capturado" title="${got ? "¡Capturado! Toca para liberar" : "Marcar como capturado"}">${ballInnerHTML()}</button></li>`;
    })
    .join("");
}

function dexLoadingHTML(name) {
  return `<p>Cargando la ficha de <strong>${name}</strong>…</p><div class="skeleton" aria-hidden="true"></div>`;
}

function dexErrorHTML() {
  return `<h3>Sin conexión</h3><p>No se pudo cargar esta ficha (evoluciones y ataques necesitan internet para consultar PokéAPI). Revisa tu conexión y vuelve a tocar el Pokémon.</p>`;
}

/* Ficha completa: imagen, tipos, ubicación+%, evoluciones y ataques. */
function dexDetailHTML(p, evoTree, moves, locSection) {
  const region = p.id <= 151 ? "Kanto" : "Johto";
  const edLabel = p.edition === "fire" ? "🔥 Rojo Fuego (exclusivo)"
    : p.edition === "leaf" ? "🍃 Verde Hoja (exclusivo)" : region;
  return `
    <header class="dex-head">
      <img src="${artworkUrl(p.id)}" alt="Arte oficial de ${displayName(p.slug)}" width="140" height="140" />
      <div>
        <p class="poke-dex" style="margin:0">${dex(p.id)} · ${edLabel}</p>
        <h3 class="dex-name">${displayName(p.slug)}</h3>
        <div class="poke-types">${typeChips(p.types)}</div>
      </div>
    </header>
    ${locSection}
    <h3 class="dex-sub">Evoluciones</h3>
    ${evoTree ? evoChainHTML(evoTree, p.id) : `<p>Sin datos de evolución.</p>`}
    <h3 class="dex-sub">Ataques por nivel</h3>
    ${movesLevelHTML(moves.level)}
    <h3 class="dex-sub">Por MT / MO</h3>
    ${movesMachineHTML(moves.machine)}
    ${moves.tutor && moves.tutor.length ? `<h3 class="dex-sub">Por tutor</h3>${movesTutorHTML(moves.tutor)}` : ""}`;
}

function evoChainHTML(tree, currentId) {
  return `<div class="evo-tree" role="list" aria-label="Cadena evolutiva">${evoNodeHTML(tree, currentId)}</div>`;
}

function evoNodeHTML(node, currentId) {
  const cur = node.id === currentId ? ' aria-current="true"' : "";
  let h = `<div class="evo-node"${cur} role="listitem">
      <img src="${artworkUrl(node.id)}" alt="" loading="lazy" decoding="async" width="72" height="72" />
      <span class="evo-num">${dex(node.id)}</span>
      <span class="evo-name">${displayName(node.name)}</span>
    </div>`;
  if (node.children && node.children.length) {
    h += `<div class="evo-branches">` + node.children.map((c) =>
      `<div class="evo-branch"><span class="evo-edge">${c.edge}</span>${evoNodeHTML(c.node, currentId)}</div>`
    ).join("") + `</div>`;
  }
  return h;
}

function moveCells(info) {
  if (!info) return `<td>—</td><td>—</td><td>—</td>`;
  const type = info.type ? typeChips([info.type]) : "—";
  const pow = info.power == null ? "—" : info.power;
  const acc = info.accuracy == null ? "—" : info.accuracy;
  return `<td>${type}</td><td>${pow}</td><td>${acc}</td>`;
}

function movesLevelHTML(items) {
  if (!items || !items.length) return `<p>Sin datos de movimientos por nivel.</p>`;
  return `<div class="table-wrap"><table class="moves-table">
    <caption class="sr-only">Ataques que aprende por nivel</caption>
    <thead><tr><th scope="col">Nv</th><th scope="col">Movimiento</th><th scope="col">Tipo</th><th scope="col">Pot.</th><th scope="col">Prec.</th></tr></thead>
    <tbody>${items.map((m) =>
      `<tr><td><strong>${m.level}</strong></td><td>${m.info ? m.info.nameEs : m.slug}</td>${moveCells(m.info)}</tr>`
    ).join("")}</tbody></table></div>`;
}

function movesMachineHTML(items) {
  if (!items || !items.length) return `<p>No aprende ninguna MT/MO.</p>`;
  return `<div class="table-wrap"><table class="moves-table">
    <caption class="sr-only">Ataques por MT o MO</caption>
    <thead><tr><th scope="col">MT/MO</th><th scope="col">Movimiento</th><th scope="col">Tipo</th><th scope="col">Pot.</th><th scope="col">Prec.</th></tr></thead>
    <tbody>${items.map((m) =>
      `<tr><td><span class="mt-badge">${m.info && m.info.mt ? m.info.mt : "MT"}</span></td><td>${m.info ? m.info.nameEs : m.slug}</td>${moveCells(m.info)}</tr>`
    ).join("")}</tbody></table></div>`;
}

function movesTutorHTML(items) {
  return `<ul class="tutor-list">${items.map((m) =>
    `<li>${m.info ? m.info.nameEs : m.slug}</li>`).join("")}</ul>`;
}

/* Dónde capturarlo según RankedBoost FRLG, con enlace a su ficha.
   src opcional {url, label} para orígenes distintos (p. ej. legendarios). */
function locationsHTML(p, src) {
  const loc = LOC[p.id];
  const slug = p.slug || p.name || "";
  const name = displayName(slug);
  const link = src || {
    url: `https://rankedboost.com/pokemon/${slug}/firered-leafgreen/`,
    label: `RankedBoost · ficha de ${name} en FRLG`,
  };
  let inner = "";
  if (loc?.w?.length) {
    inner += `<ul class="loc-list">${loc.w
      .map(([area, method, levels, rate]) => {
        const bits = [`<strong>${area}</strong>`];
        if (method) bits.push(method);
        if (levels) bits.push(levels);
        return `<li>${bits.join(" · ")}${rate ? ` <span class="loc-rate" title="Probabilidad de aparición">${rate}</span>` : ""}</li>`;
      }).join("")}</ul>`;
  }
  if (loc?.e) {
    inner += loc.e[0]
      ? `<p class="loc-evo">Evolución de <strong>${displayName(loc.e[0])}</strong> (${loc.e[1]}).</p>`
      : `<p class="loc-evo">${loc.e[1]}.</p>`;
  }
  if (!inner) inner = `<p>Sin datos de captura. Consulta su ficha completa.</p>`;
  return `<h3 style="margin:12px 0 6px">Dónde capturarlo 📍</h3>${inner}
    <p class="loc-source">Fuente: <a href="${link.url}" target="_blank" rel="noopener">${link.label}</a></p>`;
}

/* Ubicaciones salvajes fuera de RankedBoost (encuentros de PokéAPI). */
function dexSourceHTML(slug) {
  return `<p class="loc-source">Fuente: <a href="https://www.pokemon.com/es/pokedex/${slug}" target="_blank" rel="noopener">Pokédex oficial</a> · Encuentros: PokéAPI</p>`;
}

function dexWildHTML(areas, slug) {
  const items = areas.map((a) => {
    const ed = a.eds.length === 1 ? (a.eds[0] === "fire" ? " 🔥" : " 🍃") : "";
    return `<li><strong>${a.area}</strong> · ${a.method} · ${a.levels} <span class="loc-rate" title="Probabilidad de aparición">${a.rate}</span>${ed}</li>`;
  }).join("");
  return `<h3 style="margin:12px 0 6px">Dónde capturarlo 📍</h3><ul class="loc-list">${items}</ul>${dexSourceHTML(slug)}`;
}

function dexObtainHTML(text, slug) {
  return `<h3 style="margin:12px 0 6px">Cómo conseguirlo 📍</h3><p>${text}</p>${dexSourceHTML(slug)}`;
}

function statEs(s) {
  return (
    {
      hp: "PS",
      attack: "Ataque",
      defense: "Defensa",
      "special-attack": "At. Esp.",
      "special-defense": "Def. Esp.",
      speed: "Velocidad",
    }[s] || s
  );
}
