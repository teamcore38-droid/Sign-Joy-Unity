# Detailed Thesis Write-Up Guide

This document gives you more detailed material for your thesis report.

It includes:

1. More implementation details
2. More code snippets
3. Thesis-ready explanations
4. Suggested subsection names
5. Short paragraph text you can adapt into your report

You can use this file together with [THESIS_CODE_SNIPPETS.md](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/THESIS_CODE_SNIPPETS.md).

## Suggested Chapter Structure

For a 30 to 40 page thesis, a strong implementation chapter can be organized like this:

1. System architecture overview
2. Natural language and speech input processing
3. Text normalization and arithmetic interpretation
4. Sign media retrieval from the dataset
5. MediaPipe-based landmark extraction
6. Landmark serialization and transmission
7. Unity avatar animation and retargeting
8. Web-based visualization and synchronization
9. Deployment support through Unity WebGL

## 1. System Architecture Overview

Suggested thesis subsection:
`System Architecture`

Suggested paragraph:

The proposed system consists of three major layers: the input-processing layer, the landmark-processing layer, and the visualization layer. In the first layer, user input is accepted either as typed text or spoken language. The input is normalized, translated into English when necessary, and analyzed to identify numbers and arithmetic operators. In the second layer, the interpreted tokens are mapped to prerecorded sign-language video clips, and MediaPipe Holistic is applied to extract hand and body landmarks frame by frame. In the final layer, the extracted landmark data are visualized in multiple forms, including 2D overlay playback, browser-based 3D playback, and a Unity humanoid avatar animated through retargeted joint rotations.

Suggested flow diagram for thesis:

`User Input -> Translation/Normalization -> Keyword Extraction -> Arithmetic Interpretation -> Dataset Clip Mapping -> MediaPipe Landmark Extraction -> JSON/UDP Transfer -> Unity/Web Visualization`

## 2. Sinhala Detection and Translation

Suggested thesis subsection:
`Multilingual Input Handling`

Why this matters:
This part shows that the system is not limited to English input and can support Sinhala text through automatic translation.

Source:
[web_pipeline.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_pipeline.py),
[language_utils.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/language_utils.py)

Code snippet:

```python
def _translate_to_english(text: str) -> dict[str, Any]:
    translator = Translator()
    cleaned = text.strip()

    if not cleaned:
        return {
            "english_text": "",
            "detected_language": "unknown",
            "was_translated": False,
            "translation_error": None,
        }

    try:
        detected_language = translator.detect(cleaned).lang
    except Exception as exc:
        return {
            "english_text": cleaned,
            "detected_language": "unknown",
            "was_translated": False,
            "translation_error": str(exc),
        }

    if detected_language == "si":
        try:
            translated = translator.translate(cleaned, src="si", dest="en").text
            return {
                "english_text": translated,
                "detected_language": detected_language,
                "was_translated": True,
                "translation_error": None,
            }
        except Exception as exc:
            return {
                "english_text": cleaned,
                "detected_language": detected_language,
                "was_translated": False,
                "translation_error": str(exc),
            }

    return {
        "english_text": cleaned,
        "detected_language": detected_language,
        "was_translated": False,
        "translation_error": None,
    }
```

What to write in thesis:

This module performs automatic language detection and conditionally translates Sinhala input into English before further processing. This design allows the later keyword extraction and arithmetic parsing modules to operate on a single normalized language representation. Error handling is included so that, even if translation fails, the system can still preserve the original input and report the translation status.

## 3. Speech Input Pipeline

Suggested thesis subsection:
`Speech-Based Input Acquisition`

Why this matters:
This shows how the system accepts voice input and falls back gracefully when microphone access is not available.

Source:
[speech_input.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/speech_input.py)

Code snippet:

```python
def get_speech_input():
    r = sr.Recognizer()
    translator = Translator()

    try:
        with sr.Microphone() as source:
            print("Speak now (Sinhala or English)...")
            r.adjust_for_ambient_noise(source, duration=0.5)
            audio = r.listen(source)
    except AttributeError:
        return _fallback_to_text_input()
    except OSError:
        return _fallback_to_text_input()

    try:
        sinhala_text = r.recognize_google(audio, language="si-LK")
        translated = translator.translate(
            sinhala_text, src="si", dest="en"
        ).text
        return translated
    except Exception:
        try:
            english_text = r.recognize_google(audio, language="en-US")
            return english_text
        except Exception:
            return _fallback_to_text_input()
```

