"""AI explanation layer. The LLM's only job is to phrase the structured
breakdown already computed by logic.py into plain English for a loan
officer. It never decides score, shape, or recommendation.
"""
import json
import os

import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# llama-3.1-8b-instant was retired from Groq's model list; openai/gpt-oss-20b
# is the closest currently-available fast/small equivalent.
GROQ_MODEL = "openai/gpt-oss-20b"

PROMPT_TEMPLATE = (
    "You are helping a loan officer understand a borrower risk assessment. "
    "Given this structured data: {json_breakdown}, write a 2-3 sentence "
    "plain-English explanation referencing the specific evidence (deviation "
    "percentage, cash-flow shape classification, payment history, and the "
    "resulting stress score). Do not invent numbers not present in the "
    "data. Do not recommend an action beyond what's given."
)


def build_breakdown_payload(borrower_name, archetype, latest_month, score_breakdown, recommendation):
    return {
        "borrower_name": borrower_name,
        "archetype": archetype,
        "deviation_pct": latest_month["deviation_pct"],
        "shape": latest_month["shape"],
        "provisional": latest_month["provisional"],
        "missed_payments_trailing_3mo": score_breakdown["missed_payments"],
        "partial_payments_trailing_3mo": score_breakdown["partial_payments"],
        "stress_score": score_breakdown["score"],
        "risk_bucket": score_breakdown["bucket"],
        "recommendation": recommendation,
    }


def generate_explanation(breakdown_payload):
    if not GROQ_API_KEY:
        return _fallback_explanation(breakdown_payload)

    prompt = PROMPT_TEMPLATE.format(json_breakdown=json.dumps(breakdown_payload))
    try:
        resp = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 500,
            },
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()
        if not content:
            return _fallback_explanation(breakdown_payload, error="empty response")
        return _strip_markdown(content)
    except Exception as e:
        return _fallback_explanation(breakdown_payload, error=str(e))


def _strip_markdown(text):
    return text.replace("**", "").replace("__", "")


def _fallback_explanation(payload, error=None):
    shape_label = payload["shape"].replace("_", " ").lower()
    text = (
        f"{payload['borrower_name']}'s most recent month shows a "
        f"{payload['deviation_pct']}% deviation from baseline, classified as "
        f"{shape_label}, with {payload['missed_payments_trailing_3mo']} missed and "
        f"{payload['partial_payments_trailing_3mo']} partial payments in the trailing "
        f"3 months. This produces a stress score of {payload['stress_score']} "
        f"({payload['risk_bucket']} risk)."
    )
    if error:
        text += " (AI narration unavailable — showing rule-based summary instead.)"
    return text
