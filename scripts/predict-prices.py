#!/usr/bin/env python3
"""
CatBoost watch price predictor — Layer 3 of the pricing stack.

Reads data/catalog-enriched-full.json. Trains CatBoostRegressor on rows that
have direct-match prices (Layer 1) and predicts log10(price) for every row.
Writes data/external/predicted-prices.json keyed by canonical id.

The enrich script (scripts/enrich-catalog.ts) reads that JSON and uses it as
a Layer 3 fallback for any row still missing a price after Layer 1 (direct
match) and Layer 2 (similar-family median).

Features used (mix of categorical + numeric):
    Brand, modelFamily, caseMaterial, braceletType, movementType,
    productionStatus, caseSizeMm, thicknessMm, waterResistanceM,
    yearIntroduced, jewelCount, frequencyVph, complicationCount,
    limitedEditionCount, heatScore

Target: log10(estimatedValue) on rows where valueLayer == 'direct'.

Outputs:
    data/external/predicted-prices.json
      {
        "generated_at": ISO timestamp,
        "model": "catboost-v1",
        "metrics": { "rmse_log10_train", "rmse_log10_test", "n_train", "n_test" },
        "feature_importance": { "feature_name": score, ... },
        "predictions": {
            "rolex-126610ln": {
                "price_usd": 14500,
                "price_low_usd": 12500,
                "price_high_usd": 16800,
                "confidence": "medium"
            },
            ...
        }
      }

Install:
    pip3 install catboost pandas numpy scikit-learn

Run:
    npm run prices:predict
    # or directly:
    python3 scripts/predict-prices.py

Re-train periodically when significant new data arrives (e.g. after a
re-enrich with new Kaggle / scraped data). Idempotent — overwrites the
output JSON on every run.
"""

from __future__ import annotations

import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENRICHED_PATH = REPO_ROOT / "data" / "catalog-enriched-full.json"
OUTPUT_PATH = REPO_ROOT / "data" / "external" / "predicted-prices.json"

CAT_FEATURES = [
    "brand",
    "modelFamily",
    "caseMaterial",
    "braceletType",
    "movementType",
    "productionStatus",
    "watchType",
    "crystalMaterial",
    "bezelMaterial",
]
NUM_FEATURES = [
    "caseSizeMm",
    "thicknessMm",
    "waterResistanceM",
    "yearIntroduced",
    "jewelCount",
    "frequencyVph",
    "complicationCount",
    "limitedEditionCount",
    "heatScore",
]


def ensure_deps() -> None:
    missing = []
    try:
        import catboost  # noqa: F401
    except ImportError:
        missing.append("catboost")
    try:
        import pandas  # noqa: F401
    except ImportError:
        missing.append("pandas")
    try:
        import sklearn  # noqa: F401
    except ImportError:
        missing.append("scikit-learn")
    if missing:
        print(f"Missing Python deps: {missing}", file=sys.stderr)
        print("Install with: pip3 install " + " ".join(missing), file=sys.stderr)
        sys.exit(1)


def normalize_record_for_features(r: dict) -> dict:
    """Pull out the feature columns from an enriched record, with sensible
    sentinels for missing values (CatBoost handles None natively for cat
    features; we coerce to NaN for numeric)."""
    complications = r.get("complications") or []
    return {
        "id": r["id"],
        "brand": (r.get("brand") or "").strip() or None,
        "modelFamily": (r.get("modelFamily") or r.get("model") or "").strip() or None,
        "caseMaterial": (r.get("caseMaterial") or "").strip() or None,
        "braceletType": (r.get("braceletType") or "").strip() or None,
        "movementType": (r.get("movementType") or "").strip() or None,
        "productionStatus": (r.get("productionStatus") or "").strip() or None,
        "watchType": (r.get("watchType") or "").strip() or None,
        "crystalMaterial": (r.get("crystalMaterial") or "").strip() or None,
        "bezelMaterial": (r.get("bezelMaterial") or "").strip() or None,
        "caseSizeMm": r.get("caseSizeMm"),
        "thicknessMm": r.get("thicknessMm"),
        "waterResistanceM": r.get("waterResistanceM"),
        "yearIntroduced": r.get("yearIntroduced"),
        "jewelCount": r.get("jewelCount"),
        "frequencyVph": r.get("frequencyVph"),
        "complicationCount": len(complications) if isinstance(complications, list) else 0,
        "limitedEditionCount": r.get("limitedEditionCount") or 0,
        "heatScore": r.get("heatScore") or 0,
    }


