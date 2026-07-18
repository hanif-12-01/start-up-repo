from __future__ import annotations

import argparse
import hashlib
import sys
import time
from pathlib import Path

from wattwise_benchmark.config import BenchmarkConfig, data_root
from wattwise_benchmark.execution import run_benchmark
from wattwise_benchmark.pipeline import normalize_all
from wattwise_benchmark.recovery import recover_inference
from wattwise_benchmark.reporting import refresh_recovered_reports, regenerate_reports


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

    report_cmd = sub.add_parser(
        "report", help="regenerate corrected reports from an immutable benchmark run"
    )
    report_cmd.add_argument("--source-run-id", required=True)
    report_cmd.add_argument("--report-id", required=True)

    recover_cmd = sub.add_parser(
        "recover-inference",
        help="rebuild benchmark predictions from verified existing artifacts without training",
    )
    recover_cmd.add_argument("--artifact-root", type=Path, required=True)
    recover_cmd.add_argument("--artifact-checksums", type=Path, default=None)
    recover_cmd.add_argument("--run-id", required=True)
    recover_cmd.add_argument("--output-root", type=Path, default=None)
    recover_cmd.add_argument("--original-run-id", default="full-final-v2")

    refresh_cmd = sub.add_parser(
        "refresh-recovery-reports",
        help="refresh a recovered run's reports from immutable predictions and metrics",
    )
    refresh_cmd.add_argument("--run-dir", type=Path, required=True)

    args = parser.parse_args()
    if args.command is None:
        parser.print_help()
        sys.exit(1)

    if args.command == "refresh-recovery-reports":
        manifest = refresh_recovered_reports(args.run_dir)
        print(f"Run ID: {manifest['run_id']}")
        print("Refresh type: REPORTING_ONLY_FROM_IMMUTABLE_PREDICTIONS")
        print(f"Predictions: {manifest['total_predictions']}")
        print(f"Top four: {manifest['top_four']}")
        sys.exit(0)

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

    if args.command == "report":
        for value in [args.source_run_id, args.report_id]:
            if Path(value).name != value or value in {".", ".."}:
                parser.error("run and report identifiers must be single directory names")
        source_run = root / "benchmark-runs" / args.source_run_id
        report_dir = root / "benchmark-reports" / args.report_id
        manifest = regenerate_reports(source_run, report_dir)
        print(f"Report ID: {manifest['report_id']}")
        print(f"Source run: {manifest['source_run_id']}")
        print(f"Predictions: {manifest['total_predictions']}")
        print(f"Top four: {manifest['top_four']}")
        sys.exit(0)

    if args.command == "recover-inference":
        for value in [args.run_id, args.original_run_id]:
            if Path(value).name != value or value in {".", ".."}:
                parser.error("run identifiers must be single directory names")
        artifact_root = args.artifact_root.resolve()
        checksum_report = (
            args.artifact_checksums.resolve()
            if args.artifact_checksums is not None
            else artifact_root.parent / "artifact-checksums.csv"
        )
        output_root = (
            args.output_root.resolve()
            if args.output_root is not None
            else artifact_root.parent.parent
        )
        output_dir = output_root / args.run_id
        original_run = root / "benchmark-runs" / args.original_run_id
        result = recover_inference(
            data_root=root,
            repo_root=repo,
            artifact_root=artifact_root,
            checksum_report=checksum_report,
            output_dir=output_dir,
            original_run=original_run,
            config=BenchmarkConfig(stage="full"),
        )
        manifest = result["run_manifest"]
        print(f"Run ID: {manifest['run_id']}")
        print(f"Recovery type: {manifest['recovery_type']}")
        print(f"Predictions: {manifest['total_predictions']}")
        print(f"Successful: {manifest['total_successful']}")
        print(f"Failed: {manifest['total_failed']}")
        print(f"Top four: {manifest['top_four']}")
        sys.exit(0)

    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
