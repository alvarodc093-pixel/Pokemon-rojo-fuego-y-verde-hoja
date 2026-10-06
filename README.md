# Pokémon Rojo Fuego y Verde Hoja — Guía de ediciones (Switch 2)

Guía web en español de las ediciones **Rojo Fuego** y **Verde Hoja** para Switch 2:
qué Pokémon son **exclusivos de cada edición**, con datos en vivo,
guía en vídeo y recursos oficiales. Sin frameworks, sin build: HTML + CSS + JS modular.

## Portada pedida

- **Pokébola** construida con CSS (con animación de flotación) en la parte superior.
- **Logotipo de Pokémon** debajo (SVG oficial de Wikimedia con fallback en texto si falla la red).
- **Página dividida en dos colores**: mitad izquierda rojo fuego (`#d9261c → #7a0e08`)
  y mitad derecha verde hoja (`#189a46 → #0b5a28`), con divisor central “VS”.
- **Cabecera de cada mitad con su logo de juego**: insignia degradada
  `ROJO FUEGO 🔥 Charizard` / `VERDE HOJA 🍃 Venusaur`.
- **En cada lado, imágenes medianas/pequeñas de sus exclusivos**: cuadrículas de
  22 (Rojo) + 23 (Verde) con arte oficial servido por PokéAPI Sprites.

## Estructura del proyecto

```text
Pokemon/
├── index.html              # Estructura semántica + SEO + a11y
├── README.md
├── tools/                  # Scripts de recorte (solo regenerar sprites)
│   ├── crop_exclusives.py  # Recorta los 45 sprites de la tabla japonesa
│   └── clean_cutouts.py    # Limpia restos de texto de los recortes
└── src/
    ├── assets/
    │   └── cutouts/
    │       ├── fire/       # 22 recortes (mitad superior de tu imagen)
    │       └── leaf/       # 23 recortes (mitad inferior de tu imagen)
    ├── styles/
    │   └── main.css        # Sistema de diseño (variables, split, cards, responsive)
    └── js/
        ├── data.js         # Exclusivos, tipos, ubicaciones, DEX 1-251 y tipos
        ├── playlist.js     # 36 capítulos + 50 shorts de la guía en vídeo
        ├── api.js          # PokéAPI: datos vivos, evoluciones, movimientos, encuentros
        ├── ui.js           # Tarjetas, recortes, Pokédex, modal, toast, favoritos
        └── app.js          # Pestañas, ediciones, Pokédex, modal, reproductor y nav
```

La página funciona por **pestañas independientes** (sin scroll infinito):
Pokédex · Ediciones · Mapa · Guía en vídeo · Recursos. La portada
(pokébola + logo + split rojo/verde) siempre queda visible arriba.
Para añadir una pestaña nueva: crea la sección
`tabpanel` en `index.html`, su botón `tab` y añade su nombre al array
`TABS` de `src/js/app.js`.

La **Pokédex** cubre Kanto + Johto (1–251) con estética tipo pokemon.com:
imagen oficial, buscador y filtro por región; al elegir uno, ficha con
ubicación y probabilidad (`LOC` de RankedBoost para Kanto, encuentros de
PokéAPI para Johto), cadena evolutiva con niveles/métodos y ataques por
nivel, MT/MO y tutor (nombres en español vía PokéAPI, con caché en memoria).

Cada archivo tiene una responsabilidad única. Para añadir una funcionalidad nueva,
crea un módulo en `src/js/` e impórtalo desde `app.js`.

## Recortes de tu imagen (cabeceras)

La tabla japonesa (`EUHMUQL3Q5DYVE5XTZMXNEX46I.jpg`) se dividió sprite a sprite,
sin usar la imagen entera:

- **Mitad superior (Charizard) → `src/assets/cutouts/fire/`**: Ekans, Arbok,
  Growlithe, Arcanine, Oddish, Gloom, Vileplume, Psyduck, Golduck, Shellder,
  Cloyster, Scyther, Scizor, Elekid, Electabuzz, Wooper, Quagsire, Murkrow,
  Qwilfish, Delibird, Skarmory y Bellossom (22).
- **Mitad inferior (Venusaur) → `src/assets/cutouts/leaf/`**: Sandshrew,
  Sandslash, Vulpix, Ninetales, Slowpoke, Slowbro, Slowking, Bellsprout,
  Weepinbell, Victreebel, Staryu, Starmie, Pinsir, Magby, Magmar, Azurill,
  Marill, Azumarill, Misdreavus, Sneasel, Remoraid, Octillery y Mantine (23).

Cada cabecera muestra su tira de recortes; tocar un recorte abre su ficha
y los recortes se atenúan cuando no pasan el filtro activo. Si un recorte
faltara, la web usa automáticamente el arte de PokéAPI.

**Regenerar** (requiere Python + Pillow + numpy):

```powershell
python tools/crop_exclusives.py   # recorta (ajusta SRC si mueves la imagen)
python tools/clean_cutouts.py     # limpia restos de texto
```

## De dónde salen los datos

