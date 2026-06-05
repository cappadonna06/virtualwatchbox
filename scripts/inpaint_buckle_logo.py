#!/usr/bin/env python3
"""
inpaint_buckle_logo.py — zero-AI-cost, surgical removal of an engraved buckle logo.

Some generated straps inherit the maker's small embossed buckle logo from the reference photo.
This finds ONLY the tiny engraved marks on the metallic buckle and fills them from the
surrounding metal with classical inpainting (cv2.inpaint / Telea) — a light, local touch that
leaves the rest of the buckle untouched. Pure local OpenCV, no API calls, no AI credits.

Detection (within a lower-right ROI so it never touches coloured leather or edge stitching):
  1. buckle metal = bright + low-saturation pixels, eroded to drop the frame edges
  2. engraving   = pixels notably darker than their local metal neighbourhood
  3. keep only SMALL connected components (a logo is small) so structural slots/shadows are spared
  4. dilate a hair, then cv2.inpaint(Telea, radius 3)

Usage:
  python3 scripts/inpaint_buckle_logo.py <img1.png> [img2.png ...]
Exit 0 always; prints one line per file (marks filled or "clean").
"""
import sys
import cv2
import numpy as np


def inpaint_logo(path: str) -> str:
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    if img is None:
        return f"skip (unreadable) {path}"
    h, w = img.shape[:2]

    # ROI: lower-right region where the buckle sits
    x0, x1 = int(w * 0.44), int(w * 0.99)
    y0, y1 = int(h * 0.48), int(h * 0.98)
    roi = img[y0:y1, x0:x1]

    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

    # bright, near-neutral metal (exclude the pure-white background V>252)
    metal = ((V >= 140) & (V <= 252) & (S <= 40)).astype(np.uint8) * 255
    # erode so we work on the interior face, not the bright frame edges
    metal = cv2.erode(metal, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)), iterations=1)

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY).astype(np.float32)
    local_mean = cv2.blur(gray, (21, 21))
    # engraving deviates from its local metal neighbourhood in EITHER direction (an embossed
    # logo has dark grooves AND bright edges), only where there IS metal
    dev = np.abs(gray - local_mean)
    mark = (dev > 9) & (metal > 0)
    mask = (mark.astype(np.uint8)) * 255

    # keep only small blobs (a logo); drop large structural darks (pin slot, deep shadow)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    keep = np.zeros_like(mask)
    total = 0
    for i in range(1, n):
        area = stats[i, cv2.CC_STAT_AREA]
        ww, hh = stats[i, cv2.CC_STAT_WIDTH], stats[i, cv2.CC_STAT_HEIGHT]
        if 4 <= area <= 1500 and ww <= 150 and hh <= 150:
            keep[labels == i] = 255
            total += area
    if total < 6:
        return f"clean    {path}"

    # close gaps within the logo footprint, then dilate so inpaint fully covers it
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    keep = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)), iterations=1)

    full_mask = np.zeros((h, w), np.uint8)
    full_mask[y0:y1, x0:x1] = keep
    out = cv2.inpaint(img, full_mask, 4, cv2.INPAINT_TELEA)

    # The Telea fill can still echo the logo's tonal footprint on reflective metal; blend a light
    # blur into exactly the (feathered) logo footprint to erase any residual, leaving smooth metal.
    soft = cv2.GaussianBlur(out, (0, 0), 2.2)
    alpha = cv2.GaussianBlur(full_mask.astype(np.float32) / 255.0, (0, 0), 2.0)[:, :, None]
    out = (out.astype(np.float32) * (1 - alpha) + soft.astype(np.float32) * alpha).astype(np.uint8)

    cv2.imwrite(path, out)
    return f"filled   {path} ({total}px)"


def main():
    for p in sys.argv[1:]:
        print(inpaint_logo(p))


if __name__ == "__main__":
    main()