What to write in thesis:

The speech input module supports bilingual interaction by first attempting Sinhala speech recognition and translating the recognized utterance to English. If Sinhala recognition is unsuccessful, the system retries using English speech recognition. When audio capture is unavailable, the application switches to text input mode, which improves usability and fault tolerance.

## 4. Tokenization and Character-Level Fallback

Suggested thesis subsection:
`Text Tokenization and Sign Unit Construction`

Why this matters:
This section explains how the application handles both known sign words and unknown words.

Source:
[web_pipeline.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_pipeline.py)

Code snippet:

```python
def _tokenize(text: str) -> list[str]:
    return TOKEN_REGEX.findall(text.lower())

def _split_into_units(tokens: list[str]) -> list[dict[str, str]]:
    units: list[dict[str, str]] = []

    for token in tokens:
        if token.isdigit() or token in KNOWN_SIGN_TOKENS:
            units.append({"unit": token, "kind": "token", "source": token})
            continue

        if token.isalpha() and len(token) > 1:
            for letter in token:
                units.append({"unit": letter, "kind": "letter", "source": token})
            continue

        units.append({"unit": token, "kind": "token", "source": token})

    return units
```

What to write in thesis:

The tokenizer converts normalized text into lowercase alphanumeric tokens. Each token is then transformed into a sign unit. Known number words and operator words are preserved as complete semantic units, while unknown alphabetic words are decomposed into character-level units. This fallback strategy increases the robustness of the system by allowing partial visual output even when a complete word-level sign clip is unavailable.

## 5. Media Payload Construction

Suggested thesis subsection:
`Sign Clip Retrieval and Media Packaging`

Why this matters:
This part shows how the backend prepares the dataset clip information used by the frontend.

Source:
[web_pipeline.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_pipeline.py)

Code snippet:

```python
def _pick_video(folder_path: Path) -> Path | None:
    if not folder_path.exists():
        return None

    files = [f for f in folder_path.iterdir() if f.suffix.lower() in VIDEO_EXTENSIONS]
    if not files:
        return None

    files.sort(key=lambda p: (0 if p.suffix.lower() == ".mp4" else 1, p.name.lower()))
    return files[0]

def _build_media_payload(video_path: Path) -> dict[str, str]:
    relative = video_path.relative_to(DATASET_ROOT).as_posix()
    return {
        "video_file": video_path.name,
        "video_relative_path": relative,
        "video_url": f"/media/{quote(relative, safe='/')}",
    }
```

What to write in thesis:

After a semantic token is mapped to a dataset folder, the system selects a representative video clip by scanning the folder contents and preferring MP4 files when available. The selected clip is then converted into a structured payload containing the file name, relative dataset path, and a browser-accessible media URL. This payload is used consistently across the frontend visualization pipeline.

## 6. Full Input-to-Sequence Pipeline

Suggested thesis subsection:
`End-to-End Sign Sequence Generation`

Why this matters:
This is one of the most important implementation blocks in the whole project.

Source:
[web_pipeline.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_pipeline.py)

Code snippet:

```python
def process_input_text(user_text: str) -> dict[str, Any]:
    if not user_text or not user_text.strip():
        raise ValueError("Input text is required.")

    translated = _translate_to_english(user_text)
    english_text = translated["english_text"]

    tokens = _tokenize(english_text)
    input_units = _split_into_units(tokens)

    keywords = extract_keywords(english_text)
    result, expression = perform_calculation(keywords, original_text=english_text)
    teaching_sequence = _build_teaching_sequence(keywords, result)

    sequence_source = teaching_sequence if teaching_sequence else [unit["unit"] for unit in input_units]
    sequence_mode = "teaching_sequence" if teaching_sequence else "token_fallback"

    media_cache: dict[str, dict[str, Any] | None] = {}

    visual_input_units = [
        _build_visual_unit(unit["unit"], unit["kind"], unit["source"], media_cache)
        for unit in input_units
    ]

    visual_sequence_units = [
        _build_visual_unit(unit, "sequence", unit, media_cache)
        for unit in sequence_source
    ]

    unmapped_units = sorted({item["unit"] for item in visual_sequence_units if not item["is_mapped"]})

    return {
        "input_text": user_text,
        "english_text": english_text,
        "keywords": keywords,
        "calculation": {
            "expression": expression,
            "result": result,
            "is_valid": bool(teaching_sequence),
        },
        "sequence_mode": sequence_mode,
        "teaching_sequence": teaching_sequence,
        "sequence_units": visual_sequence_units,
        "unmapped_units": unmapped_units,
    }
```

