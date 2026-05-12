const textInput = document.getElementById("textInput");
const processBtn = document.getElementById("processBtn");
const micStartBtn = document.getElementById("micStartBtn");
const micStopBtn = document.getElementById("micStopBtn");
const speechLang = document.getElementById("speechLang");
const statusLine = document.getElementById("statusLine");

const detectedLanguage = document.getElementById("detectedLanguage");
const englishText = document.getElementById("englishText");
const expressionText = document.getElementById("expressionText");
const resultText = document.getElementById("resultText");

const inputUnitsEl = document.getElementById("inputUnits");
const sequenceUnitsEl = document.getElementById("sequenceUnits");
const sequenceModeEl = document.getElementById("sequenceMode");
const unmappedUnitsEl = document.getElementById("unmappedUnits");
const playSequenceBtn = document.getElementById("playSequenceBtn");
const playUnityDesktopBtn = document.getElementById("playUnityDesktopBtn");
const stopUnityDesktopBtn = document.getElementById("stopUnityDesktopBtn");
const unityDesktopStatusEl = document.getElementById("unityDesktopStatus");
const playUnityWebBtn = document.getElementById("playUnityWebBtn");
const stopUnityWebBtn = document.getElementById("stopUnityWebBtn");
const unityWebStatusEl = document.getElementById("unityWebStatus");
const unityWebStageEl = document.getElementById("unityWebStage");
const unityWebCanvasEl = document.getElementById("unityWebCanvas");
const unityWebFallbackEl = document.getElementById("unityWebFallback");
const unityWebLoadingEl = document.getElementById("unityWebLoading");
const unityWebLoadingLabelEl = document.getElementById("unityWebLoadingLabel");
const unityWebLoadingBarEl = document.getElementById("unityWebLoadingBar");
const unityWebTokenDisplayEl = document.getElementById("unityWebTokenDisplay");
const unityWebTokenMetaEl = document.getElementById("unityWebTokenMeta");
const unityWebTimelineEl = document.getElementById("unityWebTimeline");

const playSkeletonBtn = document.getElementById("playSkeletonBtn");
const stopSkeletonBtn = document.getElementById("stopSkeletonBtn");
const skeletonStatusEl = document.getElementById("skeletonStatus");
const skeletonStageEl = document.getElementById("skeletonStage");
const skeletonStreamEl = document.getElementById("skeletonStream");
const playOverlayBtn = document.getElementById("playOverlayBtn");
const stopOverlayBtn = document.getElementById("stopOverlayBtn");
const overlayStatusEl = document.getElementById("overlayStatus");
const overlayStageEl = document.getElementById("overlayStage");
const overlayStreamEl = document.getElementById("overlayStream");
const overlayTokenStageEl = document.getElementById("overlayTokenStage");
const overlayTokenDisplayEl = document.getElementById("overlayTokenDisplay");
const overlayTokenMetaEl = document.getElementById("overlayTokenMeta");
const overlayTokenTimelineEl = document.getElementById("overlayTokenTimeline");
const playGesture3DBtn = document.getElementById("playGesture3DBtn");
const stopGesture3DBtn = document.getElementById("stopGesture3DBtn");
const gesture3DStatusEl = document.getElementById("gesture3DStatus");
const gesture3DPanelEl = document.getElementById("gesture3DPanel");
const gesture3DCanvasEl = document.getElementById("gesture3DCanvas");
const gesture3DFallbackEl = document.getElementById("gesture3DFallback");
const gesture3DCurrentTokenEl = document.getElementById("gesture3DCurrentToken");
const gesture3DTimelineEl = document.getElementById("gesture3DTimeline");
const playSignAvatarBtn = document.getElementById("playSignAvatarBtn");
const stopSignAvatarBtn = document.getElementById("stopSignAvatarBtn");
const signAvatarStatusEl = document.getElementById("signAvatarStatus");
const signAvatarPanelEl = document.getElementById("signAvatarPanel");
const signAvatarCurrentTokenEl = document.getElementById("signAvatarCurrentToken");
const signAvatarTextEl = document.getElementById("signAvatarText");
const signAvatarCanvasEl = document.getElementById("signAvatarCanvas");
const signAvatarFallbackEl = document.getElementById("signAvatarFallback");
const signAvatarGroundTruthStageEl = document.getElementById("signAvatarGroundTruthStage");
const signAvatarGroundTruthVideoEl = document.getElementById("signAvatarGroundTruthVideo");
const advancedVisualsToggleEl = document.getElementById("advancedVisualsToggle");

