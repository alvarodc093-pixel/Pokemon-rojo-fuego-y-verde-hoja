"""Recorta los sprites individuales de la tabla japonesa FRLG.
Mitad superior -> Rojo Fuego (22), mitad inferior -> Verde Hoja (23).
Uso: python crop_exclusives.py
"""
import os
import tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

# Ruta de la tabla japonesa original (mitad sup. = Rojo Fuego, mitad inf. = Verde Hoja)
SRC = r"C:\Users\crazy\OneDrive\Pictures\EUHMUQL3Q5DYVE5XTZMXNEX46I.jpg"
PROJ = str(Path(__file__).resolve().parent.parent)  # raiz del proyecto (carpeta Pokemon/)
TMP = tempfile.gettempdir()  # hojas de QA: sheet-fire.png, sheet-leaf.png, debug-overlay.jpg

FIRE_ORDER = [
    [23, 24, 58, 59, 43, 44, 45],
    [54, 55, 90, 91, 123, 212, 239],
    [125, 194, 195, 198, 211, 225, 227],
    [182],
]
LEAF_ORDER = [
    [27, 28, 37, 38, 79, 80, 199],
    [69, 70, 71, 120, 121, 127, 240],
    [126, 298, 183, 184, 200, 215, 223],
    [224, 226],
]
SLUG = {
    23: "ekans", 24: "arbok", 43: "oddish", 44: "gloom", 45: "vileplume",
    54: "psyduck", 55: "golduck", 58: "growlithe", 59: "arcanine",
    90: "shellder", 91: "cloyster", 123: "scyther", 125: "electabuzz",
    182: "bellossom", 194: "wooper", 195: "quagsire", 198: "murkrow",
    211: "qwilfish", 212: "scizor", 225: "delibird", 227: "skarmory",
    239: "elekid", 27: "sandshrew", 28: "sandslash", 37: "vulpix",
    38: "ninetales", 69: "bellsprout", 70: "weepinbell", 71: "victreebel",
    79: "slowpoke", 80: "slowbro", 120: "staryu", 121: "starmie",
    126: "magmar", 127: "pinsir", 183: "marill", 184: "azumarill",
    199: "slowking", 200: "misdreavus", 215: "sneasel", 223: "remoraid",
    224: "octillery", 226: "mantine", 240: "magby", 298: "azurill",
}

WHITE_T = 220  # por debajo = contenido


def segments(mask_1d, min_len=3):
    """Devuelve intervalos [a,b) donde mask es True, con longitud >= min_len."""
    idx = np.where(mask_1d)[0]
    if len(idx) == 0:
        return []
    out, a, prev = [], idx[0], idx[0]
    for i in idx[1:]:
        if i == prev + 1:
            prev = i
        else:
            if prev - a + 1 >= min_len:
                out.append((a, prev + 1))
            a, prev = i, i
    if prev - a + 1 >= min_len:
        out.append((a, prev + 1))
    return out


