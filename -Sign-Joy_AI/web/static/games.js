const matchGameVideoEl = document.getElementById("matchGameVideo");
const matchGameVideoFallbackEl = document.getElementById("matchGameVideoFallback");
const matchGameRoundLabelEl = document.getElementById("matchGameRoundLabel");
const matchGameTagEl = document.getElementById("matchGameTag");
const matchGamePromptEl = document.getElementById("matchGamePrompt");
const matchGameChoicesEl = document.getElementById("matchGameChoices");
const matchGameFeedbackEl = document.getElementById("matchGameFeedback");
const matchGamePopupEl = document.getElementById("matchGamePopup");
const matchGamePopupIconEl = document.getElementById("matchGamePopupIcon");
const matchGamePopupTitleEl = document.getElementById("matchGamePopupTitle");
const matchGamePopupMessageEl = document.getElementById("matchGamePopupMessage");
const matchGameRoundsValueEl = document.getElementById("matchGameRoundsValue");
const matchGameCorrectValueEl = document.getElementById("matchGameCorrectValue");
const matchGameStarsValueEl = document.getElementById("matchGameStarsValue");
const matchGameStartBtn = document.getElementById("matchGameStartBtn");
const matchGameReplayBtn = document.getElementById("matchGameReplayBtn");
const matchGameNextBtn = document.getElementById("matchGameNextBtn");
const memoryGameBoardEl = document.getElementById("memoryGameBoard");
const memoryGameRoundLabelEl = document.getElementById("memoryGameRoundLabel");
const memoryGameTagEl = document.getElementById("memoryGameTag");
const memoryGamePromptEl = document.getElementById("memoryGamePrompt");
const memoryGameFeedbackEl = document.getElementById("memoryGameFeedback");
const memoryGamePairsValueEl = document.getElementById("memoryGamePairsValue");
const memoryGameMovesValueEl = document.getElementById("memoryGameMovesValue");
const memoryGameStarsValueEl = document.getElementById("memoryGameStarsValue");
const memoryGameStartBtn = document.getElementById("memoryGameStartBtn");
const memoryGameResetBtn = document.getElementById("memoryGameResetBtn");
const mathGameRoundLabelEl = document.getElementById("mathGameRoundLabel");
const mathGameTagEl = document.getElementById("mathGameTag");
const mathGameEquationEl = document.getElementById("mathGameEquation");
const mathGameCountersEl = document.getElementById("mathGameCounters");
const mathGameHintEl = document.getElementById("mathGameHint");
const mathGamePromptEl = document.getElementById("mathGamePrompt");
const mathGameChoicesEl = document.getElementById("mathGameChoices");
const mathGameFeedbackEl = document.getElementById("mathGameFeedback");
const mathGameRoundsValueEl = document.getElementById("mathGameRoundsValue");
const mathGameCorrectValueEl = document.getElementById("mathGameCorrectValue");
const mathGameStarsValueEl = document.getElementById("mathGameStarsValue");
const mathGameStartBtn = document.getElementById("mathGameStartBtn");
const mathGameNextBtn = document.getElementById("mathGameNextBtn");

let matchGamePopupHideTimer = null;
let matchGamePopupCleanupTimer = null;

const matchGameState = {
    roundNumber: 0,
    correctAnswers: 0,
    stars: 0,
    currentRound: null,
    answered: false,
    loading: false,
    lastToken: "",
};

const memoryGameState = {
    roundNumber: 0,
    pairCount: 0,
    moves: 0,
    stars: 0,
    matchedPairs: 0,
    currentRound: null,
    cards: [],
    firstCardId: null,
    secondCardId: null,
    lockBoard: false,
    loading: false,
};

const mathGameQuestionPool = [
    { a: 1, b: 2 },
    { a: 2, b: 3 },
    { a: 1, b: 4 },
    { a: 3, b: 2 },
    { a: 4, b: 1 },
    { a: 5, b: 2 },
    { a: 3, b: 4 },
    { a: 2, b: 5 },
    { a: 4, b: 4 },
    { a: 5, b: 3 },
];

const mathGameState = {
    roundNumber: 0,
    correctAnswers: 0,
    stars: 0,
    answered: false,
    currentQuestion: null,
    lastQuestionKey: "",
};

