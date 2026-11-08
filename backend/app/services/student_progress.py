"""Turns a student's raw progress rows into the numbers the admin sees."""
from datetime import date, datetime, timedelta
from typing import Dict, Iterable, List, Optional


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() + "Z" if value else None


def _streak(days: Iterable[str], today: date) -> int:
    """Consecutive study days ending today (or yesterday, so an evening check isn't a zero)."""
    have = set(days)
    cursor = today if today.isoformat() in have else today - timedelta(days=1)
    n = 0
    while cursor.isoformat() in have:
        n += 1
        cursor -= timedelta(days=1)
    return n


def summarize_progress(
    lectures: List[dict],
    progress: List[dict],
    activity_days: List[str],
    notes_count: int,
    plans_count: int,
    today: Optional[date] = None,
) -> dict:
    """
    lectures: published lectures [{id, title, subject, chapter, lecture_no}]
    progress: rows [{lecture_id, completed, completed_at, position, duration, updated_at}]
    """
    today = today or datetime.utcnow().date()
    by_id: Dict[str, dict] = {str(p["lecture_id"]): p for p in progress}
    known = {str(l["id"]) for l in lectures}

    subjects: Dict[str, Dict[str, dict]] = {}
    completed_total = 0
    for lec in sorted(lectures, key=lambda l: (l["subject"], l["chapter"], l["lecture_no"])):
        row = by_id.get(str(lec["id"]))
        done = bool(row and row["completed"])
        completed_total += 1 if done else 0
        chap = subjects.setdefault(lec["subject"], {}).setdefault(
            lec["chapter"], {"chapter": lec["chapter"], "total": 0, "completed": 0}
        )
        chap["total"] += 1
        chap["completed"] += 1 if done else 0

    subject_out = []
    for subject, chapters in subjects.items():
        chap_list = []
        for c in chapters.values():
            c["percent"] = round(100 * c["completed"] / c["total"]) if c["total"] else 0
            chap_list.append(c)
        total = sum(c["total"] for c in chap_list)
        done = sum(c["completed"] for c in chap_list)
        subject_out.append(
            {
                "subject": subject,
                "total": total,
                "completed": done,
                "percent": round(100 * done / total) if total else 0,
                "chapters": chap_list,
            }
        )

    titles = {str(l["id"]): l for l in lectures}
    recent = []
    for row in sorted(progress, key=lambda r: r["updated_at"] or datetime.min, reverse=True):
        lec = titles.get(str(row["lecture_id"]))
        if not lec:
            continue  # the lecture was deleted
        dur = row.get("duration") or 0
        recent.append(
            {
                "lecture_id": str(row["lecture_id"]),
                "title": lec["title"],
                "subject": lec["subject"],
                "chapter": lec["chapter"],
                "completed": bool(row["completed"]),
                "watched_percent": 100 if row["completed"] else (min(100, round(100 * (row.get("position") or 0) / dur)) if dur else 0),
                "updated_at": _iso(row["updated_at"]),
            }
        )
        if len(recent) >= 8:
            break

    activity = sorted(set(activity_days))
    window = {(today - timedelta(days=i)).isoformat() for i in range(28)}
    last_progress = max((r["updated_at"] for r in progress if r["updated_at"]), default=None)

    last_active = None
    if last_progress and (not activity or last_progress.date().isoformat() >= activity[-1]):
        last_active = _iso(last_progress)
    elif activity:
        last_active = activity[-1]

    total_lectures = len(known)
    return {
        "total_lectures": total_lectures,
        "completed_lectures": completed_total,
        "percent": round(100 * completed_total / total_lectures) if total_lectures else 0,
        "streak": _streak(activity, today),
        "active_days_28": len([d for d in activity if d in window]),
        "activity_last_28": [d for d in sorted(window) if d in set(activity)],
        "last_active": last_active,
        "notes_count": notes_count,
        "plans_count": plans_count,
        "subjects": sorted(subject_out, key=lambda s: s["subject"]),
        "recent": recent,
    }
