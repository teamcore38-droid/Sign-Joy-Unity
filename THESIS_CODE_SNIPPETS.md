# Thesis Code Snippets

This file collects the most important code snippets in the project for use in a thesis report.

Use these as the main implementation excerpts. You do not need to include generated files, vendor libraries, dataset files, binary models, or full UI boilerplate.

Recommended thesis focus:

1. Natural-language input processing
2. Keyword extraction and arithmetic interpretation
3. Mapping language units to sign-media clips
4. Landmark extraction with MediaPipe
5. Streaming landmarks to Unity over UDP
6. Unity-side parsing of landmark packets
7. Avatar body retargeting
8. Avatar hand retargeting

## 1. Keyword Extraction

Why this matters:
This snippet shows how the system converts user text into machine-readable operands and operators.

Source:
[keyword_extraction.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/keyword_extraction.py)

Suggested thesis caption:
`Algorithm for extracting arithmetic keywords from normalized text input`

```python
def extract_keywords(text):
    text = text.lower()

    replacements = {
        "divided by": "divide",
        "multiply by": "multiply",
        "into": "multiply",
        "times": "multiply",
        "plus": "add",
        "minus": "subtract"
    }

    for k, v in replacements.items():
        text = text.replace(k, v)

    number_map = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
        "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
        "nineteen": 19, "twenty": 20
    }

    operators = {
        "add", "plus", "minus", "subtract",
        "multiply", "divide", "division"
    }

    numbers = []
    ops = []

    for word in text.split():
        if word.isdigit():
            numbers.append(int(word))
        elif word in number_map:
            numbers.append(number_map[word])
        elif word in operators:
            ops.append(word)

    return {
        "numbers": numbers,
        "operators": ops
    }
```

## 2. Arithmetic Interpretation

Why this matters:
This is the logic that converts extracted keywords into an executable mathematical expression and handles special sentence structure such as `subtract four from nine`.

Source:
[calculator.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/calculator.py)

Suggested thesis caption:
`Rule-based arithmetic evaluation for sign-learning sentence interpretation`

```python
def perform_calculation(keywords, original_text=None):
    nums = keywords["numbers"]
    ops = keywords["operators"]

    if len(nums) < 2 or len(ops) < 1:
        return None, "Invalid expression"

    a, b = nums[0], nums[1]
    op_word = ops[0]

    if original_text is not None:
        text_lower = original_text.lower()
        if "from" in text_lower and op_word in ["subtract", "minus"]:
            a, b = b, a

    if op_word in ["add", "plus"]:
        result = a + b
        expression = f"{a} + {b}"
    elif op_word in ["subtract", "minus"]:
        result = a - b
        expression = f"{a} - {b}"
    elif op_word in ["multiply"]:
        result = a * b
        expression = f"{a} x {b}"
    elif op_word in ["divide", "division"]:
        if b == 0:
            return None, "Division by zero"
        result = a / b
        expression = f"{a} / {b}"
    else:
        return None, "Unknown operator"

    return result, expression
```

## 3. Media Mapping

Why this matters:
This snippet maps recognized words and numbers to the corresponding sign-language video folders in the dataset.

Source:
[gesture_mapping.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/gesture_mapping.py)

Suggested thesis caption:
`Dataset-folder mapping between semantic tokens and sign-language video clips`

```python
BASE_DATASET_PATH = Path(__file__).resolve().parent / "datasets" / "Numbers"

def map_keyword_to_media(keyword):
    number_word_map = {
        0: "zero", 1: "one", 2: "two", 3: "three", 4: "four",
        5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine",
        10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen",
        14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen",
        18: "eighteen", 19: "nineteen", 20: "twenty"
    }

    operator_folder_map = {
        "add": "Addition",
        "plus": "Addition",
        "subtract": "Subtraction",
        "minus": "Subtraction",
        "multiply": "Multiplication",
        "into": "Multiplication",
        "divide": "Divide",
        "division": "Divide",
        "equal": "Equal"
    }

    if isinstance(keyword, int):
        keyword = number_word_map.get(keyword, str(keyword))

    keyword = str(keyword).lower()

    if keyword in operator_folder_map:
        folder_path = BASE_DATASET_PATH / operator_folder_map[keyword]
        return str(folder_path) if folder_path.exists() else None

    for folder in os.listdir(BASE_DATASET_PATH):
        folder_lower = folder.lower()
        if ". " in folder_lower:
            _, word_part = folder_lower.split(". ", 1)
            if keyword == word_part.strip():
                return str(BASE_DATASET_PATH / folder)

    return None
```

