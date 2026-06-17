# Koncepční specifikace — Speechy (Předčítač českého textu)

Dokument popisuje **co aplikace je**, **co umí** a **jaké technologie používá**. Neřeší vnitřní strukturu kódu ani vrstvy architektury.

**Verze produktu v repu:** 2.0.0 (`package.json`)  
**Jazyk rozhraní:** čeština  
**Primární účel:** převod českého textu na mluvené slovo lokálně na vašem počítači  
**Ověřeno proti:** zdrojovému kódu v `src/`, `tts-server/`, `desktop/` (ne jen README)

---

## 1. Co to je

Speechy je **lokální český „předčítač“** — napíšete nebo vložíte text, aplikace ho rozdělí na části, vygeneruje řeč a přehraje ji. Umí ukládat **projekty** (text, hlasy, nastavení) a stáhnout výsledné audio jako WAV.

Běží jako:

| Forma | Popis |
|-------|--------|
| **Web ve vývoji** | prohlížeč + lokální servery (`node scripts/dev-up.mjs` nebo `spustit-aplikaci.bat`) |
| **Web produkčně** | standalone build Next.js (`npm run build` → `npm run start`) |
| **Windows desktop** | Electron obal, který sám spustí frontend i backend (portable EXE) |

Aplikace **neposílá váš text na cloud pro samotné čtení** — syntéza hlasu probíhá přes lokální Python backend. Výjimka je volitelný **AI agent** pro tvorbu scénářů (viz níže), který může volat externí LLM (**MiniMax** nebo **OpenRouter**).

**Aktivní TTS enginy v kódu:** pouze **OmniVoice** a **Supertonic**. Starší XTTS/Coqui vrstva už není registrovaným providerem.

---

## 2. Co uživatel umí dělat

### Text a projekty

- Vložit nebo upravit český text v editoru
- **Vyčistit text** — odstraní markdown, URL, emoji a další „šum“ (ne obecná korektura češtiny)
- **Rozdělit do bloků** — explicitní akce; bloky odpovídají odstavcům / segmentům pro render
- **Kopírovat** text do schránky
- **Smazat vše** v editoru
- Vytvářet, otevírat, přejmenovávat, připínat a mazat **projekty**
- Nastavit rychlost čtení, hlasitost a velikost textu

### Hlas a TTS engine

- Přepínat mezi dvěma lokálními enginy: **OmniVoice** (klonování z WAV) a **Supertonic** (vestavěné hlasy M1–M5, F1–F5 + vlastní JSON styly)
- Vybrat globální hlas; u OmniVoice nahrát vlastní **WAV** (+ volitelný textový sidecar `.txt` s přepisem)
- U Supertonicu importovat **JSON** styl hlasu (Voice Builder)
- Přiřadit **různé hlasy jednotlivým blokům** textu
- Pokud je Supertonic nedostupný (chybí balíček), UI přepínač ho zobrazí jako offline

### Přehrávání a export

- Spustit čtení dřív, než jsou hotové všechny bloky (progresivní generování)
- Pauza, pokračování, zastavení; klik na blok během přehrávání
- Zvýraznění právě čteného bloku v textu
- Stažení finálního **WAV** celého projektu
- Znovupoužití již vygenerovaného audio, pokud se nezměnil text ani hlas

### AI agent (volitelná funkce)

- Chat v češtině pro návrh nebo úpravu **audio scénáře** (více postav / hlasů)
- **Přiložit textový soubor** jako vstup (čte se jako prostý text)
- Po potvrzení vložit scénář do projektu jako bloky s přiřazenými hlasy
- LLM provider lze přepnout mezi **MiniMax** a **OpenRouter** v panelu agenta
- MiniMax vyžaduje `MINIMAX_API_KEY` v `.env`; model lze přepsat přes `MINIMAX_MODEL` (výchozí: `MiniMax-M2.7`)
- OpenRouter vyžaduje `OPENROUTER_API_KEY` v `.env`; seznam modelů se načítá dynamicky z API, výběr modelu se ukládá lokálně v prohlížeči
- Volitelně: `AGENT_LLM_PROVIDER` (výchozí provider), `OPENROUTER_DEFAULT_MODEL` (fallback model)
- Bez nakonfigurovaného providera agent nefunguje, **čtení textu ano**

---

## 3. Jak to funguje z pohledu uživatele (zjednodušeně)

```text
[Prohlížeč nebo Electron okno]
        │
        ▼
[Webová aplikace Speechy]  ──HTTP──►  [Lokální TTS server (port 18100)]
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
              OmniVoice                  Supertonic                  Projekty,
           (hlas z WAV)           (M1–M5, F1–F5 + JSON)           cache audio,
                                                                        hlasy
```