const unitChipTemplate = document.getElementById("unitChipTemplate");
const sequenceCardTemplate = document.getElementById("sequenceCardTemplate");
const viewParams = new URLSearchParams(window.location.search);
const isDisplayMode = (
    viewParams.get("screen") === "display"
    || viewParams.get("mode") === "display"
    || viewParams.get("display") === "1"
);
const presentationChannelName = "sign-math-overlay-sync";
const presentationStorageKey = "sign-math-overlay-sync-event";
const presentationStartLeadMs = 700;
const presentationEventMaxAgeMs = 30000;
const presentationServerPollMs = 200;
const presentationTabId = window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `presentation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const presentationChannel = typeof window.BroadcastChannel === "function"
    ? new window.BroadcastChannel(presentationChannelName)
    : null;

let recognition = null;
let mappedVideoEntries = [];
let sequenceUnitsData = [];
let playbackRun = 0;
let skeletonPaths = [];
let unityDesktopPaths = [];
let unityWebPaths = [];
let overlayPaths = [];
let overlayRun = 0;
let overlaySessionId = "";
let overlayTokenNodes = [];
let overlayTokenSequence = [];
let gesture3DPaths = [];
let gesture3DFrames = [];
let gesture3DCacheKey = "";
let gesture3DRun = 0;
let gesture3DTokenNodes = [];
let gesture3DTokenSequence = [];
let signAvatarPaths = [];
let signAvatarFrames = [];
let signAvatarCacheKey = "";
let signAvatarRun = 0;
let signAvatarTokenSequence = [];
let signAvatarGroundTruthQueue = [];
let signAvatarGroundTruthIndex = 0;
let signAvatarGroundTruthRun = 0;
let lastProcessedData = null;
let overlayAutoplayRun = 0;
let lastPresentationEventId = "";
let presentationServerRevision = 0;
let presentationPollInFlight = false;
let advancedVisualsVisible = false;
let unityDesktopStatusPollId = 0;
let unityWebFrames = [];
let unityWebCacheKey = "";
let unityWebRun = 0;
let unityWebTokenNodes = [];
let unityWebTokenSequence = [];
let unityWebBuildStatus = null;
let unityWebRuntimePromise = null;
let unityWebInstance = null;
let unityWebScriptUrl = "";

const gesture3DLibReady = Boolean(window.GestureCharacter3D);
const gesture3DModel = gesture3DLibReady
    ? new window.GestureCharacter3D(gesture3DCanvasEl, gesture3DFallbackEl)
    : {
        enabled: false,
        setFrame() {},
        resetPose() {},
    };
const signAvatarModel = gesture3DLibReady
    ? new window.GestureCharacter3D(signAvatarCanvasEl, signAvatarFallbackEl, {
        mode: "cartoon",
        // Cartoon comparison mode gets the sign-readability layer by default; use
        // ?debugHands=1, ?handTrails=1, or ?handsOnly=1 to inspect the hand retargeting.
        readableHands: true,
        handStyle: "solid",
        tokenHandshapes: viewParams.get("presetHands") !== "0",
        tokenHandshapeStrength: Math.max(0, Math.min(1, Number.isFinite(Number(viewParams.get("handshapeStrength")))
            ? Number(viewParams.get("handshapeStrength"))
            : 0.75)),
        debugHands: viewParams.get("debugHands") === "1",
        handTrails: viewParams.get("handTrails") === "1",
        handsOnly: viewParams.get("handsOnly") === "1",
    })
    : {
        enabled: false,
        setFrame() {},
        resetPose() {},
        setActiveToken() {},
    };
const gesture3DFrameCache = {
    get cacheKey() {
        return gesture3DCacheKey;
    },
    set cacheKey(value) {
        gesture3DCacheKey = value;
    },
    get frames() {
        return gesture3DFrames;
    },
    set frames(value) {
        gesture3DFrames = value;
    },
};
const signAvatarFrameCache = {
    get cacheKey() {
        return signAvatarCacheKey;
    },
    set cacheKey(value) {
        signAvatarCacheKey = value;
    },
    get frames() {
        return signAvatarFrames;
    },
    set frames(value) {
        signAvatarFrames = value;
    },
};
const signAvatarClipFrameCache = new Map();

if (!gesture3DLibReady && gesture3DFallbackEl) {
    gesture3DFallbackEl.hidden = false;
}

if (!gesture3DModel.enabled) {
    playGesture3DBtn.disabled = true;
    stopGesture3DBtn.disabled = true;
}

if (!gesture3DLibReady && signAvatarFallbackEl) {
    signAvatarFallbackEl.hidden = false;
}

if (!signAvatarModel.enabled) {
    playSignAvatarBtn.disabled = true;
    stopSignAvatarBtn.disabled = true;
}

function setStatus(message, type = "info") {
    statusLine.textContent = message;
    statusLine.classList.remove("ok", "error");
    if (type === "ok") statusLine.classList.add("ok");
    if (type === "error") statusLine.classList.add("error");
}

function setSkeletonStatus(message) {
    skeletonStatusEl.textContent = message;
}

function setUnityDesktopStatus(message) {
    if (unityDesktopStatusEl) {
        unityDesktopStatusEl.textContent = message;
    }
}

function setUnityWebStatus(message) {
    if (unityWebStatusEl) {
        unityWebStatusEl.textContent = message;
    }
}

function setOverlayStatus(message) {
    overlayStatusEl.textContent = message;
}

function setSignAvatarStatus(message) {
    if (signAvatarStatusEl) {
        signAvatarStatusEl.textContent = message;
    }
}

function setSignAvatarCurrentToken(message) {
    if (signAvatarCurrentTokenEl) {
        signAvatarCurrentTokenEl.textContent = message;
    }
}

function setAdvancedVisualsVisible(visible) {
    advancedVisualsVisible = Boolean(visible);
    if (gesture3DPanelEl) {
        gesture3DPanelEl.hidden = !advancedVisualsVisible;
    }
    if (signAvatarPanelEl) {
        signAvatarPanelEl.hidden = !advancedVisualsVisible;
    }
    if (advancedVisualsToggleEl && advancedVisualsToggleEl.value !== (advancedVisualsVisible ? "show" : "hide")) {
        advancedVisualsToggleEl.value = advancedVisualsVisible ? "show" : "hide";
    }
}

function stopUnityDesktopStatusPolling() {
    if (unityDesktopStatusPollId) {
        window.clearInterval(unityDesktopStatusPollId);
        unityDesktopStatusPollId = 0;
    }
}

async function pollUnityDesktopStatus() {
    try {
        const response = await fetch(`/api/unity/status?_ts=${Date.now()}`, {
            headers: { Accept: "application/json" },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const status = await response.json();
        const active = Boolean(status.active);
        const started = Boolean(status.started);
        const done = Boolean(status.done);
        const clipLabel = typeof status.clip_label === "string" && status.clip_label
            ? status.clip_label
            : null;
        const totalClips = Number.isFinite(Number(status.total_clips))
            ? Number(status.total_clips)
            : unityDesktopPaths.length;
        const currentIndex = Number.isFinite(Number(status.current_index))
            ? Number(status.current_index)
            : null;
        const framesSent = Number.isFinite(Number(status.frames_sent))
            ? Number(status.frames_sent)
            : 0;

        let message = typeof status.message === "string" && status.message
            ? status.message
            : "Unity desktop bridge ready.";
        if (active && started && clipLabel && currentIndex !== null && totalClips > 0) {
            message = `Streaming to Unity: clip ${currentIndex + 1} of ${totalClips} (${clipLabel}) - ${framesSent} frames sent`;
        } else if (done && framesSent > 0 && !active) {
            message = `${message} (${framesSent} frames sent)`;
        }

        setUnityDesktopStatus(message);
        playUnityDesktopBtn.disabled = active || unityDesktopPaths.length === 0;
        stopUnityDesktopBtn.disabled = !active;

        if (!active && done) {
            stopUnityDesktopStatusPolling();
        }
    } catch (error) {
        setUnityDesktopStatus(`Unable to read Unity bridge status: ${error.message}`);
        playUnityDesktopBtn.disabled = unityDesktopPaths.length === 0;
        stopUnityDesktopBtn.disabled = true;
        stopUnityDesktopStatusPolling();
    }
}

function startUnityDesktopStatusPolling() {
    stopUnityDesktopStatusPolling();
    void pollUnityDesktopStatus();
    unityDesktopStatusPollId = window.setInterval(() => {
        void pollUnityDesktopStatus();
    }, 1000);
}

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
        setStatus("Unity desktop avatar playback started.", "ok");
        startUnityDesktopStatusPolling();
    } catch (error) {
        playUnityDesktopBtn.disabled = unityDesktopPaths.length === 0;
        stopUnityDesktopBtn.disabled = true;
        setUnityDesktopStatus(`Unity desktop playback failed: ${error.message}`);
        setStatus(`Unity desktop playback failed: ${error.message}`, "error");
    }
}

async function stopUnityDesktopPlayback(statusMessage = "Unity desktop playback stopped.") {
    stopUnityDesktopBtn.disabled = true;

    try {
        await fetch("/api/unity/stop", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        // Best effort. The local status still resets below.
    }

    stopUnityDesktopStatusPolling();
    setUnityDesktopStatus(statusMessage);
    playUnityDesktopBtn.disabled = unityDesktopPaths.length === 0;
    stopUnityDesktopBtn.disabled = true;
}

function setUnityWebLoading(visible, label = "Loading Unity scene...", progress = 0) {
    if (unityWebLoadingEl) {
        unityWebLoadingEl.hidden = !visible;
    }
    if (unityWebLoadingLabelEl) {
        unityWebLoadingLabelEl.textContent = label;
    }
    if (unityWebLoadingBarEl) {
        const normalized = Math.max(0, Math.min(1, Number(progress) || 0));
        unityWebLoadingBarEl.style.width = `${Math.round(normalized * 100)}%`;
    }
}

function setUnityWebFallback(message, visible = true) {
    if (unityWebFallbackEl) {
        unityWebFallbackEl.textContent = message;
        unityWebFallbackEl.hidden = !visible;
    }
    if (unityWebStageEl) {
        unityWebStageEl.classList.toggle("is-ready", !visible);
    }
}

function syncUnityWebButtons(active = false) {
    const ready = Boolean(unityWebBuildStatus && unityWebBuildStatus.available);
    if (playUnityWebBtn) {
        playUnityWebBtn.disabled = active || !ready || unityWebPaths.length === 0;
    }
    if (stopUnityWebBtn) {
        stopUnityWebBtn.disabled = !active;
    }
}

function renderUnityWebTimeline(tokens) {
    if (!unityWebTimelineEl) return;

    unityWebTimelineEl.innerHTML = "";
    unityWebTokenNodes = [];
    if (!tokens || !tokens.length) {
        const chip = document.createElement("span");
        chip.className = "unity-webgl-token-chip";
        chip.textContent = "No tokens";
        unityWebTimelineEl.appendChild(chip);
        return;
    }

    tokens.forEach((token) => {
        const chip = document.createElement("span");
        chip.className = "unity-webgl-token-chip";
        chip.textContent = token;
        unityWebTimelineEl.appendChild(chip);
        unityWebTokenNodes.push(chip);
    });
}

function setUnityWebTimelineState(active = null) {
    unityWebTokenNodes.forEach((node, idx) => {
        node.classList.remove("active", "done");
        if (active === null) return;
        if (idx < active) node.classList.add("done");
        if (idx === active) node.classList.add("active");
    });
}

function setUnityWebTimelineDone() {
    unityWebTokenNodes.forEach((node) => {
        node.classList.remove("active");
        node.classList.add("done");
    });
}

function pulseUnityWebTokenDisplay() {
    if (!unityWebTokenDisplayEl) return;
    unityWebTokenDisplayEl.classList.remove("is-animating");
    void unityWebTokenDisplayEl.offsetWidth;
    unityWebTokenDisplayEl.classList.add("is-animating");
}

function setUnityWebTokenDisplay(index = null, message = null) {
    if (unityWebTokenDisplayEl) {
        unityWebTokenDisplayEl.textContent = (
            index !== null
            && index >= 0
            && index < unityWebTokenSequence.length
        )
            ? unityWebTokenSequence[index]
            : "-";
        pulseUnityWebTokenDisplay();
    }

    setUnityWebTimelineState(index);

    if (unityWebTokenMetaEl) {
        if (message) {
            unityWebTokenMetaEl.textContent = message;
        } else if (index !== null && index >= 0 && index < unityWebTokenSequence.length) {
            unityWebTokenMetaEl.textContent = `Showing token ${index + 1} of ${unityWebTokenSequence.length}.`;
        } else {
            unityWebTokenMetaEl.textContent = "Process input to animate the current Unity token here.";
        }
    }
}

function resetUnityWebTokenPanel(message = "Process input to animate the current Unity token here.", cancelPlayback = true) {
    if (cancelPlayback) unityWebRun += 1;
    if (unityWebTokenDisplayEl) {
        unityWebTokenDisplayEl.classList.remove("is-animating");
        unityWebTokenDisplayEl.textContent = unityWebTokenSequence.length
            ? unityWebTokenSequence[0]
            : "-";
    }
    setUnityWebTimelineState(null);
    if (unityWebTokenMetaEl) {
        unityWebTokenMetaEl.textContent = message;
    }
}

async function loadUnityWebBuildStatus(forceRefresh = false) {
    if (!forceRefresh && unityWebBuildStatus) {
        return unityWebBuildStatus;
    }

    const response = await fetch(`/api/unity/webgl/status?_ts=${Date.now()}`, {
        headers: { Accept: "application/json" },
    });
    const data = await response.json();
    unityWebBuildStatus = data;

    if (data.available) {
        setUnityWebFallback("Unity WebGL scene ready.", Boolean(!unityWebInstance));
    } else {
        setUnityWebFallback(data.message || "Unity WebGL build is not available yet.", true);
    }

    syncUnityWebButtons(false);
    return unityWebBuildStatus;
}

function loadUnityWebLoaderScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Unable to load the Unity WebGL loader script."));
        document.head.appendChild(script);
    });
}

async function ensureUnityWebRuntime() {
    if (unityWebInstance) {
        return unityWebInstance;
    }

    if (unityWebRuntimePromise) {
        return unityWebRuntimePromise;
    }

    unityWebRuntimePromise = (async () => {
        const build = await loadUnityWebBuildStatus(true);
        if (!build.available) {
            throw new Error(build.message || "Unity WebGL build is not available.");
        }

        if (!window.createUnityInstance || unityWebScriptUrl !== build.loader_url) {
            unityWebScriptUrl = build.loader_url;
            await loadUnityWebLoaderScript(build.loader_url);
        }

        if (typeof window.createUnityInstance !== "function") {
            throw new Error("Unity WebGL loader did not expose createUnityInstance.");
        }

        setUnityWebLoading(true, "Loading Unity scene...", 0);
        const instance = await window.createUnityInstance(
            unityWebCanvasEl,
            {
                dataUrl: build.data_url,
                frameworkUrl: build.framework_url,
                codeUrl: build.code_url,
                streamingAssetsUrl: "/static/unity-webgl/StreamingAssets",
                companyName: "TeamCore",
                productName: "Sign Joy Unity",
                productVersion: "1.0",
            },
            (progress) => {
                const percent = Math.round((Number(progress) || 0) * 100);
                setUnityWebLoading(true, `Loading Unity scene... ${percent}%`, progress);
            },
        );

        unityWebInstance = instance;
        setUnityWebLoading(false);
        setUnityWebFallback("Unity WebGL scene ready.", false);
        return instance;
    })().catch((error) => {
        unityWebRuntimePromise = null;
        unityWebInstance = null;
        setUnityWebLoading(false);
        setUnityWebFallback(error.message || "Unable to start the Unity WebGL scene.", true);
        throw error;
    });

    return unityWebRuntimePromise;
}

async function loadUnityWebFrames(paths) {
    const cacheKey = Array.isArray(paths) ? paths.join("|") : "";
    if (!cacheKey) {
        return [];
    }

    if (cacheKey === unityWebCacheKey && unityWebFrames.length) {
        return unityWebFrames;
    }

    const encodedPaths = encodeURIComponent(cacheKey);
    const response = await fetch(`/api/unity/sequence?paths=${encodedPaths}&_ts=${Date.now()}`, {
        headers: { Accept: "application/json" },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} while loading Unity frame sequence.`);
    }
    if (!contentType.includes("application/json")) {
        throw new Error("Unity frame endpoint returned non-JSON content.");
    }

    const data = await response.json();
    unityWebFrames = Array.isArray(data.frames) ? data.frames : [];
    unityWebCacheKey = cacheKey;
    return unityWebFrames;
}

