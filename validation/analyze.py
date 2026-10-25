#!/usr/bin/env python3
"""Turn validation/data.csv into the Markdown tables the README prints.

Usage: python3 validation/analyze.py [path/to/data.csv]

Every row is one measurement, keyed by part (A to G), participant, trial,
condition and measure; protocol.md defines the rows each part records and the
pass rule fixed before the first trial. The t distribution is computed here so
the script needs nothing beyond the standard library.
"""

from __future__ import annotations

import csv
import math
import sys
from collections import defaultdict
from pathlib import Path
from statistics import mean, stdev

GAIN_PASS_DB = 3.0
FALSE_OPENS_PASS_PER_MIN = 2.0
SETTLE_PASS_UTTERANCES = 6
FALLOFF_EXPECTED_DB = (4.0, 6.0)

Row = dict[str, str]


def main(argv: list[str]) -> int:
    path = Path(argv[1]) if len(argv) > 1 else Path(__file__).with_name("data.csv")
    rows = load(path)
    if not rows:
        print(f"No measurements in {path}. The tables fill as rows are added.")
        return 0
    sections = [
        ("Part A: gain with one earbud", paired(rows, "A", "off", "on", "laeq", "dBA")),
        ("Part B: false openings while the partner talks", specificity(rows)),
        ("Part C: controller settling", settling(rows)),
        ("Part D: clarity with and without chatter", unpaired(rows, "D", "off", "on", "clarity", "dB")),
        ("Part E: gain with both earbuds", paired(rows, "E", "off", "on_both", "laeq", "dBA")),
        ("Part F: the room's own falloff", falloff(rows)),
        ("Part G: camera seating against a tape", camera(rows)),
    ]
    for title, table in sections:
        print(f"## {title}\n")
        print(table or "No rows yet.")
        print()
    return 0


def load(path: Path) -> list[Row]:
    with path.open(newline="") as handle:
        rows = [row for row in csv.DictReader(handle) if row.get("part")]
    for row in rows:
        try:
            float(row["value"])
        except (KeyError, ValueError):
            raise SystemExit(f"Row without a numeric value: {row}") from None
    return rows


def select(rows: list[Row], part: str, **where: str) -> list[Row]:
    return [r for r in rows if r["part"] == part and all(r[k] == v for k, v in where.items())]


def values(rows: list[Row], part: str, **where: str) -> list[float]:
    return [float(r["value"]) for r in select(rows, part, **where)]


def participants(rows: list[Row]) -> list[str]:
    return sorted({r["participant"] for r in rows})


def paired(rows: list[Row], part: str, off: str, on: str, measure: str, unit: str) -> str:
    part_rows = select(rows, part, measure=measure)
    if not part_rows:
        return ""
    lines = [
        header(
            [
                "Participant",
                "Pairs",
                f"Off ({unit})",
                f"On ({unit})",
                "Gain (dB)",
                "SD",
                "95% CI",
                "Paired t, p",
                f"Pairs at {GAIN_PASS_DB:g} dB or more",
            ]
        )
    ]
    pooled: list[tuple[float, float]] = []
    for who in participants(part_rows):
        by_trial: dict[str, dict[str, float]] = defaultdict(dict)
        for r in part_rows:
            if r["participant"] == who:
                by_trial[r["trial"]][r["condition"]] = float(r["value"])
        pairs = [(t[off], t[on]) for t in by_trial.values() if off in t and on in t]
        if pairs:
            pooled.extend(pairs)
            lines.append(paired_row(who, pairs))
    if len(lines) > 2:
        lines.append(paired_row("Pooled", pooled))
    return "\n".join(lines)


def paired_row(who: str, pairs: list[tuple[float, float]]) -> str:
    diffs = [b - a for a, b in pairs]
    s = paired_stats(diffs)
    return cells(
        [
            who,
            str(len(pairs)),
            fmt(mean(a for a, _ in pairs)),
            fmt(mean(b for _, b in pairs)),
            fmt(s["mean"], signed=True),
            fmt(s["sd"]),
            fmt_ci(s["ci"]),
            fmt_test(s["t"], s["p"]),
            f"{sum(1 for d in diffs if d >= GAIN_PASS_DB)} of {len(diffs)}",
        ]
    )


