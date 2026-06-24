# Habla conmigo

A self-contained, three-minute video speaking challenge for LPS1001 Spanish Beginners (CEFR A1).

## Run it

Camera and microphone access require a secure browser context. Start a small local server from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Adapt the questions

Open `app.js` and edit the `QUESTION_BANK` array near the top. Each item has:

- `id`: the topic Lucía uses to choose a relevant follow-up reply
- `es`: the Spanish question shown and spoken aloud
- `en`: the optional English support text shown underneath

Each new attempt shuffles the bank and selects a fresh set of questions, so students do not always see the same questions in the same order.

The activity records locally in the browser. No recording is uploaded to a server.