function sendUnityWebMessage(methodName, payload) {
    if (!unityWebInstance || typeof unityWebInstance.SendMessage !== "function") {
        return;
    }

    if (payload === undefined) {
        unityWebInstance.SendMessage("DataManager", methodName);
        return;
    }

    unityWebInstance.SendMessage("DataManager", methodName, payload);
}

function clearUnityWebFrame() {
    try {
        sendUnityWebMessage("ClearFrame");
    } catch (error) {
        // Best effort reset. The next playback can still continue.
    }
}

function stopUnityWebPlayback(
    statusMessage = "Unity WebGL playback stopped.",
    panelMessage = null,
) {
    unityWebRun += 1;
    clearUnityWebFrame();
    resetUnityWebTokenPanel(
        panelMessage || (
            unityWebTokenSequence.length
                ? "Ready to animate the current Unity token."
                : "Process input to animate the current Unity token here."
        ),
        false,
    );
    syncUnityWebButtons(false);
    setUnityWebStatus(statusMessage);
}

async function playUnityWebSequence(statusMessage = "Playing the embedded Unity 3D scene...", silentErrors = false) {
    if (!unityWebPaths.length) {
        if (!silentErrors) setStatus("No mapped clips are available for the Unity 3D scene.", "error");
        return;
    }

    const runId = ++unityWebRun;
    syncUnityWebButtons(true);
    setUnityWebStatus(statusMessage);

    try {
        const instance = await ensureUnityWebRuntime();
        if (runId !== unityWebRun) return;

        const frames = await loadUnityWebFrames(unityWebPaths);
        if (runId !== unityWebRun) return;
        if (!frames.length) {
            throw new Error("No Unity-compatible landmark frames were returned.");
        }

        let activeSequenceIndex = null;
        for (const frame of frames) {
            if (runId !== unityWebRun) return;

            const frameSequenceIndex = Number(frame.sequence_index);
            if (
                Number.isInteger(frameSequenceIndex)
                && frameSequenceIndex >= 0
                && frameSequenceIndex < unityWebTokenSequence.length
                && frameSequenceIndex !== activeSequenceIndex
            ) {
                activeSequenceIndex = frameSequenceIndex;
                setUnityWebTokenDisplay(frameSequenceIndex);
            }

            const payload = JSON.stringify({
                left_hand: Array.isArray(frame.left_hand) ? frame.left_hand : [],
                right_hand: Array.isArray(frame.right_hand) ? frame.right_hand : [],
                pose: Array.isArray(frame.pose) ? frame.pose : [],
            });
            instance.SendMessage("DataManager", "ReceiveFrameJson", payload);

            const delay = Number(frame.delay_ms);
            await sleep(Number.isFinite(delay) ? Math.max(24, Math.min(delay, 220)) : 56);
        }

        if (runId !== unityWebRun) return;
        clearUnityWebFrame();
        setUnityWebTimelineDone();
        if (unityWebTokenMetaEl) {
            unityWebTokenMetaEl.textContent = unityWebTokenSequence.length
                ? `Completed ${unityWebTokenSequence.length} signs in the Unity 3D scene.`
                : "Unity 3D scene playback completed.";
        }
        setUnityWebStatus("Unity 3D scene playback completed.");
    } catch (error) {
        clearUnityWebFrame();
        if (!silentErrors) setStatus(`Unity 3D scene error: ${error.message}`, "error");
        resetUnityWebTokenPanel(`Playback interrupted: ${error.message}`, false);
        setUnityWebStatus(`Unity 3D scene stopped: ${error.message}`);
    } finally {
        if (runId !== unityWebRun) return;
        syncUnityWebButtons(false);
    }
}

function setSignAvatarGroundTruthSource(videoUrl) {
    if (!signAvatarGroundTruthVideoEl) return;

    if (signAvatarGroundTruthStageEl) {
        signAvatarGroundTruthStageEl.classList.toggle("active", Boolean(videoUrl));
    }

    signAvatarGroundTruthVideoEl.pause();
    if (videoUrl) {
        signAvatarGroundTruthVideoEl.src = videoUrl;
        signAvatarGroundTruthVideoEl.load();
    } else {
        signAvatarGroundTruthVideoEl.removeAttribute("src");
        signAvatarGroundTruthVideoEl.src = "";
        signAvatarGroundTruthVideoEl.load();
    }
}

function setSignAvatarGroundTruthPreviewSource() {
    const previewItem = signAvatarGroundTruthQueue[0];
    if (previewItem && previewItem.videoUrl) {
        setSignAvatarGroundTruthSource(previewItem.videoUrl);
    } else {
        setSignAvatarGroundTruthSource("");
    }
}