def main():
    im = Image.open(SRC).convert("RGB")
    W, H = im.size
    g = np.array(im.convert("L"))
    content = g < WHITE_T

    # 1) divisor negro horizontal
    rowdark = (g < 50).mean(axis=1)
    div = np.where(rowdark > 0.5)[0]
    d0, d1 = int(div.min()), int(div.max())
    print(f"size={W}x{H} divider=[{d0},{d1}]")

    regions = [("fire", 0, d0, FIRE_ORDER), ("leaf", d1, H, LEAF_ORDER)]
    overlay = im.copy()
    dr = ImageDraw.Draw(overlay)
    dr.rectangle([0, d0, W, d1], outline=(0, 255, 0), width=4)

    saved = {}
    for edition, y0, y1, order in regions:
        # 2) gutter: primera columna casi-blanca a altura completa desde x=500
        # (evita el borde vertical del boxart)
        frac = content[y0 + 8:y1 - 8, 500:900].mean(axis=0)
        white_runs = [(a + 500, b + 500) for (a, b) in segments(frac < 0.005)
                      if b - a >= 5]
        print(f"[{edition}] white_runs={white_runs}")
        grid_l = white_runs[0][1] if white_runs else int(W * 0.335)
        print(f"[{edition}] grid_l={grid_l}")
        dr.line([grid_l, y0, grid_l, y1], fill=(255, 0, 255), width=4)

        # 3) bloques horizontales: filas totalmente blancas separan sprite+etiqueta / fila siguiente
        row_has = content[y0:y1, grid_l:].any(axis=1)
        print(f"[{edition}] filas Blancas>=2: "
              f"{[(a + y0, b + y0) for (a, b) in segments(~row_has, min_len=2)]}")
        whites = [(a + y0, b + y0) for (a, b) in segments(~row_has) if b - a >= 2]
        blocks, prev = [], y0
        for (a, b) in whites:
            if a > prev:
                blocks.append((prev, a))
            prev = b
        if prev < y1:
            blocks.append((prev, y1))
        blocks = [(a, b) for (a, b) in blocks if b - a >= 40]
        print(f"[{edition}] blocks={blocks}")
        for (a, b) in blocks:
            dr.rectangle([grid_l, a, W - 1, b], outline=(255, 0, 0), width=3)

        # 4) en cada bloque: el segmento de contenido mas alto = sprites (etiquetas ignoradas)
        outdir = os.path.join(PROJ, "src", "assets", "cutouts", edition)
        os.makedirs(outdir, exist_ok=True)
        thumbs = []
        for r, (ba, bb) in enumerate(blocks):
            sub = content[ba:bb, grid_l:]
            sub_segs = [(a + ba, b + ba) for (a, b) in segments(sub.any(axis=1), min_len=4)]
            if not sub_segs:
                continue
            ra, rb = max(sub_segs, key=lambda s: s[1] - s[0])
            if rb - ra < 40:
                continue
            # columnas dentro de la banda de sprites (huecos >= 3px)
            band = content[ra:rb, grid_l:]
            cgaps = [(a + grid_l, b + grid_l) for (a, b) in segments(~band.any(axis=0))
                     if b - a >= 3]
            cells, prev_end = [], grid_l
            for (a, b) in cgaps:
                if a > prev_end:
                    cells.append((prev_end, a))
                prev_end = b
            if prev_end < W:
                cells.append((prev_end, W))
            cells = [(a, b) for (a, b) in cells if b - a >= 40]
            print(f"[{edition}] bloque {r} y=[{ra},{rb}] celdas={cells}")
            for (ca, cb) in cells:
                dr.line([ca, ra, ca, rb], fill=(0, 120, 255), width=2)
            ci = 0
            for (ca, cb) in cells:
                cell = content[ra:rb, ca:cb]
                if not cell.any():
                    continue
                if ci >= len(order[r]):
                    print(f"[{edition}] AVISO: celda extra en bloque {r}: x=[{ca},{cb}]")
                    continue
                pid = order[r][ci]
                ci += 1
                # recorte ajustado al contenido dentro de la celda
                ys = np.where(cell.any(axis=1))[0]
                xs = np.where(cell.any(axis=0))[0]
                pad = 8
                ya = max(ra + int(ys.min()) - pad, 0)
                yb = min(ra + int(ys.max()) + 1 + pad, H)
                xa = max(ca + int(xs.min()) - pad, 0)
                xb = min(ca + int(xs.max()) + 1 + pad, W)
                crop = im.crop((xa, ya, xb, yb))
                fname = f"{pid:03d}-{SLUG[pid]}.png"
                crop.save(os.path.join(outdir, fname))
                saved.setdefault(edition, []).append(fname)
                thumbs.append(crop.copy())
                dr.rectangle([xa, ya, xb, yb], outline=(0, 200, 0), width=2)
                dr.text((xa + 4, ya + 4), str(pid), fill=(0, 150, 0))
        # hoja de contacto para QA rapido
        if thumbs:
            tw, th = 220, 220
            cols = 7
            rows = (len(thumbs) + cols - 1) // cols
            sheet = Image.new("RGB", (cols * tw, rows * th), "white")
            for i, t in enumerate(thumbs):
                t.thumbnail((tw - 8, th - 8))
                sheet.paste(t, ((i % cols) * tw + (tw - t.width) // 2,
                                (i // cols) * th + (th - t.height) // 2))
            sheet.save(os.path.join(TMP, f"sheet-{edition}.png"))

    overlay.thumbnail((960, 9999))
    overlay.save(os.path.join(TMP, "debug-overlay.jpg"), quality=88)
    for ed, files in saved.items():
        print(f"[{ed}] guardados {len(files)}: {sorted(files)}")


if __name__ == "__main__":
    main()