What to write in thesis:

This function acts as the central orchestration point for the text-driven learning workflow. It validates the input, translates it when required, tokenizes the sentence, extracts arithmetic operands and operators, computes the mathematical result, and constructs an educational sign sequence such as “one plus two equal three.” It also prepares the mapped dataset resources required for downstream playback. The function therefore connects the language-processing stage with the media and animation stages.

## 7. Landmark Feature Packaging

Suggested thesis subsection:
`Landmark Representation for Cross-Platform Animation`

Why this matters:
This shows how landmark data are simplified into a consistent transferable format.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Code snippet:

```python
def _landmark_to_triplet(landmark) -> list[float]:
    return [round(landmark.x, 5), round(landmark.y, 5), round(landmark.z, 5)]

def _landmark_list_payload(landmarks) -> list[dict[str, float]]:
    if not landmarks:
        return []

    return [
        {
            "x": round(float(landmark.x), 5),
            "y": round(float(landmark.y), 5),
            "z": round(float(landmark.z), 5),
        }
        for landmark in landmarks.landmark
    ]

def _unity_landmark_payload(result) -> dict[str, Any]:
    return {
        "left_hand": _landmark_list_payload(result.left_hand_landmarks),
        "right_hand": _landmark_list_payload(result.right_hand_landmarks),
        "pose": _landmark_list_payload(result.pose_landmarks),
    }
```

What to write in thesis:

The MediaPipe output is transformed into a compact landmark representation containing only the normalized x, y, and z coordinates. The payload is grouped by left hand, right hand, and body pose so that different animation modules can consume only the data they require. Rounding is applied to reduce payload size while maintaining sufficient spatial precision for animation.

## 8. Frame-Wise Landmark Extraction from Video

Suggested thesis subsection:
`Video-to-Landmark Conversion`

Why this matters:
This code explains how prerecorded sign videos are converted into animation-ready landmark sequences.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Code snippet:

```python
def _extract_unity_sequence(video_paths: list[Path]) -> dict[str, Any]:
    mp_holistic = mp.solutions.holistic
    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        refine_face_landmarks=False,
    )

    frames: list[dict[str, Any]] = []

    try:
        for clip_index, video_path in enumerate(video_paths):
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                continue

            fps = cap.get(cv2.CAP_PROP_FPS)
            fps = fps if fps and fps > 0 else 24.0
            stride = max(1, int(round(fps / 30.0)))
            delay_ms = round((1000.0 / fps) * stride, 2)

            frame_index = 0
            while cap.isOpened():
                ok, frame = cap.read()
                if not ok:
                    break

                if frame_index % stride != 0:
                    frame_index += 1
                    continue

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = holistic.process(rgb)
                frame_payload = _unity_landmark_payload(result)
                frame_payload["clip"] = video_path.stem
                frame_payload["sequence_index"] = clip_index
                frame_payload["delay_ms"] = delay_ms
                frames.append(frame_payload)
                frame_index += 1

            cap.release()
    finally:
        holistic.close()

    return {"frames": frames, "total_frames": len(frames)}
```

What to write in thesis:

The prerecorded sign-language clips are processed frame by frame using the MediaPipe Holistic model. To keep playback efficient, the system samples frames according to the source frame rate and a target output rate of approximately 30 frames per second. Each processed frame is encoded as a landmark payload with timing metadata, enabling temporally accurate replay in both Unity and browser-based visualizations.

## 9. Reusable Stream Processing Engine

Suggested thesis subsection:
`Real-Time Frame Processing and Streaming`

Why this matters:
This is a higher-level engine used by multiple visual outputs, so it is strong implementation content for a thesis.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Code snippet:

