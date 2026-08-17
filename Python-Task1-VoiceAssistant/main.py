#!/usr/bin/env python3
"""Voice Assistant — main entry point.

Listens for spoken commands, recognizes intent using NLU, and responds
with actions (greeting, time, web search, email, weather, reminders, etc.)

Run:  python main.py
Stop: say "goodbye" or press Ctrl+C
"""

import sys
import signal

from voice_engine import VoiceEngine
from config_manager import ConfigManager
from nlu import classify_intent, extract_entity
from commands import handlers


CONFIDENCE_THRESHOLD = 0.15


def main() -> None:
    config = ConfigManager("config.json")

    try:
        engine = VoiceEngine(
            rate=config.get("voice_rate", 170),
            volume=config.get("voice_volume", 1.0),
            voice_id=config.get("voice_id", 0),
        )
    except Exception as e:
        print(f"Failed to initialize voice engine: {e}")
        print("Make sure a microphone and audio output are available.")
        sys.exit(1)

    def signal_handler(sig, frame):
        engine.speak("Shutting down. Goodbye!")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    engine.speak("Voice assistant is now running. How can I help you?")

    while True:
        text = engine.listen(
            timeout=config.get("listen_timeout", 5),
            phrase_time_limit=config.get("phrase_time_limit", 10),
        )

        if not text:
            engine.speak("I didn't catch that. Could you please repeat?")
            continue

        # 1. Check custom commands first (user-defined triggers)
        custom_response = config.get_custom_command(text)
        if custom_response:
            engine.speak(custom_response)
            continue

        # 2. NLU intent classification
        intent, confidence = classify_intent(text)

        if confidence < CONFIDENCE_THRESHOLD:
            engine.speak("I'm not sure what you mean. You can ask me for the time, the date, to search the web, send an email, check the weather, or set a reminder.")
            continue

        # 3. Extract the entity (the subject of the command)
        entity = extract_entity(text, intent)

        # 4. Dispatch to the appropriate handler
        handler = handlers.get(intent)
        if handler:
            try:
                handler(engine, text, entity, config)
            except SystemExit:
                raise
            except Exception as e:
                engine.speak(f"Something went wrong with that command: {str(e)}")
        else:
            engine.speak("I don't know how to do that yet.")


if __name__ == "__main__":
    main()
