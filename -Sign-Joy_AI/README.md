# Sign Joy AI

Sign Joy AI is a sign-language learning and math-teaching web app for children. It turns typed or spoken input into mapped sign clips, animated overlays, a cartoon instructor view, and additional comparison/3D visualizations.

The repository already includes:

- the Flask web app
- mapped dataset videos used by the app
- frontend assets for the landing page and lesson demos
- the 3D instructor model
- the saved gesture model file used by the project scripts

## What this project includes

- Child-friendly landing page at `/`
- Main learning app at `/learn`
- Input by text or browser speech recognition
- Sinhala to English translation flow
- Sign clip playback from the included dataset
- Realistic 2D hand/body overlay
- Cartoon instructor visualization
- 3D avatar / comparison panels

## Recommended system

- Windows 10 or Windows 11
- Python 3.11 recommended
- Google Chrome or Microsoft Edge
- At least 6 GB free disk space

Why 3.11:
- `mediapipe==0.10.21` is usually easiest to install on Python 3.11

## 1. Download the project on another laptop

You can use either Git or a ZIP download.

### Option A: Clone with Git

```powershell
git clone https://github.com/teamcore38-droid/-Sign-Joy_AI.git
cd -Sign-Joy_AI
```

### Option B: Download ZIP from GitHub

1. Open the GitHub repository in a browser
2. Click `Code`
3. Click `Download ZIP`
4. Extract the ZIP
5. Open a terminal inside the extracted folder

## 2. Install Python

Install Python 3.11 from:

- https://www.python.org/downloads/

During installation on Windows:

- enable `Add Python to PATH`

After install, verify:

```powershell
python --version
```

If `python` does not work, try:

```powershell
py --version
```

## 3. Create a virtual environment

From the project root:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Upgrade pip:

```powershell
python -m pip install --upgrade pip
```

## 4. Install project requirements

```powershell
pip install -r requirements.txt
```

Current required packages come from [requirements.txt](requirements.txt):

- `flask`
- `opencv-python`
- `mediapipe==0.10.21`
- `googletrans==4.0.0-rc1`
- `speechrecognition`
- `legacy-cgi`

## 5. Optional installs

### Microphone support in Python scripts

Only needed if you want to use the older terminal speech-input flow in `main.py`.

```powershell
pip install pyaudio
```

If `pyaudio` fails on Windows, install a matching wheel or use only the browser microphone feature in the web app.

### TensorFlow

Only needed for training/prediction scripts such as:

- [gesture_model.py](gesture_model.py)
- [gesture_predict.py](gesture_predict.py)
- [train_gesture_model.py](train_gesture_model.py)

Install only if you need those scripts:

```powershell
pip install tensorflow
```

## 6. Files and assets that must exist

These should already be included when you clone or download the repo:

- dataset videos under [datasets](datasets)
- saved model file [gesture_model.h5](gesture_model.h5)
- 3D model [instructor.glb](web/static/models/instructor.glb)
- landing/demo assets under [web/static/assets](web/static/assets)

If any of those are missing, the app may still start, but some features will not work correctly.

## 7. Run the web app

From the project root:

```powershell
python web_app.py
```

The app runs on:

- `http://127.0.0.1:5001/`

Important pages:

- Homepage: `http://127.0.0.1:5001/`
- Learning app: `http://127.0.0.1:5001/learn`

You can also change the port if needed:

```powershell
$env:WEB_APP_PORT=8000
python web_app.py
```

Then open:

- `http://127.0.0.1:8000/`

## 8. How to use the app

### Homepage

- Visit `/`
- Use `Watch Demo` buttons to open lesson/demo videos in a rounded dialog
- Click `Open App` or `Start Learning` to move to the main tool

### Learn page

- Visit `/learn`
- Type text such as `one plus two`
- Or use the browser microphone button
- Click `Make My Signs`
- Explore:
  - sign clip playback
  - realistic overlay
  - cartoon instructor
  - advanced visual panels

## 9. Browser recommendations

Use Chrome or Edge for the best experience.

Why:

- browser speech recognition support is better there
- video/media behavior is more reliable
- WebGL/Three.js support is usually stronger

## 10. Optional non-web script

There is also an older terminal-based entry point:

```powershell
python main.py
```

That script is different from the Flask web app and may require:

- microphone access
- `pyaudio`
- optional TensorFlow-related scripts depending on what you run

For most users, the web app is the recommended way to use this project.

## 11. Troubleshooting

### `ModuleNotFoundError`

Make sure the virtual environment is activated and then run:

```powershell
pip install -r requirements.txt
```

### `PyAudio is not installed`

That only affects Python microphone scripts. The web page can still use browser speech capture without `pyaudio`.

### `mediapipe` install fails

Use Python 3.11 and upgrade pip first:

```powershell
python -m pip install --upgrade pip
pip install mediapipe==0.10.21
```

### Browser microphone does not work

- Use Chrome or Edge
- Allow microphone permission for `127.0.0.1`
- Try refreshing the page

### Some sign clips do not appear

The app only shows clips that exist under:

- [datasets/Numbers](datasets/Numbers)

If a token has no mapped media, the UI will show it as unmapped.

### 3D panel is blank

Check that this file exists:

- [instructor.glb](web/static/models/instructor.glb)

Also use a browser with WebGL enabled.

### Translation issues

Sinhala translation uses `googletrans`. If translation fails, internet connectivity may be part of the issue.

## 12. Project structure

Important files:

- [web_app.py](web_app.py)
- [web_pipeline.py](web_pipeline.py)
- [web/templates/index.html](web/templates/index.html)
- [web/templates/learn.html](web/templates/learn.html)
- [web/static/styles.css](web/static/styles.css)
- [web/static/app.js](web/static/app.js)

Data and models:

- [datasets](datasets)
- [gesture_model.h5](gesture_model.h5)
- [web/static/models](web/static/models)

## 13. Quick start summary

```powershell
git clone https://github.com/teamcore38-droid/-Sign-Joy_AI.git
cd -Sign-Joy_AI
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python web_app.py
```

Then open:

```text
http://127.0.0.1:5001/
```
