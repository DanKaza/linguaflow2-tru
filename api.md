# LinguaFlow API Reference (Frontend)

Base URL: `https://lg.tixrouter.my.id/api/v1` (production) or `http://127.0.0.1:3010/api/v1` (on the VPS).

## Ready-made client

`frontend-client.js` in this repo is a zero-dependency ES module that wraps everything below (auth with token storage, TTS as Blob, STT, Sensei chat, the live pipeline, admin endpoints, and a `recordAudio()` mic helper). Use it instead of writing fetch calls by hand:

```js
import LinguaFlow, { recordAudio } from './frontend-client.js';

const lf = new LinguaFlow();
await lf.login('runa', '...');               // token stored automatically

const blob = await lf.tts('こんにちは');      // -> audio Blob
const { text } = await lf.stt(blob, 'ja');   // -> transcript
const reply = await lf.sensei('How do I say hi?');
const { translation } = await lf.translate('Terima kasih'); // direction detected

// Live voice session: raw PCM over a WebSocket, no transcribe step.
// Capture and playback live in dashboard/src/lib/live-audio.ts and
// dashboard/public/pcm-worklet.js - this is the transport, not the audio stack.
const live = lf.live({ voice: 'Aoede' });
live.onEvent = (event) => {
  if (event.type === 'audio') queuePcm16(event.data);   // 24kHz PCM16, base64
};
live.sendAudio(micPcm16Base64);                         // 16kHz PCM16, base64
```

Admin Dashboard: `https://lg.tixrouter.my.id/dashboard/`

## Models and providers

What answers each endpoint. Every id is overridable in `/root/lg/.env`, so a
model retirement is an env change and a restart rather than a code edit.

| Surface | Model | Variable |
|---------|-------|----------|
| `POST /chat` and `POST /sensei/chat` | `gemini-3.1-flash-lite` | `GEMINI_CHAT_MODEL` (falls back to `GEMINI_TEXT_MODEL`) |
| `POST /translate` | `gemini-3.1-flash-lite` | `GEMINI_TRANSLATE_MODEL` |
| `WS /sensei/live` | `gemini-2.5-flash-native-audio-latest` | `GEMINI_LIVE_MODEL` |
| `POST /stt/transcribe` | `whisper-large-v3` on Groq, then SenseVoice (ja/ko/zh) and local Whisper | `GROQ_API_KEYS`, `SENSEVOICE_URL`, `WHISPER_LOCAL_URL` |
| `POST /tts/synthesize` | Microsoft Edge neural voices | no model id - the voice follows the language spoken |

Every model id in use is listed here rather than hardcoded at the call site. The
live model is the 2.5 Flash Live family under its native-audio name; there is no
`gemini-2.5-flash-live` id, and the API rejects that spelling for
`bidiGenerateContent`.

### Why the lite tier

`gemini-3.1-flash-lite` is the cheapest Gemini that still answers on these keys,
and on a free tier it has the most headroom: the chat and translate paths share
one quota pool, and every prompt here is short and well specified, so the larger
flash tiers buy latency and quota pressure rather than better answers.

The id is pinned rather than taken from `gemini-flash-lite-latest` on purpose.
That alias currently resolves to a model that rejects `thinkingConfig`, so a
process using it answers `400` on every call - measured, not assumed:

```
gemini-3.1-flash-lite        thinkingBudget 0  ->  200, thoughts 0
 gemini-flash-lite-latest    thinkingBudget 0  ->  400 invalid argument
                             no thinkingConfig ->  200, thoughts 59
```

Every caller disables thinking (`thinkingBudget: 0`). That is what makes a lite
model suitable here: translating a phrase is a restatement and answering a
student is one to three sentences, so deliberate reasoning spends output budget
and latency for no gain. On the 3.x flash tiers it was actively harmful - with a
150-token ceiling, a Sensei reply once spent 143 of them thinking and returned a
fragment of its own instructions.

### About `gemini-2.5-flash`

The id still exists on Google's [Gemini Enterprise Agent
Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/2-5-flash)
(GA, released 17 June 2025, discontinued 16 October 2026, and it does **not**
support the Live API). It is not callable with this project's AI Studio keys: a
request answers `404 - This model models/gemini-2.5-flash is no longer available
to new users. Please update your code to use models/gemini-3.6-flash`. The same
applies to `gemini-2.5-flash-lite` and `gemini-2.5-pro`. Google's message names
the larger flash tier; this service runs the lite one for the reasons above.

Two things worth knowing before switching:

- `models.list` still **advertises** `gemini-2.5-flash` with `generateContent`,
  so the list is not evidence that a key may call it. Only a real request is.
- Moving to Vertex AI is a different credential, not a different model id: it
  needs a Google Cloud project with billing, a service account, and the SDK
  configured with `vertexai: true`, `project` and `location`. The AI Studio API
  keys this service uses are not accepted there.

