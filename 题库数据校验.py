#!/usr/bin/env python3
"""神人刘题库发布前的离线数据校验。仅使用Python标准库。"""

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXPECTED_MISSING = {1, 2, 3, 335}
VALID_TYPES = {"single", "multiple", "judge"}
RESIDUE = re.compile(r"正确等完|正确等罕|正确到衬|正确从\s*#|\|\s*$|无估|牌斜|炸贴|翘边突(?!出)|用族|不期营|电亲|账短|周转条类|肥和|手棍|【|】")


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def main() -> int:
    questions = json.loads((ROOT / "questions.json").read_text(encoding="utf-8"))
    js_text = (ROOT / "questions.js").read_text(encoding="utf-8").strip()
    prefix = "window.QUESTION_BANK="
    errors: list[str] = []

    if not js_text.startswith(prefix) or not js_text.endswith(";"):
        fail("questions.js包装格式错误", errors)
        js_questions = None
    else:
        js_questions = json.loads(js_text[len(prefix) : -1])
        if js_questions != questions:
            fail("questions.js与questions.json内容不一致", errors)

    if len(questions) != 507:
        fail(f"题目总数应为507，实际为{len(questions)}", errors)

    ids = [q.get("id") for q in questions]
    if len(ids) != len(set(ids)):
        fail("存在重复题号", errors)
    actual_missing = set(range(1, 512)) - set(ids)
    if actual_missing != EXPECTED_MISSING:
        fail(f"缺失题号异常：{sorted(actual_missing)}", errors)

    for q in questions:
        qid = q.get("id")
        qtype = q.get("type")
        options = q.get("options")
        answers = q.get("answers")
        if qtype not in VALID_TYPES:
            fail(f"#{qid}题型无效", errors)
        if not q.get("stem") or not isinstance(options, list) or not options:
            fail(f"#{qid}题干或选项缺失", errors)
            continue
        if not isinstance(answers, list) or not answers:
            fail(f"#{qid}答案缺失", errors)
            continue
        if len(options) != len(set(options)):
            fail(f"#{qid}存在重复选项", errors)
        if any(answer not in options for answer in answers):
            fail(f"#{qid}存在不属于选项的答案", errors)
        if qtype == "single" and len(answers) != 1:
            fail(f"#{qid}单选题答案数不是1", errors)
        if qtype == "judge" and (options != ["对", "错"] or len(answers) != 1):
            fail(f"#{qid}判断题结构异常", errors)
        if q.get("sourceAnswerCount") is not None and q["sourceAnswerCount"] != len(answers):
            fail(f"#{qid}答案数与原图复核数不一致", errors)
        if any(RESIDUE.search(str(text)) for text in [q["stem"], *options]):
            fail(f"#{qid}仍含已知OCR残字", errors)
        pages = q.get("sourceImages", [q.get("sourceImage")])
        if not pages or any(not isinstance(page, int) or not 1 <= page <= 111 for page in pages):
            fail(f"#{qid}原题页码异常", errors)

    by_id = {q["id"]: q for q in questions}
    locks = {
        257: {"options": 6, "answers": [0, 1, 2, 3, 5]},
        269: {"options": 4, "answers": [0, 1, 2, 3]},
        302: {"options": 4, "answers": [0, 1, 2, 3], "pages": [72, 73]},
        307: {"options": 4, "answers": [0, 1, 2, 3]},
    }
    for qid, lock in locks.items():
        q = by_id[qid]
        if len(q["options"]) != lock["options"]:
            fail(f"#{qid}原题锁定选项数异常", errors)
        expected_answers = [q["options"][index] for index in lock["answers"]]
        if q["answers"] != expected_answers:
            fail(f"#{qid}原题锁定答案异常", errors)
        if "pages" in lock and q.get("sourceImages") != lock["pages"]:
            fail(f"#{qid}跨页来源异常", errors)

    text_locks = {
        90: ["产品供方的发货单"],
        137: ["针脚无歪斜"],
        142: ["标识类工件粘贴", "无翘边突出"],
        160: ["该怎么做（ ）", "与自己无关"],
        166: ["锤子或撬棍"],
        200: ["肥皂"],
        177: ["需要进行哪些工作"],
        403: ["对立的、矛盾的"],
        434: ["规定用途"],
        437: ["不期望情况"],
        457: ["电源上挂牌"],
        501: ["账簿记录"],
        505: ["周转箱类"],
    }
    for qid, expected_parts in text_locks.items():
        q = by_id[qid]
        searchable = "\n".join([q["stem"], *q["options"]])
        for part in expected_parts:
            if part not in searchable:
                fail(f"#{qid}原图复核文字锁异常：缺少“{part}”", errors)

    source_files = sorted((ROOT / "source").glob("image*.webp"))
    if len(source_files) != 111:
        fail(f"原题截图应为111张，实际为{len(source_files)}张", errors)

    if errors:
        print("校验失败：")
        for error in errors:
            print(f"- {error}")
        return 1

    print("校验通过：507题、111张原图、题号/题型/选项/答案映射及重点原题答案锁均正常。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