```python
def _processed_frame_stream(
    video_paths: list[Path],
    frame_renderer,
    show_clip_label: bool = True,
    progress_session_id: str | None = None,
    target_width: int | None = None,
    target_fps: int | None = None,
    jpeg_quality: int = 85,
    model_complexity: int = 1,
):
    mp_holistic = mp.solutions.holistic

    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=model_complexity,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        refine_face_landmarks=False,
    )

    try:
        for clip_index, video_path in enumerate(video_paths):
            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                continue

            while cap.isOpened():
                ok, frame = cap.read()
                if not ok:
                    break

                if target_width and target_width > 0 and frame.shape[1] > target_width:
                    scale = target_width / float(frame.shape[1])
                    frame = cv2.resize(
                        frame,
                        (max(1, int(round(frame.shape[1] * scale))), max(1, int(round(frame.shape[0] * scale)))),
                        interpolation=cv2.INTER_AREA,
                    )

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = holistic.process(rgb)
                canvas = frame_renderer(frame, result, {}, {})
                encoded_ok, encoded = cv2.imencode(
                    ".jpg",
                    canvas,
                    [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality],
                )

                if encoded_ok:
                    yield (
                        b"--frame\r\n"
                        b"Content-Type: image/jpeg\r\n\r\n" + encoded.tobytes() + b"\r\n"
                    )

            cap.release()
    finally:
        holistic.close()
```

What to write in thesis:

The system uses a reusable streaming engine to process a list of sign clips and emit rendered JPEG frames as an HTTP multipart stream. This abstraction allows the same processing loop to support multiple output modalities, such as a skeleton-based instructor view and a realistic overlay view. The design improves modularity because different renderers can be plugged into the same frame acquisition and landmark extraction pipeline.

## 10. Unity Playback Bridge

Suggested thesis subsection:
`UDP-Based Unity Playback Control`

Why this matters:
This part directly connects the Python backend to the Unity avatar.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Code snippet:

```python
def _run_unity_bridge(
    video_paths: list[Path],
    session_id: str,
    udp_host: str,
    udp_port: int,
    target_fps: int,
    model_complexity: int,
    stop_event: Event,
) -> None:
    mp_holistic = mp.solutions.holistic
    socket_client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    socket_client.connect((udp_host, udp_port))

    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=model_complexity,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        refine_face_landmarks=False,
    )

    try:
        for video_path in video_paths:
            if stop_event.is_set():
                break

            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                continue

            while cap.isOpened() and not stop_event.is_set():
                ok, frame = cap.read()
                if not ok:
                    break

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = holistic.process(rgb)
                payload = _unity_landmark_payload(result)
                message = f"{json.dumps(payload, separators=(',', ':'))}<EOM>"
                socket_client.send(message.encode("utf-8"))

            cap.release()
    finally:
        socket_client.close()
        holistic.close()
```

What to write in thesis:

The Unity bridge executes a frame-by-frame playback loop in which landmarks are extracted from mapped video clips and sent to Unity over UDP. An end-of-message token is appended to each JSON packet so that the Unity receiver can reliably delimit messages. This mechanism allows the avatar to replay prerecorded sign content as if it were receiving a live motion stream.

## 11. Backend State Management for Synchronization

Suggested thesis subsection:
`Playback State and Session Management`

Why this matters:
This shows that the project includes synchronization logic, not just animation logic.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Code snippet:

```python
def _init_overlay_progress(session_id: str, total_clips: int):
    with OVERLAY_PROGRESS_LOCK:
        OVERLAY_PROGRESS[session_id] = {
            "session_id": session_id,
            "started": False,
            "done": False,
            "current_index": None,
            "clip_label": None,
            "total_clips": total_clips,
            "revision": 0,
            "updated_at": time.time(),
        }

def _set_unity_bridge_status(**updates: Any) -> dict[str, Any]:
    with UNITY_BRIDGE_LOCK:
        UNITY_BRIDGE_STATUS.update(updates)
        UNITY_BRIDGE_STATUS["revision"] = int(UNITY_BRIDGE_STATUS.get("revision", 0)) + 1
        UNITY_BRIDGE_STATUS["updated_at"] = time.time()
        return dict(UNITY_BRIDGE_STATUS)

def _stop_unity_bridge(wait_timeout: float = 2.0) -> dict[str, Any]:
    with UNITY_BRIDGE_LOCK:
        thread = UNITY_BRIDGE_THREAD
        stop_event = UNITY_BRIDGE_STOP_EVENT

    if stop_event is not None:
        stop_event.set()

    if thread is not None and thread.is_alive():
        thread.join(timeout=wait_timeout)

    _set_unity_bridge_runtime(None, None)
    return _set_unity_bridge_status(
        active=False,
        started=False,
        done=True,
        stopped=True,
        message="Unity desktop playback stopped.",
    )
```

