#!/usr/bin/env python3
"""
Study Pack — check script (one real end-to-end run).

Per the RocketRide setup guide, every app should ship a `check` script that runs
one real pipeline invocation so you catch failures at build time, not demo time.

It:
  1. connects with the credentials in .env (ROCKETRIDE_URI / ROCKETRIDE_APIKEY),
  2. starts the studypack.pipe pipeline once (use_existing=True),
  3. sends one real lecture sample through it via the webhook source,
  4. extracts the answer defensively (consulting result_types), and
  5. prints the resulting study pack and exits non-zero on any failure.

Run:  uv run python check.py     (or: python check.py)
Env:  ROCKETRIDE_URI, ROCKETRIDE_APIKEY, ROCKETRIDE_OPENAI_KEY  (see .env.example)
"""

import asyncio
import os
import sys
from pathlib import Path

from rocketride import RocketRideClient

PIPE = str(Path(__file__).parent / "studypack.pipe")
SAMPLE = Path(__file__).parent / "sample_lecture.txt"


def extract_answer(response: dict) -> str:
    """Extract the answers-lane payload regardless of custom lane names."""
    result_types = response.get("result_types", {})
    for key, lane_type in result_types.items():
        if lane_type == "answers":
            vals = response.get(key, [])
            if vals:
                return vals[0]
    # Fallback: default 'answers' key
    vals = response.get("answers", [])
    return vals[0] if vals else ""


async def main() -> int:
    material = SAMPLE.read_text(encoding="utf-8")

    # Context manager guarantees disconnect even on exceptions.
    async with RocketRideClient() as client:  # reads URI/APIKEY from env
        # Start the pipeline once; reuse if already running.
        result = await client.use(filepath=PIPE, use_existing=True)
        token = result["token"]

        # webhook source -> send() with raw text.
        response = await client.send(
            token,
            material,
            objinfo={"name": "lecture.txt"},
            mimetype="text/plain",
        )

        answer = extract_answer(response)
        if not answer.strip():
            print("FAIL: pipeline returned no answer.", file=sys.stderr)
            print(f"raw response keys: {list(response.keys())}", file=sys.stderr)
            return 1

        # Sanity check: the study pack must contain the required sections.
        required = ["## Summary", "## Practice Questions", "## Answer Key"]
        missing = [s for s in required if s not in answer]
        print("\n===== STUDY PACK =====\n")
        print(answer)
        print("\n======================\n")
        if missing:
            print(f"WARN: study pack missing sections: {missing}", file=sys.stderr)
            return 2

        print("OK: study pack generated with all required sections.")
        return 0


if __name__ == "__main__":
    if not os.environ.get("ROCKETRIDE_APIKEY"):
        print("WARN: ROCKETRIDE_APIKEY not set — copy .env.example to .env first.", file=sys.stderr)
    raise SystemExit(asyncio.run(main()))
