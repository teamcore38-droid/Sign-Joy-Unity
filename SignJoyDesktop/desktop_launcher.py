import os
import sys
import socket
from pathlib import Path
from threading import Thread
import time

# ---------------------------------------------------------
# 1. Path Management & Imports Setup
# ---------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
APP_DIR = PROJECT_ROOT / "-Sign-Joy_AI"

# Ensure the Flask app directory is in Python's search path
sys.path.insert(0, str(APP_DIR))

# ---------------------------------------------------------
# 2. Dynamic Inject / Mock online packages with offline versions
# ---------------------------------------------------------
# We dynamically inject our custom Translator class into sys.modules
# so that when web_app.py imports googletrans, it gets our offline version.
import offline_translation
from types import ModuleType

mock_googletrans = ModuleType("googletrans")
mock_googletrans.Translator = offline_translation.Translator
sys.modules["googletrans"] = mock_googletrans

# ---------------------------------------------------------
# 3. Import Flask App & Register Offline Routes
# ---------------------------------------------------------
# Now we import the Flask application object
from web_app import app
import offline_speech
from flask import jsonify

@app.route('/api/offline-speech')
def api_offline_speech():
    """
    Local endpoint to trigger local Vosk offline speech capture.
    """
    text = offline_speech.recognize_from_microphone()
    return jsonify({"text": text})

@app.after_request
def inject_offline_speech_script(response):
    """
    After-request filter that dynamically injects a speech recognition override
    script in HTML pages without modifying any templates on disk.
    """
    if response.content_type and response.content_type.startswith("text/html"):
        html_content = response.get_data(as_text=True)
        
        # Inject JavaScript before </body> to mock window.webkitSpeechRecognition with our API
        offline_script = """
        <script>
        class OfflineSpeechRecognition {
            constructor() {
                this.continuous = false;
                this.interimResults = false;
                this.lang = 'en-US';
                this.onstart = null;
                this.onresult = null;
                this.onerror = null;
                this.onend = null;
            }
            
            async start() {
                if (this.onstart) this.onstart();
                console.log("Triggered local offline speech recognition capture...");
                try {
                    const response = await fetch('/api/offline-speech');
                    const data = await response.json();
                    if (data.text && data.text.trim()) {
                        if (this.onresult) {
                            const event = {
                                resultIndex: 0,
                                results: [[{ transcript: data.text.trim() }]]
                            };
                            this.onresult(event);
                        }
                    } else {
                        if (this.onerror) {
                            this.onerror({ error: 'No offline speech detected.' });
                        }
                    }
                } catch (err) {
                    console.error("Local offline speech recognition failed: ", err);
                    if (this.onerror) {
                        this.onerror({ error: err.message });
                    }
                }
                if (this.onend) this.onend();
            }
            
            stop() {
                console.log("Local speech recognition stopped.");
            }
        }
        
        // Override standard web browser speech recognition APIs
        window.SpeechRecognition = OfflineSpeechRecognition;
        window.webkitSpeechRecognition = OfflineSpeechRecognition;
        console.log("SignJoy Offline Speech API overrides injected successfully!");
        </script>
        """
        
        if "</body>" in html_content:
            html_content = html_content.replace("</body>", f"{offline_script}</body>")
            response.set_data(html_content)
            
    return response

# ---------------------------------------------------------
# 4. Desktop Window Setup & Port Selection
# ---------------------------------------------------------
def find_free_port() -> int:
    """
    Finds a free port on localhost.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('localhost', 0))
    port = s.getsockname()[1]
    s.close()
    return port

PORT = 5001
try:
    # Try using default port 5001 first
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('127.0.0.1', 5001))
    s.close()
except OSError:
    # Fallback to random free port
    PORT = find_free_port()

def run_flask():
    """
    Background worker that launches the Flask server.
    """
    print(f"Starting backend Flask server on http://127.0.0.1:{PORT}...")
    app.run(host="127.0.0.1", port=PORT, debug=False, use_reloader=False)

# ---------------------------------------------------------
# 5. Main Execution Entrypoint (PyWebView UI wrapper)
# ---------------------------------------------------------
if __name__ == "__main__":
    import webview
    
    # 1. Start Flask backend inside a background daemon thread
    flask_thread = Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    # Give the backend server a short second to start up
    time.sleep(1.0)
    
    # 2. Check offline speech systems
    is_speech_ready, speech_msg = offline_speech.check_vosk_ready()
    print(f"[*] Offline Speech Status: {speech_msg}")
    
    # 3. Create the native desktop Chromium WebView window
    print("Launching SignJoy Desktop premium interface...")
    webview.create_window(
        title="SignJoy - Offline Sign Landmark Learning & Games",
        url=f"http://127.0.0.1:{PORT}",
        width=1200,
        height=800,
        min_size=(1024, 768),
        resizable=True,
        text_select=False
    )
    
    # Start the PyWebView main GUI thread (blocks here until window is closed)
    webview.start()
    print("SignJoy Desktop closed. Goodbye!")