What to write in thesis:

The system maintains internal state objects to track the progress of overlay rendering and Unity playback sessions. Each state object stores flags such as started, done, and current clip index, together with a revision number and timestamp. This design supports responsive frontend updates and helps coordinate synchronized playback across different output modalities.

## 12. Flask API Design

Suggested thesis subsection:
`Backend Service Interface`

Why this matters:
This code demonstrates how the application exposes its processing pipeline to the client interface.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Code snippet:

```python
@app.post("/api/process")
def process():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()

    if not text:
        return jsonify({"error": "Please provide text in the request body."}), 400

    try:
        response = process_input_text(text)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Processing failed: {exc}"}), 500

    return jsonify(response)

@app.get("/api/unity/sequence")
def unity_sequence():
    video_paths = _parse_video_paths(request.args.get("paths", ""), deduplicate=False)
    if not video_paths:
        return jsonify({"error": "No valid mapped video paths were provided for Unity WebGL playback."}), 400
    return jsonify(_extract_unity_sequence(video_paths))
```

What to write in thesis:

The backend is exposed as a REST-style web service. The `/api/process` endpoint transforms user text into a structured teaching sequence, while `/api/unity/sequence` generates landmark frames that can be consumed by the browser-side 3D player. This separation of responsibilities makes the system easier to extend and test.

## 13. Frontend Processing Workflow

Suggested thesis subsection:
`Client-Side Playback Orchestration`

Why this matters:
This is useful because it proves your project is a complete interactive system, not only a backend prototype.

Source:
[app.js](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web/static/app.js)

Code snippet:

```javascript
async function processInput() {
    const text = textInput.value.trim();
    if (!text) {
        setStatus("Enter text or record speech before processing.", "error");
        return;
    }

    processBtn.disabled = true;
    setStatus("Processing input...", "info");
    try {
        const response = await fetch("/api/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Request failed.");

        await renderPipelineAndStartOverlay(data, {
            overlayStatusMessage: "Real-time 2D overlay playback started automatically.",
            successStatusMessage: "Pipeline completed and 2D overlay playback started automatically.",
        });

        void startSynchronizedUnityWebPlayback({
            preparingStatusMessage: "Preparing synchronized Unity 3D scene playback...",
            playingStatusMessage: "Unity 3D scene playback started automatically.",
        });
    } catch (error) {
        setStatus(`Error: ${error.message}`, "error");
    } finally {
        processBtn.disabled = false;
    }
}
```

What to write in thesis:

The frontend sends the user text to the backend through an asynchronous HTTP request and receives a structured response containing the teaching sequence and mapped sign resources. After the response is received, the client automatically triggers synchronized visualization modes, including the 2D overlay and the Unity-based 3D scene. This provides a seamless educational interaction for the learner.

## 14. Frontend Unity Desktop Trigger

Suggested thesis subsection:
`Browser-to-Unity Desktop Communication`

Why this matters:
This code is small but useful because it connects the web interface to the Unity desktop avatar.

Source:
[app.js](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web/static/app.js)

Code snippet:

```javascript
async function startUnityDesktopPlayback() {
    if (!unityDesktopPaths.length) {
        setStatus("No mapped clips available for Unity desktop playback.", "error");
        return;
    }

    playUnityDesktopBtn.disabled = true;
    stopUnityDesktopBtn.disabled = false;
    setUnityDesktopStatus("Starting Unity desktop playback...");

    try {
        const response = await fetch("/api/unity/play", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paths: unityDesktopPaths }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Unity desktop playback failed to start.");
        }

        setUnityDesktopStatus(data.message || "Streaming mapped sign sequence to Unity.");
        startUnityDesktopStatusPolling();
    } catch (error) {
        setUnityDesktopStatus(`Unity desktop playback failed: ${error.message}`);
    }
}
```

What to write in thesis:

The browser client can trigger desktop-avatar playback by sending a playback request to the Flask backend. The request includes the relative paths of the mapped sign clips. The client then starts polling the backend for playback status updates, allowing the web interface to reflect the state of the Unity avatar session in real time.

