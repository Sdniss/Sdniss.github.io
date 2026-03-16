let myCards = [];
let currentIndex = 0;
let side = 0;
let voices = [];
let sessionCorrect = 0;
let sessionTotal = 0;
let hasVoted = false;

const DATA_BASE_PATH = '/assets/data/';

/**
 * 1. Score & Database Logic
 */
function recordResult(isCorrect) {
    hasVoted = true;

    if (isCorrect) sessionCorrect++;
    sessionTotal++;

    document.getElementById('session-score').innerText = `${sessionCorrect} / ${sessionTotal}`;

    saveToDatabase(isCorrect);

    // SCIENTIST'S LOGIC: If we just voted on the last card, show the end screen.
    if (currentIndex === myCards.length - 1) {
        showEndScreen();
    } else {
        nextCard();
    }
}

function saveToDatabase(isCorrect) {
    const current = myCards[currentIndex];
    if (!current) return;

    let stats = JSON.parse(localStorage.getItem('sanse_stats')) || {};
    const id = current.simplified;

    if (!stats[id]) {
        stats[id] = { correct: 0, wrong: 0, lastSeen: Date.now() };
    }

    if (isCorrect) stats[id].correct++;
    else stats[id].wrong++;

    stats[id].lastSeen = Date.now();
    localStorage.setItem('sanse_stats', JSON.stringify(stats));
}

/**
 * 2. Navigation & UI
 */
function flipCard() {
    side = (side + 1) % 3;
    if (side === 0) playAudio();
    updateUI();
}

function nextCard() {
    if (!hasVoted) {
        alert("Please indicate if you got it Correct or Wrong before proceeding! 🧠");
        return;
    }

    if (currentIndex < myCards.length - 1) {
        currentIndex++;
        side = 0;
        hasVoted = false; // Reset for the new card
        updateUI();
    }
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        side = 0;
        updateUI();
    }
}

function updateUI() {
    const textEl = document.getElementById('card-text');
    const subEl = document.getElementById('card-subtext');
    const progressEl = document.getElementById('progress-fill');
    const cardEl = document.getElementById('card');
    const current = myCards[currentIndex];

    if (!current) return;

    // Data Path Logic
    let displayTxt = "";
    let subTxt = "";

    if (side === 0) {
        displayTxt = current.simplified;
        textEl.style.textAlign = "center";
        //subTxt = "Hanzi (Tap for Pinyin)";
    } else if (side === 1) {
        displayTxt = current.forms[0].transcriptions.pinyin;
        textEl.style.textAlign = "center";
        //subTxt = "Pinyin (Tap for English)";
    } else {
        displayTxt = current.forms[0].meanings.join(", ");
        textEl.style.textAlign = "center";
        //subTxt = "English (Tap for Hanzi)";
    }

    // Dynamic Scaling
    const charCount = displayTxt.length;
    textEl.style.fontSize = charCount > 20 ? "1.8rem" : charCount > 10 ? "2.5rem" : "4rem";

    textEl.innerText = displayTxt;
    subEl.innerText = subTxt;

    // Progress Bar
    if (progressEl) {
        progressEl.style.width = ((currentIndex + 1) / myCards.length * 100) + "%";
    }
}

/**
 * 3. Deck & Initialization
 */
async function changeDeck(subPath) {
    // 1. Reset Progress & Score variables
    currentIndex = 0;
    side = 0;
    hasVoted = false;
    sessionCorrect = 0;
    sessionTotal = 0;

    // 2. Reset the UI text
    const scoreEl = document.getElementById('session-score');
    if (scoreEl) scoreEl.innerText = "0 / 0";

    // 3. Hide End Screen (if it was visible from a previous deck)
    const endScreen = document.getElementById('end-screen');
    if (endScreen) endScreen.style.display = 'none';

    // 4. Ensure the card is visible again
    const cardEl = document.getElementById('card');
    if (cardEl) cardEl.style.visibility = 'visible';

    const fullPath = `${DATA_BASE_PATH}${subPath}`;

    try {
        const response = await fetch(`${fullPath}?v=${Date.now()}`);
        const data = await response.json();
        myCards = Array.isArray(data) ? data : [];
        updateUI();
    } catch (e) {
        console.error("Load error", e);
        document.getElementById('card-text').innerText = "⚠️ Error";
    }
}

// Rest of your initApp and voice logic remains the same...
// Make sure to call initApp() at the end.
async function initApp() {
    const sliders = ['rate', 'pitch', 'volume'];
    sliders.forEach(id => {
        const slider = document.getElementById(`${id}-slider`);
        const display = document.getElementById(`${id}-val`);
        if (slider && display) {
            slider.addEventListener('input', () => display.innerText = slider.value);
        }
    });

    window.speechSynthesis.onvoiceschanged = populateVoiceList;
    populateVoiceList();

    const selector = document.getElementById('json-select');
    if (selector) changeDeck(selector.value);
}

function populateVoiceList() {
    voices = window.speechSynthesis.getVoices();
    const voiceSelect = document.getElementById('voice-select');
    if (!voiceSelect) return;
    voiceSelect.innerHTML = '';
    voices.filter(v => v.lang.includes('zh')).forEach(voice => {
        const option = document.createElement('option');
        option.textContent = voice.name;
        option.setAttribute('data-name', voice.name);
        if (voice.lang === 'zh-CN' && voice.name.includes('Google')) option.selected = true;
        voiceSelect.appendChild(option);
    });
}

function playAudio() {
    window.speechSynthesis.cancel();
    if (!myCards[currentIndex]) return;
    const utterance = new SpeechSynthesisUtterance(myCards[currentIndex].simplified);
    utterance.rate = document.getElementById('rate-slider')?.value || 0.8;
    const voiceName = document.getElementById('voice-select')?.selectedOptions[0]?.getAttribute('data-name');
    const selectedVoice = voices.find(v => v.name === voiceName);
    if (selectedVoice) utterance.voice = selectedVoice;
    window.speechSynthesis.speak(utterance);
}

function showEndScreen() {
    const endScreen = document.getElementById('end-screen');
    const finalPercent = document.getElementById('final-percentage');
    const finalScoreText = document.getElementById('final-score-text');

    if (endScreen) {
        // Calculate accuracy
        const percentage = Math.round((sessionCorrect / sessionTotal) * 100);

        // Update text
        finalPercent.innerText = `${percentage}%`;
        finalScoreText.innerText = `Correct: ${sessionCorrect} | Total: ${sessionTotal}`;

        // Show the screen
        endScreen.style.display = 'flex';
    }
}

initApp();