def unpaired(rows: list[Row], part: str, off: str, on: str, measure: str, unit: str) -> str:
    part_rows = select(rows, part, measure=measure)
    if not part_rows:
        return ""
    lines = [header(["Participant", f"Off ({unit}, n)", f"On ({unit}, n)", "Change (dB)", "95% CI", "Welch t, p"])]
    for who in participants(part_rows):
        a = values(part_rows, part, participant=who, condition=off)
        b = values(part_rows, part, participant=who, condition=on)
        if not a or not b:
            continue
        s = welch(a, b)
        lines.append(
            cells(
                [
                    who,
                    f"{mean(a):.1f} ({len(a)})",
                    f"{mean(b):.1f} ({len(b)})",
                    fmt(s["mean"], signed=True),
                    fmt_ci(s["ci"]),
                    fmt_test(s["t"], s["p"]),
                ]
            )
        )
    return "\n".join(lines)


def specificity(rows: list[Row]) -> str:
    part_rows = select(rows, "B")
    if not part_rows:
        return ""
    lines = [
        header(
            [
                "Participant",
                "Partner at",
                "Openings",
                "Minutes",
                "False openings per minute",
                f"Under {FALSE_OPENS_PASS_PER_MIN:g} per minute",
            ]
        )
    ]
    for who in participants(part_rows):
        for condition in sorted({r["condition"] for r in part_rows if r["participant"] == who}):
            opens = sum(values(part_rows, "B", participant=who, condition=condition, measure="false_opens"))
            seconds = sum(values(part_rows, "B", participant=who, condition=condition, measure="duration"))
            if seconds <= 0:
                continue
            per_min = opens / (seconds / 60)
            lines.append(
                cells(
                    [
                        who,
                        condition,
                        f"{opens:g}",
                        f"{seconds / 60:.1f}",
                        f"{per_min:.1f}",
                        "yes" if per_min < FALSE_OPENS_PASS_PER_MIN else "no",
                    ]
                )
            )
    return "\n".join(lines)


def settling(rows: list[Row]) -> str:
    part_rows = select(rows, "C")
    if not part_rows:
        return ""
    lines = [
        header(
            [
                "Participant",
                "Runs",
                "Sentences to settle",
                "Mean",
                "Final level (dB)",
                f"Within {SETTLE_PASS_UTTERANCES} every run",
            ]
        )
    ]
    for who in participants(part_rows):
        counts = values(part_rows, "C", participant=who, measure="utterances_to_settle")
        levels = values(part_rows, "C", participant=who, measure="final_level")
        if not counts:
            continue
        lines.append(
            cells(
                [
                    who,
                    str(len(counts)),
                    ", ".join(f"{c:g}" for c in counts),
                    f"{mean(counts):.1f}",
                    fmt(mean(levels)) if levels else "",
                    "yes" if max(counts) <= SETTLE_PASS_UTTERANCES else "no",
                ]
            )
        )
    return "\n".join(lines)


def falloff(rows: list[Row]) -> str:
    part_rows = select(rows, "F")
    if not part_rows:
        return ""
    lo, hi = FALLOFF_EXPECTED_DB
    lines = [
        header(
            [
                "Participant",
                "At 1 m (dBA)",
                "At 2 m (dBA)",
                "Falloff (dB per doubling)",
                f"Inside {lo:g} to {hi:g}",
                "Room by app (dBA)",
                "Room by meter (dBA)",
            ]
        )
    ]
    for who in participants(part_rows):
        near = values(part_rows, "F", participant=who, condition="1m", measure="laeq")
        far = values(part_rows, "F", participant=who, condition="2m", measure="laeq")
        app = values(part_rows, "F", participant=who, condition="room", measure="noise_app")
        meter = values(part_rows, "F", participant=who, condition="room", measure="noise_meter")
        slope = mean(near) - mean(far) if near and far else None
        lines.append(
            cells(
                [
                    who,
                    fmt(mean(near)) if near else "",
                    fmt(mean(far)) if far else "",
                    fmt(slope),
                    "" if slope is None else ("yes" if lo <= slope <= hi else "no"),
                    fmt(mean(app)) if app else "",
                    fmt(mean(meter)) if meter else "",
                ]
            )
        )
    return "\n".join(lines)


