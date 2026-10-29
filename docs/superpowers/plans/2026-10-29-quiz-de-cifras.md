# Quiz de Cifras — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an offline-capable mobile PWA where the user pastes Cifra Club chord sheets, edits their order/chords, and plays a multiple-choice "next chord" quiz while listening on Spotify.

**Architecture:** Plain ES modules, no build. Pure logic (chord detection, paste parser, editor operations, quiz session, storage/backup) lives in `js/core/` and is unit-tested with `node --test`. DOM views live in `js/ui/` and render from a single in-memory state, persisted to `localStorage`. A service worker caches the app shell for offline use; hosted on GitHub Pages under a sub-path, so every URL is relative.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules), Node 24 built-in test runner (`node --test`) for core tests, Chrome DevTools for manual UI checks, GitHub Pages.

**Spec:** `docs/design.md` (mockups: `.superpowers/brainstorm/905-1793287524/content/telas.html`, `editor-v2.html`)

## Global Constraints

- Mobile portrait first; must work at 360px width with touch. No horizontal page scroll (the cifra block itself may scroll horizontally).
- Works offline after first load (service worker + manifest, installable via "Adicionar à tela inicial").
- No build step; no runtime dependencies. All URLs relative (`./…`), because GitHub Pages serves at `/<repo>/`.
- All UI text in Brazilian Portuguese with correct accents.
- Quiz options come **only** from chords of the song itself; if the song has fewer distinct chords than the chosen option count, show fewer buttons.
- Lyrics are never editable.
- Stanzas with `counts: false` (Intro by default) are shown but never produce questions and are excluded from "N" in "acorde X de N".
- Stars update only on a full run with no jumps. Stars: ≥90% → 3, ≥70% → 2, ≥40% → 1, else 0.
- Destructive actions (delete song, import-replace) confirm via an in-app dialog — never `alert`/`confirm`/`prompt`.
- Visual: dark purple theme and colors from the mockups (`--bg:#1a1530; --card:#2a2250; --card2:#352b66; --txt:#f4f0ff; --mut:#a99fd0; --pri:#ffb627; --ok:#2ed47a; --err:#ff4d6d; --blu:#5ec8ff; --pink:#ff7ad9`), rounded UI font (Fredoka), monospace for the cifra (JetBrains Mono), both self-hosted; system fallbacks if fonts fail.

## Review Focus

1. **Portuguese lyric lines made only of chord-like words** (e.g. a lyric line that is just `E A`) — rule stays simple: a line is a chord line iff every token is a chord; such a lyric becomes a chord line, which the user can fix in the editor (delete the line). Pin it with a test in Task 1 named `'all-chord-token lyric is treated as chord line (accepted limitation)'` asserting `parseChordLine('E A')` is not null, so the behavior is deliberate.
2. **Song with zero quiz questions** (only Intro, or everything marked "não conta") — tapping it must open the editor with a toast "Essa música ainda não tem acordes no jogo", not a broken quiz. Test in Task 4 (`createSession` on such a song → `finished === true`, `total === 0`) and handled in Task 8.
3. **Corrupt/foreign backup file on import** — must show an error and change nothing. Test in Task 5.
4. **Jump to a stanza that has no questions** (Intro or "não conta") or to the last stanza — lands on the next question after it, or ends the quiz. Test in Task 4.
5. **Windows line endings / tabs / non-breaking spaces in pasted text** shift chord columns — parser normalizes `\r\n` → `\n`, `\t` → spaces up to the next multiple of 4 columns, ` ` → space. Test in Task 2.

---

## File Structure

```
index.html                 app shell, loads js/app.js as module
manifest.webmanifest
sw.js                      service worker (cache-first app shell)
css/app.css
fonts/                     Fredoka + JetBrains Mono woff2 (OFL)
icons/icon-192.png, icon-512.png, icon.svg
js/core/chords.js          chord token / chord line detection
js/core/parser.js          paste text → song stanzas
js/core/model.js           ids, factories, clone helpers
js/core/edit.js            pure editor operations + undo history
js/core/quiz.js            questions, options, session, stars
js/core/store.js           persistence, export/import
js/ui/dom.js               tiny h() element helper, dialog, toast
js/ui/home.js              Minhas músicas + settings/backup
js/ui/paste.js             Colar cifra
js/ui/editor.js            editor screen
js/ui/play.js              quiz screen
js/app.js                  state, router (hash-based), boot, SW registration
tests/*.test.js            node --test
tests/fixtures/exemplo.txt  sample paste (from the user's screenshot)
package.json               { "type": "module", "scripts": { "test": "node --test tests/" } }
```