async function loadSignAvatarClipFrames(relativePath) {
    const cacheKey = typeof relativePath === "string" ? relativePath.trim() : "";
    if (!cacheKey) return [];
    if (signAvatarClipFrameCache.has(cacheKey)) {
        return signAvatarClipFrameCache.get(cacheKey);
    }

    const encodedPath = encodeURIComponent(cacheKey);
    const response = await fetch(`/api/landmarks/sequence?paths=${encodedPath}&_ts=${Date.now()}`, {
        headers: { Accept: "application/json" },
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} while loading clip landmarks.`);
    }
    if (!contentType.includes("application/json")) {
        throw new Error("Landmark endpoint returned non-JSON content.");
    }

    const data = await response.json();
    const frames = Array.isArray(data.frames) ? data.frames : [];
    signAvatarClipFrameCache.set(cacheKey, frames);
    return frames;
}

function waitForSignAvatarVideoMetadata(runId) {
    if (!signAvatarGroundTruthVideoEl) return Promise.resolve(null);

    const videoEl = signAvatarGroundTruthVideoEl;
    const currentDuration = Number(videoEl.duration);
    if (videoEl.readyState >= 1 && Number.isFinite(currentDuration) && currentDuration > 0) {
        return Promise.resolve(currentDuration * 1000);
    }

    return new Promise((resolve) => {
        let settled = false;
        const cleanup = () => {
            window.clearInterval(pollId);
            videoEl.removeEventListener("loadedmetadata", onLoadedMetadata);
            videoEl.removeEventListener("error", onError);
        };
        const finish = (durationMs = null) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(durationMs);
        };
        const onLoadedMetadata = () => {
            const duration = Number(videoEl.duration);
            finish(Number.isFinite(duration) && duration > 0 ? duration * 1000 : null);
        };
        const onError = () => finish(null);
        const pollId = window.setInterval(() => {
            if (signAvatarRun !== runId || signAvatarGroundTruthRun !== runId) {
                finish(null);
            }
        }, 60);

        videoEl.addEventListener("loadedmetadata", onLoadedMetadata);
        videoEl.addEventListener("error", onError);
    });
}

function resetSignAvatarComparisonPlayback() {
    signAvatarRun += 1;
    signAvatarGroundTruthRun += 1;
    signAvatarGroundTruthIndex = 0;

    if (signAvatarModel.enabled) {
        signAvatarModel.resetPose();
        if (typeof signAvatarModel.setActiveToken === "function") {
            signAvatarModel.setActiveToken(null);
        }
    }

    if (signAvatarGroundTruthVideoEl) {
        signAvatarGroundTruthVideoEl.pause();
        try {
            signAvatarGroundTruthVideoEl.currentTime = 0;
        } catch (error) {
            // Ignore browsers that do not allow immediate seeks before metadata is ready.
        }
    }

    setSignAvatarGroundTruthPreviewSource();
    setSignAvatarCurrentToken(
        signAvatarTokenSequence.length
            ? `Current Token: ${signAvatarTokenSequence[0]}`
            : "Current Token: -",
    );

    playSignAvatarBtn.disabled = !signAvatarModel.enabled
        || signAvatarPaths.length === 0
        || signAvatarGroundTruthQueue.length === 0;
    stopSignAvatarBtn.disabled = true;
}

function stopSignAvatarComparison(statusMessage = "Comparison stopped") {
    resetSignAvatarComparisonPlayback();
    setSignAvatarStatus(statusMessage);
}

function waitForSignAvatarGroundTruthClip(runId) {
    if (!signAvatarGroundTruthVideoEl) {
        return Promise.resolve({ status: "missing" });
    }
    if (signAvatarGroundTruthVideoEl.ended) {
        return Promise.resolve({ status: "ended" });
    }

    return new Promise((resolve) => {
        let settled = false;
        const cleanup = () => {
            window.clearInterval(pollId);
            signAvatarGroundTruthVideoEl.removeEventListener("ended", onEnded);
            signAvatarGroundTruthVideoEl.removeEventListener("error", onError);
        };
        const finish = (result) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(result);
        };
        const onEnded = () => finish({ status: "ended" });
        const onError = () => finish({ status: "error" });
        const pollId = window.setInterval(() => {
            if (signAvatarGroundTruthRun !== runId) {
                finish({ status: "stopped" });
            } else if (signAvatarGroundTruthVideoEl.ended) {
                finish({ status: "ended" });
            }
        }, 60);

        signAvatarGroundTruthVideoEl.addEventListener("ended", onEnded);
        signAvatarGroundTruthVideoEl.addEventListener("error", onError);
    });
}

async function playSignAvatarGroundTruthSequence(runId) {
    if (!signAvatarGroundTruthVideoEl || !signAvatarGroundTruthQueue.length) {
        return false;
    }

    signAvatarGroundTruthIndex = 0;
    let playedAnyClip = false;

    while (runId === signAvatarGroundTruthRun && signAvatarGroundTruthIndex < signAvatarGroundTruthQueue.length) {
        const clipIndex = signAvatarGroundTruthIndex;
        const clip = signAvatarGroundTruthQueue[clipIndex];
        signAvatarGroundTruthIndex = clipIndex;

        if (!clip || !clip.videoUrl) {
            setSignAvatarCurrentToken(`Current Token: ${clip?.token || "-"}`);
            setSignAvatarStatus(`Ground truth: clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} skipped — ${clip?.token || "-"}`);
            signAvatarGroundTruthIndex += 1;
            continue;
        }

        setSignAvatarCurrentToken(`Current Token: ${clip.token || "-"}`);
        setSignAvatarStatus(`Ground truth: clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} — ${clip.token || "-"}`);

        signAvatarGroundTruthVideoEl.pause();
        try {
            signAvatarGroundTruthVideoEl.currentTime = 0;
        } catch (error) {
            // Some browsers need metadata first; the later load/play call will still work.
        }
        signAvatarGroundTruthVideoEl.src = clip.videoUrl;
        signAvatarGroundTruthVideoEl.load();

        let playResult;
        try {
            playResult = signAvatarGroundTruthVideoEl.play();
            if (playResult && typeof playResult.catch === "function") {
                await playResult;
            }
        } catch (error) {
            if (runId !== signAvatarGroundTruthRun) return playedAnyClip;
            setSignAvatarStatus(`Ground truth: clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} failed to play — ${clip.token || "-"}`);
            signAvatarGroundTruthIndex += 1;
            continue;
        }

        playedAnyClip = true;
        const result = await waitForSignAvatarGroundTruthClip(runId);
        if (runId !== signAvatarGroundTruthRun) return playedAnyClip;
        if (result.status !== "ended") {
            if (result.status === "error") {
                setSignAvatarStatus(`Ground truth: clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} skipped — ${clip.token || "-"}`);
            }
            signAvatarGroundTruthIndex += 1;
            continue;
        }

        signAvatarGroundTruthIndex += 1;
    }

    return playedAnyClip;
}

async function playSignAvatarClipFrames(frames, runId, clipDurationMs = null) {
    if (!signAvatarModel.enabled || !Array.isArray(frames) || !frames.length) {
        return false;
    }

    const totalDelay = frames.reduce((sum, frame) => {
        const delay = Number(frame?.delay_ms);
        return sum + (Number.isFinite(delay) && delay > 0 ? delay : 56);
    }, 0);
    const hasDuration = Number.isFinite(clipDurationMs) && clipDurationMs > 0 && totalDelay > 0;
    const timingScale = hasDuration
        ? Math.max(0.5, Math.min(2.0, clipDurationMs / totalDelay))
        : 1;

    for (const frame of frames) {
        if (runId !== signAvatarRun || runId !== signAvatarGroundTruthRun) return false;
        signAvatarModel.setFrame(frame);
        const delay = Number(frame?.delay_ms);
        const baseDelay = Number.isFinite(delay) && delay > 0 ? delay : 56;
        const nextDelay = Math.max(24, Math.min(baseDelay * timingScale, 220));
        await sleep(nextDelay);
    }

    return true;
}

async function playSignAvatarSynchronizedSequence(runId) {
    if (!signAvatarModel.enabled || !signAvatarGroundTruthQueue.length) {
        return false;
    }

    let playedAnyClip = false;

    for (let clipIndex = 0; clipIndex < signAvatarGroundTruthQueue.length; clipIndex += 1) {
        if (runId !== signAvatarRun || runId !== signAvatarGroundTruthRun) return playedAnyClip;

        signAvatarGroundTruthIndex = clipIndex;
        const clip = signAvatarGroundTruthQueue[clipIndex];
        const tokenLabel = clip?.token || "-";
        if (typeof signAvatarModel.setActiveToken === "function") {
            signAvatarModel.setActiveToken(tokenLabel);
        }
        setSignAvatarCurrentToken(`Current Token: ${tokenLabel}`);

        if (!clip || !clip.videoUrl || !clip.relativePath) {
            setSignAvatarStatus(`Clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} skipped - ${tokenLabel}`);
            continue;
        }

        setSignAvatarStatus(`Playing clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} - ${tokenLabel}`);

        let frames = [];
        let clipDurationMs = null;
        try {
            const [loadedFrames, durationHint] = await Promise.all([
                loadSignAvatarClipFrames(clip.relativePath),
                (async () => {
                    setSignAvatarGroundTruthSource(clip.videoUrl);
                    return waitForSignAvatarVideoMetadata(runId);
                })(),
            ]);
            frames = loadedFrames;
            clipDurationMs = durationHint;
        } catch (error) {
            if (runId !== signAvatarRun || runId !== signAvatarGroundTruthRun) return playedAnyClip;
            setSignAvatarStatus(`Clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} failed to load - ${tokenLabel}`);
            continue;
        }

        if (runId !== signAvatarRun || runId !== signAvatarGroundTruthRun) return playedAnyClip;
        if (!Array.isArray(frames) || !frames.length) {
            setSignAvatarStatus(`Clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} has no landmark frames - ${tokenLabel}`);
            continue;
        }

        const videoEl = signAvatarGroundTruthVideoEl;
        if (!videoEl) return playedAnyClip;
        videoEl.pause();
        try {
            videoEl.currentTime = 0;
        } catch (error) {
            // Some browsers require metadata before seeking.
        }

        try {
            const playResult = videoEl.play();
            if (playResult && typeof playResult.catch === "function") {
                await playResult;
            }
        } catch (error) {
            if (runId !== signAvatarRun || runId !== signAvatarGroundTruthRun) return playedAnyClip;
            setSignAvatarStatus(`Clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} could not start - ${tokenLabel}`);
            continue;
        }

        const avatarPlayback = playSignAvatarClipFrames(frames, runId, clipDurationMs);
        const videoFinished = waitForSignAvatarGroundTruthClip(runId);
        playedAnyClip = true;

        const [avatarResult, videoResult] = await Promise.all([avatarPlayback, videoFinished]);
        if (runId !== signAvatarRun || runId !== signAvatarGroundTruthRun) return playedAnyClip;

        if (videoResult?.status === "error") {
            setSignAvatarStatus(`Clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} ended with a video error - ${tokenLabel}`);
            continue;
        }

        if (!avatarResult) {
            setSignAvatarStatus(`Clip ${clipIndex + 1} of ${signAvatarGroundTruthQueue.length} ended early on the avatar side - ${tokenLabel}`);
        }
    }

    if (runId === signAvatarRun && runId === signAvatarGroundTruthRun) {
        if (typeof signAvatarModel.setActiveToken === "function") {
            signAvatarModel.setActiveToken(null);
        }
        setSignAvatarStatus("Comparison complete");
    }
    return playedAnyClip;
}

function renderOverlayTokenTimeline(tokens) {
    if (!overlayTokenTimelineEl) return;

    overlayTokenTimelineEl.innerHTML = "";
    overlayTokenNodes = [];
    if (!tokens || !tokens.length) {
        const chip = document.createElement("span");
        chip.className = "overlay-token-chip";
        chip.textContent = "No tokens";
        overlayTokenTimelineEl.appendChild(chip);
        return;
    }

    tokens.forEach((token) => {
        const chip = document.createElement("span");
        chip.className = "overlay-token-chip";
        chip.textContent = token;
        overlayTokenTimelineEl.appendChild(chip);
        overlayTokenNodes.push(chip);
    });
}

function setOverlayTokenTimelineState(active = null) {
    overlayTokenNodes.forEach((node, idx) => {
        node.classList.remove("active", "done");
        if (active === null) return;
        if (idx < active) node.classList.add("done");
        if (idx === active) node.classList.add("active");
    });
}

function setOverlayTokenTimelineDone() {
    overlayTokenNodes.forEach((node) => {
        node.classList.remove("active");
        node.classList.add("done");
    });
}

function pulseOverlayTokenDisplay() {
    if (!overlayTokenDisplayEl) return;
    overlayTokenDisplayEl.classList.remove("is-animating");
    void overlayTokenDisplayEl.offsetWidth;
    overlayTokenDisplayEl.classList.add("is-animating");
}

function setOverlayTokenDisplay(index = null, message = null) {
    if (overlayTokenDisplayEl) {
        overlayTokenDisplayEl.textContent = (
            index !== null
            && index >= 0
            && index < overlayTokenSequence.length
        )
            ? overlayTokenSequence[index]
            : "-";
        pulseOverlayTokenDisplay();
    }

    setOverlayTokenTimelineState(index);

    if (overlayTokenMetaEl) {
        if (message) {
            overlayTokenMetaEl.textContent = message;
        } else if (index !== null && index >= 0 && index < overlayTokenSequence.length) {
            overlayTokenMetaEl.textContent = `Showing token ${index + 1} of ${overlayTokenSequence.length}.`;
        } else {
            overlayTokenMetaEl.textContent = "Process input to animate the current token here.";
        }
    }
}

function resetOverlayTokenPanel(message = "Process input to animate the current token here.", cancelPlayback = true) {
    if (cancelPlayback) overlayRun += 1;
    if (overlayTokenDisplayEl) {
        overlayTokenDisplayEl.classList.remove("is-animating");
    }
    if (overlayTokenSequence.length) {
        if (overlayTokenDisplayEl) overlayTokenDisplayEl.textContent = overlayTokenSequence[0];
    } else if (overlayTokenDisplayEl) {
        overlayTokenDisplayEl.textContent = "-";
    }
    setOverlayTokenTimelineState(null);
    if (overlayTokenMetaEl) overlayTokenMetaEl.textContent = message;
}

function createOverlaySessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return `overlay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function markPresentationEventHandled(eventId) {
    if (!eventId) return false;
    if (lastPresentationEventId === eventId) return true;
    lastPresentationEventId = eventId;
    return false;
}

