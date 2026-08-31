#!/usr/bin/env python3
"""
Receipt Desk — check script (one real end-to-end run).

Sends sample receipts through receiptdesk.pipe and asserts the pipeline returns a
categorized expense sheet. Mirrors the Study Pack check; same webhook pipeline shape.

Run:  uv run python check.py     (or: python check.py)
Env:  ROCKETRIDE_URI, ROCKETRIDE_APIKEY, ROCKETRIDE_OPENAI_KEY  (see .env.example)
"""

import asyncio
import os
import sys
from pathlib import Path

from rocketride import RocketRideClient

PIPE = str(Path(__file__).parent / "receiptdesk.pipe")
SAMPLE = Path(__file__).parent / "sample_receipts.txt"


def extract_answer(response: dict) -> str:
    """Extract the answers-lane payload regardless of custom lane names."""
    result_types = response.get("result_types", {})
    for key, lane_type in result_types.items():
        if lane_type == "answers":
            vals = response.get(key, [])
            if vals:
                return vals[0]
    vals = response.get("answers", [])
    return vals[0] if vals else ""


async def main() -> int:
    receipts = SAMPLE.read_text(encoding="utf-8")

    async with RocketRideClient() as client:  # reads URI/APIKEY from env
        result = await client.use(filepath=PIPE, use_existing=True)
        token = result["token"]

        # webhook source -> send() with raw text.
        response = await client.send(
            token,
            receipts,
            objinfo={"name": "receipts.txt"},
            mimetype="text/plain",
        )

        answer = extract_answer(response)
        if not answer.strip():
            print("FAIL: pipeline returned no answer.", file=sys.stderr)
            print(f"raw response keys: {list(response.keys())}", file=sys.stderr)
            return 1

        # Sanity: must contain the expense table + summary and at least one row.
        required = ["## Expenses", "## Summary", "|"]
        missing = [s for s in required if s not in answer]
        print("\n===== EXPENSE SHEET =====\n")
        print(answer)
        print("\n=========================\n")
        if missing:
            print(f"WARN: expense sheet missing expected parts: {missing}", file=sys.stderr)
            return 2

        print("OK: expense sheet generated with a table and summary.")
        return 0


if __name__ == "__main__":
    if not os.environ.get("ROCKETRIDE_APIKEY"):
        print("WARN: ROCKETRIDE_APIKEY not set — copy .env.example to .env first.", file=sys.stderr)
    raise SystemExit(asyncio.run(main()))