## 4. Input Translation, Tokenization, and Teaching Sequence Construction

Why this matters:
This is the main NLP pipeline of the web app. It translates Sinhala when required, tokenizes text, builds sign units, performs the calculation, and prepares the final teaching sequence.

Source:
[web_pipeline.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_pipeline.py)

Suggested thesis caption:
`End-to-end text-to-sign pipeline for educational math-sign generation`

```python
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

def _build_teaching_sequence(keywords: dict[str, list[Any]], result: Any) -> list[str]:
    numbers = keywords.get("numbers", [])
    operators = keywords.get("operators", [])

    if len(numbers) < 2 or len(operators) < 1 or result is None:
        return []

    sequence = [str(numbers[0]), operators[0], str(numbers[1]), "equal"]
    sequence.append(str(int(result)) if isinstance(result, float) and result.is_integer() else str(result))
    return sequence

def process_input_text(user_text: str) -> dict[str, Any]:
    translated = _translate_to_english(user_text)
    english_text = translated["english_text"]

    tokens = _tokenize(english_text)
    input_units = _split_into_units(tokens)

    keywords = extract_keywords(english_text)
    result, expression = perform_calculation(keywords, original_text=english_text)
    teaching_sequence = _build_teaching_sequence(keywords, result)

    sequence_source = teaching_sequence if teaching_sequence else [unit["unit"] for unit in input_units]
    media_cache: dict[str, dict[str, Any] | None] = {}

    visual_sequence_units = [
        _build_visual_unit(unit, "sequence", unit, media_cache)
        for unit in sequence_source
    ]

    return {
        "english_text": english_text,
        "keywords": keywords,
        "calculation": {
            "expression": expression,
            "result": result,
            "is_valid": bool(teaching_sequence),
        },
        "teaching_sequence": teaching_sequence,
        "sequence_units": visual_sequence_units,
    }
```

## 5. Landmark Packaging for Unity

Why this matters:
This code converts MediaPipe output into a compact JSON payload containing only left hand, right hand, and pose landmarks. This payload is the bridge format between Python and Unity.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Suggested thesis caption:
`Landmark serialization format used for Unity avatar playback`

```python
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

## 6. Offline Landmark Sequence Extraction from Video Clips

Why this matters:
This snippet shows how prerecorded sign videos are converted into frame-by-frame landmark sequences using MediaPipe Holistic.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Suggested thesis caption:
`Frame-wise landmark extraction from sign-language video clips`

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

    return {
        "frames": frames,
        "total_frames": len(frames),
        "clips": [path.stem for path in video_paths],
    }
```

## 7. UDP Streaming from Python to Unity

Why this matters:
This is the live bridge that reads mapped video frames, extracts landmarks, converts them to JSON, and streams them to the Unity avatar using UDP.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Suggested thesis caption:
`Real-time UDP transmission of landmark frames to the Unity avatar`

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
    frames_sent = 0
    socket_client: socket.socket | None = None
    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=model_complexity,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
        refine_face_landmarks=False,
    )

    try:
        socket_client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        socket_client.connect((udp_host, udp_port))

        for clip_index, video_path in enumerate(video_paths):
            if stop_event.is_set():
                break

            cap = cv2.VideoCapture(str(video_path))
            if not cap.isOpened():
                continue

            source_fps = cap.get(cv2.CAP_PROP_FPS)
            source_fps = source_fps if source_fps and source_fps > 0 else float(target_fps)
            stride = max(1, int(round(source_fps / float(target_fps)))) if target_fps > 0 else 1
            frame_delay = max((1.0 / source_fps) * stride, 1.0 / float(target_fps))
            frame_index = 0

            try:
                while cap.isOpened() and not stop_event.is_set():
                    frame_started_at = time.perf_counter()
                    ok, frame = cap.read()
                    if not ok:
                        break

                    if frame_index % stride != 0:
                        frame_index += 1
                        continue

                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    result = holistic.process(rgb)
                    payload = _unity_landmark_payload(result)
                    message = f"{json.dumps(payload, separators=(',', ':'))}<EOM>"
                    socket_client.send(message.encode("utf-8"))
                    frames_sent += 1

                    elapsed = time.perf_counter() - frame_started_at
                    remaining = frame_delay - elapsed
                    if remaining > 0:
                        time.sleep(remaining)

                    frame_index += 1
            finally:
                cap.release()
    finally:
        if socket_client is not None:
            socket_client.close()
        holistic.close()