## 15. Original Webcam-Based Research Pipeline

Suggested thesis subsection:
`Initial Real-Time Prototype`

Why this matters:
This is good material if your thesis includes an evolution from research prototype to final system.

Source:
[body.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Python/body.py),
[clientUDP.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Python/clientUDP.py)

Code snippet:

```python
class CaptureThread(threading.Thread):
    def run(self):
        self.cap = cv2.VideoCapture(global_vars.CAM_INDEX)
        while not global_vars.KILL_THREADS:
            ret, frame = self.cap.read()
            with self.lock:
                self.ret = ret
                self.frame = frame.copy() if ret else None
            self.isRunning = True

class BodyThread(threading.Thread):
    def run(self):
        self.setup_comms()
        capture = CaptureThread()
        capture.start()

        with mp.solutions.holistic.Holistic(
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
            model_complexity=1,
            static_image_mode=False,
            enable_segmentation=True
        ) as holistic:
            while not global_vars.KILL_THREADS and capture.cap.isOpened():
                with capture.lock:
                    image = capture.frame.copy() if capture.ret else None
                if image is None:
                    continue

                image = cv2.flip(image, 1)
                results = holistic.process(image)

                data = {
                    "left_hand": [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in results.left_hand_landmarks.landmark] if results.left_hand_landmarks else [],
                    "right_hand": [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in results.right_hand_landmarks.landmark] if results.right_hand_landmarks else [],
                    "pose": [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in results.pose_landmarks.landmark] if results.pose_landmarks else []
                }

                self.send_data(json.dumps(data))
```

What to write in thesis:

The original prototype performed live webcam capture using a dedicated capture thread and a separate processing thread. MediaPipe Holistic was applied to each frame to estimate pose and hand landmarks, which were then serialized into JSON and transmitted to Unity. This prototype established the fundamental feasibility of real-time cross-platform motion transfer.

## 16. Unity Landmark Parsing

Suggested thesis subsection:
`Unity-Side Landmark Reception`

Why this matters:
This is the entry point for all avatar motion in Unity.

Source:
[DataManager.cs](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Unity/Assets/Scripts/DataManager.cs)

Code snippet:

```csharp
[Serializable]
public class Landmark
{
    public float x;
    public float y;
    public float z;
}

[Serializable]
public class LandmarkPacket
{
    public List<Landmark> left_hand;
    public List<Landmark> right_hand;
    public List<Landmark> pose;
}

private static string SanitizePayload(string rawPayload)
{
    if (string.IsNullOrWhiteSpace(rawPayload))
    {
        return string.Empty;
    }

    string payload = rawPayload.Trim();
    if (payload.EndsWith("<EOM>", StringComparison.Ordinal))
    {
        payload = payload.Substring(0, payload.Length - "<EOM>".Length).TrimEnd();
    }

    return payload;
}

private static float[][] ConvertLandmarks(List<Landmark> landmarks)
{
    if (landmarks == null || landmarks.Count == 0)
    {
        return null;
    }

    return landmarks
        .Select(landmark => new[] { landmark.x, landmark.y, landmark.z })
        .ToArray();
}
```

What to write in thesis:

The Unity receiver first sanitizes incoming UDP messages by removing the end-of-message token. The JSON payload is then deserialized into strongly typed landmark objects and converted into a numeric array format that can be efficiently consumed by the avatar animation scripts. This layer acts as the bridge between transport-level communication and animation-level processing.

## 17. Avatar Body Retargeting Tree

Suggested thesis subsection:
`Body Skeleton Retargeting`

Why this matters:
This is one of the most technically important code sections in the Unity part.

Source:
[Body.cs](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Unity/Assets/Scripts/Body.cs)

Code snippet:

```csharp
private void BulidTree()
{
    Hip = new AvatarTree(hip, -1, hip.rotation);
    Spine = Hip.child = new AvatarTree(spine, -2, spine.rotation, Hip);
    Thorax = Spine.child = new AvatarTree(thorax, -3, thorax.rotation, Spine);
    Neck = Thorax.child = new AvatarTree(neck, -4, neck.rotation, Thorax);
    Head = Neck.child = new AvatarTree(head, -5, head.rotation, Neck);
    Nose = Head.child = new AvatarTree(nose, 0, nose.rotation, Head);
    LHip = new AvatarTree(lHip, 23, lHip.rotation);
    LKnee = LHip.child = new AvatarTree(lKnee, 25, lKnee.rotation, LHip);
    LFoot = LKnee.child = new AvatarTree(lFoot, 29, lFoot.rotation, LKnee);
    RHip = new AvatarTree(rHip, 24, rHip.rotation);
    RKnee = RHip.child = new AvatarTree(rKnee, 26, rHip.rotation, RHip);
    RFoot = RKnee.child = new AvatarTree(rFoot, 30, rFoot.rotation, RKnee);
}
```