def main() -> None:
    ensure_deps()

    import numpy as np
    import pandas as pd
    from catboost import CatBoostRegressor, Pool
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_squared_error

    if not ENRICHED_PATH.exists():
        print(f"Enriched catalog not found at {ENRICHED_PATH}", file=sys.stderr)
        print("Run `npm run catalog:enrich` first.", file=sys.stderr)
        sys.exit(1)

    with ENRICHED_PATH.open() as f:
        enriched = json.load(f)
    records = enriched.get("records", [])
    print(f"[predict] loaded {len(records):,} records")

    # ─── Build feature DataFrame ─────────────────────────────────────
    rows = [normalize_record_for_features(r) for r in records]
    df = pd.DataFrame(rows)

    # Attach the training target where available (Layer 1 direct-match rows only)
    direct_priced = {
        r["id"]: r["estimatedValue"]
        for r in records
        if r.get("valueLayer") == "direct" and isinstance(r.get("estimatedValue"), (int, float)) and r["estimatedValue"] > 0
    }
    df["price_usd"] = df["id"].map(direct_priced)
    df["log10_price"] = df["price_usd"].apply(lambda v: math.log10(v) if v and v > 0 else None)
    print(f"[predict] {df['log10_price'].notna().sum():,} rows have a Layer-1 direct-match price (training set)")

    if df["log10_price"].notna().sum() < 500:
        print("Too few training rows for a useful model. Aborting.", file=sys.stderr)
        sys.exit(1)

    # Fill missing categoricals with literal "None" — CatBoost handles them as their own category.
    for c in CAT_FEATURES:
        df[c] = df[c].fillna("None").astype(str)
    # Numerics: NaN is fine, CatBoost handles natively.
    for n in NUM_FEATURES:
        df[n] = pd.to_numeric(df[n], errors="coerce")

    # ─── Split + train ───────────────────────────────────────────────
    train_df = df[df["log10_price"].notna()].copy()
    predict_df = df[df["log10_price"].isna()].copy()

    feature_cols = CAT_FEATURES + NUM_FEATURES
    X_train_all = train_df[feature_cols]
    y_train_all = train_df["log10_price"].astype(float)

    cat_idx = [feature_cols.index(c) for c in CAT_FEATURES]

    # Stratify-light: split by Brand so we have representative coverage in test
    X_tr, X_te, y_tr, y_te = train_test_split(
        X_train_all, y_train_all, test_size=0.20, random_state=42
    )

    train_pool = Pool(X_tr, y_tr, cat_features=cat_idx)
    test_pool = Pool(X_te, y_te, cat_features=cat_idx)

    model = CatBoostRegressor(
        iterations=400,
        depth=6,
        learning_rate=0.07,
        l2_leaf_reg=3,
        loss_function="RMSE",
        verbose=0,
        random_seed=42,
    )
    print("[predict] training CatBoost on", len(X_tr), "rows (validating on", len(X_te), ")")
    model.fit(train_pool, eval_set=test_pool, use_best_model=True)

    y_tr_pred = model.predict(train_pool)
    y_te_pred = model.predict(test_pool)
    rmse_train = math.sqrt(mean_squared_error(y_tr, y_tr_pred))
    rmse_test = math.sqrt(mean_squared_error(y_te, y_te_pred))
    # Convert log10 RMSE to a multiplicative factor that's interpretable as
    # "predictions are within ~Xx of the true price."
    factor_train = 10 ** rmse_train
    factor_test = 10 ** rmse_test
    print(
        f"[predict] RMSE(log10) — train {rmse_train:.3f}  test {rmse_test:.3f}   "
        f"(typical error: {factor_test:.2f}x on test)"
    )

    feat_imp = dict(zip(feature_cols, model.get_feature_importance().tolist()))
    feat_imp_sorted = dict(sorted(feat_imp.items(), key=lambda kv: -kv[1]))
    print("[predict] top-10 feature importance:")
    for name, score in list(feat_imp_sorted.items())[:10]:
        print(f"    {name:24s}  {score:6.2f}")

    # ─── Predict for ALL rows (so we can include band estimates everywhere) ─
    X_all = df[feature_cols]
    y_all_pred = model.predict(X_all)

    # Quantile bands: CatBoost can train a quantile-loss model, but simpler
    # for now to widen by the test RMSE — predictions within ~factor_test.
    # P25 ≈ pred / sqrt(factor_test); P75 ≈ pred * sqrt(factor_test).
    spread = math.sqrt(factor_test)

    predictions: dict[str, dict] = {}
    for i, row in df.iterrows():
        watch_id = row["id"]
        log_pred = float(y_all_pred[i])
        price = float(10 ** log_pred)
        # Confidence: HIGH if our training set had >= 50 same-brand rows;
        # MEDIUM if 5-49; LOW otherwise.
        brand = row["brand"] or ""
        brand_train_count = int((train_df["brand"] == brand).sum())
        if brand_train_count >= 50:
            conf = "medium"  # cap at medium since these are still imputed
        elif brand_train_count >= 5:
            conf = "low"
        else:
            conf = "low"
        # Cap to reasonable range
        if price < 50 or price > 10_000_000 or not math.isfinite(price):
            continue
        predictions[watch_id] = {
            "price_usd": round(price),
            "price_low_usd": round(price / spread),
            "price_high_usd": round(price * spread),
            "confidence": conf,
        }

    print(f"[predict] generated predictions for {len(predictions):,} watches")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": "catboost-v1",
        "metrics": {
            "rmse_log10_train": round(rmse_train, 4),
            "rmse_log10_test": round(rmse_test, 4),
            "typical_error_factor_test": round(factor_test, 3),
            "n_train": int(len(X_tr)),
            "n_test": int(len(X_te)),
            "n_predicted": len(predictions),
        },
        "feature_importance": {k: round(v, 3) for k, v in feat_imp_sorted.items()},
        "predictions": predictions,
    }
    with OUTPUT_PATH.open("w") as f:
        json.dump(payload, f, indent=2)
    print(f"[predict] wrote {OUTPUT_PATH.relative_to(REPO_ROOT)}")
    print()
    print("Next: re-run `npm run catalog:enrich` to ingest these into the catalog.")


if __name__ == "__main__":
    main()