- Frontend zobrazuje UI a ovládání.
- Backend generuje audio, ukládá projekty a hlasy na disk.
- Modely TTS se stahují při prvním použití (cache v `tts-server/.model-cache/` nebo v desktopové user-data).
- V desktopové verzi Electron předá frontendu adresu backendu přes `window.speechyDesktop`.

---

## 4. Technologie — přehled s odkazy

Uvedené položky jsou **ověřeně používané** v aplikačním kódu. `package.json` obsahuje i další závislosti z původní šablony, které reader dnes neimportuje (Prisma, next-auth, většina Radix komponent atd.) — ty sem nepatří.

### 4.1 Základní běhové prostředí

| Technologie | Účel | Odkaz |
|-------------|------|--------|
| [Node.js](https://nodejs.org/) 18+ | frontend, skripty, Electron | https://nodejs.org/ |
| [npm](https://docs.npmjs.com/) | správa JS závislostí | https://docs.npmjs.com/ |
| [Python](https://www.python.org/) 3.11+ | TTS backend | https://www.python.org/ |

### 4.2 Frontend (webová část)

| Technologie | Účel | Odkaz |
|-------------|------|--------|
| [Next.js](https://nextjs.org/) 16 | webový framework, App Router, API route pro agenta | https://nextjs.org/ |
| [React](https://react.dev/) 18 | uživatelské rozhraní | https://react.dev/ |
| [TypeScript](https://www.typescriptlang.org/) | typovaný JavaScript | https://www.typescriptlang.org/ |
| [Tailwind CSS](https://tailwindcss.com/) 4 | styly rozhraní | https://tailwindcss.com/ |
| [Radix UI Toast](https://www.radix-ui.com/primitives/docs/components/toast) | notifikace | https://www.radix-ui.com/ |
| [Lucide](https://lucide.dev/) | ikony v UI | https://lucide.dev/ |
| [Google Fonts](https://fonts.google.com/) (Inter, Roboto Mono) | písma přes `next/font` | https://fonts.google.com/ |
| Prohlížečové API | přehrávání audio, `localStorage` pro nastavení čtečky | [MDN](https://developer.mozilla.org/) |

### 4.3 Desktop (Windows)

| Technologie | Účel | Odkaz |
|-------------|------|--------|
| [Electron](https://www.electronjs.org/) 42 | desktopové okno, spuštění frontend + backend | https://www.electronjs.org/ |
| [electron-builder](https://www.electron.build/) | sestavení portable EXE (`Speechy-2.0.0.exe`) | https://www.electron.build/ |

### 4.4 Backend (lokální TTS server)

| Technologie | Účel | Odkaz |
|-------------|------|--------|
| [FastAPI](https://fastapi.tiangolo.com/) | HTTP API (projekty, hlasy, render, health) | https://fastapi.tiangolo.com/ |
| [Uvicorn](https://www.uvicorn.org/) | ASGI server | https://www.uvicorn.org/ |
| [Pydantic](https://docs.pydantic.dev/) v2 | validace requestů / modelů | https://docs.pydantic.dev/ |

### 4.5 Umělá inteligence a audio (lokálně)

| Technologie | Účel | Odkaz |
|-------------|------|--------|
| [PyTorch](https://pytorch.org/) + CUDA | inference OmniVoice na GPU | https://pytorch.org/ |
| [Hugging Face Hub](https://huggingface.co/docs/hub) | stahování modelů | https://huggingface.co/docs/hub |
| [Transformers](https://huggingface.co/docs/transformers) 5.3 + [Accelerate](https://huggingface.co/docs/accelerate) | Python závislosti pro OmniVoice (viz README) | https://huggingface.co/docs/transformers |
| [OmniVoice](https://huggingface.co/k2-fsa/OmniVoice) | výchozí engine — klon hlasu z WAV | https://huggingface.co/k2-fsa/OmniVoice |
| [supertonic-py](https://github.com/supertone-inc/supertonic-py) | druhý engine — model `supertonic-3` | https://github.com/supertone-inc/supertonic-py |
| [NumPy](https://numpy.org/) | práce s audio signálem | https://numpy.org/ |
| [SoundFile](https://python-soundfile.readthedocs.io/) | čtení/zápis WAV | https://python-soundfile.readthedocs.io/ |
| [torchcodec](https://github.com/pytorch/torchcodec) + [FFmpeg](https://ffmpeg.org/) | volitelný ASR fallback u OmniVoice, pokud chybí `.txt` sidecar | https://ffmpeg.org/ |

**OmniVoice v repu:** kód modelu se načítá z balíčku `omnivoice` (složka `OmniVoice/` na disku, pokud existuje, nebo instalace podle lokálního setupu). Model `k2-fsa/OmniVoice` se cachuje pod `tts-server/.model-cache/`.

### 4.6 Externí služba (jen pro AI agenta)

| Služba | Účel | Odkaz |
|--------|------|--------|
| [MiniMax API](https://www.minimaxi.com/) | chat pro generování scénářů (`api.minimaxi.chat`) | https://www.minimaxi.com/ |
| [OpenRouter](https://openrouter.ai/) | alternativní LLM provider pro agenta (`openrouter.ai/api/v1`) | https://openrouter.ai/ |

Čtení textu (TTS) tato služba **nepoužívá**.

---

## 5. Síť a porty (lokální běh)

| Služba | Výchozí adresa | Poznámka |
|--------|----------------|----------|
| Frontend (vývoj) | http://localhost:3417 | `dev-up.mjs` může zvolit jiný volný port od 3417 |
| Frontend (desktop) | dynamický localhost | Electron hledá volný port v rozsahu kolem 3417 |
| TTS backend | http://localhost:18100 | pevný ve vývoji; desktop může zvolit jiný v rozsahu kolem 18100 |
| Health kontrola | http://localhost:18100/api/health | |

**Důležité proměnné prostředí:**

| Proměnná | Účel |
|----------|------|
| `NEXT_PUBLIC_TTS_API_BASE_URL` | adresa TTS backendu pro frontend |
| `SPEECHY_BACKEND_PORT` / `SPEECHY_FRONTEND_PORT` | výchozí porty pro dev / desktop |
| `TTS_SERVER_PORT` | port Python serveru |
| `TTS_DEFAULT_PROVIDER` | výchozí engine (`omnivoice` nebo `supertonic`) |
| `TTS_SERVER_STORAGE_DIR` | kam backend ukládá projekty a render data |
| `TTS_SERVER_MODEL_CACHE_DIR` | cache modelů (desktop) |
| `TTS_SERVER_VOICES_DIR` | nahrané hlasy (desktop) |
| `HF_TOKEN` | volitelně rychlejší stahování z Hugging Face |
| `MINIMAX_API_KEY`, `MINIMAX_MODEL` | AI agent (MiniMax) |
| `OPENROUTER_API_KEY`, `OPENROUTER_DEFAULT_MODEL`, `AGENT_LLM_PROVIDER` | AI agent (OpenRouter) |
| `SPEECHY_PYTHON`, `SPEECHY_NODE` | ruční cesta k Pythonu/Node v desktop EXE |

---

## 6. Co se ukládá na disku

### Vývoj (web)

| Obsah | Umístění |
|-------|----------|
| TTS modely | `tts-server/.model-cache/` |
| Nahrané hlasy (WAV) | `tts-server/voices/` |
| Supertonic JSON styly | `tts-server/voices/supertonic/` |
| Projekty + render cache | `tts-server/tmp-jobs/projects/` (prázdné po `uklid.bat tmp`; backend složku znovu vytvoří při renderu) |
| Dočasné joby | `tts-server/tmp-jobs/` |

### Desktop (Windows, Electron user-data)

Typicky `%APPDATA%\Speechy\` (přesně podle Electron `userData`):

| Obsah | Umístění |
|-------|----------|
| Projekty + render cache | `tts-server-data/projects/projects/` |
| Modely | `tts-server-data/model-cache/` |
| Hlasy | `tts-server-data/voices/` |
| Logy desktopu | `desktop-logs/` |

### Prohlížeč

| Obsah | Umístění |
|-------|----------|
| Nastavení čtečky | `localStorage` |

---

## 7. Omezení a předpoklady (důležité pro provoz)

- **CUDA / GPU:** backend při startu inicializuje OmniVoice a **bez dostupné CUDA typicky vůbec nenastartuje** (`ensure_gpu_ready` v `omnivoice_runtime.py`). Supertonic je volitelný druhý engine, ale základ backendu dnes počítá s GPU.
- **Desktop EXE** není plně „vše v jednom“ — potřebuje nainstalovaný Python 3 s backend závislostmi (viz [README.md](../README.md)).
- **Supertonic** vyžaduje `pip install supertonic` a restart backendu; bez něj je v UI offline.
- **OmniVoice** potřebuje `transformers==5.3.0` a `accelerate` (README).
- **První render** může trvat déle (stahování modelů).
- Frontend **bez běžícího backendu** se zobrazí, ale čtení nefunguje.
- **ASR fallback** (hlas bez `.txt` sidecaru) na Windows často vyžaduje FFmpeg „full-shared“ build kvůli torchcodec.

---

## 8. Související dokumenty

| Dokument | Obsah |
|----------|--------|
| [README.md](../README.md) | instalace, spuštění, FFmpeg, sidecary |
| [docs/README.md](README.md) | mapa dokumentace a pravidel pro vývoj |

---

*Poslední kontrola proti kódu: červen 2026. Při větších změnách v `tts-server/` nebo reader UI tento dokument znovu ověřte.*