What to write in thesis:

The body retargeting module represents the humanoid skeleton as a hierarchical tree in which each node stores a transform, a landmark index, and the original joint rotation. Some nodes correspond directly to MediaPipe landmarks, while others represent virtual anatomical points such as the hip center or chest center, computed from multiple landmarks. This tree structure simplifies recursive pose updates.

## 18. Quaternion-Based Body Rotation Update

Suggested thesis subsection:
`Pose Update Algorithm`

Source:
[Body.cs](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Unity/Assets/Scripts/Body.cs)

Code snippet:

```csharp
private void UpdateBone(AvatarTree tree, float blend)
{
    Vector3 dir1 = tree.GetDir();
    Vector3 dir2 = GetData(tree.parent.idx) - GetData(tree.idx);
    Quaternion rot = Quaternion.FromToRotation(dir1, dir2);
    Quaternion rot1 = tree.parent.transf.rotation;
    tree.parent.transf.rotation = Quaternion.Lerp(rot1, rot * rot1, blend);
}
```

What to write in thesis:

For each joint, the system computes the direction vector of the current avatar bone and the target direction vector implied by the incoming landmark positions. A quaternion is then derived using `Quaternion.FromToRotation`, and the joint is smoothly interpolated toward the target orientation using `Quaternion.Lerp`. This prevents abrupt motion and produces more stable avatar animation.

## 19. Hand Joint Hierarchy

Suggested thesis subsection:
`Finger-Level Hand Retargeting`

Source:
[Hand.cs](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Unity/Assets/Scripts/Hand.cs)

Code snippet:

```csharp
private void BulidTree()
{
    L_Wrist = new AvatarTree(l_wrist, 5, 0, l_wrist.rotation);
    L_Thumb1 = L_Wrist.childs[0] = new AvatarTree(l_thumb1, 1, 1, l_thumb1.rotation, L_Wrist);
    L_Index1 = L_Wrist.childs[1] = new AvatarTree(l_index1, 1, 5, l_index1.rotation, L_Wrist);
    L_Middle1 = L_Wrist.childs[2] = new AvatarTree(l_middle1, 1, 9, l_middle1.rotation, L_Wrist);
    L_Ring1 = L_Wrist.childs[3] = new AvatarTree(l_ring1, 1, 13, l_ring1.rotation, L_Wrist);
    L_Pinky1 = L_Wrist.childs[4] = new AvatarTree(l_pinky1, 1, 17, l_pinky1.rotation, L_Wrist);

    L_Thumb2 = L_Thumb1.childs[0] = new AvatarTree(l_thumb2, 1, 2, l_thumb2.rotation, L_Thumb1);
    L_Thumb3 = L_Thumb2.childs[0] = new AvatarTree(l_thumb3, 1, 3, l_thumb3.rotation, L_Thumb2);
    L_Thumb4 = L_Thumb3.childs[0] = new AvatarTree(l_thumb4, 0, 4, l_thumb4.rotation, L_Thumb3);
}
```

What to write in thesis:

The hand retargeting system models each finger as a chain of joints originating from the wrist. Each node in the hierarchy is mapped to a MediaPipe hand-landmark index. This structure allows the avatar to reconstruct articulated finger motion from the 21-point hand landmark representation provided by MediaPipe.

## 20. Recursive Hand Animation Update

Suggested thesis subsection:
`Recursive Finger Pose Propagation`

Source:
[Hand.cs](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Unity/Assets/Scripts/Hand.cs)

Code snippet:

