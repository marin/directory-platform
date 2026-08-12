Generate 3-5 FAQ question/answer pairs grounded in the provided data.

## Context
{{contextJson}}

## Rules
- Questions must be answerable from the data provided.
- Answers must cite concrete facts (counts, prices, hours) from the data.
- Do not invent statistics or claims.
- Return JSON array: [{"question":"...","answer":"..."}]
