import anthropic
import json
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

RISK_PROMPT = """You are a legal contract risk analyst. Analyze the following contract and identify individual clauses.
For each clause, assign a risk level:
- "green": standard, safe clause
- "yellow": unusual or worth reviewing
- "red": potentially risky, unfavorable, or legally problematic

Return a JSON object with this exact structure:
{
  "clauses": [
    {
      "text": "the clause text (first 100 chars)",
      "risk": "green" | "yellow" | "red",
      "reason": "one-line explanation"
    }
  ],
  "summary": "overall one-paragraph risk assessment"
}

CONTRACT TEXT:
"""


def analyze_contract_risk(content: str) -> dict:
    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": RISK_PROMPT + content
            }
        ]
    )

    response_text = message.content[0].text

    # Extract JSON from the response
    start = response_text.find("{")
    end = response_text.rfind("}") + 1
    if start == -1 or end == 0:
        return {"clauses": [], "summary": "Unable to parse risk analysis."}

    return json.loads(response_text[start:end])