## Data model (shared by all tasks)

```js
// Song
{ id: string, title: string, createdAt: number, best: { stars: 0|1|2|3, pct: number } | null, stanzas: Stanza[] }
// Stanza
{ id: string, name: string, counts: boolean, lines: Line[] }
// Line  (lyric may be ""; chords sorted by col)
{ id: string, lyric: string, chords: Array<{ name: string, col: number }> }
```

---

### Task 1: Project scaffold + chord detection

**Files:**
- Create: `package.json`, `.gitignore` (contains `.superpowers/`, `node_modules/`), `js/core/chords.js`, `js/core/model.js`
- Test: `tests/chords.test.js`

**Interfaces:**
- Produces:
  - `isChordToken(token: string): boolean`
  - `parseChordLine(line: string): Array<{name: string, col: number}> | null` — `null` if the line is not a chord line; decorations `|`, `-`, `(2x)`-style markers ignored.
  - `model.js`: `uid(): string`, `newLine(lyric='', chords=[]): Line`, `newStanza(name='', lines=[], counts=true): Stanza`, `newSong(title, stanzas): Song`, `cloneStanza(s): Stanza` / `cloneLine(l): Line` (deep copy with fresh ids).

- [ ] **Step 1:** `git init` in the project root; create `package.json` and `.gitignore` as above.
- [ ] **Step 2: Write failing tests** in `tests/chords.test.js`:

```js
for (const c of ['A','Am','F#m','G/B','F7M','C#m7(b5)','D4','E7','Bb','Gm','A9','Dsus4','Cadd9','Bº','B°','E7(9)','C/E','Ab7M'])
  test(`chord ${c}`, () => assert.ok(isChordToken(c)));
for (const w of ['ABRI','DE','AMOR','Eu','Am.','...ABRI','Em,','Bom','Ah'])
  test(`not chord ${w}`, () => assert.ok(!isChordToken(w)));
test('positions', () => assert.deepEqual(parseChordLine('Am                     F#m'), [{name:'Am',col:0},{name:'F#m',col:23}]));
test('leading spaces', () => assert.deepEqual(parseChordLine('                       Am'), [{name:'Am',col:23}]));
test('lyric is not chord line', () => assert.equal(parseChordLine('...VI O SOL NASCER LÁ FORA'), null));
test('ignores repeat marker', () => assert.deepEqual(parseChordLine('G  D (2x)'), [{name:'G',col:0},{name:'D',col:3}]));
test('empty line is not chord line', () => assert.equal(parseChordLine('   '), null));
```