## Dashboard login credentials

| Field | Value |
|-------|-------|
| URL | `https://lg.tixrouter.my.id/dashboard/` |
| Username | `runa` |
| Password | stored in `/root/lg/.env` as `SEED_ADMIN_PASSWORD` (generated at deploy time, never committed) |

The first admin account is seeded on API startup from `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_EMAIL` in `/root/lg/.env`. To read the current password on the VPS:

```bash
grep SEED_ADMIN /root/lg/.env
```

To change it, edit `SEED_ADMIN_PASSWORD` in `/root/lg/.env` and restart: `systemctl restart linguaflow-api` (the seeder refreshes the hash when the password differs).

Interactive docs: Swagger UI at `/docs` (development builds only).

## Authentication

Admin endpoints require a JWT issued by the login endpoint:

```
Authorization: Bearer <accessToken>
```

- Access token: 7 days. Refresh token: 30 days.
- Store the token in `localStorage` (the dashboard uses key `lf_admin_token`).
- On any `401` response, clear the stored token and redirect to login.
- CORS is **open to every origin** by default: the response reflects the caller's `Origin` and `Vary: Origin` is set, so a browser client on any host (localhost, preview deployments, the frontend's production domain) can call the API directly. Authentication is a Bearer token rather than a cookie, so an open policy does not expose a session. To restrict it, put a comma separated list in `CORS_ORIGIN` in `/root/lg/.env` and restart.
- Response headers a browser may read: `X-TTS-Translated-From`, `X-TTS-Translated-To`, `X-TTS-Translation-Latency-Ms`, `X-TTS-Synth-Text`, `X-RateLimit-*`, `Retry-After`.
- All `/admin/*` routes (except `/admin/auth/login` and `/admin/auth/refresh`) require the token and the `ADMIN` or `MODERATOR` role.

### Login

```http
POST /admin/auth/login
Content-Type: application/json

{ "username": "runa", "password": "..." }
```

Response:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 604800,
  "refreshExpiresIn": 2592000,
  "user": { "id": "cuid", "username": "runa", "role": "ADMIN" }
}
```

### Verify token

```http
GET /admin/auth/verify
Authorization: Bearer <accessToken>
```

Response: `{ "valid": true, "user": { "username": "runa", "role": "ADMIN" } }`

### Refresh access token

```http
POST /admin/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJ..." }
```

Response: `{ "accessToken": "eyJ...", "expiresIn": 604800 }`

## Error format

Every failure shares one shape:

```json
{ "error": "Human readable message", "code": "ERROR_CODE" }
```

The HTTP status carries the category, `code` is the stable identifier to switch
on, and `error` is the sentence to show a user. One place shapes all of them
(`src/plugins/error-handler.ts`), including Fastify's own failures and the
replies routes write by hand, so the shape holds on every endpoint.

| Code | Status | When |
|------|--------|------|
| `BAD_REQUEST` | 400 | Bad input the schema cannot express: an unknown language code, malformed JSON, text over 5000 characters |
| `VALIDATION_ERROR` | 400 | A JSON schema rejected the request; `details` lists every failure |
| `UNAUTHORIZED` | 401 | Missing, expired or invalid token |
| `NOT_FOUND` | 404 | Unknown route, or a record that does not exist |
| `CONFLICT` | 409 | The change collides with existing data |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Body sent with a content type the API cannot parse |
| `NOT_ACCEPTABLE` | 406 | A multipart endpoint got a non-multipart request |
| `AI_ERROR` / `TTS_ERROR` / `STT_ERROR` | 502 | An upstream provider failed |
| `INTERNAL_ERROR` | 500 | Unexpected failure; the detail is in the server log, not the response |

Routes with something more specific to say use their own code, such as
`USERNAME_EXISTS` or `LAST_ADMIN`.

A schema rejection is a `400` `VALIDATION_ERROR`: `error` is the first failure and
`details` is the list from Fastify's validator.

```json
{
  "error": "text: must have required property 'text'",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "instancePath": "",
      "schemaPath": "#/required",
      "keyword": "required",
      "params": { "missingProperty": "text" },
      "message": "must have required property 'text'"
    }
  ]
}
```

Malformed JSON is a `400` `BAD_REQUEST`:

```json
{ "error": "Body is not valid JSON but content-type is set to 'application/json'", "code": "BAD_REQUEST" }
```

### Rate limiting

**Not enforced.** `src/plugins/rate-limit.ts` defines a global limit (200/min per
IP) and stricter per-endpoint ones (login 5/min, TTS 20/min, STT 10/min, Sensei
15/min), but none of them run: the plugin is registered without `fastify-plugin`,
so its `onRequest` hook lands in an encapsulated context that owns no routes.
There are no `X-RateLimit-*` headers and the API never answers `429` on its own,
except for any route that throws `RateLimitError` itself.

The limit that does bite belongs to the provider: each Gemini key is its own
project with its own quota, and on the free tier the flash models allow only a
couple of dozen text requests per day, shared between translation and the Sensei
chat. Exhausting it surfaces as a `502` `AI_ERROR`, not a `429`. Add more keys to
`GEMINI_API_KEY`, or move translation to a lighter model with
`GEMINI_TRANSLATE_MODEL` (see `.env.example`).

## TTS

### Synthesize (sync, returns audio)

```http
POST /tts/synthesize
Content-Type: application/json

