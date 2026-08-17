"""Speech-to-text and text-to-speech engine wrappers."""

import sounddevice as sd
import speech_recognition as sr
import pyttsx3


class VoiceEngine:
    """Handles microphone input and spoken output."""

    def __init__(
        self,
        rate: int = 170,
        volume: float = 1.0,
        voice_id: int = 0,
    ):
        self.recognizer = sr.Recognizer()

        # Text-to-speech engine
        self.engine = pyttsx3.init()
        self.engine.setProperty("rate", rate)
        self.engine.setProperty("volume", volume)

        voices = self.engine.getProperty("voices")

        if voices and 0 <= voice_id < len(voices):
            self.engine.setProperty("voice", voices[voice_id].id)

        # Audio configuration
        self.sample_rate = 16000
        self.channels = 1
        self.sample_width = 2

        # Speech recognition configuration
        self.recognizer.dynamic_energy_threshold = True

    def speak(self, text: str) -> None:
        """Convert text to speech and say it out loud."""

        print(f"Assistant: {text}")

        self.engine.say(text)
        self.engine.runAndWait()

    def _record_audio(self, duration: int) -> sr.AudioData:
        """Record microphone audio using sounddevice."""

        print("Listening...")

        recording = sd.rec(
            int(duration * self.sample_rate),
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="int16",
        )

        sd.wait()

        audio_bytes = recording.tobytes()

        return sr.AudioData(
            audio_bytes,
            self.sample_rate,
            self.sample_width,
        )

    def listen(
        self,
        timeout: int = 5,
        phrase_time_limit: int = 10,
    ) -> str | None:
        """Record microphone audio and convert it to text."""

        try:
            audio = self._record_audio(phrase_time_limit)

        except Exception as e:
            print(f"[Microphone error] {e}")
            return None

        try:
            text = self.recognizer.recognize_google(audio)

            print(f"You: {text}")

            return text.lower().strip()

        except sr.UnknownValueError:
            print("Sorry, I couldn't understand you.")
            return None

        except sr.RequestError as e:
            print(f"[Speech recognition service error] {e}")
            return None

    def calibrate(self) -> None:
        """Perform a basic microphone calibration."""

        print("Calibrating microphone...")

        try:
            duration = 2

            recording = sd.rec(
                int(duration * self.sample_rate),
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype="int16",
            )

            sd.wait()

            # Use the average absolute signal level
            total = 0

            for sample in recording:
                value = abs(int(sample[0]))
                total += value

            average_level = total / len(recording)

            self.recognizer.energy_threshold = max(
                100,
                average_level * 1.5,
            )

            print("Microphone calibration complete.")

        except Exception as e:
            print(f"[Calibration error] {e}")