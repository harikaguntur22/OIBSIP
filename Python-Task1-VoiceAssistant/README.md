# Voice Assistant

A Python-based voice assistant that listens to spoken commands and responds with useful actions. Supports both beginner-tier features (voice recognition, greetings, time/date, web search, text-to-speech) and advanced-tier features (NLP intent recognition, email, reminders, live weather, knowledge lookup, and custom commands).

## Features

### Beginner Tier
- **Voice input** via `speech_recognition` (microphone)
- **Greeting response** — say "hello" and get a time-aware greeting
- **Time & date** — ask "what time is it?" or "what's the date?"
- **Web search** — say "search for Python tutorials" to open a browser search
- **Error handling** — if speech isn't understood, the assistant asks you to repeat
- **Text-to-speech** — all responses are spoken aloud via `pyttsx3`

### Advanced Tier (all beginner features, plus)
- **Natural language understanding** — intent is parsed from free-form sentences using NLTK-based tokenization and cosine-similarity matching, not just keyword matching
- **Email** — send an email by voice using `smtplib` (configure a test Gmail account)
- **Timed reminders** — say "remind me in 5 minutes to check the oven" and get an audible alert
- **Live weather** — fetch and read out weather using the OpenWeatherMap API
- **General knowledge QA** — ask "what is photosynthesis" and get a spoken answer from Wikipedia/DuckDuckGo
- **Custom commands** — say "add a custom command" to teach the assistant new responses, or edit `config.json` directly
- **Privacy documentation** — see the Privacy section below

## Setup

### Prerequisites

1. **Python 3.10+**
2. **System dependencies** (Linux/Ubuntu):
   ```bash
   sudo apt update
   sudo apt install portaudio19-dev python3-pyaudio espeak-ng ffmpeg
   ```
   - macOS: `brew install portaudio espeak`
   - Windows: PyAudio wheels are pre-built — no extra system packages needed

3. **Microphone** connected and enabled

### Installation

```bash
pip install -r requirements.txt
```

### Configuration

Edit `config.json` to customize the assistant:

| Field | Description |
|-------|-------------|
| `voice_rate` | Speech speed (words per minute, default 170) |
| `voice_volume` | Volume 0.0–1.0 (default 1.0) |
| `voice_id` | Voice index (0 = first available voice) |
| `weather_api_key` | Your OpenWeatherMap API key (get one free at [openweathermap.org](https://openweathermap.org/api)) |
| `email_address` | Sender email for voice email feature |
| `email_password` | Sender email app password (use an app-specific password, not your real password) |
| `smtp_server` | SMTP server (default: `smtp.gmail.com`) |
| `smtp_port` | SMTP port (default: 587) |
| `custom_commands` | Pre-defined custom command triggers and responses |

### Running

```bash
python main.py
```

Say a command and the assistant will respond. Say **"goodbye"** or press **Ctrl+C** to stop.

## Example Commands

| You say... | Assistant does... |
|---|---|
| "Hello" | Greets you based on time of day |
| "What time is it?" | Speaks the current time |
| "What's the date today?" | Speaks today's date |
| "Search for cute cat videos" | Opens browser with Google search |
| "Send an email" | Walks you through composing and sending an email |
| "Remind me in 5 minutes to drink water" | Sets a timer and speaks a reminder |
| "What's the weather in London?" | Fetches and reads out live weather |
| "What is the theory of relativity?" | Looks up and reads a knowledge answer |
| "Add a custom command" | Teaches the assistant a new trigger/response pair |

## Privacy Considerations

This assistant processes the following data:

| Data | Where it's processed | How it's used |
|------|---------------------|---------------|
| **Voice audio** | Captured locally by `speech_recognition`, sent to Google Web Speech API for transcription | Converted to text, then discarded. Audio is not stored. |
| **Transcribed text** | Processed in-memory on your machine | Used to determine intent and execute commands. Not stored unless it's a custom command you explicitly add. |
| **Email credentials** | Stored in `config.json` on your local machine | Used only to send emails you request. **Use an app-specific password**, never your real email password. |
| **Weather API key** | Stored in `config.json` | Sent to OpenWeatherMap to fetch weather data. |
| **Custom commands** | Stored in `config.json` | Persisted locally so your custom commands survive restarts. |
| **Web search queries** | Sent to Google via your browser | Opens in your default browser. |

**Recommendations:**
- Use a dedicated test email account with an app-specific password — never your primary email password
- Do not commit `config.json` with real credentials to version control
- The assistant does not record, store, or transmit your voice audio beyond the transcription API call
- All processing happens on your local machine except the external API calls noted above

## Project Structure

```
voice-assistant/
├── main.py              # Entry point — main listening loop
├── voice_engine.py      # Speech-to-text and text-to-speech
├── nlu.py               # Natural language understanding (intent + entity extraction)
├── commands.py          # Command handlers (greeting, time, email, weather, etc.)
├── config_manager.py    # Loads/saves config and custom commands
├── config.json          # User configuration and custom commands
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## Troubleshooting

- **"No microphone found"** — ensure your microphone is connected and selected as the system default
- **Speech recognition fails** — try speaking clearly in a quiet environment; the assistant recalibrates for ambient noise
- **pyttsx3 no audio** — install `espeak-ng` (Linux) or `espeak` (macOS)
- **Email fails** — enable "less secure apps" or use an app-specific password for Gmail
- **Weather fails** — verify your OpenWeatherMap API key is valid and active (can take a few hours after signup)