- Lista de exclusivos verificada con guías de lanzamiento Switch/Switch 2 (feb 2026)
  y con [RankedBoost FRLG](https://rankedboost.com/pokemon/hypno/firered-leafgreen/#locations).
- **Rojo Fuego (22):** Ekans, Arbok, Oddish, Gloom, Vileplume, Psyduck, Golduck,
  Growlithe, Arcanine, Shellder, Cloyster, Scyther, Electabuzz, Bellossom, Wooper,
  Quagsire, Murkrow, Qwilfish, Scizor, Delibird, Skarmory, Elekid.
- **Verde Hoja (23):** Sandshrew, Sandslash, Vulpix, Ninetales, Bellsprout,
  Weepinbell, Victreebel, Slowpoke, Slowbro, Staryu, Starmie, Magmar, Pinsir,
  Marill, Azumarill, Slowking, Misdreavus, Sneasel, Remoraid, Octillery, Mantine,
  Magby, Azurill.
- **Deoxys** es exclusivo de forma (Ataque en Rojo / Defensa en Verde, Isla Origen)
  y se documenta en la nota informativa: PokéAPI lo sirve como un único nº 386.
- Sprites, tipos y stats en vivo desde [PokéAPI](https://pokeapi.co) con
  fallback a datos locales si no hay conexión.
- **Ubicaciones de captura** (`LOC` en `src/js/data.js`) extraídas de la
  [Pokédex FRLG de RankedBoost](https://rankedboost.com/pokemon/pokedex/firered-leafgreen/):
  zona, método, niveles y **porcentaje de aparición** en español. Cada ficha de detalle muestra dónde
  capturarlo (o de quién evoluciona) con enlace a su ficha en RankedBoost.

## Instalación y ejecución

No hay dependencias ni build, y funciona abriendo el archivo directamente
(scripts clásicos, compatibles con `file://`).

**Opción 1 — doble clic (la más fácil):**
abre `index.html` con tu navegador (Chrome, Edge o Firefox). Solo necesitas
conexión a internet (datos de PokéAPI, mapa, vídeos e imágenes).

**Opción 2 — servidor local (recomendado para desarrollar):**

```powershell
# PowerShell, desde la carpeta Pokemon/
python -m http.server 5500
# abre http://localhost:5500
```

o con Node:

```powershell
npx serve .
```

## Cómo modificar la web

| Quiero… | Toco… |
|---|---|
| Cambiar colores, radios, sombras, responsive | `src/styles/main.css` (`:root` y breakpoints 640/1024) |
| Corregir/añadir un exclusivo | `src/js/data.js` (arrays `FIRE_RED` / `LEAF_GREEN`) |
| Cambiar cómo se pide a la API | `src/js/api.js` (`fetchPokemon`, `loadAll`) |
| Cambiar tarjetas, modal o favoritos | `src/js/ui.js` |
| Añadir secciones | `index.html` + `src/js/app.js` |
| Cambiar vídeos/guías | `src/js/playlist.js` (listas `EPISODES`/`SHORTS`) |
| Cambiar el mapa | `index.html` (iframe `#frlgMap`, pestaña Mapa) |
| Cambiar pestañas | `index.html` (tablist + panel) y `TABS` en `src/js/app.js` |
| Favoritos del usuario | `localStorage` clave `frlg:favs:v1` |

## Funcionalidad real (nada es decorativo)

- Pestañas Pokédex / Ediciones / Mapa / Guía / Recursos con teclado
  (flechas, inicio, fin), enlace profundo (`#mapa`, `#guia`…) y sin scroll infinito.
- **Pokédex**: cuadrícula de los 251 con imagen, buscador y filtro
  Kanto/Johto; al elegir uno, ficha con ubicación y %, evoluciones
  (nivel/método) y ataques por nivel, MT/MO y tutor.
- **Mapa**: FRLG Map de RankedBoost incrustado en la pestaña Mapa (con enlace
  alternativo si no carga).
- **Guía en vídeo**: reproductor de YouTube incrustado + lista lateral de
  36 capítulos y 50 shorts; elegir un vídeo lo carga en el reproductor.
- **Ediciones**: los 45 exclusivos en sus dos cuadros (22 🔥 + 23 🍃) con
  esqueletos de carga y estado de error con datos locales si falla PokéAPI.
- Tarjetas con detalle (modal accesible: ESC, clic fuera, foco) con ubicación
  y porcentaje de captura, stats, tipos, altura, peso y habilidades;
  favoritos persistentes ★.
- Navegación móvil funcional, scroll suave, volver arriba, todos los enlaces
  externos verificados.

## Accesibilidad, SEO y rendimiento

- HTML semántico, skip-link, labels, `alt` descriptivos, foco visible, teclado
  completo, contraste AA en textos, `aria-live` en resultados y toasts.
- `<title>`, meta description, Open Graph, headings ordenados, URLs por ancla.
- Imágenes `lazy` + `async` (salvo logo hero), `preconnect` a las APIs, sin
  frameworks; los iframes (mapa, YouTube) cargan en diferido (`loading="lazy"`).