function broadcastPresentationEvent(type, payload = {}) {
    const message = {
        eventId: createOverlaySessionId(),
        senderId: presentationTabId,
        type,
        payload,
        sentAt: Date.now(),
    };

    if (presentationChannel) {
        presentationChannel.postMessage(message);
    }

    try {
        window.localStorage.setItem(presentationStorageKey, JSON.stringify(message));
    } catch (error) {
        // Storage fallback is best-effort only.
    }

    return message;
}

function readStoredPresentationEvent() {
    try {
        const raw = window.localStorage.getItem(presentationStorageKey);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function isFreshPresentationEvent(message) {
    const sentAt = Number(message?.sentAt);
    if (!Number.isFinite(sentAt)) return false;
    return (Date.now() - sentAt) <= presentationEventMaxAgeMs;
}

async function publishPresentationEventToServer(message) {
    if (!message || typeof message !== "object") return null;

    try {
        const response = await fetch("/api/presentation/event", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(message),
        });
        if (!response.ok) return null;
        const data = await response.json();
        const revision = Number(data?.revision);
        if (Number.isFinite(revision)) {
            presentationServerRevision = Math.max(presentationServerRevision, revision);
        }
        return data;
    } catch (error) {
        return null;
    }
}

async function fetchPresentationEventFromServer() {
    try {
        const response = await fetch(
            `/api/presentation/event?revision=${encodeURIComponent(String(presentationServerRevision))}&_ts=${Date.now()}`,
            {
                headers: { Accept: "application/json" },
                cache: "no-store",
            },
        );
        if (response.status === 204 || !response.ok) return null;
        const data = await response.json();
        const revision = Number(data?.revision);
        if (Number.isFinite(revision)) {
            presentationServerRevision = Math.max(presentationServerRevision, revision);
        }
        return data;
    } catch (error) {
        return null;
    }
}

async function pollPresentationEventFromServer() {
    if (!isDisplayMode || presentationPollInFlight) return;

    presentationPollInFlight = true;
    try {
        const message = await fetchPresentationEventFromServer();
        if (!message || !isFreshPresentationEvent(message)) return;
        if (message.eventId && message.eventId === lastPresentationEventId) return;
        await handlePresentationEvent(message);
    } finally {
        presentationPollInFlight = false;
    }
}

function waitForOverlayFirstFrame(runId, timeoutMs = 3000) {
    if (!overlayStreamEl) return Promise.resolve();
    if (overlayStreamEl.complete && overlayStreamEl.naturalWidth > 0) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            overlayStreamEl.removeEventListener("load", onLoad);
            overlayStreamEl.removeEventListener("error", onError);
            window.clearTimeout(timerId);
            resolve();
        };
        const onLoad = () => {
            if (runId !== overlayRun) return finish();
            finish();
        };
        const onError = () => finish();
        const timerId = window.setTimeout(finish, timeoutMs);

        overlayStreamEl.addEventListener("load", onLoad);
        overlayStreamEl.addEventListener("error", onError);
    });
}

