import os
import shutil
import re
from pathlib import Path

source_root = Path(r"c:\Users\ahame\Music\Unity_MediaPipe_Action_Tracking-master\Dataset - Original")
dest_root = Path(r"c:\Users\ahame\Music\Unity_MediaPipe_Action_Tracking-master\-Sign-Joy_AI\datasets\literature\videos")

def normalize_name(name: str) -> str:
    # Convert to lowercase
    n = name.lower()
    # Replace spaces and hyphens with underscores
    n = re.sub(r'[\s\-]+', '_', n)
    # Remove parenthesis and other special characters except underscores and dots
    n = re.sub(r'[^\w\.]', '', n)
    # Clean up double underscores
    n = re.sub(r'_{2,}', '_', n)
    return n.strip('_')

def run_relocation():
    if not source_root.exists():
        print(f"Source directory {source_root} does not exist. Already relocated?")
        return

    dest_root.mkdir(parents=True, exist_ok=True)
    
    total_moved = 0
    total_expected = 0
    
    # First, calculate total files to move for verification
    for root, _, files in os.walk(source_root):
        for f in files:
            if Path(f).suffix.lower() in ['.mp4', '.mov']:
                total_expected += 1
                
    print(f"Total video files expected to relocate: {total_expected}")
    
    for cat_dir in source_root.iterdir():
        if not cat_dir.is_dir():
            continue
            
        normalized_cat = normalize_name(cat_dir.name)
        dest_cat_dir = dest_root / normalized_cat
        dest_cat_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"Processing category: {cat_dir.name} -> {normalized_cat}")
        
        # Handle special category A-Z (contains direct files)
        if normalized_cat == "a_z":
            for item in cat_dir.iterdir():
                if item.is_file() and item.suffix.lower() in ['.mp4', '.mov']:
                    normalized_file = normalize_name(item.stem) + item.suffix.lower()
                    dest_file = dest_cat_dir / normalized_file
                    
                    shutil.move(str(item), str(dest_file))
                    total_moved += 1
        else:
            # Word-level folders (e.g. Adjectives/Bad/)
            for word_dir in cat_dir.iterdir():
                if not word_dir.is_dir():
                    continue
                    
                normalized_word = normalize_name(word_dir.name)
                dest_word_dir = dest_cat_dir / normalized_word
                dest_word_dir.mkdir(parents=True, exist_ok=True)
                
                for item in word_dir.iterdir():
                    if item.is_file() and item.suffix.lower() in ['.mp4', '.mov']:
                        normalized_file = normalize_name(item.stem) + item.suffix.lower()
                        dest_file = dest_word_dir / normalized_file
                        
                        shutil.move(str(item), str(dest_file))
                        total_moved += 1
                        
    print(f"\nRelocation completed. Total files successfully moved: {total_moved} of {total_expected}")
    
    # Verify and clean up
    if total_moved == total_expected and total_moved > 0:
        print("Verification successful! Safely removing the temporary folder...")
        try:
            shutil.rmtree(source_root)
            print("Temporary 'Dataset - Original' folder removed successfully.")
        except Exception as e:
            print(f"Error while removing temporary folder: {e}")
    else:
        print("Warning: Relocated file count does not match expected count. Keeping temporary folder for safety.")

if __name__ == "__main__":
    run_relocation()
