const matchGameVideoEl = document.getElementById("matchGameVideo");
const matchGameVideoFallbackEl = document.getElementById("matchGameVideoFallback");
const matchGameRoundLabelEl = document.getElementById("matchGameRoundLabel");
const matchGameTagEl = document.getElementById("matchGameTag");
const matchGamePromptEl = document.getElementById("matchGamePrompt");
const matchGameChoicesEl = document.getElementById("matchGameChoices");
const matchGameFeedbackEl = document.getElementById("matchGameFeedback");
const matchGameRoundsValueEl = document.getElementById("matchGameRoundsValue");
const matchGameCorrectValueEl = document.getElementById("matchGameCorrectValue");
const matchGameStarsValueEl = document.getElementById("matchGameStarsValue");
const matchGameStartBtn = document.getElementById("matchGameStartBtn");
const matchGameReplayBtn = document.getElementById("matchGameReplayBtn");
const matchGameNextBtn = document.getElementById("matchGameNextBtn");

const matchGameState = {
    roundNumber: 0,
    correctAnswers: 0,
    stars: 0,
    currentRound: null,
    answered: false,
    loading: false,
    lastToken: "",
};

function updateMatchGameScoreboard() {
    if (matchGameRoundsValueEl) matchGameRoundsValueEl.textContent = String(matchGameState.roundNumber);
    if (matchGameCorrectValueEl) matchGameCorrectValueEl.textContent = String(matchGameState.correctAnswers);
    if (matchGameStarsValueEl) matchGameStarsValueEl.textContent = String(matchGameState.stars);
}

function setMatchGameFeedback(message, tone = "") {
    if (!matchGameFeedbackEl) return;
    matchGameFeedbackEl.textContent = message;
    matchGameFeedbackEl.classList.remove("is-success", "is-error");
    if (tone === "success") {
        matchGameFeedbackEl.classList.add("is-success");
    } else if (tone === "error") {
        matchGameFeedbackEl.classList.add("is-error");
    }
}

function setMatchGameLoading(active) {
    matchGameState.loading = active;
    if (matchGameStartBtn) {
        matchGameStartBtn.disabled = active;
        matchGameStartBtn.textContent = active ? "Loading..." : "Start Match Game";
    }
    if (matchGameReplayBtn) {
        matchGameReplayBtn.disabled = active || !matchGameState.currentRound;
    }
    if (matchGameNextBtn) {
        matchGameNextBtn.disabled = active || !matchGameState.answered;
    }
}

function updateMatchGameHeader() {
    if (matchGameRoundLabelEl) {
        matchGameRoundLabelEl.textContent = matchGameState.roundNumber
            ? `Round ${matchGameState.roundNumber}`
            : "Round 0";
    }
    if (matchGameTagEl) {
        matchGameTagEl.textContent = matchGameState.currentRound
            ? `Starter pool • ${matchGameState.currentRound.available_tokens} signs`
            : "Recognition practice";
    }
}

async function playMatchGameClip(resetTime = false) {
    if (!matchGameVideoEl || !matchGameState.currentRound) return;
    if (resetTime) {
        matchGameVideoEl.currentTime = 0;
    }
    try {
        await matchGameVideoEl.play();
    } catch (error) {
        // Silent fallback. The video controls are not required for the round to continue.
    }
}

function renderMatchGameChoices(roundData) {
    if (!matchGameChoicesEl) return;
    matchGameChoicesEl.innerHTML = "";

    roundData.choices.forEach((choice) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "games-choice";
        button.dataset.token = choice.token;
        button.innerHTML = `
            <span class="games-choice-main">${choice.display_text}</span>
            <span class="games-choice-helper">${choice.helper_text}</span>
        `;
        button.addEventListener("click", () => handleMatchGameChoice(choice, button));
        matchGameChoicesEl.appendChild(button);
    });
}

function lockMatchGameChoices(correctToken, selectedToken) {
    if (!matchGameChoicesEl) return;
    Array.from(matchGameChoicesEl.querySelectorAll("button")).forEach((button) => {
        button.disabled = true;
        const token = button.dataset.token || "";
        button.classList.remove("is-correct", "is-wrong");
        if (token === correctToken) {
            button.classList.add("is-correct");
        } else if (token === selectedToken) {
            button.classList.add("is-wrong");
        }
    });
}