function updateMatchGameScoreboard() {
    if (matchGameRoundsValueEl) matchGameRoundsValueEl.textContent = String(matchGameState.roundNumber);
    if (matchGameCorrectValueEl) matchGameCorrectValueEl.textContent = String(matchGameState.correctAnswers);
    if (matchGameStarsValueEl) matchGameStarsValueEl.textContent = String(matchGameState.stars);
}

function updateMemoryGameScoreboard() {
    if (memoryGamePairsValueEl) memoryGamePairsValueEl.textContent = String(memoryGameState.matchedPairs);
    if (memoryGameMovesValueEl) memoryGameMovesValueEl.textContent = String(memoryGameState.moves);
    if (memoryGameStarsValueEl) memoryGameStarsValueEl.textContent = String(memoryGameState.stars);
}

function updateMathGameScoreboard() {
    if (mathGameRoundsValueEl) mathGameRoundsValueEl.textContent = String(mathGameState.roundNumber);
    if (mathGameCorrectValueEl) mathGameCorrectValueEl.textContent = String(mathGameState.correctAnswers);
    if (mathGameStarsValueEl) mathGameStarsValueEl.textContent = String(mathGameState.stars);
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

function hideMatchGamePopup(immediate = false) {
    if (!matchGamePopupEl) return;

    if (matchGamePopupHideTimer) {
        clearTimeout(matchGamePopupHideTimer);
        matchGamePopupHideTimer = null;
    }
    if (matchGamePopupCleanupTimer) {
        clearTimeout(matchGamePopupCleanupTimer);
        matchGamePopupCleanupTimer = null;
    }

    if (immediate) {
        matchGamePopupEl.hidden = true;
        matchGamePopupEl.setAttribute("aria-hidden", "true");
        matchGamePopupEl.classList.remove("is-visible", "is-success", "is-error");
        return;
    }

    matchGamePopupEl.classList.remove("is-visible");
    matchGamePopupCleanupTimer = window.setTimeout(() => {
        if (!matchGamePopupEl) return;
        matchGamePopupEl.hidden = true;
        matchGamePopupEl.setAttribute("aria-hidden", "true");
        matchGamePopupEl.classList.remove("is-success", "is-error");
    }, 240);
}

function showMatchGamePopup({ tone = "", icon = "😊", title = "", message = "" } = {}) {
    if (!matchGamePopupEl || !matchGamePopupIconEl || !matchGamePopupTitleEl || !matchGamePopupMessageEl) {
        return;
    }

    hideMatchGamePopup(true);
    matchGamePopupIconEl.textContent = icon;
    matchGamePopupTitleEl.textContent = title;
    matchGamePopupMessageEl.textContent = message;
    matchGamePopupEl.classList.remove("is-success", "is-error");
    if (tone) {
        matchGamePopupEl.classList.add(`is-${tone}`);
    }
    matchGamePopupEl.hidden = false;
    matchGamePopupEl.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
        matchGamePopupEl.classList.add("is-visible");
    });

    matchGamePopupHideTimer = window.setTimeout(() => {
        hideMatchGamePopup();
    }, tone === "error" ? 1700 : 1900);
}

function setMemoryGameFeedback(message, tone = "") {
    if (!memoryGameFeedbackEl) return;
    memoryGameFeedbackEl.textContent = message;
    memoryGameFeedbackEl.classList.remove("is-success", "is-error");
    if (tone === "success") {
        memoryGameFeedbackEl.classList.add("is-success");
    } else if (tone === "error") {
        memoryGameFeedbackEl.classList.add("is-error");
    }
}