{
  "text": "こんにちは",
  "voice": "ja-JP-NanamiNeural",     // optional
  "format": "mp3",                   // optional
  "translate": true,                 // optional, speak it in another language
  "from": "auto",                    // optional, source language of the text
  "to": "auto"                       // optional, language to speak
}
```

- `text` (required): 1..5000 chars
- `voice`: any id from `GET /tts/voices`; omit or `"auto"` for a voice that matches the language spoken (Japanese when nothing is translated)
- `format`: `mp3` (default) | `wav` | `ogg`
- `translate`, `from`, `to`: see [Speak it in another language](#speak-it-in-another-language)

Response: raw audio bytes with `Content-Type: audio/mpeg`, headers `X-TTS-Latency-Ms`
and `X-TTS-Synth-Text` (the text that was actually spoken, percent-encoded).

```js
const res = await fetch(`${BASE}/tts/synthesize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, voice }),
});
const blob = await res.blob();
audioEl.src = URL.createObjectURL(blob);
```

#### Speak it in another language

With `translate`, the phrase is translated first and the translation is what
gets spoken, so a sentence typed in Indonesian comes out as Japanese audio. One
call, one audio clip, no round trip through `/translate`.

- `translate` is a switch: `true`, `1`, `on`, `yes`, `auto`. Anything else (`false`, `off`, `0`, `no`, `none`, omitted) speaks the text as written.
- A language code works in its place, so `translate: "ja"` is the short form of `translate: true, to: "ja"`.
- `from` pins the source language; `auto` (the default) reads it from the text itself.
- `to` picks the language to speak; `auto` (the default) follows the source: Indonesian becomes Japanese, Japanese becomes Indonesian, anything else becomes Indonesian.
- The voice follows the language that ends up being spoken whenever `voice` is omitted or `"auto"`. A voice pinned by the caller is used as given, so pair it with the target language.
- The pair and the translation are reported in the response headers: `X-TTS-Translated-From`, `X-TTS-Translated-To` and `X-TTS-Translation-Latency-Ms`.
- A direction that would not translate anything is a `400` (`Source and target language are the same`); an unknown code is a `400` (`Unknown target language: xx`). A translation failure fails the request rather than speaking the wrong language (`502 AI_ERROR`).

```bash
BASE=https://lg.tixrouter.my.id/api/v1

# Indonesian text -> Japanese speech
curl -X POST $BASE/tts/synthesize -H 'Content-Type: application/json' \
  -d '{"text":"Selamat pagi, apa kabar?","translate":true}' -o japanese.mp3

# Japanese text -> Indonesian speech, with an Indonesian voice
curl -X POST $BASE/tts/synthesize -H 'Content-Type: application/json' \
  -d '{"text":"私は日本語を勉強しています。","translate":"id","voice":"id-ID-GadisNeural"}' -o indonesian.mp3
```

```js
// What was spoken comes back in the headers.
const res = await fetch(`${BASE}/tts/synthesize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Selamat pagi', translate: true }),
});
res.headers.get('X-TTS-Translated-From');  // 'id'
res.headers.get('X-TTS-Translated-To');    // 'ja'
decodeURIComponent(res.headers.get('X-TTS-Synth-Text')); // 'おはようございます'
```

### Synthesize (async, queued)

```http
POST /tts/synthesize/async
Content-Type: application/json

{
  "text": "...",
  "voice": "ja-JP-NanamiNeural",   // optional
  "format": "mp3",                 // optional
  "translate": true,               // optional, same options as the sync endpoint
  "from": "auto",
  "to": "auto"
}
```

Response: `{ "requestId": "...", "jobId": "...", "status": "queued", "translate", "targetLanguage" }`

The translation happens before the job is queued: a wrong language code fails the
request instead of the job, and the voice can follow the language spoken. The job
itself carries the text to synthesize, so the worker does not translate again.

Poll the status:

```http
GET /tts/status/:requestId
```

Response: `{ "id", "status": "PENDING|PROCESSING|COMPLETED|FAILED", "duration", "fileSize", "latencyMs", "error", "createdAt", "translation", "translationLanguage" }`

The last two are `null` unless a translation was asked for: `translation` is the
text that was spoken and `translationLanguage` the language it is in.

### List voices

```http
GET /tts/voices
```

Response: `{ "voices": [{ "id", "name", "gender", "locale", "language" }] }`

Available voices: Nanami/Keita (ja), Gadis/Ardi (id), Jenny/Guy (en), SunHi/InJoon (ko), Xiaoxiao/Yunxi (zh).

## STT

### Transcribe (sync, multipart)

```http
POST /stt/transcribe
Content-Type: multipart/form-data