async function fetchOverlayProgress(sessionId) {
    if (!sessionId) return null;

    try {
        const response = await fetch(`/api/overlay/progress?session_id=${encodeURIComponent(sessionId)}&_ts=${Date.now()}`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
}

async function waitForOverlayProgressComplete(sessionId, runId, timeoutMs = 120000) {
    const startedAt = Date.now();
    while (runId === overlayRun) {
        const progress = await fetchOverlayProgress(sessionId);
        if (runId !== overlayRun) return false;
        if (progress?.done) return true;
        if ((Date.now() - startedAt) >= timeoutMs) return false;
        await sleep(120);
    }
    return false;
}

async function playOverlayTokenSequence(
    message = "Animating tokens in sync with the overlay stream...",
    runId = ++overlayRun,
    sessionId = overlaySessionId,
) {
    if (!mappedVideoEntries.length) {
        resetOverlayTokenPanel("No mapped tokens are available for overlay animation.");
        return;
    }
    if (!sessionId) {
        resetOverlayTokenPanel("Overlay progress is unavailable for token synchronization.");
        return;
    }

    if (overlayTokenMetaEl) overlayTokenMetaEl.textContent = message;
    let activeIndex = null;

    while (runId === overlayRun) {
        const progress = await fetchOverlayProgress(sessionId);
        if (runId !== overlayRun) return;
        const nextIndex = Number(progress?.current_index);

        if (
            Number.isInteger(nextIndex)
            && nextIndex >= 0
            && nextIndex < overlayTokenSequence.length
            && nextIndex !== activeIndex
        ) {
            activeIndex = nextIndex;
            setOverlayTokenDisplay(nextIndex);
        }

        if (progress?.done) {
            setOverlayTokenTimelineDone();
            if (overlayTokenMetaEl) overlayTokenMetaEl.textContent = "Overlay token animation completed.";
            return;
        }

        await sleep(120);
    }
}

function setGesture3DStatus(message) {
    gesture3DStatusEl.textContent = message;
}

function renderGesture3DTimeline(tokens) {
    if (!gesture3DTimelineEl) return;

    gesture3DTimelineEl.innerHTML = "";
    gesture3DTokenNodes = [];
    if (!tokens || !tokens.length) {
        const chip = document.createElement("span");
        chip.className = "avatar-token";
        chip.textContent = "No sequence";
        gesture3DTimelineEl.appendChild(chip);
        return;
    }
    tokens.forEach((token) => {
        const chip = document.createElement("span");
        chip.className = "avatar-token";
        chip.textContent = token;
        gesture3DTimelineEl.appendChild(chip);
        gesture3DTokenNodes.push(chip);
    });
}

function setGesture3DTimelineState(active = null) {
    gesture3DTokenNodes.forEach((node, idx) => {
        node.classList.remove("active", "done");
        if (active === null) return;
        if (idx < active) node.classList.add("done");
        if (idx === active) node.classList.add("active");
    });
}

function setGesture3DTimelineDone() {
    gesture3DTokenNodes.forEach((node) => {
        node.classList.remove("active");
        node.classList.add("done");
    });
}

function startSkeletonStream(paths, statusMessage) {
    if (!skeletonStreamEl || !skeletonStageEl) return;

    if (!paths || !paths.length) {
        setSkeletonStatus("No mapped sign clips are available for cartoon instructor visualization.");
        playSkeletonBtn.disabled = true;
        stopSkeletonBtn.disabled = true;
        return;
    }

    const encodedPaths = encodeURIComponent(paths.join("|"));
    skeletonStreamEl.src = `/api/skeleton/stream?paths=${encodedPaths}&_ts=${Date.now()}`;
    skeletonStageEl.classList.add("active");
    playSkeletonBtn.disabled = true;
    stopSkeletonBtn.disabled = false;
    setSkeletonStatus(statusMessage);
}

function stopSkeletonStream(statusMessage = "Cartoon instructor stream stopped.") {
    if (!skeletonStreamEl || !skeletonStageEl) return;

    skeletonStreamEl.removeAttribute("src");
    skeletonStreamEl.src = "";
    skeletonStageEl.classList.remove("active");
    playSkeletonBtn.disabled = skeletonPaths.length === 0;
    stopSkeletonBtn.disabled = true;
    setSkeletonStatus(statusMessage);
}

function startOverlayStream(paths, statusMessage, animateTokens = true) {
    if (!overlayStreamEl || !overlayStageEl) return;

    if (!paths || !paths.length) {
        setOverlayStatus("No mapped sign clips are available for realistic hand + upper-body overlay.");
        playOverlayBtn.disabled = true;
        stopOverlayBtn.disabled = true;
        resetOverlayTokenPanel("No mapped tokens are available for overlay animation.");
        return null;
    }

    if (overlayStageEl.classList.contains("active") || overlayStreamEl.getAttribute("src")) {
        overlayStreamEl.removeAttribute("src");
        overlayStreamEl.src = "";
        overlayStageEl.classList.remove("active");
    }

    const runId = ++overlayRun;
    overlaySessionId = createOverlaySessionId();
    const overlayParams = new URLSearchParams({
        paths: paths.join("|"),
        session_id: overlaySessionId,
        width: "640",
        fps: "15",
        quality: "70",
        complexity: "0",
        _ts: String(Date.now()),
    });
    overlayStreamEl.src = `/api/overlay/stream?${overlayParams.toString()}`;
    overlayStageEl.classList.add("active");
    playOverlayBtn.disabled = true;
    stopOverlayBtn.disabled = false;
    setOverlayStatus(statusMessage);

    if (animateTokens) {
        resetOverlayTokenPanel("Waiting for the overlay stream to start...", false);
        void (async () => {
            await waitForOverlayFirstFrame(runId);
            if (runId !== overlayRun) return;
            await playOverlayTokenSequence("Animating tokens in sync with the overlay stream...", runId, overlaySessionId);
        })();
    } else {
        resetOverlayTokenPanel("Token animation is synced with the current overlay sequence.", false);
    }

    return runId;
}

function stopOverlayStream(statusMessage = "Realistic hand + upper-body overlay stream stopped.") {
    if (!overlayStreamEl || !overlayStageEl) return;

    overlayAutoplayRun += 1;
    overlayStreamEl.removeAttribute("src");
    overlayStreamEl.src = "";
    overlaySessionId = "";
    overlayStageEl.classList.remove("active");
    playOverlayBtn.disabled = overlayPaths.length === 0;
    stopOverlayBtn.disabled = true;
    setOverlayStatus(statusMessage);
    resetOverlayTokenPanel(statusMessage);
}

async function loadGesture3DFrames(paths, cacheState = gesture3DFrameCache) {
    const cacheKey = paths.join("|");
    if (cacheKey && cacheKey === cacheState.cacheKey && cacheState.frames.length) {
        return cacheState.frames;
    }

    const encodedPaths = encodeURIComponent(cacheKey);
    const candidateUrls = [
        `/api/landmarks/sequence?paths=${encodedPaths}&_ts=${Date.now()}`,
        `/api/landmark/sequence?paths=${encodedPaths}&_ts=${Date.now()}`,
        `/api/gesture3d/sequence?paths=${encodedPaths}&_ts=${Date.now()}`,
    ];

    let lastError = "Failed to load 3D landmark sequence.";

    for (const url of candidateUrls) {
        try {
            const response = await fetch(url, { headers: { Accept: "application/json" } });
            const contentType = response.headers.get("content-type") || "";

            if (!response.ok) {
                lastError = `HTTP ${response.status} while loading 3D landmark sequence.`;
                continue;
            }

            if (!contentType.includes("application/json")) {
                lastError = "Landmark endpoint returned non-JSON content. Restart backend and hard-refresh browser.";
                continue;
            }

            const data = await response.json();
            cacheState.frames = Array.isArray(data.frames) ? data.frames : [];
            cacheState.cacheKey = cacheKey;
            return cacheState.frames;
        } catch (error) {
            lastError = error.message || String(error);
        }
    }

    throw new Error(lastError);
}

function stopGesture3DPlayback(statusMessage = "3D landmark gesture playback stopped.") {
    gesture3DRun += 1;
    if (gesture3DModel.enabled) gesture3DModel.resetPose();
    playGesture3DBtn.disabled = !gesture3DModel.enabled || gesture3DPaths.length === 0;
    stopGesture3DBtn.disabled = true;
    setGesture3DTimelineState(null);
    if (gesture3DCurrentTokenEl) {
        gesture3DCurrentTokenEl.textContent = gesture3DTokenSequence.length
            ? gesture3DTokenSequence[0]
            : "-";
    }
    setGesture3DStatus(statusMessage);
}

async function playGesture3DSequence(statusMessage = "Playing 3D landmark-driven gesture sequence...", silentErrors = false) {
    if (!gesture3DModel.enabled || !gesture3DPaths.length) {
        if (!silentErrors) setStatus("3D landmark gesture visualization is not available.", "error");
        return;
    }

    const runId = ++gesture3DRun;
    playGesture3DBtn.disabled = true;
    stopGesture3DBtn.disabled = false;
    setGesture3DStatus(statusMessage);

    try {
        const frames = await loadGesture3DFrames(gesture3DPaths);
        if (runId !== gesture3DRun) return;
        if (!frames.length) throw new Error("No landmark frames were returned.");

        let activeSequenceIndex = null;
        for (const frame of frames) {
            if (runId !== gesture3DRun) return;
            const frameSequenceIndex = Number(frame.sequence_index);
            const currentToken = (
                Number.isInteger(frameSequenceIndex)
                && frameSequenceIndex >= 0
                && frameSequenceIndex < gesture3DTokenSequence.length
            )
                ? gesture3DTokenSequence[frameSequenceIndex]
                : null;
            gesture3DModel.setFrame({
                ...frame,
                token: currentToken,
            });
            if (
                Number.isInteger(frameSequenceIndex)
                && frameSequenceIndex >= 0
                && frameSequenceIndex < gesture3DTokenSequence.length
                && frameSequenceIndex !== activeSequenceIndex
            ) {
                activeSequenceIndex = frameSequenceIndex;
                setGesture3DTimelineState(frameSequenceIndex);
                if (gesture3DCurrentTokenEl) {
                    gesture3DCurrentTokenEl.textContent = gesture3DTokenSequence[frameSequenceIndex];
                }
            }
            const delay = Number(frame.delay_ms);
            await sleep(Number.isFinite(delay) ? Math.max(24, Math.min(delay, 220)) : 56);
        }

        if (runId !== gesture3DRun) return;
        setGesture3DTimelineDone();
        setGesture3DStatus("3D landmark-driven gesture sequence completed.");
    } catch (error) {
        if (!silentErrors) setStatus(`3D gesture error: ${error.message}`, "error");
        setGesture3DStatus(`3D gesture playback stopped: ${error.message}`);
    } finally {
        if (runId !== gesture3DRun) return;
        playGesture3DBtn.disabled = !gesture3DModel.enabled || gesture3DPaths.length === 0;
        stopGesture3DBtn.disabled = true;
    }
}

async function playSignAvatarComparison() {
    if (!signAvatarModel.enabled || !signAvatarPaths.length || !signAvatarGroundTruthQueue.length) {
        setStatus("SignAvatars-style comparison is not available.", "error");
        return;
    }

    resetSignAvatarComparisonPlayback();
    const runId = signAvatarRun;
    playSignAvatarBtn.disabled = true;
    stopSignAvatarBtn.disabled = false;
    setSignAvatarStatus(`Loading synchronized comparison sequence (${signAvatarGroundTruthQueue.length} mapped clips)...`);
    setSignAvatarCurrentToken(`Current Token: ${signAvatarGroundTruthQueue[0]?.token || signAvatarTokenSequence[0] || "-"}`);

    try {
        await playSignAvatarSynchronizedSequence(runId);
    } catch (error) {
        if (runId !== signAvatarRun) return;
        setSignAvatarStatus(`SignAvatars-style comparison stopped: ${error.message}`);
        setStatus(`Comparison error: ${error.message}`, "error");
    } finally {
        if (runId !== signAvatarRun) return;
        playSignAvatarBtn.disabled = !signAvatarModel.enabled
            || signAvatarPaths.length === 0
            || signAvatarGroundTruthQueue.length === 0;
        stopSignAvatarBtn.disabled = true;
    }
}

function setSummary(data) {
    detectedLanguage.textContent = data.detected_language || "-";
    englishText.textContent = data.english_text || "-";
    expressionText.textContent = data.calculation?.expression || "-";
    resultText.textContent = data.calculation?.result ?? "-";
}

function renderInputUnits(units) {
    inputUnitsEl.innerHTML = "";
    if (!units || !units.length) {
        inputUnitsEl.textContent = "No tokens detected.";
        return;
    }
    units.forEach((u) => {
        const node = unitChipTemplate.content.firstElementChild.cloneNode(true);
        node.querySelector(".chip-main").textContent = u.unit;
        node.querySelector(".chip-sub").textContent = u.kind;
        inputUnitsEl.appendChild(node);
    });
}

function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function renderSequenceUnits(units) {
    sequenceUnitsEl.innerHTML = "";
    mappedVideoEntries = [];
    sequenceUnitsData = units || [];
    void stopUnityDesktopPlayback("Unity desktop playback stopped while preparing a new sequence.");

    if (!sequenceUnitsData.length) {
        sequenceUnitsEl.textContent = "No sequence generated.";
        playSequenceBtn.disabled = true;
        skeletonPaths = [];
        unityWebPaths = [];
        overlayPaths = [];
        overlayTokenSequence = [];
        unityWebFrames = [];
        unityWebCacheKey = "";
        unityWebTokenSequence = [];
        gesture3DPaths = [];
        gesture3DFrames = [];
        gesture3DCacheKey = "";
        gesture3DTokenSequence = [];
        signAvatarPaths = [];
        signAvatarFrames = [];
        signAvatarCacheKey = "";
        signAvatarTokenSequence = [];
        signAvatarGroundTruthQueue = [];
        signAvatarGroundTruthIndex = 0;
        unityDesktopPaths = [];
        playSkeletonBtn.disabled = true;
        stopSkeletonBtn.disabled = true;
        playUnityDesktopBtn.disabled = true;
        stopUnityDesktopBtn.disabled = true;
        syncUnityWebButtons(false);
        playOverlayBtn.disabled = true;
        stopOverlayBtn.disabled = true;
        playGesture3DBtn.disabled = true;
        stopGesture3DBtn.disabled = true;
        playSignAvatarBtn.disabled = true;
        stopSignAvatarBtn.disabled = true;
        stopSkeletonStream("No sequence generated for cartoon instructor streaming.");
        void stopUnityDesktopPlayback("No sequence generated for Unity desktop playback.");
        stopOverlayStream("No sequence generated for realistic hand + upper-body overlay streaming.");
        stopGesture3DPlayback("No sequence generated for 3D landmark gesture visualization.");
        stopSignAvatarComparison("No sequence generated for SignAvatars-style comparison.");
        renderOverlayTokenTimeline([]);
        resetOverlayTokenPanel("No sequence generated for overlay token animation.");
        renderUnityWebTimeline([]);
        resetUnityWebTokenPanel("No sequence generated for Unity token animation.", false);
        setUnityWebStatus("Process input to prepare the embedded Unity 3D scene.");
        if (gesture3DCurrentTokenEl) gesture3DCurrentTokenEl.textContent = "-";
        setSignAvatarCurrentToken("Current Token: -");
        renderGesture3DTimeline([]);
        if (signAvatarTextEl) signAvatarTextEl.textContent = "-";
        setSignAvatarGroundTruthSource("");
        return;
    }

    sequenceUnitsData.forEach((u, i) => {
        const node = sequenceCardTemplate.content.firstElementChild.cloneNode(true);
        node.querySelector(".token-label").textContent = u.unit;
        node.querySelector(".token-kind").textContent = u.kind;
        const mediaWrap = node.querySelector(".media-wrap");

        if (u.is_mapped && u.video_url) {
            const video = document.createElement("video");
            video.src = u.video_url;
            video.controls = true;
            video.preload = "metadata";
            video.playsInline = true;
            mediaWrap.appendChild(video);
            mappedVideoEntries.push({
                video,
                index: i,
                token: u.unit,
                relativePath: u.video_relative_path || "",
                videoUrl: u.video_url || "",
            });
        } else {
            const fallback = document.createElement("div");
            fallback.className = "media-fallback";
            fallback.textContent = "No sign clip found for this unit.";
            mediaWrap.appendChild(fallback);
        }
        sequenceUnitsEl.appendChild(node);
    });

    playSequenceBtn.disabled = mappedVideoEntries.length === 0;
    skeletonPaths = mappedVideoEntries
        .map((entry) => entry.relativePath)
        .filter((path) => Boolean(path));
    unityDesktopPaths = [...skeletonPaths];
    unityWebPaths = [...skeletonPaths];
    overlayPaths = [...skeletonPaths];
    overlayTokenSequence = mappedVideoEntries.map((entry) => entry.token);
    unityWebFrames = [];
    unityWebCacheKey = "";
    unityWebTokenSequence = mappedVideoEntries.map((entry) => entry.token);
    gesture3DPaths = [...skeletonPaths];
    gesture3DFrames = [];
    gesture3DCacheKey = "";
    gesture3DTokenSequence = mappedVideoEntries.map((entry) => entry.token);
    signAvatarPaths = mappedVideoEntries
        .map((entry) => entry.relativePath)
        .filter((path) => Boolean(path));
    signAvatarFrames = [];
    signAvatarCacheKey = "";
    signAvatarTokenSequence = mappedVideoEntries.map((entry) => entry.token);
    signAvatarGroundTruthQueue = mappedVideoEntries.map((entry) => ({
        token: entry.token,
        videoUrl: entry.videoUrl || "",
        relativePath: entry.relativePath || "",
    }));
    signAvatarGroundTruthIndex = 0;
    playSkeletonBtn.disabled = skeletonPaths.length === 0;
    stopSkeletonBtn.disabled = true;
    playUnityDesktopBtn.disabled = unityDesktopPaths.length === 0;
    stopUnityDesktopBtn.disabled = true;
    syncUnityWebButtons(false);
    playOverlayBtn.disabled = overlayPaths.length === 0;
    stopOverlayBtn.disabled = true;
    playGesture3DBtn.disabled = !gesture3DModel.enabled || gesture3DPaths.length === 0;
    stopGesture3DBtn.disabled = true;
    playSignAvatarBtn.disabled = !signAvatarModel.enabled
        || signAvatarPaths.length === 0
        || signAvatarGroundTruthQueue.length === 0;
    stopSignAvatarBtn.disabled = true;
    if (skeletonPaths.length) {
        stopSkeletonStream("Ready to stream cartoon instructor sequence.");
    } else {
        stopSkeletonStream("No mapped clips available for cartoon instructor visualization.");
    }
    if (unityDesktopPaths.length) {
        setUnityDesktopStatus("Ready to send the mapped sign sequence to the Unity desktop avatar.");
    } else {
        void stopUnityDesktopPlayback("No mapped clips available for Unity desktop playback.");
    }
    if (unityWebPaths.length) {
        if (unityWebBuildStatus?.available) {
            setUnityWebStatus("Ready to play the mapped sign sequence in the embedded Unity 3D scene.");
        } else {
            setUnityWebStatus(unityWebBuildStatus?.message || "Unity WebGL build is not available yet.");
        }
    } else {
        stopUnityWebPlayback("No mapped clips available for the Unity 3D scene.");
    }
    if (overlayPaths.length) {
        stopOverlayStream("Ready to stream realistic 2D hand + upper-body overlay sequence.");
    } else {
        stopOverlayStream("No mapped clips available for realistic 2D hand + upper-body overlay.");
    }
    renderOverlayTokenTimeline(overlayTokenSequence);
    resetOverlayTokenPanel(
        overlayTokenSequence.length
            ? "Ready to animate the current overlay token."
            : "No mapped tokens available for overlay animation.",
    );
    renderUnityWebTimeline(unityWebTokenSequence);
    resetUnityWebTokenPanel(
        unityWebTokenSequence.length
            ? "Ready to animate the current Unity token."
            : "No mapped tokens available for the Unity 3D scene.",
        false,
    );
    if (gesture3DPaths.length) {
        stopGesture3DPlayback("Ready to stream 3D hand + character landmark sequence.");
    } else {
        stopGesture3DPlayback("No mapped clips available for 3D hand + character landmark sequence.");
    }
    if (signAvatarPaths.length) {
        setSignAvatarGroundTruthPreviewSource();
        stopSignAvatarComparison(`Ready: ${signAvatarGroundTruthQueue.length} mapped clips`);
    } else {
        setSignAvatarGroundTruthSource("");
        stopSignAvatarComparison("No mapped clips available for SignAvatars-style comparison.");
    }
    if (signAvatarTextEl) {
        signAvatarTextEl.textContent = signAvatarTokenSequence.length
            ? `"${signAvatarTokenSequence.join(", ")}"`
            : "-";
    }
    setSignAvatarCurrentToken(
        signAvatarTokenSequence.length
            ? `Current Token: ${signAvatarTokenSequence[0]}`
            : "Current Token: -",
    );
    renderGesture3DTimeline(gesture3DTokenSequence);
    setGesture3DTimelineState(null);

    if (gesture3DCurrentTokenEl) {
        gesture3DCurrentTokenEl.textContent = gesture3DTokenSequence.length
            ? gesture3DTokenSequence[0]
            : "-";
    }
}

function renderPipeline(data) {
    lastProcessedData = data && typeof data === "object" ? data : null;
    playbackRun += 1;
    setSummary(data);
    renderInputUnits(data.input_units || []);
    renderSequenceUnits(data.sequence_units || []);

    sequenceModeEl.textContent = data.sequence_mode === "teaching_sequence"
        ? "Using teaching sequence generated from arithmetic interpretation."
        : "Using fallback token/letter sequence.";

    unmappedUnitsEl.textContent = data.unmapped_units?.length
        ? `No mapped visual sign for: ${data.unmapped_units.join(", ")}`
        : "";
}

async function renderPipelineAndStartOverlay(
    data,
    {
        scheduledStartAt = null,
        overlayStatusMessage = "Streaming realistic hand + upper-body overlay...",
        successStatusMessage = "Pipeline completed and 2D overlay playback started.",
        noOverlayStatusMessage = "Pipeline completed, but no mapped overlay clips are available for the 2D overlay.",
    } = {},
) {
    if (!data || typeof data !== "object") return false;

    renderPipeline(data);
    const autoplayRun = ++overlayAutoplayRun;

    if (!overlayPaths.length) {
        if (noOverlayStatusMessage) setStatus(noOverlayStatusMessage, "ok");
        return false;
    }

    const requestedStartAt = Number(scheduledStartAt);
    const startAt = Number.isFinite(requestedStartAt) ? requestedStartAt : Date.now();
    const waitMs = Math.max(0, startAt - Date.now());

    if (waitMs > 0) {
        setOverlayStatus("Waiting for synchronized overlay start...");
        if (overlayTokenMetaEl) {
            overlayTokenMetaEl.textContent = "Waiting for synchronized overlay start...";
        }
        await sleep(waitMs);
    }

    if (autoplayRun !== overlayAutoplayRun) return false;

    startOverlayStream(overlayPaths, overlayStatusMessage);
    if (successStatusMessage) setStatus(successStatusMessage, "ok");
    return true;
}

async function handlePresentationEvent(message) {
    if (!message || typeof message !== "object") return;
    if (message.senderId === presentationTabId) return;
    if (markPresentationEventHandled(message.eventId)) return;

    if (message.type === "start-overlay-playback" && message.payload?.data) {
        const controllerText = typeof message.payload.text === "string"
            ? message.payload.text.trim()
            : "";
        if (controllerText) textInput.value = controllerText;

        await renderPipelineAndStartOverlay(message.payload.data, {
            scheduledStartAt: message.payload.startAt,
            overlayStatusMessage: "Presentation overlay playback started from the controller tab.",
            successStatusMessage: "Presentation display updated from controller tab.",
            noOverlayStatusMessage: "Presentation updated, but no mapped overlay clips are available for the 2D overlay.",
        });
        return;
    }

    if (message.type === "stop-overlay-playback") {
        stopOverlayStream("Presentation overlay stopped from the controller tab.");
    }
}

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
        const startAt = Date.now() + presentationStartLeadMs;
        const presentationMessage = broadcastPresentationEvent("start-overlay-playback", {
            data,
            text,
            startAt,
        });
        await publishPresentationEventToServer(presentationMessage);
        setStatus("Preparing synchronized overlay playback...", "info");
        await renderPipelineAndStartOverlay(data, {
            scheduledStartAt: startAt,
            overlayStatusMessage: "Real-time 2D overlay playback started automatically.",
            successStatusMessage: "Pipeline completed and 2D overlay playback started automatically.",
            noOverlayStatusMessage: "Pipeline completed, but no mapped overlay clips are available for the 2D overlay.",
        });
    } catch (error) {
        setStatus(`Error: ${error.message}`, "error");
    } finally {
        processBtn.disabled = false;
    }
}