function setMathGameFeedback(message, tone = "") {
    if (!mathGameFeedbackEl) return;
    mathGameFeedbackEl.textContent = message;
    mathGameFeedbackEl.classList.remove("is-success", "is-error");
    if (tone === "success") {
        mathGameFeedbackEl.classList.add("is-success");
    } else if (tone === "error") {
        mathGameFeedbackEl.classList.add("is-error");
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

function setMemoryGameLoading(active) {
    memoryGameState.loading = active;
    if (memoryGameStartBtn) {
        memoryGameStartBtn.disabled = active;
        memoryGameStartBtn.textContent = active ? "Loading..." : "Start Memory Cards";
    }
    if (memoryGameResetBtn) {
        memoryGameResetBtn.disabled = active || !memoryGameState.currentRound;
    }
    renderMemoryGameBoard();
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

function updateMemoryGameHeader() {
    if (memoryGameRoundLabelEl) {
        memoryGameRoundLabelEl.textContent = memoryGameState.roundNumber
            ? `Round ${memoryGameState.roundNumber}`
            : "Round 0";
    }
    if (memoryGameTagEl) {
        memoryGameTagEl.textContent = memoryGameState.currentRound
            ? `Starter pool • ${memoryGameState.currentRound.available_tokens} signs`
            : "Memory practice";
    }
}

function updateMathGameHeader() {
    if (mathGameRoundLabelEl) {
        mathGameRoundLabelEl.textContent = mathGameState.roundNumber
            ? `Round ${mathGameState.roundNumber}`
            : "Round 0";
    }
    if (mathGameTagEl) {
        mathGameTagEl.textContent = mathGameState.currentQuestion
            ? "Mini sums | up to 10"
            : "Number practice";
    }
}

function setMathGamePrompt(text) {
    if (mathGamePromptEl) {
        mathGamePromptEl.textContent = text;
    }
}

function shuffleItems(items) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
}

function numberToWord(value) {
    const numberWords = {
        0: "zero",
        1: "one",
        2: "two",
        3: "three",
        4: "four",
        5: "five",
        6: "six",
        7: "seven",
        8: "eight",
        9: "nine",
        10: "ten",
        11: "eleven",
        12: "twelve",
    };
    return numberWords[value] || String(value);
}

function buildMathGameChoices(answer) {
    const choiceSet = new Set([answer]);

    while (choiceSet.size < 4) {
        const offset = Math.floor(Math.random() * 5) - 2;
        const candidate = Math.max(0, Math.min(12, answer + offset));
        choiceSet.add(candidate);
    }

    if (choiceSet.size < 4) {
        for (let value = 0; value <= 12 && choiceSet.size < 4; value += 1) {
            choiceSet.add(value);
        }
    }

    return shuffleItems(Array.from(choiceSet));
}

function buildNextMathQuestion() {
    const availableQuestions = mathGameQuestionPool.filter((question) => (
        `${question.a}+${question.b}` !== mathGameState.lastQuestionKey
    ));
    const pool = availableQuestions.length ? availableQuestions : mathGameQuestionPool;
    const baseQuestion = pool[Math.floor(Math.random() * pool.length)];
    const answer = baseQuestion.a + baseQuestion.b;

    return {
        ...baseQuestion,
        answer,
        key: `${baseQuestion.a}+${baseQuestion.b}`,
        choices: buildMathGameChoices(answer),
    };
}

function renderMathGameCounters(question) {
    if (!mathGameCountersEl) return;
    mathGameCountersEl.innerHTML = "";

    const firstGroup = document.createElement("div");
    firstGroup.className = "math-counter-group";
    for (let count = 0; count < question.a; count += 1) {
        const dot = document.createElement("span");
        dot.className = "math-counter-dot";
        firstGroup.appendChild(dot);
    }

    const plus = document.createElement("span");
    plus.className = "math-counter-plus";
    plus.textContent = "+";

    const secondGroup = document.createElement("div");
    secondGroup.className = "math-counter-group math-counter-group-secondary";
    for (let count = 0; count < question.b; count += 1) {
        const dot = document.createElement("span");
        dot.className = "math-counter-dot";
        secondGroup.appendChild(dot);
    }

    mathGameCountersEl.appendChild(firstGroup);
    mathGameCountersEl.appendChild(plus);
    mathGameCountersEl.appendChild(secondGroup);
}

function renderMathGameChoices(question) {
    if (!mathGameChoicesEl) return;
    mathGameChoicesEl.innerHTML = "";

    question.choices.forEach((choiceValue) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "games-choice";
        button.dataset.value = String(choiceValue);
        button.innerHTML = `
            <span class="games-choice-main">${choiceValue}</span>
            <span class="games-choice-helper">${numberToWord(choiceValue)}</span>
        `;
        button.addEventListener("click", () => handleMathGameChoice(choiceValue, button));
        mathGameChoicesEl.appendChild(button);
    });
}

function markMathGameChoiceWrong(button) {
    if (!button) return;
    button.disabled = true;
    button.classList.add("is-wrong");
}

function lockMathGameChoices(correctValue, selectedValue) {
    if (!mathGameChoicesEl) return;
    Array.from(mathGameChoicesEl.querySelectorAll("button")).forEach((button) => {
        button.disabled = true;
        const value = Number(button.dataset.value);
        button.classList.remove("is-correct", "is-wrong");
        if (value === correctValue) {
            button.classList.add("is-correct");
        } else if (value === selectedValue) {
            button.classList.add("is-wrong");
        }
    });
}

function applyMathGameQuestion(question) {
    mathGameState.currentQuestion = question;
    mathGameState.answered = false;
    mathGameState.lastQuestionKey = question.key;
    mathGameState.roundNumber += 1;

    updateMathGameHeader();
    updateMathGameScoreboard();
    renderMathGameChoices(question);
    renderMathGameCounters(question);

    if (mathGameEquationEl) {
        mathGameEquationEl.textContent = `${question.a} + ${question.b} = ?`;
    }
    if (mathGameHintEl) {
        mathGameHintEl.textContent = `Count ${question.a} yellow dots and ${question.b} blue dots, then add them together.`;
    }
    setMathGamePrompt("Count the dots and tap the correct answer.");
    setMathGameFeedback("Pick the number that matches the total.");

    if (mathGameNextBtn) {
        mathGameNextBtn.disabled = true;
    }
}

function loadNextMathGameQuestion() {
    applyMathGameQuestion(buildNextMathQuestion());
}

function handleMathGameChoice(choiceValue, button) {
    if (!mathGameState.currentQuestion || mathGameState.answered) {
        return;
    }

    const isCorrect = choiceValue === mathGameState.currentQuestion.answer;

    if (isCorrect) {
        mathGameState.answered = true;
        mathGameState.correctAnswers += 1;
        mathGameState.stars += 1;
        updateMathGameScoreboard();
        lockMathGameChoices(mathGameState.currentQuestion.answer, choiceValue);
        setMathGamePrompt("You solved it. Press Next Sum for another little maths puzzle.");
        setMathGameFeedback(`Great job! ${mathGameState.currentQuestion.a} + ${mathGameState.currentQuestion.b} = ${choiceValue}.`, "success");
        if (mathGameNextBtn) {
            mathGameNextBtn.disabled = false;
        }
        return;
    }

    markMathGameChoiceWrong(button);
    setMathGamePrompt("That answer is not right yet. Count again and try another choice.");
    setMathGameFeedback("Nice try. Count the dots one more time.", "error");
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

function shuffleMemoryGameCards(cards) {
    const nextCards = [...cards];
    for (let idx = nextCards.length - 1; idx > 0; idx -= 1) {
        const swapIndex = Math.floor(Math.random() * (idx + 1));
        [nextCards[idx], nextCards[swapIndex]] = [nextCards[swapIndex], nextCards[idx]];
    }
    return nextCards;
}

function buildMemoryGameCards(pairs) {
    const cards = [];
    pairs.forEach((pair, pairIndex) => {
        const shared = {
            token: pair.token,
            display_text: pair.display_text,
            helper_text: pair.helper_text,
            video_url: pair.video_url,
        };
        cards.push({
            id: `text-${pair.token}-${pairIndex}`,
            cardType: "text",
            matched: false,
            flipped: false,
            ...shared,
        });
        cards.push({
            id: `video-${pair.token}-${pairIndex}`,
            cardType: "video",
            matched: false,
            flipped: false,
            ...shared,
        });
    });
    return shuffleMemoryGameCards(cards);
}

function renderMemoryGameBoard() {
    if (!memoryGameBoardEl) return;
    memoryGameBoardEl.innerHTML = "";

    if (!memoryGameState.cards.length) {
        for (let index = 0; index < 6; index += 1) {
            const placeholder = document.createElement("button");
            placeholder.type = "button";
            placeholder.className = "memory-card";
            placeholder.disabled = true;
            placeholder.innerHTML = '<span class="memory-card-face memory-card-back">?</span>';
            memoryGameBoardEl.appendChild(placeholder);
        }
        return;
    }

    memoryGameState.cards.forEach((card) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "memory-card";
        if (card.flipped) button.classList.add("is-flipped");
        if (card.matched) button.classList.add("is-matched");
        button.disabled = memoryGameState.loading || card.matched || memoryGameState.lockBoard;
        button.dataset.cardId = card.id;

        const frontContent = card.cardType === "video"
            ? `
                <div class="memory-card-face memory-card-front is-video">
                    <span class="memory-card-video-label">Watch Sign</span>
                    <video class="memory-card-video" playsinline muted loop preload="metadata" src="${card.video_url}"></video>
                </div>
            `
            : `
                <div class="memory-card-face memory-card-front">
                    <span class="memory-card-main">${card.display_text}</span>
                    <span class="memory-card-helper">${card.helper_text}</span>
                </div>
            `;

        button.innerHTML = `
            <span class="memory-card-inner">
                <span class="memory-card-face memory-card-back">?</span>
                ${frontContent}
            </span>
        `;

        button.addEventListener("click", () => handleMemoryGameCardClick(card.id));
        memoryGameBoardEl.appendChild(button);

        if (card.flipped || card.matched) {
            const video = button.querySelector("video");
            if (video) {
                void video.play().catch(() => {});
            }
        }
    });
}

function setMemoryGamePrompt(text) {
    if (memoryGamePromptEl) {
        memoryGamePromptEl.textContent = text;
    }
}

function findMemoryCard(cardId) {
    return memoryGameState.cards.find((card) => card.id === cardId) || null;
}

function areMemoryCardsMatch(firstCard, secondCard) {
    if (!firstCard || !secondCard) return false;
    return firstCard.token === secondCard.token && firstCard.cardType !== secondCard.cardType;
}

function resetMemoryGameTurn() {
    memoryGameState.firstCardId = null;
    memoryGameState.secondCardId = null;
    memoryGameState.lockBoard = false;
}

async function resolveMemoryGameTurn() {
    const firstCard = findMemoryCard(memoryGameState.firstCardId);
    const secondCard = findMemoryCard(memoryGameState.secondCardId);
    if (!firstCard || !secondCard) {
        resetMemoryGameTurn();
        return;
    }

    const isMatch = areMemoryCardsMatch(firstCard, secondCard);
    if (isMatch) {
        firstCard.matched = true;
        secondCard.matched = true;
        memoryGameState.matchedPairs += 1;
        memoryGameState.stars += 1;
        setMemoryGameFeedback(`Nice match! You found ${firstCard.helper_text}.`, "success");
        setMemoryGamePrompt("Great job. Keep going and find the next pair.");
        resetMemoryGameTurn();
        renderMemoryGameBoard();
        updateMemoryGameScoreboard();

        if (memoryGameState.matchedPairs === memoryGameState.pairCount) {
            setMemoryGameFeedback(`Amazing! You matched all ${memoryGameState.pairCount} pairs.`, "success");
            setMemoryGamePrompt("Board complete. Press New Board to play again.");
        }
        return;
    }

    setMemoryGameFeedback("Not a match yet. Watch carefully and try again.", "error");
    setMemoryGamePrompt("These two cards do not belong together.");
    renderMemoryGameBoard();
    await new Promise((resolve) => setTimeout(resolve, 900));
    firstCard.flipped = false;
    secondCard.flipped = false;
    resetMemoryGameTurn();
    renderMemoryGameBoard();
}

function handleMemoryGameCardClick(cardId) {
    if (memoryGameState.loading || memoryGameState.lockBoard) return;
    const card = findMemoryCard(cardId);
    if (!card || card.matched || card.flipped) return;

    card.flipped = true;
    renderMemoryGameBoard();

    if (!memoryGameState.firstCardId) {
        memoryGameState.firstCardId = cardId;
        setMemoryGamePrompt("Now flip a matching card.");
        return;
    }

    memoryGameState.secondCardId = cardId;
    memoryGameState.lockBoard = true;
    memoryGameState.moves += 1;
    updateMemoryGameScoreboard();
    void resolveMemoryGameTurn();
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

function markMatchGameChoiceWrong(button) {
    if (!button) return;
    button.disabled = true;
    button.classList.add("is-wrong");
}

function handleMatchGameChoice(choice, button) {
    if (!matchGameState.currentRound || matchGameState.answered || matchGameState.loading) {
        return;
    }

    const isCorrect = Boolean(choice.is_correct);

    if (isCorrect) {
        matchGameState.answered = true;
        matchGameState.correctAnswers += 1;
        matchGameState.stars += 1;
        setMatchGameFeedback(`Correct answer. This sign means ${choice.helper_text}.`, "success");
        showMatchGamePopup({
            tone: "success",
            icon: "😊",
            title: "Correct Answer!",
            message: "Great job! You found the right sign.",
        });
        lockMatchGameChoices(matchGameState.currentRound.correct_token, choice.token);
        updateMatchGameScoreboard();

        if (matchGamePromptEl) {
            matchGamePromptEl.textContent = "You matched the sign correctly. Press Next Round to keep going.";
        }

        if (matchGameNextBtn) {
            matchGameNextBtn.disabled = false;
        }
    } else {
        setMatchGameFeedback("Wrong answer. Try again.", "error");
        showMatchGamePopup({
            tone: "error",
            icon: "😕",
            title: "Wrong Answer",
            message: "Try again! Watch the sign and pick another choice.",
        });
        markMatchGameChoiceWrong(button);

        if (matchGamePromptEl) {
            matchGamePromptEl.textContent = "That one is not right yet. Try another answer.";
        }
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
    hideMatchGamePopup(true);

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

function applyMemoryGameRound(roundData) {
    memoryGameState.currentRound = roundData;
    memoryGameState.roundNumber += 1;
    memoryGameState.pairCount = Number(roundData.pair_count) || 0;
    memoryGameState.moves = 0;
    memoryGameState.stars = 0;
    memoryGameState.matchedPairs = 0;
    memoryGameState.cards = buildMemoryGameCards(Array.isArray(roundData.pairs) ? roundData.pairs : []);
    resetMemoryGameTurn();

    updateMemoryGameHeader();
    updateMemoryGameScoreboard();
    renderMemoryGameBoard();
    setMemoryGamePrompt("Flip one word card and one sign-video card to find a matching pair.");
    setMemoryGameFeedback("Find pairs that share the same sign meaning.");

    if (memoryGameResetBtn) {
        memoryGameResetBtn.disabled = false;
    }
}

async function fetchMatchGameRound() {
    const params = new URLSearchParams({
        pool: "starter",
        choices: "4",
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

async function fetchMemoryGameRound() {
    const params = new URLSearchParams({
        pool: "starter",
        pairs: "3",
        _ts: String(Date.now()),
    });
    const response = await fetch(`/api/games/memory-cards/round?${params.toString()}`, {
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
        hideMatchGamePopup(true);
        setMatchGameFeedback(`Unable to load a match round: ${error.message}`, "error");
        if (matchGamePromptEl) {
            matchGamePromptEl.textContent = "Please try again in a moment.";
        }
    } finally {
        setMatchGameLoading(false);
    }
}

async function loadNextMemoryGameRound() {
    setMemoryGameLoading(true);
    try {
        const roundData = await fetchMemoryGameRound();
        applyMemoryGameRound(roundData);
    } catch (error) {
        setMemoryGameFeedback(`Unable to load a memory board: ${error.message}`, "error");
        setMemoryGamePrompt("Please try again in a moment.");
    } finally {
        setMemoryGameLoading(false);
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

if (memoryGameStartBtn) {
    memoryGameStartBtn.addEventListener("click", () => {
        memoryGameState.roundNumber = 0;
        loadNextMemoryGameRound();
    });
}

if (memoryGameResetBtn) {
    memoryGameResetBtn.addEventListener("click", () => {
        loadNextMemoryGameRound();
    });
}

if (mathGameStartBtn) {
    mathGameStartBtn.addEventListener("click", () => {
        mathGameState.roundNumber = 0;
        mathGameState.correctAnswers = 0;
        mathGameState.stars = 0;
        mathGameState.lastQuestionKey = "";
        mathGameState.currentQuestion = null;
        updateMathGameScoreboard();
        loadNextMathGameQuestion();
    });
}

if (mathGameNextBtn) {
    mathGameNextBtn.addEventListener("click", () => {
        loadNextMathGameQuestion();
    });
}

updateMatchGameHeader();
updateMatchGameScoreboard();
updateMemoryGameHeader();
updateMemoryGameScoreboard();
renderMemoryGameBoard();
updateMathGameHeader();
updateMathGameScoreboard();