file: <audio file, max 25MB>
language: ja          // optional, spoken language hint for the engines, default ja
translate: true       // optional, also translate the transcript
to: auto              // optional, translation target, default auto
```

```js
const form = new FormData();
form.append('file', audioBlob, 'recording.webm');
form.append('language', 'id');
form.append('translate', 'true');   // Indonesian speech in, Japanese text out
const res = await fetch(`${BASE}/stt/transcribe`, { method: 'POST', body: form });
const { text, translation, sourceLanguage, targetLanguage } = await res.json();
```

```json
{
  "text": "Selamat pagi, apa kabar?",
  "language": "id",
  "duration": 2.52,
  "latencyMs": 636,
  "source": "groq",
  "translation": "おはようございます、お元気ですか？",
  "sourceLanguage": "id",
  "targetLanguage": "ja",
  "translationLatencyMs": 1216,
  "translationError": null
}
```

- `source` tells which engine won: `groq` (cloud) or `local` (SenseVoice/Whisper on the VPS).
- Languages: `ja`, `en`, `id`, `ko`, `zh` (`GET /stt/languages` for the list).

#### Translating the transcript

The translation is a step on top of the transcription, in the same request. Only
the target is named: the source is what the engine decoded the audio as, so a
caller does not have to name the language it just got back.

- `translate` is a switch: `true`, `1`, `on`, `yes`, `auto`. Anything else (`false`, `off`, `0`, `no`, `none`, omitted) means transcript only.
- A language code works in its place, so `translate=ja` is the short form of `translate=true&to=ja`.
- `to` picks the target and turns translation on by itself. `auto` (the default) follows the source: Indonesian becomes Japanese, Japanese becomes Indonesian, anything else becomes Indonesian. Any code from `GET /translate/languages` is accepted, aliases and BCP-47 variants included.
- The languages come back as `sourceLanguage` / `targetLanguage`, alongside `translationLatencyMs`.
- Asking for the language the audio is already in is a `400` (`Source and target language are the same`); an unknown code is a `400` (`Unknown target language: xx`).
- A provider failure does **not** lose the transcript: the response is still `200` with `translation: null` and the reason in `translationError`.

Both directions, one option each:

```bash
BASE=https://lg.tixrouter.my.id/api/v1

# Indonesian speech -> Japanese text
curl -X POST $BASE/stt/transcribe \
  -F "file=@rekaman-id.webm" -F "language=id" -F "translate=true"

# Japanese speech -> Indonesian text
curl -X POST $BASE/stt/transcribe \
  -F "file=@rekaman-ja.webm" -F "language=ja" -F "to=id"

# Pin a target outside the pair
curl -X POST $BASE/stt/transcribe \
  -F "file=@rekaman-id.webm" -F "language=id" -F "translate=ko"
```

### Transcribe (async, queued)

```http
POST /stt/transcribe/async
Content-Type: multipart/form-data

file: <audio file>
language: ja
translate: true       // optional
to: ja                // optional
```

Response: `{ "requestId", "jobId", "status": "queued", "translate", "targetLanguage" }`,
then poll `GET /stt/status/:requestId`, which returns `translation` and
`translationLanguage` once the job is done. A bad target is rejected with a `400`
at the time of the request, not by the worker later.

## Translate

Text translation between any pair of the 30 languages in the catalogue.
Nothing is required beyond the text: the source language is read from the text
itself and the target follows it. Pin either side with `from`/`to` to force it.

```http
POST /translate
Content-Type: application/json

{ "text": "Selamat pagi, apa kabar?", "from": "auto", "to": "auto" }
```

Response:

```json
{
  "translation": "おはようございます、お元気ですか？",
  "sourceLanguage": "id",
  "targetLanguage": "ja",
  "detected": true,
  "model": "gemini-2.5-flash",
  "latencyMs": 1216
}
```

- `text` (required): 1..5000 characters.
- `from`: `auto` (default) or a code from the table below. `auto` reads the language from the text itself.
- `to`: `auto` (default) or a code. `auto` follows the source: `id` -> `ja`, `ja` -> `id`, anything else -> `id`.
- Codes are case-insensitive. A BCP-47 variant falls back to its base language (`zh-Hant` -> `zh`, `pt-BR` -> `pt`) and a few common aliases are accepted: `jp`, `in`, `iw`, `fil`, `cmn`.
- `detected`: `true` when the source language was inferred rather than given.
- Pinning the same language on both sides is a `400` (`Source and target language are the same`); an unknown code is a `400` (`Unknown source language: xx`).
- The text is translated, never answered: a phrase that happens to be a question comes back as a question in the other language.

Detected direction means one call covers both ways:

```bash
BASE=https://lg.tixrouter.my.id/api/v1

