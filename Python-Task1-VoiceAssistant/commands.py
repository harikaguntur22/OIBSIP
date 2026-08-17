"""Command handlers for the voice assistant.

Each handler takes the VoiceEngine, the raw text, and the extracted entity,
performs its action, and speaks a response. The handlers dict maps intent
names to callables so the main loop stays generic.
"""

from __future__ import annotations

import datetime
import webbrowser
import urllib.parse
from typing import TYPE_CHECKING, Callable

if TYPE_CHECKING:
    from voice_engine import VoiceEngine
    from config_manager import ConfigManager


def handle_greeting(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    hour = datetime.datetime.now().hour
    if 5 <= hour < 12:
        greeting = "Good morning!"
    elif 12 <= hour < 18:
        greeting = "Good afternoon!"
    else:
        greeting = "Good evening!"
    engine.speak(f"{greeting} How can I help you?")


def handle_time(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    now = datetime.datetime.now()
    time_str = now.strftime("%I:%M %p")
    engine.speak(f"The current time is {time_str}.")


def handle_date(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    today = datetime.datetime.now()
    date_str = today.strftime("%A, %B %d, %Y")
    engine.speak(f"Today is {date_str}.")


def handle_web_search(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    query = entity or text
    if not query:
        engine.speak("What would you like me to search for?")
        return
    url = f"https://www.google.com/search?q={urllib.parse.quote(query)}"
    webbrowser.open(url)
    engine.speak(f"Searching the web for {query}.")


def handle_exit(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    engine.speak("Goodbye! Talk to you later.")
    raise SystemExit(0)


# --- Advanced command handlers ---

def handle_email(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    import smtplib
    from email.mime.text import MIMEText

    cfg = config.data
    sender = cfg.get("email_address", "")
    password = cfg.get("email_password", "")
    smtp_server = cfg.get("smtp_server", "smtp.gmail.com")
    smtp_port = cfg.get("smtp_port", 587)

    if not sender or not password:
        engine.speak("Email is not configured. Please set your email address and password in config.json.")
        return

    engine.speak("Who should I send the email to? Please say the email address.")
    recipient = engine.listen(timeout=10)
    if not recipient:
        engine.speak("I didn't catch the email address. Cancelling.")
        return

    # Clean up spoken email address (remove spaces, "at" -> @, "dot" -> .)
    recipient = recipient.replace(" at ", "@").replace(" dot ", ".").replace(" ", "")
    engine.speak(f"What should I say in the email?")
    body = engine.listen(timeout=15)
    if not body:
        engine.speak("I didn't catch the message. Cancelling.")
        return

    subject = "Voice Assistant Message"
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, recipient, msg.as_string())
        engine.speak(f"Email sent to {recipient}.")
    except Exception as e:
        engine.speak(f"I couldn't send the email. Error: {str(e)}")


def handle_reminder(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    import threading

    from nlu import parse_duration

    duration = parse_duration(text)
    if not duration:
        engine.speak("How long from now should I remind you? For example, say 'remind me in 5 minutes'.")
        follow_up = engine.listen(timeout=10)
        if follow_up:
            duration = parse_duration(follow_up)
        if not duration:
            engine.speak("I couldn't understand the duration. Cancelling the reminder.")
            return

    reminder_message = entity
    if reminder_message == text or not reminder_message:
        engine.speak("What should the reminder say?")
        reminder_message = engine.listen(timeout=10) or "Reminder!"

    minutes = round(duration / 60, 1)
    engine.speak(f"Okay, I'll remind you in {minutes} minutes.")

    def trigger_reminder():
        import time
        time.sleep(duration)
        engine.speak(f"Reminder! {reminder_message}")

    timer = threading.Thread(target=trigger_reminder, daemon=True)
    timer.start()


def handle_weather(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    import requests

    cfg = config.data
    api_key = cfg.get("weather_api_key", "")
    units = cfg.get("weather_units", "metric")

    if not api_key:
        engine.speak("Weather is not configured. Please set your weather API key in config.json.")
        return

    city = entity.strip()
    # Remove common trailing words
    for word in ("please", "today", "now", "outside"):
        city = city.replace(word, "").strip()

    if not city or city == text:
        engine.speak("Which city's weather would you like?")
        city = engine.listen(timeout=10)
        if not city:
            engine.speak("I didn't catch the city name. Cancelling.")
            return

    try:
        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?q={urllib.parse.quote(city)}&appid={api_key}&units={units}"
        )
        response = requests.get(url, timeout=10)
        data = response.json()

        if response.status_code != 200:
            engine.speak(f"I couldn't find weather for {city}.")
            return

        temp = data["main"]["temp"]
        description = data["weather"][0]["description"]
        feels_like = data["main"]["feels_like"]
        unit_label = "Celsius" if units == "metric" else "Fahrenheit"

        engine.speak(
            f"The weather in {city} is {description}. "
            f"The temperature is {temp} degrees {unit_label}, "
            f"and it feels like {feels_like} degrees."
        )
    except Exception as e:
        engine.speak(f"I couldn't fetch the weather. Error: {str(e)}")


def handle_knowledge(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    import requests

    question = entity or text
    if not question:
        engine.speak("What would you like to know?")
        question = engine.listen(timeout=10)
        if not question:
            return

    try:
        url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(question.split()[0])
        response = requests.get(url, timeout=10, headers={"Accept": "application/json"})

        if response.status_code == 200:
            data = response.json()
            extract = data.get("extract", "")
            if extract:
                engine.speak(extract[:500])
                return

        # Fallback: DuckDuckGo Instant Answer API
        ddg_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(question)}&format=json&no_html=1"
        ddg_response = requests.get(ddg_url, timeout=10)
        if ddg_response.status_code == 200:
            ddg_data = ddg_response.json()
            answer = ddg_data.get("AnswerText", "") or ddg_data.get("Abstract", "")
            if answer:
                engine.speak(answer[:500])
                return

        engine.speak(f"I'm not sure about that. Let me search the web for {question}.")
        webbrowser.open(f"https://www.google.com/search?q={urllib.parse.quote(question)}")
    except Exception as e:
        engine.speak(f"I couldn't look that up. Error: {str(e)}")


def handle_add_command(engine: VoiceEngine, text: str, entity: str, config: ConfigManager) -> None:
    engine.speak("What trigger phrase should activate this command?")
    trigger = engine.listen(timeout=10)
    if not trigger:
        engine.speak("I didn't catch the trigger phrase. Cancelling.")
        return

    engine.speak("What should I respond with?")
    response = engine.listen(timeout=15)
    if not response:
        engine.speak("I didn't catch the response. Cancelling.")
        return

    config.add_custom_command(trigger, response)
    engine.speak(f"Got it. From now on, when you say {trigger}, I will respond with: {response}")


# --- Handler registry ---

handlers: dict[str, Callable] = {
    "greeting": handle_greeting,
    "time": handle_time,
    "date": handle_date,
    "web_search": handle_web_search,
    "email": handle_email,
    "reminder": handle_reminder,
    "weather": handle_weather,
    "knowledge": handle_knowledge,
    "add_command": handle_add_command,
    "exit": handle_exit,
}
