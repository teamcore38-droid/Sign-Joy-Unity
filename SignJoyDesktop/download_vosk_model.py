import os
import urllib.request
import zipfile
import shutil
from pathlib import Path

# Setup paths
DESKTOP_DIR = Path(__file__).resolve().parent
MODEL_DIR = DESKTOP_DIR / "vosk_model"
TEMP_ZIP = DESKTOP_DIR / "vosk_model_temp.zip"
TEMP_EXTRACT = DESKTOP_DIR / "vosk_model_temp_extract"

MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"

def download_and_setup():
    # 1. Skip if model already exists and is configured
    if MODEL_DIR.exists() and any(MODEL_DIR.iterdir()):
        print(f"[+] Vosk model directory already exists at {MODEL_DIR} and is not empty. Skipping download.")
        return

    print(f"[*] Creating target directory: {MODEL_DIR}")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # 2. Download the Zip
    print(f"[*] Downloading lightweight Vosk English model from: {MODEL_URL} ...")
    try:
        urllib.request.urlretrieve(MODEL_URL, TEMP_ZIP)
        print("[+] Download complete!")
    except Exception as e:
        print(f"[-] Error downloading model: {e}")
        if TEMP_ZIP.exists():
            TEMP_ZIP.unlink()
        return

    # 3. Extract the Zip
    print("[*] Extracting model package...")
    try:
        TEMP_EXTRACT.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(TEMP_ZIP, 'r') as zip_ref:
            zip_ref.extractall(TEMP_EXTRACT)
        print("[+] Extraction complete!")
    except Exception as e:
        print(f"[-] Error extracting model: {e}")
        clean_temp_files()
        return

    # 4. Move contents to correct folder
    # The zip contains a folder like 'vosk-model-small-en-us-0.15'
    try:
        extracted_folders = list(TEMP_EXTRACT.glob("vosk-model-*"))
        if not extracted_folders:
            print("[-] Error: Could not find model directory inside extracted files.")
            return

        model_src_folder = extracted_folders[0]
        print(f"[*] Moving model contents from {model_src_folder} to {MODEL_DIR}...")
        for item in model_src_folder.iterdir():
            dest = MODEL_DIR / item.name
            if item.is_dir():
                shutil.copytree(item, dest, dirs_exist_ok=True)
            else:
                shutil.copy2(item, dest)
        
        print("[+] Model files successfully configured offline!")
    except Exception as e:
        print(f"[-] Error reorganizing model folders: {e}")
    finally:
        clean_temp_files()

def clean_temp_files():
    print("[*] Cleaning up temporary files...")
    if TEMP_ZIP.exists():
        TEMP_ZIP.unlink()
    if TEMP_EXTRACT.exists():
        shutil.rmtree(TEMP_EXTRACT, ignore_errors=True)
    print("[+] Clean up complete.")

if __name__ == "__main__":
    download_and_setup()