# Indonesian -> Japanese
curl -X POST $BASE/translate -H 'Content-Type: application/json' \
  -d '{"text":"Selamat pagi, apa kabar?"}'

# Japanese -> Indonesian
curl -X POST $BASE/translate -H 'Content-Type: application/json' \
  -d '{"text":"私は日本語を勉強しています。"}'

# Korean -> Indonesian (the fallback target for languages outside the pair)
curl -X POST $BASE/translate -H 'Content-Type: application/json' \
  -d '{"text":"안녕하세요, 잘 지내세요?"}'

# Pin both sides
curl -X POST $BASE/translate -H 'Content-Type: application/json' \
  -d '{"text":"Terima kasih banyak","from":"id","to":"ko"}'
```

```js
const { translation, sourceLanguage, targetLanguage } = await fetch(`${BASE}/translate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, from: 'auto', to: 'auto' }),
}).then((r) => r.json());
```

### Supported languages

```http
GET /translate/languages
```

Response: `{ "languages": [{ "code", "name", "nativeName" }], "defaultTargets": { "id": "ja", "ja": "id", ... }, "autoDetect": true, "maxLength": 5000 }`

Read this instead of hardcoding the list: the endpoint is the source of truth,
the table below is the same data at the time of writing.

| Code | Language | Code | Language | Code | Language |
|------|----------|------|----------|------|----------|
| `id` | Indonesian | `ja` | Japanese | `en` | English |
| `ko` | Korean | `zh` | Chinese | `ms` | Malay |
| `jv` | Javanese | `su` | Sundanese | `tl` | Filipino |
| `th` | Thai | `vi` | Vietnamese | `hi` | Hindi |
| `bn` | Bengali | `ta` | Tamil | `ar` | Arabic |
| `fa` | Persian | `tr` | Turkish | `he` | Hebrew |
| `ru` | Russian | `uk` | Ukrainian | `pl` | Polish |
| `nl` | Dutch | `de` | German | `fr` | French |
| `es` | Spanish | `pt` | Portuguese | `it` | Italian |
| `sv` | Swedish | `el` | Greek | `sw` | Swahili |

`defaultTargets` maps each code to where it goes when `to` is `auto`: `id` ->
`ja`, `ja` -> `id`, everything else -> `id`.

## AI Sensei

### Chat

```http
POST /sensei/chat
Content-Type: application/json

{
  "message": "How do I say thank you?",
  "history": [{ "role": "user", "parts": "hello" }, { "role": "model", "parts": "こんにちは！" }]
}
```

- `history` optional, max 20 items, roles are `user` | `model`.
- Responses are short tutor-style sentences (Japanese practice), cached for 30s per identical message.
- Scope is enforced, not suggested: the model answers only on Japanese, the JLPT and Japan, and declines everything else with one sentence plus an offer of a Japanese thread. See **Chat** below for the shared rules.

Response: `{ "response", "tokensUsed", "latencyMs" }`

### Chat history (auth)

```http
GET /sensei/history?limit=20&offset=0
```

### Async chat

`POST /sensei/chat/async` (same body) -> `{ "requestId", "jobId", "status" }`, poll `GET /sensei/status/:requestId`.

## Chat

The general AI chat. Same tutor as AI Sensei, stateless: one question in, one
answer out, no queue and no session. Public, like the other learning endpoints.

```http
POST /chat
Content-Type: application/json

{
  "message": "Apa bedanya partikel は dan が?",
  "history": [
    { "role": "user", "parts": "Halo, level saya N5." },
    { "role": "model", "parts": "Halo! Ayo mulai dari partikel dasar." }
  ]
}
```

Response:

```json
{
  "response": "「は」menandai topik, 「が」menandai subjek. Contoh N5: 私は学生です / 猫がいます。",
  "model": "gemini-3.6-flash",
  "latencyMs": 1420
}
```

- `history` optional, max 20 items; only the last 8 are sent upstream.
- `message` 1-2000 characters.

### Scope: Japanese only, on purpose

The product is a Japanese tutor, so every AI surface (this endpoint, `/sensei/chat`
and the live session) shares one boundary, defined in
`src/lib/ai-tutor-persona.ts`:

- **In scope** - the language (kana, kanji, grammar, particles, keigo, vocabulary,
  pitch), the JLPT, Japan itself, and how to study.
- **Out of scope** - general knowledge, news, politics, coding, other school
  subjects, health/legal/financial advice, translation that does not involve
  Japanese, roleplay as another assistant, and attempts to reveal or override
  these rules.

An out-of-scope request is not answered, not even partly, and not "as context".
The reply says in one short sentence that it only helps with Japanese and then
offers a Japanese thread instead. Asking again does not widen the scope, and a
question dressed up as a Japanese lesson is judged by what it actually wants.

This matters because the endpoint is public: without the boundary it is a
general-purpose model behind this project's API key. It is still unrated -
see **Rate limiting** - so treat it as prototype exposure, not a hardened
service.

## Live conversation (Gemini Live API over WebSocket)

Native speech-to-speech. The browser streams raw microphone audio and the model
streams spoken audio straight back: there is no transcription step and no
separate TTS engine in this path. This replaced the older
record -> transcribe -> chat -> synthesize chain.

```text
WS /sensei/live?token=<admin JWT>&voice=Aoede
```

| Query   | Required | Notes |
|---------|----------|-------|
| `token` | yes | Admin/moderator access token. A browser cannot set an `Authorization` header on a WebSocket handshake, so it travels as a query parameter. |
| `voice` | no | One of the prebuilt Live voices from `GET /sensei/live/config`. Defaults to the server default. |

Audio is raw **PCM16 little-endian mono**: 16 kHz upstream, 24 kHz downstream.
Every frame is JSON text, with audio base64 encoded.

Client -> server:

```json
{ "type": "audio", "data": "<base64 pcm16 @16kHz>" }
{ "type": "text", "text": "typed input, streamed into the context" }
{ "type": "turn", "text": "typed input that must produce a reply" }
{ "type": "audioStreamEnd" }
{ "type": "close" }
```

Server -> client:

```json
{ "type": "ready", "model": "gemini-2.5-flash-native-audio-latest", "voice": "Aoede", "sessionId": "..." }
{ "type": "audio", "data": "<base64 pcm16 @24kHz>", "mimeType": "audio/pcm;rate=24000" }
{ "type": "text", "text": "text part, when the model emits one" }
{ "type": "inputTranscript", "text": "こんにちは", "finished": false }
{ "type": "outputTranscript", "text": "こんにちは！", "finished": false }
{ "type": "interrupted" }
{ "type": "turnComplete", "userText": "...", "aiText": "...", "language": "ja", "latencyMs": 1900 }
{ "type": "goingAway", "timeLeft": "10s" }
{ "type": "error", "message": "..." }
{ "type": "closed", "reason": "..." }
```

Notes:

- `language` is derived from the transcript (`ja`, `id`, `en`, `unknown`). The
  model itself follows whoever is speaking; the label only names it for the UI
  and for the stored turn.
- `text` and `turn` are not the same. With automatic voice activity detection
  the model answers when it hears speech, so streamed text alone can sit in the
  context without producing a turn.
- `interrupted` means the student spoke over the model: stop queued playback.
- `goingAway` means the session is close to its server-side limit; open a new
  one rather than letting it go silent.
- Close codes: `4401` missing or invalid token, `4403` not an admin account,
  `4500` the Gemini session could not be opened.

### Live config (no auth)

```http
GET /sensei/live/config
```

Returns the model id, the prebuilt voices, and the exact audio format for both
directions. Read it before connecting rather than hardcoding a voice.

### Live history

```http
GET /sensei/live/history
```

Returns the 20 most recent stored turns.

## Admin endpoints (auth required)

### Monitoring

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Totals, today counts, **per-day counts for the last 14 days**, recent 10 requests per type, Groq key stats |
| GET | `/admin/live` | Requests from the last 30s (the live feed; poll every 1-5s) |
| GET | `/admin/queue` | BullMQ queue status: waiting/active/completed/failed/paused |
| GET | `/admin/queue/dead-letter?queue=&limit=` | Failed jobs |
| POST | `/admin/queue/retry/:queue/:jobId` | Retry a failed job |
| GET | `/admin/health` | DB/Redis/Groq latency checks |
| GET | `/admin/logs?type=&status=&search=&limit=` | Stored request history, newest first (the dashboard's History page) |

`/admin/live` response: `{ "requests": [{ "id", "type": "tts|stt|sensei", "text?", "transcription?", "message?", "voice?", "language?", "latencyMs", "status", "createdAt" }] }`

`/admin/logs` reads all three request tables in one call, since the page shows
them side by side. Query: `type` = `tts|stt|sensei|all`, `status` =
`success|failed|pending|all`, `search` = a substring of the stored text
(case-insensitive; it looks at the text/transcript and its translation for TTS
and STT, and at the question and answer for chats), `limit` = 1-200. Per type it
selects the columns that belong to that row - voice and format for TTS, the read
tongue and audio duration for STT, model and token count for chats:

```json
{
  "logs": [
    {
      "id": "clz1a2b3c0001", "type": "tts", "status": "success", "latencyMs": 1620,
      "error": null, "createdAt": "2026-09-16T09:12:04.881Z",
      "text": "Selamat pagi, apa kabar?", "voice": "ja-JP-NanamiNeural", "format": "mp3",
      "duration": 1.92, "fileSize": 20480,
      "translation": "おはようございます、お元気ですか？", "translationLanguage": "ja"
    },
    {
      "id": "clz1a2b3c0003", "type": "sensei", "status": "success", "latencyMs": 1420,
      "error": null, "createdAt": "2026-09-16T09:11:20.104Z",
      "message": "Apa bedanya partikel は dan が?", "response": "「は」menandai topik...",
      "model": "gemini-3.1-flash-lite", "tokensUsed": 0
    }
  ],
  "total": 2,
  "counts": { "tts": 19, "stt": 18, "sensei": 32 },
  "filters": { "type": "all", "status": "all", "search": null, "limit": 50 }
}
```

`counts` is the whole table per type regardless of the filters, so a caller can
label a tab with how much exists; `total` is how many rows match the filters in
force. Rows older than `REQUEST_RETENTION_DAYS` are swept every six hours, so
both numbers shrink on their own.

`/admin/stats` returns a `daily` block for the overview chart: every one of the last 14 UTC days, oldest first, days with no traffic present as zeroes (so the axis has no gaps), each day carrying its own busiest hour per request type:

```json
{
  "daily": {
    "days": 14,
    "series": [
      {
        "date": "2026-09-15",
        "ttsRequests": 7,
        "sttRequests": 6,
        "senseiChats": 14,
        "total": 27,
        "busiestHour": {
          "ttsRequests": { "hour": 9, "requests": 4 },
          "sttRequests": null,
          "senseiChats": { "hour": 20, "requests": 6 }
        },
        "hourly": [0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 6, 0, 0, 0]
      }
    ],
    "busiestHour": {
      "ttsRequests": { "hour": 9, "requests": 12 },
      "sttRequests": null,
      "senseiChats": { "hour": 20, "requests": 18 }
    }
  }
}
```

- `series[].busiestHour[type]` is that **day's** busiest hour for that type; `daily.busiestHour[type]` is the hour of the day carrying the most requests **across the whole window**. Hours are UTC, 0-23, and `null` means no traffic for that type.
- `series[].hourly` is all types combined, 24 numbers per day, index 0 = 00:00 UTC. It drives the hour grid on the overview.
- The counts come from the `tts_requests`, `stt_requests` and `sensei_chats` tables. Every path writes a row: synchronous `/tts/synthesize` and `/stt/transcribe`, their `/async` variants, and each completed AI Sensei turn. Failed attempts are recorded too, with `status: FAILED`, so a broken provider shows up rather than silently disappearing.
- Rows written for a synchronous request are best effort - if the insert fails the response is unaffected, and the reason is logged rather than returned.

### Testing tools

| Method | Path | Body |
|--------|------|------|
| POST | `/admin/test/tts` | JSON `{ text, voice }` -> raw audio bytes |
| POST | `/admin/test/stt` | multipart `file` + `language` -> `{ text, language, latencyMs }` |
| GET | `/admin/voices` | Same voice list as `/tts/voices` |
| GET | `/admin/languages` | STT language list |

### Live chat (Gemini Live)

The live conversation is a WebSocket, not an admin REST endpoint — see
[Live conversation](#live-conversation-gemini-live-api-over-websocket). It needs
an admin token, the same one the rest of the admin API uses. The old
`POST /admin/gemini-live/chat` SSE endpoint no longer exists.

### Accounts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/accounts` | List admin/moderator accounts |
| POST | `/admin/accounts` | Create `{ username, password, email?, role: "ADMIN"\|"MODERATOR" }` |
| PATCH | `/admin/accounts/:id` | Update `{ username?, email?, role?, isActive? }` |
| DELETE | `/admin/accounts/:id` | Delete account |
| POST | `/admin/accounts/:id/reset-password` | `{ password }` |
| POST | `/admin/accounts/bulk-delete` | `{ ids: string[] }` |
| POST | `/admin/accounts/bulk-role` | `{ ids, role }` |
| POST | `/admin/accounts/bulk-status` | `{ ids, isActive }` |
| GET | `/admin/accounts/stats` | Account counts by role |

### Users

`GET /admin/users?limit=20&offset=0&search=` -> `{ users, total }`

### API keys

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/apikeys` | List keys (prefix only, never the full key) |
| POST | `/admin/apikeys` | Create `{ name, permissions?, rateLimit?, whitelistIPs?, whitelistDomains?, expiresInDays? }` -> response includes `key` (the full `lf_...` key, shown once) |
| PATCH | `/admin/apikeys/:id` | Update key config |
| DELETE | `/admin/apikeys/:id` | Revoke key |
| POST | `/admin/apikeys/:id/regenerate` | New secret for the same key record |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/settings` | All system settings (keys: `publicApi`, `authRequired`, `rateLimit`, `groqKeys`, `geminiKeys`, `whitelistIps`, `email*`, ...) |
| PUT | `/admin/settings` | Full replace of provided keys |
| PATCH | `/admin/settings` | Partial update |

Only known keys are persisted; unknown keys are ignored.

### Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/preferences` | Current user's notification preferences |
| PUT | `/admin/preferences` | Update preferences |
| POST | `/admin/preferences/reset` | Reset to defaults |
| GET | `/admin/preferences/all` | All users' preferences |
| POST | `/admin/notifications/subscribe` | Push subscription `{ subscription, userId? }` |
| DELETE | `/admin/notifications/unsubscribe` | `{ endpoint }` |
| POST | `/admin/notifications/test` | Send a test notification |

### Security & backups

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/security/events` | Failed-request events (last 50) |
| GET | `/admin/security/blocked` | Blocked IPs (empty: no Log model yet) |
| GET | `/admin/security/stats` | Event counts |
| GET | `/admin/backups` | List backup files |
| POST | `/admin/backups/create` | Run a backup now |
| POST | `/admin/backups/restore/:filename` | Restore a backup |
| DELETE | `/admin/backups/:filename` | Delete a backup |
| POST | `/admin/backups/cleanup` | Enforce retention |
| GET | `/admin/backups/verify/:filename` | Verify gzip integrity |
| GET | `/admin/backups/schedule` | Cron schedule info |

## Public health endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness: `{ status, timestamp, uptime, pid }` |
| GET | `/health/ready` | Readiness: DB + Redis + memory checks, 503 when degraded |
| GET | `/health/metrics` | Memory/uptime snapshot |
| GET | `/health/deep` | Slower: also checks SenseVoice and Whisper engines |

## Frontend integration notes

1. **Auth wrapper** — one `authFetch` helper that injects `Authorization` and handles 401 (clear token, redirect). See `dashboard/src/lib/api.ts` for the pattern used by the dashboard.
2. **Polling** — Overview polls 4 endpoints every 5s via `Promise.allSettled` so one failure never blanks the page; history panels poll `/admin/live` every 5s.
3. **Audio playback** — sync TTS returns a Blob; async/live flows return base64. Convert with `URL.createObjectURL(blob)` or a `data:` URI.
4. **Recording** — for the upload endpoints (`/stt/transcribe`, `/admin/test/stt`) prefer `MediaRecorder` with `audio/webm;codecs=opus`, fall back through `audio/webm` -> `audio/ogg;codecs=opus` -> `audio/mp4`. Feature-detect with `MediaRecorder.isTypeSupported`.
5. **Multipart** — never set `Content-Type` manually on FormData requests; the browser adds the boundary.
6. **WebSocket** — the live conversation is a WebSocket (`ws` on the server), because the Gemini Live API is WebSocket-only and audio has to flow upstream. `MediaRecorder` does not apply there: capture is an `AudioWorklet` emitting 16-bit PCM at 16 kHz (`dashboard/public/pcm-worklet.js`) and playback is a scheduled `AudioBuffer` queue (`dashboard/src/lib/live-audio.ts`). `dashboard/src/pages/LivePage.tsx` is the reference implementation.

## Deployment (this VPS)

| Component | Detail |
|-----------|--------|
| API service | `linguaflow-api.service` (systemd), runs `node dist/index.js` on `127.0.0.1:3010` |
| Database | Docker `linguaflow-postgres` on `127.0.0.1:5432` |
| Cache/Queue | Docker `linguaflow-redis` on `127.0.0.1:6379` |
| HTTPS | Cloudflare Tunnel `34290c2b...` -> `lg.tixrouter.my.id` (TLS at the edge; ingress in `/etc/cloudflared/config.yml`) |
| Env | `/root/lg/.env` (mode 600): DB, Redis, JWT secret, CORS, seed admin |
| Retention | `REQUEST_RETENTION_DAYS` (default 30, `0` disables). A sweep runs every 6 hours and deletes `tts_requests`, `stt_requests` and `sensei_chats` older than the window; it logs only when it removes something |

Common commands:

```bash
systemctl restart linguaflow-api     # restart API (also re-seeds admin if password changed)
journalctl -u linguaflow-api -f      # API logs
docker restart linguaflow-postgres linguaflow-redis
cd /root/lg && npx tsc               # rebuild after code changes
```