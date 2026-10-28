"""ML quality gate for the CI/CD pipeline.

Reads the metrics written by `python -m sim.evaluate --out model_out` and fails the build
(exit code 1) if the freshly trained model is not good enough to ship.

    python devops/check_model.py model_out/metrics.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# minimum quality a model must reach before it is deployed
MIN_TAKEOVER_RECALL = 0.90      # catch at least 90% of rented / taken-over accounts
MAX_FALSE_STEPUP = 0.006        # at most 0.6% of honest sessions asked for a selfie
MAX_FALSE_LOCKOUT = 0.001       # honest riders (almost) never locked out


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "model_out/metrics.json")
    tj = json.loads(path.read_text())["systems"]["trust_juggler"]

    checks = [
        ("takeover recall (14 days)", tj["takeover_recall_14d"], ">=", MIN_TAKEOVER_RECALL),
        ("false step-up rate", tj["false_stepup_rate"], "<=", MAX_FALSE_STEPUP),
        ("false lockout rate", tj["false_lockout_rate"], "<=", MAX_FALSE_LOCKOUT),
    ]
    failed = 0
    print("Model quality gate")
    for name, value, op, limit in checks:
        ok = value >= limit if op == ">=" else value <= limit
        failed += not ok
        print(f"  {'PASS' if ok else 'FAIL'}  {name:<26} {value:.4f}  (needs {op} {limit})")

    if failed:
        print(f"\n{failed} check(s) failed: the model will NOT be deployed.")
        return 1
    print("\nAll checks passed: the model can be deployed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