def camera(rows: list[Row]) -> str:
    part_rows = [r for r in select(rows, "G", measure="distance_est") if r.get("reference")]
    if not part_rows:
        return ""
    lines = [header(["Participant", "Seats", "Mean absolute error (m)", "Bias (m)", "Largest error (m)"])]
    for who in participants(part_rows):
        errors = [float(r["value"]) - float(r["reference"]) for r in part_rows if r["participant"] == who]
        lines.append(
            cells(
                [
                    who,
                    str(len(errors)),
                    f"{mean(abs(e) for e in errors):.2f}",
                    f"{mean(errors):+.2f}",
                    f"{max(abs(e) for e in errors):.2f}",
                ]
            )
        )
    return "\n".join(lines)


def paired_stats(diffs: list[float]) -> dict:
    n = len(diffs)
    d = mean(diffs)
    if n < 2:
        return {"n": n, "mean": d, "sd": None, "ci": None, "t": None, "p": None}
    sd = stdev(diffs)
    sem = sd / math.sqrt(n)
    if sem == 0:
        return {"n": n, "mean": d, "sd": sd, "ci": (d, d), "t": math.inf, "p": 0.0}
    t = d / sem
    half = t_quantile(0.975, n - 1) * sem
    return {"n": n, "mean": d, "sd": sd, "ci": (d - half, d + half), "t": t, "p": 2 * (1 - t_cdf(abs(t), n - 1))}


def welch(a: list[float], b: list[float]) -> dict:
    d = mean(b) - mean(a)
    if len(a) < 2 or len(b) < 2:
        return {"mean": d, "ci": None, "t": None, "p": None}
    va, vb = stdev(a) ** 2 / len(a), stdev(b) ** 2 / len(b)
    se = math.sqrt(va + vb)
    if se == 0:
        return {"mean": d, "ci": (d, d), "t": math.inf, "p": 0.0}
    df = (va + vb) ** 2 / (va**2 / (len(a) - 1) + vb**2 / (len(b) - 1))
    t = d / se
    half = t_quantile(0.975, df) * se
    return {"mean": d, "ci": (d - half, d + half), "t": t, "p": 2 * (1 - t_cdf(abs(t), df))}


def t_cdf(t: float, df: float) -> float:
    tail = 0.5 * regularized_beta(df / (df + t * t), df / 2, 0.5)
    return 1 - tail if t >= 0 else tail


def t_quantile(p: float, df: float) -> float:
    lo, hi = 0.0, 100.0
    for _ in range(200):
        mid = (lo + hi) / 2
        if t_cdf(mid, df) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def regularized_beta(x: float, a: float, b: float) -> float:
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    front = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log1p(-x))
    if x < (a + 1) / (a + b + 2):
        return front * beta_continued_fraction(x, a, b) / a
    return 1 - front * beta_continued_fraction(1 - x, b, a) / b


def beta_continued_fraction(x: float, a: float, b: float) -> float:
    # Lentz's method for the incomplete beta function (Numerical Recipes, betacf).
    tiny = 1e-300
    qab, qap, qam = a + b, a + 1, a - 1
    c = 1.0
    d = 1 - qab * x / qap
    d = 1 / (d if abs(d) > tiny else tiny)
    h = d
    for m in range(1, 300):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1 + aa * d
        d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c
        c = c if abs(c) > tiny else tiny
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1 + aa * d
        d = 1 / (d if abs(d) > tiny else tiny)
        c = 1 + aa / c
        c = c if abs(c) > tiny else tiny
        step = d * c
        h *= step
        if abs(step - 1) < 1e-12:
            break
    return h


def header(names: list[str]) -> str:
    return cells(names) + "\n|" + " --- |" * len(names)


def cells(items: list[str]) -> str:
    return "| " + " | ".join(items) + " |"


def fmt(value: float | None, digits: int = 1, signed: bool = False) -> str:
    if value is None:
        return ""
    if math.isinf(value):
        return "inf"
    return f"{value:+.{digits}f}" if signed else f"{value:.{digits}f}"


def fmt_ci(ci: tuple[float, float] | None) -> str:
    return f"{fmt(ci[0], signed=True)} to {fmt(ci[1], signed=True)}" if ci else ""


def fmt_test(t: float | None, p: float | None) -> str:
    if t is None or p is None:
        return ""
    return f"t = {fmt(t, 2)}, p {'< 0.001' if p < 0.001 else f'= {p:.3f}'}"


if __name__ == "__main__":
    sys.exit(main(sys.argv))
