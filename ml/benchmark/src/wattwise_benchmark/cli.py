from __future__ import annotations

import argparse
import hashlib
import sys
import time
from pathlib import Path

from wattwise_benchmark.config import BenchmarkConfig, data_root
from wattwise_benchmark.execution import run_benchmark
from wattwise_benchmark.pipeline import normalize_all


def _run_id(stage: str) -> str:
    ts = time.strftime("%Y%m%dT%H%M%S", time.gmtime())
    tag = hashlib.sha256(f"{ts}|{stage}".encode()).hexdigest()[:8]
    return f"{stage}-{ts}-{tag}"


def main() -> None:
    parser = argparse.ArgumentParser(prog="wattwise-benchmark")
    sub = parser.add_subparsers(dest="command")

    normalize_cmd = sub.add_parser("normalize", help="ingest and normalize datasets")
    normalize_cmd.add_argument("--force", action="store_true")
    normalize_cmd.add_argument("--completeness", type=float, default=0.90)

    bench_cmd = sub.add_parser("benchmark", help="run the model benchmark")
    bench_cmd.add_argument("--stage", choices=["smoke", "full"], default="smoke")
    bench_cmd.add_argument("--run-id", type=str, default=None)

    args = parser.parse_args()
    root = data_root()
    repo = Path(__file__).resolve().parents[4]
    package = Path(__file__).resolve().parent

    if args.command == "normalize":
        result = normalize_all(
            root,
            package,
            completeness_threshold=args.completeness,
            force=args.force,
        )
        panel = result["combined_panel"]
        print(f"Normalized: {len(panel)} entity-months, {panel['entity_id'].nunique()} entities")
        sys.exit(0)

    if args.command == "benchmark":
        normalize_all(root, package)
        config = BenchmarkConfig(stage=args.stage)
        rid = args.run_id or _run_id(args.stage)
        run_dir = root / "benchmark-runs" / rid
        result = run_benchmark(root, repo, run_dir, config)
        manifest = result["run_manifest"]
        print(f"Run ID: {manifest['run_id']}")
        print(f"Stage: {manifest['stage']}")
        print(f"Predictions: {manifest['total_predictions']}")
        print(f"Successful: {manifest['total_successful']}")
        print(f"Failed: {manifest['total_failed']}")
        print(f"Phase champions: {manifest['phase_champions']}")
        print(f"Top four: {manifest['top_four']}")
        sys.exit(0)

    parser.print_help()
    sys.exit(1)