async function playSequence() {
    if (!mappedVideoEntries.length) {
        setStatus("No mapped sign videos available to play.", "error");
        return;
    }
    const runId = ++playbackRun;
    let overlayStreamRunId = null;
    playSequenceBtn.disabled = true;
    setStatus("Playing sign clips...", "info");
    if (skeletonPaths.length) {
        startSkeletonStream(skeletonPaths, "Synchronized cartoon instructor stream started.");
    }
    if (overlayPaths.length) {
        overlayStreamRunId = startOverlayStream(overlayPaths, "Synchronized realistic hand + upper-body overlay stream started.");
    }
    if (unityWebPaths.length) {
        void playUnityWebSequence("Synchronized Unity 3D scene playback started.", true);
    }
    if (gesture3DPaths.length) {
        playGesture3DSequence("Synchronized 3D hand + character playback started.", true);
    }

    try {
        if (overlayPaths.length && overlayStreamRunId !== null) {
            await waitForOverlayFirstFrame(overlayStreamRunId);
            if (runId !== playbackRun) return;
        }

        for (const entry of mappedVideoEntries) {
            if (runId !== playbackRun) return;
            entry.video.currentTime = 0;
            await entry.video.play();
            await new Promise((resolve) => {
                const onEnded = () => {
                    entry.video.removeEventListener("ended", onEnded);
                    resolve();
                };
                entry.video.addEventListener("ended", onEnded);
            });
        }
        if (overlayPaths.length && overlaySessionId) {
            await waitForOverlayProgressComplete(overlaySessionId, overlayStreamRunId ?? overlayRun);
            if (runId !== playbackRun) return;
        }
        setStatus("Sequence playback complete.", "ok");
        if (skeletonPaths.length) {
            setSkeletonStatus("Cartoon instructor sequence completed.");
            playSkeletonBtn.disabled = false;
            stopSkeletonBtn.disabled = true;
        }
        if (overlayPaths.length) {
            setOverlayStatus("Realistic hand + upper-body overlay sequence completed.");
            playOverlayBtn.disabled = false;
            stopOverlayBtn.disabled = true;
        }
        if (unityWebPaths.length) {
            setUnityWebStatus("Unity 3D scene playback completed.");
            syncUnityWebButtons(false);
        }
        if (gesture3DPaths.length) {
            setGesture3DStatus("3D hand + character playback completed.");
            playGesture3DBtn.disabled = !gesture3DModel.enabled || gesture3DPaths.length === 0;
            stopGesture3DBtn.disabled = true;
        }
    } catch (error) {
        setStatus(`Playback error: ${error.message}`, "error");
        if (skeletonPaths.length) stopSkeletonStream(`Cartoon instructor stream stopped: ${error.message}`);
        if (overlayPaths.length) stopOverlayStream(`Realistic hand overlay stream stopped: ${error.message}`);
        if (unityWebPaths.length) stopUnityWebPlayback(`Unity 3D scene stopped: ${error.message}`);
        if (gesture3DPaths.length) stopGesture3DPlayback(`3D hand + character playback stopped: ${error.message}`);
    } finally {
        playSequenceBtn.disabled = mappedVideoEntries.length === 0;
    }
}

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micStartBtn.disabled = true;
        micStopBtn.disabled = true;
        setStatus("Browser speech recognition is not supported here. Use text input.", "error");
        return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = speechLang.value;
    recognition.onstart = () => { micStartBtn.disabled = true; micStopBtn.disabled = false; setStatus("Listening...", "info"); };
    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) transcript += event.results[i][0].transcript;
        textInput.value = transcript.trim();
    };
    recognition.onerror = (event) => setStatus(`Speech error: ${event.error}`, "error");
    recognition.onend = () => {
        micStartBtn.disabled = false;
        micStopBtn.disabled = true;
        setStatus(textInput.value.trim() ? "Speech captured. Click Process Input." : "Listening stopped.", textInput.value.trim() ? "ok" : "info");
    };
    speechLang.addEventListener("change", () => { if (recognition) recognition.lang = speechLang.value; });
}

