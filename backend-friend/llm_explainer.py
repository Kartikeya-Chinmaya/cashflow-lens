import os
import json
from openai import OpenAI


# =========================================================
# GROQ CLIENT
# =========================================================

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)


# =========================================================
# GENERATE EXPLANATION
# =========================================================

def explain_borrower(result):

    prompt = f"""
You are an explainable financial analysis assistant for a
microfinance repayment planning system.

The financial analysis engine has already made all decisions.

Your ONLY job is to explain the structured analysis to a lender.

STRICT RULES:

1. Use ONLY information present in the provided JSON.
2. Do NOT invent numbers, dates, causes, or borrower details.
3. Do NOT change the recommendation.
4. Do NOT create a new recommendation.
5. Do NOT give financial advice outside the provided recommendation.
6. Use "cash flow" when referring to income minus expenses and repayment.
7. Use the currency and currency symbol provided in the JSON.
8. Never assume INR, USD, EUR, or any other currency.
9. Do not perform currency conversion.
10. If forecast values are negative, say that the forecast shows
    negative future cash flow. Do not claim that default is certain.
11. Clearly distinguish historical evidence from forecasted values.
12. Keep the explanation concise and professional.
13. Write 3-5 sentences.
14. Mention the recommendation exactly as provided.

Financial analysis:

{json.dumps(result, indent=2)}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an explainability layer. "
                    "The financial engine is authoritative. "
                    "Never make financial decisions yourself. "
                    "Only explain the supplied structured evidence."
                )
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1
    )

    text = response.choices[0].message.content.strip()
    return text.replace("**", "").replace("__", "")