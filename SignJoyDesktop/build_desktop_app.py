import os
import sys
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
APP_DIR = PROJECT_ROOT / "-Sign-Joy_AI"
DESKTOP_DIR = PROJECT_ROOT / "SignJoyDesktop"

def check_dependencies():
    """
    Ensures pyinstaller and pywebview are installed.
    """
    print("[*] Checking development build dependencies...")
    try:
        import PyInstaller
        print("  - PyInstaller is installed.")
    except ImportError:
        print("  - PyInstaller is missing! Installing via pip...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
        
    try:
        import webview
        print("  - PyWebView is installed.")
    except ImportError:
        print("  - PyWebView is missing! Installing via pip...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pywebview"])

def compile_binary():
    """
    Executes PyInstaller to bundle the SignJoy Desktop application.
    """
    print("[*] Preparing PyInstaller build configurations...")
    
    # Path coordinates
    launcher_script = str(DESKTOP_DIR / "desktop_launcher.py")
    icon_file = str(APP_DIR / "web" / "static" / "images" / "character.png") # Fallback to icon later if available
    
    # Build the PyInstaller command argument list
    cmd = [
        "pyinstaller",
        "--name=SignJoy",
        "--noconfirm",
        "--onedir", # Directory distribution is best for large video datasets
        "--windowed", # Hide terminal window
        # Add Python search path so imports inside -Sign-Joy_AI work perfectly inside bundle
        f"--paths={str(APP_DIR)}{os.pathsep}{str(DESKTOP_DIR)}",
        
        # Explicitly declare hidden imports to ensure PyInstaller packages them
        "--hidden-import=googletrans",
        "--hidden-import=offline_translation",
        "--hidden-import=offline_speech",
        "--hidden-import=vosk",
        "--hidden-import=pyaudio",
        
        # Bundle templates, static web assets, and dataset videos
        f"--add-data={str(APP_DIR / 'web' / 'templates')}{os.pathsep}web/templates",
        f"--add-data={str(APP_DIR / 'web' / 'static')}{os.pathsep}web/static",
        f"--add-data={str(APP_DIR / 'datasets')}{os.pathsep}datasets",
        
        # Include gesture predictions and helper code
        f"--add-data={str(APP_DIR / 'gesture_model.h5')}{os.pathsep}.",
    ]

    # Explicitly force-bundle the vosk site-package containing libvosk.dll
    site_packages_vosk = APP_DIR / ".venv" / "Lib" / "site-packages" / "vosk"
    if site_packages_vosk.exists():
        print(f"  - Force-bundling Vosk site-package from: {site_packages_vosk}")
        cmd.append(f"--add-data={str(site_packages_vosk)}{os.pathsep}vosk")
    
    # Include Vosk speech recognition model directory if it has been downloaded
    vosk_model_path = DESKTOP_DIR / "vosk_model"
    if vosk_model_path.exists() and os.listdir(vosk_model_path):
        print(f"  - Bundling Vosk offline model folder: {vosk_model_path}")
        cmd.append(f"--add-data={str(vosk_model_path)}{os.pathsep}vosk_model")
    else:
        print("  - Note: Vosk model was not found in 'SignJoyDesktop/vosk_model/'. Exe will compile but speech recognition will run in fallback text mode.")
        
    cmd.append(launcher_script)
    
    print("\n[*] Launching PyInstaller compiling engine...")
    print("Command:", " ".join(cmd))
    
    try:
        subprocess.check_call(cmd, cwd=str(PROJECT_ROOT))
        print("\n[+] SUCCESS: SignJoy Desktop application has compiled perfectly!")
        print(f"    Check the compiled build directory at: {PROJECT_ROOT / 'dist' / 'SignJoy'}")
        print("    You can run the application directly by clicking 'SignJoy.exe' in that folder.")
    except Exception as e:
        print(f"\n[-] ERROR: Compiling failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_dependencies()
    compile_binary()