function handleMatchGameChoice(choice, button) {
    if (!matchGameState.currentRound || matchGameState.answered || matchGameState.loading) {
        return;
    }

    matchGameState.answered = true;
    const isCorrect = Boolean(choice.is_correct);

    if (isCorrect) {
        matchGameState.correctAnswers += 1;
        matchGameState.stars += 1;
        setMatchGameFeedback(`Great job! This sign means ${choice.helper_text}.`, "success");
    } else {
        const correctChoice = matchGameState.currentRound.choices.find((item) => item.is_correct);
        const correctText = correctChoice ? correctChoice.helper_text : "the correct answer";
        setMatchGameFeedback(`Nice try. This sign means ${correctText}.`, "error");
    }

    lockMatchGameChoices(matchGameState.currentRound.correct_token, choice.token);
    updateMatchGameScoreboard();

    if (matchGamePromptEl) {
        matchGamePromptEl.textContent = isCorrect
            ? "You matched the sign correctly. Press Next Round to keep going."
            : "The correct answer is highlighted. Press Next Round to try another sign.";
    }

    if (matchGameNextBtn) {
        matchGameNextBtn.disabled = false;
    }
}

function applyMatchGameRound(roundData) {
    matchGameState.currentRound = roundData;
    matchGameState.answered = false;
    matchGameState.lastToken = roundData.correct_token || "";
    matchGameState.roundNumber += 1;

    updateMatchGameHeader();
    updateMatchGameScoreboard();
    renderMatchGameChoices(roundData);

    if (matchGamePromptEl) {
        matchGamePromptEl.textContent = "Watch the sign clip, then tap the matching answer.";
    }
    setMatchGameFeedback("Pick the answer that matches the sign video.");

    if (matchGameVideoEl) {
        matchGameVideoEl.src = roundData.prompt.video_url || "";
        matchGameVideoEl.load();
    }
    if (matchGameVideoFallbackEl) {
        matchGameVideoFallbackEl.hidden = false;
    }

    if (matchGameReplayBtn) {
        matchGameReplayBtn.disabled = false;
    }
    if (matchGameNextBtn) {
        matchGameNextBtn.disabled = true;
    }

    void playMatchGameClip(true);
}

async function fetchMatchGameRound() {
    const params = new URLSearchParams({
        pool: "starter",
        choices: "3",
        _ts: String(Date.now()),
    });
    if (matchGameState.lastToken) {
        params.set("exclude", matchGameState.lastToken);
    }

    const response = await fetch(`/api/games/match-sign/round?${params.toString()}`, {
        headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
}

async function loadNextMatchGameRound() {
    setMatchGameLoading(true);
    try {
        const roundData = await fetchMatchGameRound();
        applyMatchGameRound(roundData);
    } catch (error) {
        setMatchGameFeedback(`Unable to load a match round: ${error.message}`, "error");
        if (matchGamePromptEl) {
            matchGamePromptEl.textContent = "Please try again in a moment.";
        }
    } finally {
        setMatchGameLoading(false);
    }
}

if (matchGameVideoEl && matchGameVideoFallbackEl) {
    matchGameVideoEl.addEventListener("loadeddata", () => {
        matchGameVideoFallbackEl.hidden = true;
        void playMatchGameClip(true);
    });

    matchGameVideoEl.addEventListener("error", () => {
        matchGameVideoFallbackEl.hidden = false;
        matchGameVideoFallbackEl.innerHTML = "This sign clip could not be loaded. Press <strong>Next Round</strong> to try another one.";
    });
}

if (matchGameStartBtn) {
    matchGameStartBtn.addEventListener("click", () => {
        matchGameState.roundNumber = 0;
        matchGameState.correctAnswers = 0;
        matchGameState.stars = 0;
        matchGameState.lastToken = "";
        updateMatchGameScoreboard();
        loadNextMatchGameRound();
    });
}

if (matchGameReplayBtn) {
    matchGameReplayBtn.addEventListener("click", () => {
        void playMatchGameClip(true);
    });
}

if (matchGameNextBtn) {
    matchGameNextBtn.addEventListener("click", () => {
        loadNextMatchGameRound();
    });
}

updateMatchGameHeader();
updateMatchGameScoreboard();
