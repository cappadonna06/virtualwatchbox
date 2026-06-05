#!/usr/bin/env python3
"""
recenter_strap.py — robust, zero-AI-cost centering for white-background strap masters.

Trim-by-threshold can be fooled by a faint corner smudge (it inflates the bounding box and
shoves the strap off-centre). This instead finds the strap by connected components: it unions
the bounding boxes of all LARGE dark components (both halves of a two-piece strap), ignoring
small specks (smudges), then crops to that union and re-centres on a clean 1000x1200 white
canvas. Idempotent on already-centred images.

Usage: python3 scripts/recenter_strap.py <img.png ...>
"""
import sys
import cv2
import numpy as np

OUT_W, OUT_H = 1000, 1200
CONTENT_W, CONTENT_H = 900, 1080
MIN_AREA = 1500  # components smaller than this are smudges/specks, not strap


def recenter(path: str) -> str:
    img = cv2.imread(path, cv2.IMREAD_COLOR)  # white-bg RGB (alpha flattened)
    if img is None:
        return f"skip (unreadable) {path}"
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # non-white = the strap (everything darker than near-white)
    mask = ((255 - gray.astype(np.int16)) > 25).astype(np.uint8)
    n, _labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)

    boxes = [stats[i] for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] >= MIN_AREA]
    if not boxes:
        return f"skip (no strap) {path}"
    x0 = min(b[cv2.CC_STAT_LEFT] for b in boxes)
    y0 = min(b[cv2.CC_STAT_TOP] for b in boxes)
    x1 = max(b[cv2.CC_STAT_LEFT] + b[cv2.CC_STAT_WIDTH] for b in boxes)
    y1 = max(b[cv2.CC_STAT_TOP] + b[cv2.CC_STAT_HEIGHT] for b in boxes)

    crop = img[y0:y1, x0:x1]
    cw, ch = x1 - x0, y1 - y0
    scale = min(CONTENT_W / cw, CONTENT_H / ch)
    nw, nh = max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))
    resized = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)

    canvas = np.full((OUT_H, OUT_W, 3), 255, np.uint8)
    left, top = (OUT_W - nw) // 2, (OUT_H - nh) // 2
    canvas[top:top + nh, left:left + nw] = resized
    cv2.imwrite(path, canvas)
    return f"recentred {path}"


def main():
    for p in sys.argv[1:]:
        print(recenter(p))


if __name__ == "__main__":
    main()
