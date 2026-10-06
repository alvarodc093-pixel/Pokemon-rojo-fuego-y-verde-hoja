"""Limpia los recortes: elimina motas de texto desconectadas del sprite principal.
Conserva solo componentes con area >= 1.5% del componente mayor (o >= 300 px)."""
import os
import tempfile
from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image

PROJ = str(Path(__file__).resolve().parent.parent)  # raiz del proyecto (carpeta Pokemon/)
TMP = tempfile.gettempdir()  # hoja de QA: sheet-check.png


def clean_one(path):
    im = Image.open(path).convert("RGB")
    a = np.array(im)
    mask = a.min(axis=2) < 235
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    kept = np.zeros_like(mask, dtype=bool)
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                q, comp = deque([(y, x)]), []
                seen[y, x] = True
                while q:
                    cy, cx = q.popleft()
                    comp.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True
                                q.append((ny, nx))
                if len(comp) >= 300:
                    for (cy, cx) in comp:
                        kept[cy, cx] = True
    # segundo pase: umbral relativo al mayor
    # (re-etiquetar solo lo conservado para medir el mayor)
    seen2 = np.zeros_like(mask, dtype=bool)
    sizes = []
    comp_map = np.zeros((h, w), dtype=np.int32)
    cid = 0
    for y in range(h):
        for x in range(w):
            if kept[y, x] and not seen2[y, x]:
                cid += 1
                q, n = deque([(y, x)]), 0
                seen2[y, x] = True
                while q:
                    cy, cx = q.popleft()
                    comp_map[cy, cx] = cid
                    n += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and kept[ny, nx] and not seen2[ny, nx]:
                                seen2[ny, nx] = True
                                q.append((ny, nx))
                sizes.append(n)
    if not sizes:
        return False
    biggest = max(sizes)
    final = np.zeros_like(mask, dtype=bool)
    for i, s in enumerate(sizes, start=1):
        if s >= max(300, biggest * 0.015):
            final |= comp_map == i
    out = np.full_like(a, 255)
    out[final] = a[final]
    # recorte final ajustado + margen
    ys, xs = np.where(final)
    pad = 6
    im2 = Image.fromarray(out).crop((
        max(int(xs.min()) - pad, 0), max(int(ys.min()) - pad, 0),
        min(int(xs.max()) + 1 + pad, w), min(int(ys.max()) + 1 + pad, h)))
    im2.save(path)
    return True


def main():
    total = 0
    for edition in ("fire", "leaf"):
        d = os.path.join(PROJ, "src", "assets", "cutouts", edition)
        for f in sorted(os.listdir(d)):
            if f.endswith(".png"):
                clean_one(os.path.join(d, f))
                total += 1
    print(f"limpios {total} recortes")
    # mini-hoja de los que tenian restos, para verificar
    checks = [("fire", "054-psyduck.png"), ("fire", "182-bellossom.png"),
              ("leaf", "199-slowking.png"), ("leaf", "215-sneasel.png")]
    thumbs = []
    for ed, f in checks:
        t = Image.open(os.path.join(PROJ, "src", "assets", "cutouts", ed, f))
        thumbs.append(t.copy())
    tw, th = 260, 260
    sheet = Image.new("RGB", (tw * len(thumbs), th), "white")
    for i, t in enumerate(thumbs):
        t.thumbnail((tw - 8, th - 8))
        sheet.paste(t, (i * tw + (tw - t.width) // 2, (th - t.height) // 2))
    sheet.save(os.path.join(TMP, "sheet-check.png"))


if __name__ == "__main__":
    main()