```

## 8. Flask API Endpoints

Why this matters:
These routes expose the system as web services. They are the main entry points used by the browser client.

Source:
[web_app.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web_app.py)

Suggested thesis caption:
`REST API endpoints for processing input and triggering Unity playback`

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

@app.post("/api/unity/play")
def unity_play():
    payload = request.get_json(silent=True) or {}
    raw_paths = payload.get("paths", [])

    if not isinstance(raw_paths, list):
        return jsonify({"error": "Unity playback requires a list of mapped relative video paths."}), 400

    video_paths = _parse_video_path_list(raw_paths, deduplicate=False)
    if not video_paths:
        return jsonify({"error": "No valid mapped video paths were provided for Unity playback."}), 400

    stop_event = Event()
    thread = Thread(
        target=_run_unity_bridge,
        args=(video_paths, "unity-session", UNITY_UDP_HOST, UNITY_UDP_PORT, UNITY_DEFAULT_TARGET_FPS, 1, stop_event),
        daemon=True,
    )
    thread.start()
    return jsonify({"message": "Unity playback started."})
```

## 9. Browser-Side Request Handling

Why this matters:
This JavaScript function shows how the frontend sends user text to the Flask backend and starts synchronized playback.

Source:
[app.js](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/-Sign-Joy_AI/web/static/app.js)

Suggested thesis caption:
`Client-side orchestration of text processing and multimodal playback`

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

## 10. Original Webcam-to-Unity Research Pipeline

Why this matters:
This is the original real-time research pipeline. It captures webcam frames, runs MediaPipe Holistic, draws landmarks for debugging, and sends the JSON payload to Unity.

Source:
[body.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Python/body.py)

Suggested thesis caption:
`Original real-time webcam-based MediaPipe to Unity streaming pipeline`

```python
class BodyThread(threading.Thread):
    def run(self):
        mp_drawing = mp.solutions.drawing_utils
        mp_holistic = mp.solutions.holistic

        self.setup_comms()

        capture = CaptureThread()
        capture.start()

        with mp_holistic.Holistic(
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
            model_complexity=1,
            static_image_mode=False,
            enable_segmentation=True
        ) as holistic:
            while not global_vars.KILL_THREADS and capture.cap.isOpened():
                with capture.lock:
                    ret = capture.ret
                    image = capture.frame.copy() if ret else None

                if image is None:
                    continue

                image = cv2.flip(image, 1)
                results = holistic.process(image)

                data = {
                    "left_hand": [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in results.left_hand_landmarks.landmark] if results.left_hand_landmarks else [],
                    "right_hand": [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in results.right_hand_landmarks.landmark] if results.right_hand_landmarks else [],
                    "pose": [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in results.pose_landmarks.landmark] if results.pose_landmarks else []
                }

                final_message = json.dumps(data)
                self.send_data(final_message)
```

## 11. UDP Client

Why this matters:
This snippet shows the low-level transport mechanism used to send serialized landmarks from Python to Unity.

Source:
[clientUDP.py](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Python/clientUDP.py)

Suggested thesis caption:
`UDP client implementation for transmitting landmark packets`

