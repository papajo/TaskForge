import json

TASK_TYPES = [
    "bounding-box",
    "classification",
    "categorization",
    "moderation",
    "data-collection",
    "hitl-validation",
]


def validate_answer(task_type: str, answers: dict, labels: list, form_fields: list) -> str | None:
    if not isinstance(answers, dict):
        return "Answers must be an object keyed by item id."
    if task_type == "bounding-box":
        for item_id, boxes in answers.items():
            if not isinstance(boxes, list) or not boxes:
                return f"Item {item_id}: at least one bounding box required."
            for b in boxes:
                if not isinstance(b, dict):
                    return f"Item {item_id}: box must be an object."
                label = b.get("label")
                if not label:
                    return f"Item {item_id}: box missing label."
                if labels and label not in labels:
                    return f"Item {item_id}: box label '{label}' not in allowed labels."
                for k in ("x", "y", "w", "h"):
                    if not isinstance(b.get(k), (int, float)):
                        return f"Item {item_id}: box missing numeric '{k}'."
                if b["w"] <= 0 or b["h"] <= 0:
                    return f"Item {item_id}: box has non-positive size."
        return None
    if task_type in ("classification", "categorization"):
        for item_id, value in answers.items():
            if not isinstance(value, str) or not value:
                return f"Item {item_id}: a label must be selected."
            if labels and value not in labels:
                return f"Item {item_id}: label '{value}' not allowed."
        return None
    if task_type == "moderation":
        for item_id, value in answers.items():
            decision = value.get("decision") if isinstance(value, dict) else value
            if decision not in ("approve", "reject"):
                return f"Item {item_id}: decision must be approve/reject."
        return None
    if task_type == "data-collection":
        for item_id, form in answers.items():
            if not isinstance(form, dict):
                return f"Item {item_id}: form must be an object."
            for f in form_fields or []:
                if not str(form.get(f, "")).strip():
                    return f"Item {item_id}: field '{f}' is required."
        return None
    if task_type == "hitl-validation":
        for item_id, value in answers.items():
            if not isinstance(value, dict):
                return f"Item {item_id}: object with decision required."
            decision = value.get("decision")
            if decision not in ("accept", "correct"):
                return f"Item {item_id}: decision must be accept/correct."
            if decision == "correct" and not value.get("correction"):
                return f"Item {item_id}: correction required when correcting."
        return None
    return "Unknown task type."


def parse_items(items_json: str):
    try:
        items = json.loads(items_json or "[]")
        for it in items:
            if "id" not in it:
                raise ValueError("Every item must have an 'id'.")
        return items
    except ValueError:
        raise
    except Exception:
        raise ValueError("Items must be a JSON array.")