- [ ] **Step 3:** Run `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement `chords.js` with a single anchored regex: root `[A-G]`, accidental `[#b]?`, optional quality (`m`, `M`, `maj`, `dim`, `aug`, `sus`, `add`, `º`, `°`, `+`, `-`), extensions of digits / `M` / `(…)` containing digits, `b`, `#`, `+`, `-`, optional bass `/[A-G][#b]?`. Implement `model.js` (`uid` via `crypto.randomUUID()`, available in Node 24 and browsers).
- [ ] **Step 5:** `npm test` → PASS.
- [ ] **Step 6:** Commit `feat: scaffold and chord detection`.

---

### Task 2: Paste parser

**Files:**
- Create: `js/core/parser.js`, `tests/fixtures/exemplo.txt` (first two stanzas + chorus of the screenshot in `docs/design.md`, preceded by a header line `Minha Canção - Artista`, a `Tom: Am` line, and an intro line `[Intro] Am F#m F Em`)
- Test: `tests/parser.test.js`

**Interfaces:**
- Consumes: `parseChordLine`, `newLine`, `newStanza`, `cloneStanza` (Task 1).
- Produces: `parseCifra(text: string): Stanza[]`

Rules (exact):
1. Normalize: `\r\n`/`\r` → `\n`; ` ` → space; tabs expanded to the next multiple of 4 columns.
2. Skip: tablature lines (`/^[EADGBe]\|/` or containing `|-` / `-|`), `Tom:`/`Afinação:`/`Capotraste` lines, and every non-chord line appearing **before the first chord line** (title/artist header).
3. Bracket labels `[Nome]` at line start: start a new stanza named `Nome`; the rest of the line (if any) is parsed as a chord line.
4. A chord line immediately followed by a non-blank, non-chord line → one `Line` with that lyric and those chords. A chord line followed by a blank/chord line/EOF → `Line` with `lyric: ''`. A lyric line without a chord line above → `Line` with `chords: []`.
5. Blank line(s) end the current stanza.
6. `(Nx)` (N = 2..9) either at the end of a line or alone on a line: strip it; when the stanza closes, append N−1 `cloneStanza` copies of it.
7. Intro: every line before the first `Line` with non-empty lyric goes into a single stanza `{ name: 'Intro', counts: false }` (merging any bracket name like `[Intro]`). If there are no such lines, no Intro stanza.
8. Empty stanzas are dropped. Stanza names default to `''`.

- [ ] **Step 1: Write failing tests:**

```js
const st = parseCifra(readFileSync('tests/fixtures/exemplo.txt','utf8'));
test('intro first, not counted', () => { assert.equal(st[0].name,'Intro'); assert.equal(st[0].counts,false);
  assert.deepEqual(st[0].lines[0].chords.map(c=>c.name), ['Am','F#m','F','Em']); });
test('header dropped', () => assert.ok(!JSON.stringify(st).includes('Tom:')));
test('first verse line', () => { const l = st[1].lines[0]; assert.equal(l.lyric,'ABRI A JANELA DO QUARTO'); assert.deepEqual(l.chords,[{name:'Am',col:23}]); });
test('stanzas split on blank lines', () => assert.equal(st[1].lines.length, 4));
test('(2x) duplicates stanza', () => { const s = parseCifra('G\nla la\nD\nle le (2x)'); assert.equal(s.length,2);
  assert.notEqual(s[0].id,s[1].id); assert.equal(s[1].lines[1].lyric,'le le'); });
test('chord line with no lyric', () => { const s = parseCifra('Am\nla\n\nF E Am'); assert.equal(s.at(-1).lines[0].lyric,''); });
test('lyric without chords kept', () => { const s = parseCifra('Am\nla\nsó letra'); assert.deepEqual(s[0].lines[1].chords,[]); });
test('CRLF + tabs + nbsp', () => { const s = parseCifra('Am\t F\r\nla la la la la la\r\n'); assert.deepEqual(s[0].lines[0].chords,[{name:'Am',col:0},{name:'F',col:5}]);
  assert.deepEqual(parseCifra('  G\nla la')[0].lines[0].chords,[{name:'G',col:2}]); });
test('empty input', () => assert.deepEqual(parseCifra('  \n\n'), []));
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `parseCifra` per the rules above.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: cifra paste parser`.

---

### Task 3: Editor operations + undo

**Files:**
- Create: `js/core/edit.js`
- Test: `tests/edit.test.js`

**Interfaces:**
- Consumes: model helpers (Task 1).
- Produces (all **pure**: take a `Song`, return a new `Song`; never mutate input). A line address is `{s: stanzaIndex, l: lineIndex}`.
  - `moveStanza(song, from, to)`, `duplicateStanza(song, s)` (copy inserted right after), `deleteStanza(song, s)`, `addStanza(song, at, name='')`, `renameStanza(song, s, name)`, `setCounts(song, s, counts)`
  - `moveLines(song, addrs, toS, toL)` — removes the addressed lines (any stanzas) and inserts them, in original order, at stanza `toS` before index `toL` (indices refer to the song **after** removal); empty source stanzas are dropped.
  - `duplicateLines(song, addrs)` — copies inserted right after the last selected line of each stanza group.
  - `deleteLines(song, addrs)` — empty stanzas dropped.
  - `linesToStanza(song, addrs)` — removes them and creates a new stanza containing them, placed right after the stanza of the first address.
  - `setChord(song, addr, i, name)`, `shiftChord(song, addr, i, delta)` (col clamped ≥0, chords re-sorted by col), `removeChord(song, addr, i)`, `addChord(song, addr, name, col)`
  - `distinctChords(song): string[]` — in order of first appearance.
  - `createHistory(limit = 30): { push(song), undo(): Song|null, canUndo(): boolean }`

- [ ] **Step 1: Write failing tests**, one per operation, asserting resulting lyric order / stanza count, e.g.:

```js
const song = newSong('t',[newStanza('A',[newLine('a1'),newLine('a2')]), newStanza('B',[newLine('b1')])]);
test('moveLines across stanzas', () => { const r = moveLines(song,[{s:0,l:0}],1,1);
  assert.deepEqual(r.stanzas.map(s=>s.lines.map(l=>l.lyric)), [['a2'],['b1','a1']]); });
test('moving last line drops empty stanza', () => assert.equal(moveLines(song,[{s:1,l:0}],0,0).stanzas.length,1));
test('duplicateStanza new ids', () => { const r = duplicateStanza(song,0); assert.equal(r.stanzas[1].name,'A'); assert.notEqual(r.stanzas[1].id,song.stanzas[0].id); });
test('linesToStanza', () => assert.deepEqual(linesToStanza(song,[{s:0,l:1}]).stanzas.map(s=>s.lines.length), [1,1,1]));
test('shiftChord clamps', () => { const s2 = addChord(song,{s:0,l:0},'G',0); assert.equal(shiftChord(s2,{s:0,l:0},0,-3).stanzas[0].lines[0].chords[0].col,0); });
test('input not mutated', () => { const before = JSON.stringify(song); deleteLines(song,[{s:0,l:0}]); assert.equal(JSON.stringify(song),before); });
test('history undo', () => { const h = createHistory(2); h.push(song); h.push(deleteStanza(song,1)); h.push(deleteStanza(song,0));
  assert.equal(h.undo().stanzas.length,1); assert.equal(h.undo(),null); });
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement (use `structuredClone` for immutability).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: pure editor operations and undo history`.

---

### Task 4: Quiz logic

**Files:**
- Create: `js/core/quiz.js`
- Test: `tests/quiz.test.js`

**Interfaces:**
- Consumes: `distinctChords` (Task 3).
- Produces:
  - `buildQuestions(song): Array<{s, l, c, answer: string}>` — every chord of every line of every stanza with `counts: true`, in order (repeats included).
  - `chordPool(song): string[]` — distinct chord names from counted stanzas.
  - `makeOptions(answer, pool, n, rng = Math.random): string[]` — length `min(n, pool.length)`, contains `answer` once, distinct, shuffled.
  - `starsFor(pct: number): 0|1|2|3` — thresholds from Global Constraints.
  - `createSession(song, n, rng = Math.random)` → session object (plain data) `{ questions, index, options, correct, wrong, streak, bestStreak, jumped, last: null | {choice, correct: boolean}, finished, total }`
  - `answer(session, choice): session` (records `last`, updates counters; ignored if `last` already set)
  - `next(session): session` (advance, recompute `options`, clear `last`, set `finished`)
  - `jumpTo(session, stanzaIndex): session` (index ← first question with `s >= stanzaIndex`; sets `jumped: true`; clears `last`; finishes if none)
  - `restart(session, song): session` (fresh session, `jumped: false`)
  - `result(session): { correct, total, pct, stars, bestStreak, countsForStars: !jumped }`

- [ ] **Step 1: Write failing tests:**

```js
test('intro excluded', () => { /* song: Intro(counts:false,[G D]) + verse [Am F#m] */ assert.deepEqual(buildQuestions(song).map(q=>q.answer), ['Am','F#m']); });
test('repeats are separate questions', ...);            // line chords [G,G] → 2 questions
test('options only from pool, fewer when small', () => { assert.equal(makeOptions('G',['G','C','D'],4).length,3);
  const o = makeOptions('G',['G','C','D','Em','Am'],4); assert.ok(o.includes('G')); assert.equal(new Set(o).size,4);
  assert.ok(o.every(x=>['G','C','D','Em','Am'].includes(x))); });
test('single-chord song → 1 option', () => assert.deepEqual(makeOptions('G',['G'],3),['G']));
test('stars thresholds', () => assert.deepEqual([0.9,0.89,0.7,0.4,0.39].map(starsFor),[3,2,2,1,0]));
test('streak and best', ...);                            // right,right,wrong,right → streak 1, bestStreak 2
test('double answer ignored', ...);
test('zero-question song finished immediately', () => { const s = createSession(introOnly,4); assert.equal(s.finished,true); assert.equal(s.total,0); });
test('jump to non-counted stanza lands on next question', ...);
test('jump past last question finishes', ...);
test('jump disables stars; restart re-enables', () => { /* result(jumped).countsForStars === false; result(restart(...)).countsForStars === true */ });
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement. `pct = correct / total` (0 when `total === 0`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: quiz session logic`.

---

### Task 5: Storage + backup

**Files:**
- Create: `js/core/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Produces:
  - `KEY = 'cifraquiz.v1'`; `DEFAULT_PREFS = { options: 4, showLyrics: true }`
  - `load(storage = globalThis.localStorage): { songs: Song[], prefs }` — missing/corrupt data → empty defaults (never throws).
  - `save(data, storage = globalThis.localStorage): void`
  - `exportJson(data): string` — `{ app: 'cifraquiz', version: 1, exportedAt, songs, prefs }`, pretty-printed.
  - `parseBackup(text): { songs, prefs }` — throws `Error('Arquivo de backup inválido')` unless `app === 'cifraquiz'`, `version === 1`, `songs` is an array of objects with `id`, `title`, `stanzas` array.
  - `mergeData(current, imported, mode: 'replace' | 'merge')` — replace: imported wholesale; merge: imported song replaces a current song with the same `id`, others appended; prefs kept from current on merge.
  - Backup filename: `cifras-backup-YYYY-MM-DD.json`.

- [ ] **Step 1: Write failing tests** with a fake storage `{ getItem, setItem }` backed by a `Map`: round-trip save/load; `load` on `'{garbage'` returns defaults; `parseBackup('{}')`, `parseBackup('not json')` and `parseBackup('{"app":"cifraquiz","version":1,"songs":[{"x":1}]}')` all throw that exact message; merge replaces same-id and appends new; replace drops old.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: storage and backup`.

---

### Task 6: App shell, home and paste screens

**Files:**
- Create: `index.html`, `css/app.css`, `js/app.js`, `js/ui/dom.js`, `js/ui/home.js`, `js/ui/paste.js`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  - `app.js` exports nothing; owns `state = { songs, prefs }`, `commit(mutator)` (applies change, `save()`s, re-renders), hash routes `#/` (home), `#/nova` (paste), `#/editar/<id>`, `#/jogar/<id>`. Each `js/ui/*.js` exports `render(root: HTMLElement, ctx)` where `ctx = { state, commit, go(hash), toast(msg), confirmDialog({title, text, ok, cancel}): Promise<boolean>, choiceDialog({title, text, options: [{label, value}]}): Promise<value|null> }`.
  - `dom.js`: `h(tag, props, ...children)`, `toast`, `confirmDialog`, `choiceDialog` (in-app overlays).

Behavior:
- Home (mockup `telas.html` tela 1): title "Minhas músicas"; option chips 2/3/4 bound to `prefs.options`; song cards (colored cover cycling through `--pink --blu --pri --ok`, title, "N acordes no jogo", stars from `best`); tap card → `#/jogar/<id>`; each card has a "✎" button → editor and a "🗑" button → `confirmDialog` → delete. Empty state: friendly message pointing to "＋ Colar cifra". FAB "＋ Colar cifra" → `#/nova`. ⚙️ opens a sheet with "Exportar backup" (download via `Blob` + `<a download>`) and "Importar backup" (`<input type=file accept=.json>` → `parseBackup` → `choiceDialog` "Substituir tudo" / "Juntar com as atuais" → `mergeData`; on error `toast('Arquivo de backup inválido')`).
- Paste: title input (required) + large monospace textarea + "Continuar"; parses with `parseCifra`; if result is empty → toast "Não encontrei acordes nesse texto"; else creates the song and goes to `#/editar/<id>`.

- [ ] **Step 1:** Implement files; CSS uses the Global Constraints tokens, Fredoka/JetBrains Mono with `system-ui` / `monospace` fallbacks (fonts added in Task 9).
- [ ] **Step 2:** `npm test` still PASS.
- [ ] **Step 3: Manual check** — serve with `npx --yes http-server -c-1 -p 8080 .` (or `python -m http.server 8080`), open in Chrome DevTools device mode at 360×740: paste `tests/fixtures/exemplo.txt` → lands on `#/editar/<id>` (placeholder ok); back home shows the card; change chips → reload → choice persisted; export downloads JSON; import of that file with "Juntar" keeps one copy; import of a random `.json` shows the error toast; delete asks in-app confirmation. No console errors.
- [ ] **Step 4:** Commit `feat: app shell, home, paste and backup UI`.

---

### Task 7: Editor screen

**Files:**
- Create: `js/ui/editor.js`; Modify: `css/app.css`

**Interfaces:**
- Consumes: `edit.js` operations + `createHistory` (Task 3), `ctx` (Task 6).

Behavior (mockup `editor-v2.html` A and B):
- Header: ← back (saves), song title (tap to rename via `choiceDialog`-style text input in `dom.js` if needed), 💾 save + toast "Salvo".
- Each stanza: colored block (color by index), header with name (tap to rename), selo "não conta" when `counts:false` plus a toggle "Conta no jogo", buttons ⧉ duplicar, 🗑 apagar (confirm), ⋮⋮ drag handle.
- Each line: monospace `<pre>` with chord row (chords absolutely positioned by `col` in `ch` units, colored `--pri`) above lyric row (not editable); ⋮⋮ handle on the left.
- Drag (pointer events, works with touch, `touch-action: none` on handles): lines can be dropped between any two lines of any stanza; stanzas between stanzas. Show a drop indicator. Long lists auto-scroll near edges.
- Selection mode ("☑️ Selecionar"): checkboxes on lines; bottom bar "Duplicar", "Mover" (then tap a drop slot to place), "Virar estrofe", "Apagar"; header shows "N selecionadas" and ✕ to exit.
- Tap a chord → popup: grid of `distinctChords(song)` (current highlighted) + "✎" (type new chord, validated with `isChordToken`, error toast otherwise); "⟵ mover" / "mover ⟶" (`shiftChord` ±1); "🗑 tirar". Tap empty space in a chord row → add chord at that column (same grid).
- Bottom bar outside selection: "☑️ Selecionar", "＋ Estrofe" (opens the "Ir para"-style list of existing stanzas; picking one appends a `duplicateStanza` copy at the end — lyrics can't be typed, so a new stanza is always a copy), "↶ Desfazer" (disabled when `!canUndo()`).
- Every operation: `history.push(current)` then apply, then `commit`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npm test` PASS.
- [ ] **Step 3: Manual check** at 360px with touch emulation, using the fixture song: drag a line into another stanza; drag a stanza to the end; select 2 lines → Duplicar → they appear after originals; select → Virar estrofe; change `F#m` to `F`; shift a chord right twice; remove a chord; add a chord on an empty spot; toggle "Conta no jogo" on a stanza; undo 3 times restores; reload page → changes persisted; lyric text cannot be edited. No console errors.
- [ ] **Step 4:** Commit `feat: chord sheet editor`.

---

### Task 8: Quiz screen

**Files:**
- Create: `js/ui/play.js`; Modify: `css/app.css`

**Interfaces:**
- Consumes: `quiz.js` (Task 4), `ctx`, `prefs.options`, `prefs.showLyrics`.

Behavior (mockups `telas.html` tela 2, `editor-v2.html` C):
- On open: `createSession(song, prefs.options)`; if `total === 0` → `toast('Essa música ainda não tem acordes no jogo')` and `go('#/editar/<id>')`.
- Top: ✕ (back home), title, ⏸ menu; gradient progress bar; "acorde X de N"; "✅ a · ❌ e · 🔥 s".
- Stanza name pill (when the current stanza has a name).
- Lyrics card (if `showLyrics`): previous line at 40% opacity; current line with already-answered chords visible, the asked chord replaced by a highlighted **?** at its column, later chords hidden. When the previous line belongs to a non-counted stanza, its chords show normally (reference only).
- Options: 2×2 grid of big buttons (one column when 2 options looks better is the builder's call). Correct tap → button green, auto-advance after 700 ms. Wrong tap → tapped red, correct green, label "toque pra seguir"; next tap anywhere advances. Short CSS shake/pop animations.
- ⏸ menu sheet: "Reiniciar", "Ir para…" (list of all stanzas: name or "Estrofe N", first ~30 chars of first lyric, non-counted ones marked "não conta"), "Mostrar letra"/"Esconder letra" (persists `prefs.showLyrics`), "Sair".
- End screen: big "a de N", stars (animated), "Maior sequência 🔥 b"; if `!countsForStars` show "Partida com pulos — estrelas não mudam"; else update `song.best` if better (by `pct`). Buttons "Jogar de novo" and "Voltar".

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npm test` PASS.
- [ ] **Step 3: Manual check** at 360px: play the fixture with 4, then 2 options; intro shows no **?**; wrong answer flow; hide lyrics persists across reload; "Ir para…" a later stanza → end screen shows the "com pulos" note and stars unchanged; full clean run updates stars on home; a song with all stanzas "não conta" redirects to the editor with the toast. No console errors.
- [ ] **Step 4:** Commit `feat: quiz screen`.

---

### Task 9: PWA — offline, icons, fonts

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`, `fonts/*.woff2`; Modify: `index.html`, `js/app.js`, `css/app.css`

Decisions:
- Manifest: `name: "Quiz de Cifras"`, `short_name: "Cifras"`, `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `orientation: "portrait"`, `background_color`/`theme_color: "#1a1530"`, icons 192/512 PNG (`purpose: "any maskable"`) + SVG. `index.html` also gets `<link rel="apple-touch-icon" href="icons/icon-192.png">` and `<meta name="theme-color">`.
- Icon: guitar-pick shape in `--pri` on `--bg` with a "?" — PNGs generated by any no-dependency means (e.g. a one-off Node script using `zlib` to write the PNG, or rendering the SVG in headless Chrome); the generator script is not committed.
- Fonts: download Fredoka (400–700) and JetBrains Mono (500, 700) latin woff2 files from Google Fonts into `fonts/`, declare `@font-face` with `font-display: swap`. If the download is impossible, skip and keep system fallbacks (note it in the commit message).
- `sw.js`: `const CACHE = 'cifraquiz-v1'`; precache every shell file (explicit list, relative paths); cache-first for same-origin GETs, network fallback; delete old caches on `activate`; `self.skipWaiting()` + `clients.claim()`. Registered from `app.js` with `navigator.serviceWorker.register('./sw.js')`. **Bump `CACHE` whenever any shell file changes** (comment at top of `sw.js` says so).

- [ ] **Step 1:** Implement.
- [ ] **Step 2: Manual check** in Chrome DevTools: Application → Manifest shows no errors and installability OK; Service Workers active; check "Offline" + reload → app loads with fonts and saved songs; Lighthouse PWA/installability has no failures.
- [ ] **Step 3:** Commit `feat: offline PWA support`.

---

### Task 10: Publish on GitHub Pages

**Files:**
- Create: `README.md` (pt-BR: what it is, how to install on the phone, how to run tests, reminder to bump `CACHE` in `sw.js` on changes)

- [ ] **Step 1:** Write README; commit `docs: readme`.
- [ ] **Step 2:** Check `gh auth status`. If not logged in, ask the user to run `! gh auth login`. **Ask the user to confirm** the repo name (suggest `quiz-de-cifras`) and that it will be **public** (GitHub Pages on free accounts requires a public repo) before creating anything.
- [ ] **Step 3:** `gh repo create <name> --public --source . --push`, then enable Pages from `main` / root: `gh api -X POST repos/<owner>/<name>/pages -f "source[branch]=main" -f "source[path]=/"`.
- [ ] **Step 4:** Wait for the build (`gh api repos/<owner>/<name>/pages/builds/latest` → `status: built`), open `https://<owner>.github.io/<name>/` and confirm the app loads, SW registers and manifest is valid at the sub-path.
- [ ] **Step 5:** Give the user the URL and phone install steps (Android Chrome: menu → "Adicionar à tela inicial"/"Instalar app"; iPhone Safari: Compartilhar → "Adicionar à Tela de Início"), plus a reminder to export a backup now and then.