```python
class ClientUDP(threading.Thread):
    def __init__(self, ip, port, autoReconnect=True) -> None:
        threading.Thread.__init__(self)
        self.ip = ip
        self.port = port
        self.autoReconnect = autoReconnect
        self.connected = False

    def sendMessage(self, message):
        try:
            message = str('%s<EOM>' % message).encode('utf-8')
            self.socket.send(message)
        except ConnectionRefusedError:
            self.disconnect()
        except ConnectionResetError:
            self.disconnect()

    def connect(self):
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.connect((self.ip, self.port))
        self.connected = True
```

## 12. Unity Data Reception and Parsing

Why this matters:
This is the Unity entry point for receiving landmark packets, sanitizing them, parsing JSON, and distributing pose and hand arrays to the animation scripts.

Source:
[DataManager.cs](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Unity/Assets/Scripts/DataManager.cs)

Suggested thesis caption:
`Unity-side parsing of incoming landmark packets`

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

private void ApplyFramePayload(string rawPayload)
{
    receivedData = SanitizePayload(rawPayload);
    if (string.IsNullOrWhiteSpace(receivedData))
    {
        ClearFrame();
        return;
    }

    LandmarkPacket payload = JsonUtility.FromJson<LandmarkPacket>(receivedData);

    if (hand != null)
    {
        hand.left_hand_data = ConvertLandmarks(payload.left_hand);
        hand.right_hand_data = ConvertLandmarks(payload.right_hand);
    }

    if (body != null)
    {
        body.pose_data = ConvertLandmarks(payload.pose);
    }
}
```

## 13. Unity Body Retargeting

Why this matters:
This code maps MediaPipe pose landmarks onto avatar body joints by computing direction vectors and rotating bones with quaternion interpolation.

Source:
[Body.cs](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Unity/Assets/Scripts/Body.cs)

Suggested thesis caption:
`Quaternion-based body retargeting from MediaPipe pose landmarks to a humanoid avatar`

```csharp
private Vector3 GetData(int idx)
{
    float x;
    float y;
    float z;

    if (idx == -1)
    {
        x = (pose_data[23][0] + pose_data[24][0]) / 2;
        y = (pose_data[23][1] + pose_data[24][1]) / 2;
        z = (pose_data[23][2] + pose_data[24][2]) / 2;
    }
    else if (idx == -3)
    {
        x = (pose_data[11][0] + pose_data[12][0]) / 2;
        y = (pose_data[11][1] + pose_data[12][1]) / 2;
        z = (pose_data[11][2] + pose_data[12][2]) / 2;
    }
    else
    {
        x = pose_data[idx][0];
        y = pose_data[idx][1];
        z = pose_data[idx][2];
    }

    return new Vector3(-x, y, -z);
}

private void UpdateBone(AvatarTree tree, float blend)
{
    Vector3 dir1 = tree.GetDir();
    Vector3 dir2 = GetData(tree.parent.idx) - GetData(tree.idx);
    Quaternion rot = Quaternion.FromToRotation(dir1, dir2);
    Quaternion rot1 = tree.parent.transf.rotation;
    tree.parent.transf.rotation = Quaternion.Lerp(rot1, rot * rot1, blend);
}
```

## 14. Unity Hand Retargeting

Why this matters:
This is the core finger animation logic. It builds a tree of joints for each hand and updates each parent bone using the direction of the corresponding MediaPipe landmarks.

Source:
[Hand.cs](/C:/Users/ahame/Music/Unity_MediaPipe_Action_Tracking-master/Unity/Assets/Scripts/Hand.cs)

Suggested thesis caption:
`Finger-joint retargeting using MediaPipe hand landmarks`

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

## Best Order for the Thesis

If you only want the most important excerpts, use them in this order:

1. `keyword_extraction.py`
2. `calculator.py`
3. `gesture_mapping.py`
4. `web_pipeline.py`
5. `web_app.py` landmark payload + sequence extraction
6. `web_app.py` Unity UDP bridge
7. `DataManager.cs`
8. `Body.cs`
9. `Hand.cs`
10. `body.py` original webcam pipeline

## What You Can Skip in the Thesis

Usually do not include these unless your supervisor explicitly asks:

1. Generated Unity WebGL build files
2. Vendor libraries such as `three.js`
3. Large HTML/CSS layout files
4. Binary models such as `.h5`, `.wasm`, `.data`
5. Dataset media files
6. Repetitive UI state code

