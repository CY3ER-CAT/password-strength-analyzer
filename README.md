# CY3ER-CAT — Password Strength Analyzer

A local-first, cybersecurity-themed password strength analyzer built with plain **HTML5, CSS3, and JavaScript**. It scores passwords from 0–100, estimates entropy and offline crack time, flags common passwords and predictable patterns, provides tailored fixes, and generates cryptographically secure alternatives.

Everything runs in the browser. **No backend, no build step, no external libraries, no network requests, no storage, and no console logging of passwords.**

---

## Features

### Analysis
- Live strength score from **0–100** with five levels: Very weak → Very strong.
- Length, uppercase, lowercase, number, and symbol detection.
- Local common-password wordlist with leet-speak normalisation (`P@ssw0rd` is caught).
- Detection of:
  - repeated characters (`aaaa`)
  - repeated blocks (`abcabcabc`)
  - sequential runs (`abcd`, `4321`)
  - keyboard walks (`qwerty`, `asdf`)
  - years and dates (`1999`, `2026`)
  - digits-only passwords and long numeric runs (phone/ID-like)
  - repeated digit groups (`555-555-5555`) and sequential phone-keypad numbers (`123-456-7890`)
  - phone-number formats with separators
  - name-like prefixes followed by digits or symbols (`Alex@...`)
  - dictionary words embedded in longer passwords
- Pattern penalties scale with how much of the password the pattern covers, so a short repeated run inside a long password does not collapse the score.
- Educational entropy estimate and crack-time projection.
- Plain-language verdict explaining *why* a password is weak or strong.
- Real-time seven-point security checklist.
- Actionable, prioritised recommendations.

### Generator
- Uses `crypto.getRandomValues()` with rejection sampling — **not** `Math.random()`.
- Customisable length (8–64).
- Uppercase, lowercase, numbers, and symbol sets.
- Optional exclusion of look-alike characters (`0 O 1 l I`).
- One-click copy and a shortcut to analyze the generated password.

### Interface
- Dark navy/black theme with neon green and cyan accents.
- Glassmorphism cards, ambient orbs, subtle grid and grain.
- Animated score dial and five-segment strength meter.
- Responsive layout for desktop, tablet, and mobile.
- Keyboard accessible, reduced-motion support, visible focus states.
- No external fonts, images, trackers, or API calls.

### Privacy
- Analysis happens entirely in memory in the current tab.
- Passwords are **never** written to `localStorage`, `sessionStorage`, cookies, or IndexedDB.
- Passwords are **never** sent to an API.
- Passwords are **never** logged to the console.
- The clipboard is only touched when you explicitly press **Copy** on a generated password.
- Clear the analyzed password at any time with the **×** button.

---

## Project structure

```
password-strength-analyzer/
├── index.html              # Semantic page structure, SVG icon sprite
├── css/
│   └── styles.css          # Design tokens, glass cards, responsive layout
├── js/
│   ├── wordlist.js         # Local common-password list, pattern data
│   ├── analyzer.js         # Scoring, entropy, pattern detection, advice
│   ├── generator.js        # Web Crypto password generator
│   └── app.js              # DOM wiring and UI state
└── README.md
```

The scripts are loaded as classic scripts in dependency order, so the project works by **double-clicking `index.html`** — ES modules would be blocked by the browser's `file://` security policy.

---

## Run it locally

### Option 1 — Open the file directly (simplest)

1. Download or clone the project.
2. Double-click `index.html`, or drag it into your browser.

No installation, server, or internet connection required.

> Clipboard access is most reliable over `http://localhost`. If it is unavailable, the app falls back to a legacy copy method.

### Option 2 — Serve with Python

From the project folder:

```bash
# macOS / Linux
python3 -m http.server 8080

# Windows (if Python is installed)
py -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

### Option 3 — Serve with Node.js

```bash
npx serve .
```

Then open the printed local URL.

---

## How to use

1. Type or paste a password into **Password under test**.
2. Watch the score dial, meter, metrics, checklist, and recommendations update live.
3. Use the eye button to reveal the password and the **×** button to clear it.
4. Use the **generator** to create a strong alternative, adjust its length and character sets, then copy it.
5. Press **Analyze this password** to load the generated password into the inspector and compare its score.
6. Read **Field notes** for the security concepts behind the score.

The score updates **250 ms after the last keystroke**, not on every character. While you are still typing, a shorter prefix can look stronger than the finished password: adding an eighth digit to a name-and-number password, for example, completes a phone/ID pattern and can lower the score. The **final, full password** is the meaningful result.

---

## How the score works

### Point model

A baseline score is built from:

| Factor | Contribution |
|---|---|
| Length | up to **60** points (3 per character) |
| Character variety | **9** points per class (lower, upper, number, symbol), up to **36** |
| Long-password bonus | **+4** at 16+ chars, **+2** at 24+ chars |

Then penalties and hard caps are applied:

- Exact common password → capped at **6**
- Common password with leet substitutions / added digits → capped at **18**
- Repeated characters → **–3 per extra character** (max **–18**); capped at 30 or 50 only when the run dominates the password
- Repeated blocks → scaled penalty; capped at **35** when the block covers half or more of the password
- Sequential runs → **–3 per extra character** (max **–15**); capped at **39** when the run covers 35% or more
- Keyboard walks → **–3 per extra character** (max **–18**); capped at **39** when the walk covers 35% or more
- Embedded dictionary word → up to **–16**; capped at 59 for short, date-based, or word-dominated passwords
- Year/date (not part of a longer number) → **–8**, capped at 79 for passwords under 20 characters
- Name-like prefix → up to **–12**, capped at 75 when it dominates a short password
- Repeated digit groups → **–15**, capped at 20 when digits make up at least half the password
- Sequential digit groups → **–12**, capped at 35
- Phone-number format (`555-555-5555`, `123-456-7890`) → capped at **59**
- Long numeric run (8+ digits) → up to **–14**; treated as phone/ID-like and capped at 70 only when the longest run is 16 digits or fewer and it covers at least half of the password
- Name plus phone/ID-like number → capped at **59**; a numeric tail of 17+ digits is long enough to add real entropy and is not collapsed to 59
- High-entropy floor (16+ character passwords): **92** at 128+ effective bits, **85** at 96+, **78** at 80+
- Very short passwords → capped at 20 / 35 / 49 / 59 depending on length
- Effective entropy under 33 bits → capped at 39; under 45 → 55; under 60 → 69

Bands:

| Score | Level |
|---|---|
| 0–19 | Very weak |
| 20–39 | Weak |
| 40–59 | Medium |
| 60–79 | Strong |
| 80–100 | Very strong |

### Entropy

The estimate is:

```
E = L × log₂(N)
```

where `L` is the password length and `N` is the size of the observed character pool (lowercase 26, uppercase 26, digits 10, symbols 33). Predictable structures reduce the displayed estimate, because raw combinations assume a randomly generated password.

### Crack time

Crack time is derived from the effective entropy estimate, assuming an **offline attacker testing 10 billion guesses per second** and an average of half the keyspace. It is an educational baseline, not a prediction for a specific attacker or service.

### Why the score is only an estimate

Entropy math assumes random character selection. People choose patterns — words, names, dates, keyboard walks — that dramatically shrink the real search space. A high score does **not** mean an account cannot be compromised through phishing, password reuse, malware, or a server-side breach.

---

## Customising

### Add to the wordlist

Edit `js/wordlist.js` and append lowercase entries to `COMMON_PASSWORDS`. The analyzer normalises case, symbols, and common leet substitutions before matching, so `P@ssw0rd2026` will still match `password`.

### Change the generator character sets

Edit the `SETS` object in `js/generator.js`:

```js
var SETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/'
};
```

Keep the Web Crypto rejection-sampling logic intact so every character remains uniformly distributed.

### Change the scoring weights

All scoring rules live in `analyze()` inside `js/analyzer.js` and are commented by section. Adjust the length multiplier, variety points, penalties, or caps there. The UI updates automatically.

### Change the colour system

Design tokens are declared at the top of `css/styles.css` under `:root`. Strength colours are mapped through the `--tone` variable and the `data-strength` attribute on the analyzer card.

---

## Security design notes

- **No network calls.** There is no `fetch`, `XMLHttpRequest`, WebSocket, analytics, or external asset.
- **No persistence.** There is no `localStorage`, `sessionStorage`, `indexedDB`, or cookie code.
- **No logging.** There is no `console.log` (or any console method) anywhere in the app.
- **CSPRNG generation.** The generator uses the browser's cryptographically secure pseudo-random number generator with rejection sampling to avoid modulo bias.
- **Clipboard on demand.** Only generated passwords are copied, and only when the user clicks Copy.
- **Input hardening.** The analyzer input disables autocomplete, autocorrect, autocapitalisation, and spellcheck, and caps length at 128 characters to keep pattern scanning bounded.
- **DOM safety.** User-facing recommendation text is inserted with `textContent`, not `innerHTML`, preventing injection.

### Important limitation

The score is an educational estimate, **not a guarantee against compromise**. Use a password manager, never reuse passwords, enable multi-factor authentication (preferably passkeys or hardware keys), and check whether your accounts have appeared in known breaches.

---

## Browser support

Tested against current versions of Chrome, Edge, Firefox, and Safari. Requires:

- `crypto.getRandomValues` (universal in modern browsers)
- CSS custom properties, `backdrop-filter`, and `mask-image` for full visual fidelity
- `Intl.NumberFormat` for crack-time formatting

Older browsers will still run the analyzer; some glass effects may degrade gracefully.

---

## License

This project is provided for educational use. You may adapt it for personal or commercial projects. Attribution is appreciated but not required.
