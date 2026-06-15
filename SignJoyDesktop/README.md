# SignJoy Offline Desktop Application Packager

This folder contains all the files, libraries, and automation scripts required to compile **Sign-Joy** into a downloadable, installer-wrapped offline desktop application. 

This desktop version is designed to run **100% offline** on any standard Windows laptop or PC without needing an internet connection.

---

## Key Technical Features

1. **Native Chromium WebView2**: Uses Windows' modern Chromium-based rendering, which fully supports **WebGL 3D graphics** (meaning the embedded 3D Unity avatar works flawlessly offline).
2. **Offline Speech Recognition**: Powered by the **Vosk Speech Engine** running 100% locally.
3. **Offline Sinhala Translator**: A custom hybrid translator that uses Google Translate if internet is present, but seamlessly switches to a robust local Sinhala-to-English dictionary when offline.
4. **Isolated & Safe**: Created completely outside your working project folders—leaving your active development code untouched.

---

## 1. Quick Start - Run in Development Mode

Before compiling, you can run the desktop application locally to test it:

1. **Activate your Python environment**:
   ```powershell
   cd ".\-Sign-Joy_AI"
   .venv\Scripts\Activate.ps1
   ```
2. **Install desktop requirements** (inside the active virtual environment):
   ```powershell
   pip install pywebview vosk pyaudio
   ```
3. **Run the launcher**:
   ```powershell
   python ..\SignJoyDesktop\desktop_launcher.py
   ```
   *This will start the Flask server in a background thread and immediately open a beautiful native desktop window.*

---

## 2. Setup Offline Speech Recognition (Vosk Model)

To enable offline voice microphone capture:

1. Create a directory named `vosk_model` inside `SignJoyDesktop/`:
   ```powershell
   mkdir "..\SignJoyDesktop\vosk_model"
   ```
2. Download a lightweight acoustic language model from [Vosk Models](https://alphacephei.com/vosk/models).
   * **For English**: Download `vosk-model-small-en-us-0.15` (approx. 40 MB).
   * **For Sinhala (Optional)**: Download `vosk-model-si-lk-0.4` (approx. 20 MB).
3. Extract the downloaded ZIP file, and copy all its contents (containing folders like `am`, `graph`, etc.) directly inside your new `SignJoyDesktop/vosk_model/` folder.

---

## 3. How to Compile to a Single Folder (.exe)

We use **PyInstaller** to automatically package Python, OpenCV, MediaPipe, templates, video datasets, and the Vosk speech model.

To trigger the automated build:
1. Open PowerShell and run:
   ```powershell
   python ..\SignJoyDesktop\build_desktop_app.py
   ```
2. The compilation will run automatically. When finished, you will find the compiled application folder at:
   `[Project_Root]\dist\SignJoy\`
3. You can run the application directly by clicking **`SignJoy.exe`** in that folder!

---

## 4. Packaging Into a Downloadable Setup Installer (`.exe`)

To turn the compiled folder into a single, professional setup wizard installer:

1. Download and install the free [Inno Setup Compiler](https://jrsoftware.org/isdl.php) (industry-standard installer compiler).
2. Open Inno Setup.
3. Click **"Open an existing script file"** and select:
   `[Project_Root]\SignJoyDesktop\installer_config.iss`
4. Click the **Build > Compile** menu item (or press **F9**).
5. Inno Setup will compile the bundle and output a single download file named **`SignJoy_Offline_Setup.exe`** at:
   `[Project_Root]\SignJoyDesktop\dist\setup\`

Now you can share `SignJoy_Offline_Setup.exe` via GitHub, USB, or cloud drives. Users can download, double-click to install, and run the app from their Desktop icon 100% offline!
