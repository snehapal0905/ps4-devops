"""Wait until a URL answers 200 (used by Jenkins after `docker compose up`).

    python devops/wait_for.py http://localhost:8000/health 120
"""
from __future__ import annotations

import sys
import time
import urllib.request


def main() -> int:
    url = sys.argv[1]
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 120
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status == 200:
                    print(f"UP: {url}")
                    return 0
        except OSError:
            pass
        time.sleep(3)
    print(f"DOWN: {url} did not answer within {timeout}s")
    return 1


if __name__ == "__main__":
    sys.exit(main())
