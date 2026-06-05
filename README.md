# Code Review Website 🚀

**AI-Powered Code Analysis Tool** — Paste your code, get instant reviews with scores across 5 categories, smart suggestions, and AI-powered improvements.

![Languages](https://img.shields.io/badge/Languages-16-blueviolet)
![Scoring](https://img.shields.io/badge/Categories-5-success)
![Type](https://img.shields.io/badge/Type-Static%20Analysis-orange)

---

## ✨ Features

| Category | Description |
|----------|-------------|
| 🛡️ **Security Analysis** | Detect XSS, SQL injections, unsafe `eval()`, missing validation & more |
| 🎯 **Syntax & Structure** | Catches missing semicolons, unclosed blocks, incorrect imports |
| ⚡ **Performance Tips** | Identifies slow patterns — excessive loops, repeated DOM ops, memory leaks |
| 🎨 **Code Style** | Enforces language conventions — snake_case, camelCase, formatting |
| 🧠 **AI Suggestions** | Smart recommendations with code examples tailored per language |
| 🔍 **Auto Detect** | Paste any code and the tool detects the language automatically |

## 🗂️ Project Structure

```
├── index.html      # HTML structure (10.7 KB)
├── style.css       # Styles & animations — Linear-inspired dark theme (11.4 KB)
├── script.js       # All logic — 16 analyzers, scoring, UI rendering (32.9 KB)
└── README.md       # This file
```

## 🖥️ Supported Languages (16)

JavaScript · TypeScript · Python · HTML · CSS · Java · C++ · C# · Go · Rust · PHP · Ruby · Swift · Kotlin · Bash · **Auto Detect**

## 🧮 Scoring System

Each review scores your code from **10–100** based on:

- **Error** → −15 points
- **Warning** → −8 points
- **Info** → −3 points

Categories checked: Security, Syntax & Structure, Performance, Code Style, Best Practices

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Aliahasan399/Code-Review-Website.git

# Open directly in browser
open index.html

# Or serve locally
cd Code-Review-Website
python3 -m http.server 8080
# → http://localhost:8080
```

## 🌐 Live Demo

Visit **[https://aliahasan399.github.io/Code-Review-Website/](https://aliahasan399.github.io/Code-Review-Website/)** (enable GitHub Pages in repo settings)

## 🛠️ Usage

1. **Select** a language from the dropdown (or leave on Auto Detect)
2. **Paste** your code into the editor
3. Click **Run Review** → instant analysis with score
4. Click **✨ AI Enhance** for smart improvement tips
5. Click **💡 Fix** on any issue to see the recommended fix

## 📦 Tech Stack

- Pure **HTML/CSS/JavaScript** — zero dependencies
- Dark theme inspired by Linear's design system
- Pattern-matching static analysis (no backend required)
- Fully client-side — your code never leaves your browser

## 🔗 Links

- **GitHub**: [Aliahasan399/Code-Review-Website](https://github.com/Aliahasan399/Code-Review-Website)
- **Live Site**: Enable GitHub Pages from repo **Settings > Pages** (branch: `main`, root `/`)

---

Built with ❤️ by Ali Ahsan
