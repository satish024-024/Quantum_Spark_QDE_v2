# Quantum_Spark_QDE_v2
Read WORKBOARD.md first (~/workspace/WORKBOARD.md). Only edit files listed under your name.

## Run
- Install: `pip install -r requirements.txt`
- Dev server: `python hybrid_quantum_app.py`
- Prod entry (Vercel): `api/index.py` via `@vercel/python`
- No test suite in repo — verify with targeted runtime checks (import the changed module, exercise the changed function, paste the output).

## Rules
- Work on a branch, open a PR, never push to main.
- Keep diffs small. No drive-by refactors or reformatting.
- Don't change element IDs, APIs, or auth unless the task says so.
- Run tests and the app before reporting. Paste the output.
- Never commit secrets or temporary credentials.
- If blocked or the task is ambiguous, stop and write it in WORKBOARD.md.

## Done = tests pass + diff reviewed + WORKBOARD.md updated