processBtn.addEventListener("click", processInput);
playSequenceBtn.addEventListener("click", playSequence);
if (advancedVisualsToggleEl) {
    advancedVisualsToggleEl.addEventListener("change", () => {
        setAdvancedVisualsVisible(advancedVisualsToggleEl.value === "show");
    });
}
playUnityDesktopBtn.addEventListener("click", () => {
    void startUnityDesktopPlayback();
});
stopUnityDesktopBtn.addEventListener("click", () => {
    void stopUnityDesktopPlayback("Unity desktop playback stopped.");
});
playUnityWebBtn.addEventListener("click", () => {
    void playUnityWebSequence();
});
stopUnityWebBtn.addEventListener("click", () => {
    stopUnityWebPlayback("Unity 3D scene playback stopped.");
});
playSkeletonBtn.addEventListener("click", () => {
    if (!skeletonPaths.length) {
        setStatus("No mapped clips available for cartoon instructor visualization.", "error");
        return;
    }
    startSkeletonStream(skeletonPaths, "Streaming cartoon instructor overlay...");
});
stopSkeletonBtn.addEventListener("click", () => {
    stopSkeletonStream("Cartoon instructor stream stopped.");
});
playOverlayBtn.addEventListener("click", () => {
    if (!overlayPaths.length) {
        setStatus("No mapped clips available for realistic hand + upper-body overlay.", "error");
        return;
    }
    startOverlayStream(overlayPaths, "Streaming realistic hand + upper-body overlay...");
});
stopOverlayBtn.addEventListener("click", () => {
    stopOverlayStream("Realistic hand + upper-body overlay stream stopped.");
    const message = broadcastPresentationEvent("stop-overlay-playback");
    void publishPresentationEventToServer(message);
});
playGesture3DBtn.addEventListener("click", () => {
    if (!gesture3DPaths.length) {
        setStatus("No mapped clips available for 3D hand + character landmark visualization.", "error");
        return;
    }
    playGesture3DSequence("Playing 3D full-body + face character from MediaPipe landmarks...");
});
stopGesture3DBtn.addEventListener("click", () => {
    stopGesture3DPlayback("3D hand + character playback stopped.");
});
playSignAvatarBtn.addEventListener("click", () => {
    if (!signAvatarPaths.length || !signAvatarGroundTruthQueue.length) {
        setStatus("No mapped clips available for SignAvatars-style comparison.", "error");
        return;
    }
    void playSignAvatarComparison();
});
stopSignAvatarBtn.addEventListener("click", () => {
    stopSignAvatarComparison("Comparison stopped");
});

if (skeletonStreamEl) {
    skeletonStreamEl.addEventListener("error", () => {
        if (skeletonStageEl && skeletonStageEl.classList.contains("active")) {
            stopSkeletonStream("Unable to load cartoon instructor stream.");
        }
    });
}

if (overlayStreamEl) {
    overlayStreamEl.addEventListener("error", () => {
        if (overlayStageEl && overlayStageEl.classList.contains("active")) {
            stopOverlayStream("Unable to load realistic hand + upper-body overlay stream.");
        }
    });
}

micStartBtn.addEventListener("click", () => { if (recognition) { recognition.lang = speechLang.value; recognition.start(); } });
micStopBtn.addEventListener("click", () => { if (recognition) recognition.stop(); });
textInput.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") processInput(); });

if (presentationChannel) {
    const onPresentationChannelMessage = (event) => {
        void handlePresentationEvent(event.data);
    };
    presentationChannel.onmessage = onPresentationChannelMessage;
    presentationChannel.addEventListener("message", onPresentationChannelMessage);
}

window.addEventListener("storage", (event) => {
    if (event.key !== presentationStorageKey || !event.newValue) return;
    try {
        void handlePresentationEvent(JSON.parse(event.newValue));
    } catch (error) {
        // Ignore malformed sync payloads.
    }
});

if (isDisplayMode) {
    void pollPresentationEventFromServer();
    window.setInterval(() => {
        const message = readStoredPresentationEvent();
        if (message && isFreshPresentationEvent(message)) {
            if (message.senderId !== presentationTabId && message.eventId !== lastPresentationEventId) {
                void handlePresentationEvent(message);
                return;
            }
        }
        void pollPresentationEventFromServer();
    }, presentationServerPollMs);
}

document.body.classList.toggle("display-mode", isDisplayMode);

setSkeletonStatus("Process input to stream the full-body MediaPipe landmark instructor view.");
setUnityDesktopStatus("Process input to send the mapped sign sequence to the Unity desktop avatar over UDP.");
setUnityWebStatus("Checking Unity WebGL build status...");
setOverlayStatus("Process input to stream the realistic OpenCV full-body + face overlay.");
renderOverlayTokenTimeline([]);
resetOverlayTokenPanel("Process input to animate the current token here.");
renderUnityWebTimeline([]);
resetUnityWebTokenPanel("Process input to animate the current Unity token here.", false);
setAdvancedVisualsVisible(false);
setGesture3DStatus(gesture3DModel.enabled
    ? "Process input to animate the 3D character using hand + pose + face landmarks."
    : "3D landmark model unavailable. Check WebGL support and Three.js loading.");
setSignAvatarStatus(signAvatarModel.enabled
    ? "Process input to prepare the SignAvatars-style comparison view."
    : "SignAvatars-style comparison unavailable. Check WebGL support and Three.js loading.");
if (signAvatarTextEl) {
    signAvatarTextEl.textContent = "-";
}
setSignAvatarGroundTruthSource("");

if (isDisplayMode) {
    setOverlayStatus("Display mode ready. Waiting for controller trigger...");
    resetOverlayTokenPanel("Waiting for controller trigger.");
}

void loadUnityWebBuildStatus().then((status) => {
    if (!status.available) {
        setUnityWebStatus(status.message || "Unity WebGL build is not available yet.");
    } else if (!unityWebPaths.length) {
        setUnityWebStatus("Unity WebGL scene is ready. Process input to load a sign sequence.");
    }
}).catch((error) => {
    setUnityWebStatus(`Unable to inspect Unity WebGL build: ${error.message}`);
    setUnityWebFallback(`Unable to inspect Unity WebGL build: ${error.message}`, true);
});

setupSpeechRecognition();
