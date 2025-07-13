

# 🚀 Interview Assistant – Fast, AI-powered coding help from screenshots or voice! 🧑‍💻🎤📸


**Interview Assistant** is your secret weapon for coding interviews! Instantly process coding questions from screenshots or voice, get AI-powered solutions, and keep your workflow lightning fast with keyboard shortcuts. Powered by OpenAI & Gemini, built with Electron + React. ⚡️

## Features

- 📸 **Screenshot Processing**: Snap up to 4 screenshots of coding questions! Get:
  - 💡 Approach explanation
  - 🧑‍💻 Code solution (with line numbers)
  - ⏱️ Time & 🗄️ Space complexity
- 🎤 **Audio Question Processing**: Record your question by voice! Watch the AI stream its answer live, then save it to your history. 🔥
- 🕑 **History**: All results (screenshots & audio) are saved. Click any item to relive your coding glory! 🏆
- 🤖 **Configurable AI Provider**: Choose OpenAI or Gemini, set your API keys, language, model, and audio device. Make it yours! 🛠️
- ⌨️ **Keyboard Shortcuts**: Speedy workflow with hotkeys for every major action. No mouse required! 🏎️
- 🧼 **Minimal UI**: Clean, focused interface with preview, status, and history sections. Zen mode for coders. 🧘

## Hotkeys

| 🎹 Shortcut            | 🏃‍♂️ Action                        |
|-----------------------|-----------------------------------|
| ⌘/Ctrl + H            | 📸 Take screenshot                 |
| ⌘/Ctrl + ↵ (Enter)    | 🧑‍💻 Process screenshots            |
| ⌘/Ctrl + R            | 🧹 Reset all state/history         |
| ⌘/Ctrl + M            | 🎤 Start/stop audio recording      |
| ⌘/Ctrl + P            | ⚙️ Show/hide settings              |
| ⌘/Ctrl + B            | 👀 Show/hide app window            |
| ⌘/Ctrl + Q            | 🚪 Quit application                |
| ⌘/Ctrl + Arrow Keys   | 🕹️ Move around (future use)        |

## Usage

1. 📸 **Take Screenshots**: Press ⌘/Ctrl + H to capture up to 4 screenshots. Previews appear at the top!
2. 🧑‍💻 **Process Screenshots**: Press ⌘/Ctrl + ↵ to send screenshots to the AI and get your solution.
3. 🎤 **Record Audio Question**: Press ⌘/Ctrl + M to start/stop recording. Watch the AI stream its answer live!
4. 🕑 **View History**: All results are saved. Click any item to view details and flex your skills!
5. ⚙️ **Settings**: Press ⌘/Ctrl + P to open settings and configure your AI provider, API keys, language, and audio device.
6. 🧹 **Reset**: Press ⌘/Ctrl + R to clear all screenshots, audio, and history. Fresh start!
7. 🚪 **Quit**: Press ⌘/Ctrl + Q to exit the app. See you next time!

## Configuration

- 🤖 **Provider**: Select OpenAI or Gemini.
- 🔑 **API Keys**: Enter your API key for the selected provider.
- 🌐 **Language/Model**: Choose your preferred language and model.
- 🎙️ **Audio Device**: Select the microphone device for audio recording.

## Status Indicators

- ⏳ **Processing...**: Screenshot or audio processing is in progress. Hang tight!
- 🔴 **Recording...**: Audio recording is active. Speak your question!
- 💬 **Streaming Response**: Watch the AI answer your question live!
- ⚠️ **Error Bar**: Any errors will be shown at the top and auto-hide after 5 seconds.

## Development

- 🛠️ Built with Electron, React, and TypeScript.
- 🧩 See `src/renderer/App.tsx` for main UI logic and hotkey handling.
- 🦾 See `src/services/` for AI integration and audio recording logic.

## License

This project is licensed under the MIT License.

---

## 💬 Feedback & Contributing

Found a bug? Have a feature idea? Want to help make this app even cooler? Open an issue or PR! ⭐️

---

Made with ❤️ for interview warriors. Good luck and happy coding! 🚀