```csharp
private void UpdateTree(AvatarTree tree, float lerp, bool isLeft)
{
    if (tree.parent != null)
    {
        UpdateBone(tree, lerp, isLeft);
    }
    if (tree.childs != null)
    {
        foreach (var child in tree.childs)
        {
            if (child != null)
            {
                UpdateTree(child, lerp, isLeft);
            }
        }
    }
}

private void UpdateBone(AvatarTree tree, float lerp, bool isLeft)
{
    Vector3 dir1 = tree.GetDir();
    Vector3 parentPos = GetData(tree.parent.idx, isLeft);
    Vector3 childPos = GetData(tree.idx, isLeft);
    Vector3 dir2 = parentPos - childPos;

    Quaternion rot = Quaternion.FromToRotation(dir1, dir2);
    Quaternion rot1 = tree.parent.transf.rotation;
    tree.parent.transf.rotation = Quaternion.Lerp(rot1, rot * rot1, lerp);
}
```

What to write in thesis:

Hand animation is applied recursively from the wrist outward through all child joints. For each finger segment, the system compares the avatar’s current bone direction with the target direction derived from the parent and child landmarks. The resulting quaternion rotation is blended into the current orientation, enabling smooth finger articulation.

## 21. Unity WebGL Build Integration

Suggested thesis subsection:
`Deployment and Web Integration`

Why this matters:
This is useful if your thesis discusses how the system was deployed for browser-based use.

Source:
[SignJoyWebGLBuild.cs](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Unity/Assets/Editor/SignJoyWebGLBuild.cs)

Code snippet:

```csharp
public static class SignJoyWebGLBuild
{
    private const string BuildName = "SignJoyUnityWeb";

    [MenuItem("Build/Build SignJoy WebGL")]
    public static void BuildFromMenu()
    {
        Build();
    }

    public static void Build()
    {
        string outputRoot = GetOutputRoot();
        string[] scenes = GetEnabledScenes();

        if (scenes.Length == 0)
        {
            scenes = new[] { "Assets/Scenes/SampleScene.unity" };
        }

        var options = new BuildPlayerOptions
        {
            scenes = scenes,
            target = BuildTarget.WebGL,
            locationPathName = outputRoot,
            options = BuildOptions.None,
        };

        BuildReport report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != BuildResult.Succeeded)
        {
            throw new Exception($"WebGL build failed: {report.summary.result}");
        }
    }
}
```

What to write in thesis:

To support browser-based deployment, the Unity project includes an editor build script that exports the avatar scene as a WebGL application. The build output is written directly into the Flask web application’s static directory, making the Unity content available as part of the same web system. This integration simplifies deployment and allows the 3D avatar to be embedded in the learning interface.

## 22. Strongest Code Snippets to Definitely Include

If your thesis can only include a limited number of code blocks, prioritize these:

1. `process_input_text()` from `web_pipeline.py`
2. `extract_keywords()` from `keyword_extraction.py`
3. `perform_calculation()` from `calculator.py`
4. `map_keyword_to_media()` from `gesture_mapping.py`
5. `_extract_unity_sequence()` from `web_app.py`
6. `_run_unity_bridge()` from `web_app.py`
7. `ApplyFramePayload()` from `DataManager.cs`
8. `UpdateBone()` from `Body.cs`
9. `UpdateTree()` and `UpdateBone()` from `Hand.cs`
10. `processInput()` from `app.js`

## 23. Good Thesis Writing Pattern for Each Code Snippet

For each snippet, use this 4-part pattern:

1. Purpose
This code is used to...

2. Input
The function accepts...

3. Processing
It performs the following steps...

4. Output
The final output is...

Example:

The `process_input_text()` function is the main controller of the text-processing pipeline. It accepts the user’s raw input sentence, translates it into English when needed, tokenizes the sentence, extracts arithmetic keywords, computes the mathematical result, and builds a corresponding sign-teaching sequence. Its output is a structured response object containing the normalized text, identified keywords, calculated expression, and the mapped sign units required for playback.

## 24. Extra Tip for Thesis Presentation

When you insert code into the thesis:

1. Use only 10 to 30 lines per code block
2. Do not paste entire files
3. Add a caption below each block
4. Explain the code immediately after the figure
5. Focus on logic, not boilerplate
6. Group related snippets into subsections

## 25. Best Combination for a 30 to 40 Page Thesis

A good balance would be:

1. 8 to 12 major code snippets
2. 1 to 2 pages of architecture diagrams
3. 4 to 6 pages of implementation explanation
4. 2 to 3 pages of algorithm discussion
5. 2 to 3 pages of result discussion and screenshots

