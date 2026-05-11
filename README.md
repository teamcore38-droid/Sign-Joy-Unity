![Unity Avatar](./images/character.png)

# Sign Joy Unity

This repository combines two related projects:

1. `Unity/` + `Python/`
   Real-time webcam pose tracking with MediaPipe, sending landmarks to a Unity avatar over UDP.
2. `-Sign-Joy_AI/`
   A Flask web app that accepts text or voice input, maps tokens to sign-language dataset clips, generates MediaPipe landmark sequences from those clips, and can now stream those sequences to the Unity desktop avatar over UDP.

The desktop integration target is:

- Unity receives UDP data on `127.0.0.1:5054`
- SignJoy AI can replay mapped sign sequences into Unity with `Play in Unity`

## Project layout

- `Unity/` - Unity 2021.3 project with the avatar and UDP receiver
- `Python/` - original live webcam-to-Unity MediaPipe bridge
- `-Sign-Joy_AI/` - SignJoy AI web app with text/voice input, dataset playback, 2D overlays, 3D browser visualizations, and Unity desktop bridge

## Recommended versions

Use these versions on another laptop for the smoothest setup:

- Windows 10 or Windows 11
- Unity Hub
- Unity Editor `2021.3.22f1`
- VS Code
- Python `3.11.x` for `-Sign-Joy_AI`
- Python `3.12.x` or `3.11.x` for the original `Python/` live-tracking script
- Chrome or Edge for the SignJoy AI web app

Why:

- The Unity project is pinned to `2021.3.22f1` in `Unity/ProjectSettings/ProjectVersion.txt`
- `-Sign-Joy_AI` uses `mediapipe==0.10.21`, which is easiest on Python 3.11

## What each mode does

### Mode A: Original live webcam tracking

This runs the old MediaPipe webcam script from `Python/` and animates the Unity avatar from your live camera.

### Mode B: SignJoy AI to Unity desktop avatar

This runs the Flask web app from `-Sign-Joy_AI/`, lets the user enter text or voice, maps that input to dataset videos, extracts landmarks from those sign clips, and sends them to the Unity avatar.

This is the main integrated workflow added in this repo.

## First-time setup on another laptop

### 1. Install software

Install:

- Unity Hub
- Unity Editor `2021.3.22f1`
- VS Code
- Python `3.11`
- optionally Python `3.12` if you also want the original webcam script exactly as tested

### 2. Download the repository

You can clone it with Git:

```powershell
git clone https://github.com/teamcore38-droid/Sign-Joy-Unity.git
cd Sign-Joy-Unity
```

Or download the ZIP from GitHub and extract it.

### 3. Open the Unity project

1. Open Unity Hub
2. Click `Open`
3. Select the `Unity` folder inside this repository
4. Let Unity import the project
5. Open `Assets > Scenes > SampleScene`

The Unity avatar receiver is already configured to listen on UDP port `5054`.

## Run the integrated SignJoy AI + Unity flow

This is the recommended full-project workflow.

### Step 1. Start Unity

1. Open the `Unity/` project in Unity Hub
2. Open `SampleScene`
3. Press the `Play` button in Unity

Keep Unity running in Play mode.

### Step 2. Set up SignJoy AI

Open a terminal in the repository root and run:

```powershell
cd ".\-Sign-Joy_AI"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python web_app.py
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### Step 3. Open the web app

Open this URL in Chrome or Edge:

```text
http://127.0.0.1:5001/learn
```

### Step 4. Use SignJoy AI

1. Type text such as `one plus two`
2. Or click `Use My Voice`
3. Click `Make My Signs`
4. Wait for the mapped sequence to appear
5. Click `Play in Unity`

The mapped sign sequence will now be replayed into the Unity desktop avatar over UDP.

## Run the original webcam-to-Unity flow

Use this if you want the old live body-tracking mode instead of the SignJoy dataset mode.

### Step 1. Start Unity

1. Open the `Unity/` project
2. Open `SampleScene`
3. Press `Play`

### Step 2. Set up the Python live-tracking script

Open another terminal:

```powershell
cd ".\Python"
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install mediapipe==0.10.21 opencv-contrib-python
python main.py
```

If you prefer Python 3.11 and it is installed, this also works:

```powershell
py -3.11 -m venv .venv
```

### Step 3. Use the webcam mode

- Stand in front of the camera
- Keep enough of your body visible
- The Unity avatar should follow the incoming pose

To stop:

- press `Esc` in the webcam window, or
- stop the Python process, then stop Unity Play mode

## UDP integration details

The Unity project expects JSON in this shape:

```json
{
  "left_hand": [{"x": 0.0, "y": 0.0, "z": 0.0}],
  "right_hand": [{"x": 0.0, "y": 0.0, "z": 0.0}],
  "pose": [{"x": 0.0, "y": 0.0, "z": 0.0}]
}
```

It listens on:

- host: `127.0.0.1`
- port: `5054`

The SignJoy AI Unity desktop bridge uses the same payload contract, so the Unity side does not need to be changed.

## VS Code usage

You can open the repository root in VS Code.

Recommended extensions:

- Python
- Pylance
- C#

For Unity C# editing:

1. Open Unity
2. Go to `Edit > Preferences > External Tools`
3. Set `External Script Editor` to `Visual Studio Code`

## Important files

### Unity side

- `Unity/Assets/Scripts/DataManager.cs`
- `Unity/Assets/Scripts/Body.cs`
- `Unity/Assets/Scripts/Hand.cs`
- `Unity/Assets/Scenes/SampleScene.unity`

### Original live-tracking side

- `Python/main.py`
- `Python/body.py`
- `Python/global_vars.py`

### SignJoy AI side

- `-Sign-Joy_AI/web_app.py`
- `-Sign-Joy_AI/web_pipeline.py`
- `-Sign-Joy_AI/web/templates/learn.html`
- `-Sign-Joy_AI/web/static/app.js`

## Troubleshooting

### Unity avatar does not move in SignJoy mode

Check:

- Unity is open and in Play mode
- `SampleScene` is open
- SignJoy AI is running on `http://127.0.0.1:5001/learn`
- you clicked `Play in Unity`
- Windows firewall is not blocking local UDP

### `mediapipe` install fails

Use Python 3.11 for `-Sign-Joy_AI`.

### Voice input does not work in the browser

- Use Chrome or Edge
- allow microphone access
- try refreshing the page

### Sign clip sequence appears, but Unity still stays in T-pose

That usually means:

- Unity is not in Play mode, or
- no landmarks are being produced for the mapped clips, or
- the local bridge is not running in the SignJoy backend

### PowerShell activation blocked

Run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Notes

- The repository intentionally ignores Unity `Library/`, `Temp/`, logs, and Python virtual environments.
- The `Unity/Tracking.7z` file is kept as part of the original project contents.
- The folder name `-Sign-Joy_AI` starts with `-`, so in PowerShell it is safest to `cd` using quotes:

```powershell
cd ".\-Sign-Joy_AI"
```

## Quick start summary

### SignJoy AI + Unity

```powershell
git clone https://github.com/teamcore38-droid/Sign-Joy-Unity.git
cd Sign-Joy-Unity
cd ".\-Sign-Joy_AI"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python web_app.py
```

Then:

1. Open the Unity project from `Unity/`
2. Press Play in `SampleScene`
3. Open `http://127.0.0.1:5001/learn`
4. Click `Make My Signs`
5. Click `Play in Unity`
