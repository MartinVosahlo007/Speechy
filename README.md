# Předčítač Českého Textu

Next.js frontend pro české čtení textu a lokální FastAPI backend s TTS enginy **OmniVoice** a **Supertonic**. Projekt dnes podporuje:

- webový vývojový režim
- produkční standalone web build
- Windows desktop shell, který si sám startuje frontend i backend

## Požadavky

- Node.js 18+
- npm
- Python 3.11+
- lokálně připravené Python závislosti pro `tts-server/`

## Instalace

```bash
npm install
```

Backend používá vlastní Python prostředí. Pokud ještě není připravené, nainstaluj závislosti:

```bash
cd tts-server
python -m pip install -r requirements.txt
```

Pro OmniVoice běh je v praxi potřeba alespoň:

```bash
python -m pip install "transformers==5.3.0" accelerate
```

Pro přepínač **Supertonic** v UI je navíc potřeba Python balíček (po instalaci restartujte backend / `spustit-aplikaci.bat`):

```bash
python -m pip install supertonic
```

ASR fallback pro `create_voice_clone_prompt(ref_audio=..., ref_text=None)` navíc vyžaduje funkční `torchcodec` + kompatibilní FFmpeg runtime. Na Windows to znamená mít dostupné FFmpeg DLL z "full-shared" buildu; bez toho render skončí chybou při načítání `libtorchcodec`.

## Transcript sidecar fallback

OmniVoice prompt creation používá tento pořadník:

1. najde vybraný hlasový `.wav`
2. zkusí načíst transcript sidecar se stejným stemem
3. pokud transcript existuje, použije `ref_audio + ref_text` a nespouští ASR
4. pokud transcript neexistuje, teprve potom použije ASR fallback
5. pokud ASR fallback selže, projekt/render skončí s jasnou backend chybou místo visení

Příklady sidecarů:

```text
tts-server/voices/speaker.wav
tts-server/voices/speaker.txt

tts-server/voices/my-voice.wav
tts-server/voices/my-voice.txt
```

Soubor `.txt` musí být prostý UTF-8 text. Prázdný transcript se bere jako chybějící.

Bundled demo voices `speaker.wav` až `speaker6.wav` mají připravené transcript sidecary, takže v tomto repu už nevyžadují ASR fallback pro voice-clone prompt.

## Spuštění ve vývoji

Preferovaný start:

```bash
node scripts/dev-up.mjs
```

Skript spustí backend na pevném portu `18100` a frontend na prvním volném portu od `3417`, vypíše URL a ukončí oba procesy, pokud jeden z nich spadne.

Ruční spuštění:

1. Spusť backend:

```bash
cd tts-server
python server.py
```

2. Ve druhém terminálu spusť frontend:

```bash
npm run dev
```

3. Otevři aplikaci na URL, kterou frontend vypíše v terminálu.

Pokud backend neběží na `http://localhost:18100`, nastav před spuštěním frontendu:

```bash
NEXT_PUBLIC_TTS_API_BASE_URL=http://jiný-host:18100
```

Volitelné lokální overrides pro vývoj/desktop:

```bash
SPEECHY_BACKEND_PORT=19100
SPEECHY_FRONTEND_PORT=3517
```

Health endpoint backendu:

```text
http://localhost:18100/api/health
```

## Produkční web build

```bash
npm run build
npm run start
```

`npm run build` vytváří Next standalone build v `.next/standalone`.

## Desktop build pro Windows

Lokální desktop shell staví na Electronu a při spuštění si sám zvedne:

- TTS backend
- produkční frontend server
- jedno desktop okno aplikace

Vývojové spuštění desktop shellu:

```bash
npm run desktop:start
```

Portable desktop build:

```bash
npm run desktop:build
```

Výstup:

```text
desktop-dist/Speechy-2.0.0.exe
desktop-dist/win-unpacked/Speechy.exe
```

Důležitá poznámka: desktop build zatím není úplně self-contained. Pořád očekává funkční lokální Python + backend závislosti pro `tts-server/`.

Desktop verze ukládá svoje runtime cache, projekty, nahrané hlasy a logy do user-data složky Windows, ne do kořene repa.

## Ověření

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run desktop:pack` nebo `npm run desktop:build` při práci na desktop shellu

## Co aplikace umí

- vložit nebo upravit český text a uložit ho jako znovuotevíratelný projekt
- přepínat TTS engine **OmniVoice** (klon z WAV) nebo **Supertonic** (vestavěné hlasy + JSON styly)
- vybrat výchozí hlas, nahrát vlastní `.wav` a přiřadit různé hlasy jednotlivým blokům textu
- generovat bloky progresivně na pozadí a začít přehrávat hned po prvním připraveném bloku
- znovu použít uložené blokové audio bez nového renderu při stejném textu, hlasu a nastavení
- přehrávat, pauznout, obnovit, zastavit a stáhnout výsledný WAV s blokovým zvýrazněním textu
- volitelně použít **AI agenta** (MiniMax nebo OpenRouter) pro návrh scénáře s více hlasy

## AI agent (volitelné)

Agent **nepoužívá TTS backend** — volá externí LLM přes Next.js API routes (`src/app/api/agent/`). Bez klíče agent nefunguje, **čtení textu ano**.

Do `.env` v kořeni projektu doplň podle zvoleného providera:

```bash
# MiniMax
MINIMAX_API_KEY=...
MINIMAX_MODEL=MiniMax-M2.7

# OpenRouter
OPENROUTER_API_KEY=...
OPENROUTER_DEFAULT_MODEL=...

# Volitelně: výchozí provider (minimax | openrouter)
AGENT_LLM_PROVIDER=openrouter
```

Po změně `.env` restartuj frontend (`spustit-aplikaci.bat` nebo `npm run dev`). V panelu agenta lze provider přepnout; OpenRouter model se vybírá v UI a ukládá lokálně v prohlížeči.

Detailní popis: [docs/KONCEPCNI_SPECIFIKACE.md](docs/KONCEPCNI_SPECIFIKACE.md) (sekce AI agent).

## Dokumentace a úklid

- Koncepční specifikace (produkt + technologie): [docs/KONCEPCNI_SPECIFIKACE.md](docs/KONCEPCNI_SPECIFIKACE.md)
- Mapa dokumentace a pravidel: [docs/README.md](docs/README.md)
- Úklid cache a buildů na disku: dvojklik na [uklid.bat](uklid.bat) (aplikace vypnutá; volitelně `uklid.bat tmp` pro dočasné rendery)

## Poznámky

- Frontend bez backendu naběhne, ale čtení zůstane nedostupné.
- Backend při prvním startu inicializuje OmniVoice runtime, takže start může trvat déle.
- První render může stáhnout OmniVoice/ASR modely z Hugging Face. Bez `HF_TOKEN` funguje i anonymní přístup, ale může být pomalejší.
- Vývojové logy webu se zapisují do `dev.log`, produkční web start do `server.log`.
