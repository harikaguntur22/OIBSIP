"""Configuration manager: loads, saves, and provides custom command lookups."""

import json
import os
from typing import Any


class ConfigManager:
    """Loads config.json at startup and persists changes (e.g. new custom commands)."""

    def __init__(self, path: str = "config.json"):
        self.path = path
        self.data: dict[str, Any] = {}
        self.load()

    def load(self) -> None:
        if os.path.exists(self.path):
            with open(self.path, "r", encoding="utf-8") as f:
                self.data = json.load(f)
        else:
            self.data = {
                "wake_word": "assistant",
                "voice_rate": 170,
                "voice_volume": 1.0,
                "voice_id": 0,
                "listen_timeout": 5,
                "phrase_time_limit": 10,
                "weather_api_key": "",
                "weather_units": "metric",
                "email_address": "",
                "email_password": "",
                "smtp_server": "smtp.gmail.com",
                "smtp_port": 587,
                "custom_commands": {},
                "custom_intents": {},
            }
            self.save()

    def save(self) -> None:
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def add_custom_command(self, trigger: str, response: str) -> None:
        """Register a new custom command and persist it to config.json."""
        commands = self.data.setdefault("custom_commands", {})
        commands[trigger] = response
        self.save()

    def get_custom_command(self, text: str) -> str | None:
        """Return a custom response if the user's text matches a custom trigger."""
        commands = self.data.get("custom_commands", {})
        for trigger, response in commands.items():
            if trigger in text:
                return response
        return None

    def get(self, key: str, default: Any = None) -> Any:
        return self.data.get(key, default)
