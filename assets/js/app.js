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
    // 1. Check if the deck is already finished
    const endScreen = document.getElementById('end-screen');
    if (endScreen && endScreen.style.display === 'flex') {
        return; // Do nothing if the end screen is showing
    }

    hasVoted = true;

    if (isCorrect) sessionCorrect++;
    sessionTotal++;

    document.getElementById('session-score').innerText = `${sessionCorrect} / ${sessionTotal}`;

    saveToDatabase(isCorrect);

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
    // Prevent moving if end screen is visible
    if (document.getElementById('end-screen').style.display === 'flex') return;

    if (!hasVoted) {
        alert("Please indicate if you got it Correct or Wrong before proceeding! 🧠");
        return;
    }

    if (currentIndex < myCards.length - 1) {
        currentIndex++;
        side = 0;
        hasVoted = false;
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

    document.querySelectorAll('button[onclick^="recordResult"]').forEach(btn => {
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    });

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
    console.log("Sān Sè Initializing...");

    // --- 1. THE API KEY CHECK (Top Priority) ---
    try {
        const savedKey = localStorage.getItem('sanse_gemini_key');
        const statusEl = document.getElementById('key-status');
        if (statusEl) {
            if (savedKey) {
                statusEl.innerText = "✅ Key is set and saved in your browser.";
                statusEl.style.color = "#2A9D8F";
            } else {
                statusEl.innerText = "❌ Key not found. Please enter and save below.";
                statusEl.style.color = "#e76f51";
            }
        }
    } catch (e) {
        console.error("Storage access error:", e);
    }

    // --- 2. AUDIO & VOICE SETUP ---
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

    // --- 3. DECK INITIALIZATION ---
    const selector = document.getElementById('json-select');
    if (selector) {
        changeDeck(selector.value);
    } else {
        console.warn("No deck selector found in HTML.");
    }
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
        // Dim the buttons to show they are inactive
        document.querySelectorAll('button[onclick^="recordResult"]').forEach(btn => {
            btn.style.opacity = "0.5";
            btn.style.cursor = "default";
        });

        // Calculate accuracy
        const percentage = Math.round((sessionCorrect / sessionTotal) * 100);

        // Update text
        finalPercent.innerText = `${percentage}%`;
        finalScoreText.innerText = `Correct: ${sessionCorrect} | Total: ${sessionTotal}`;

        // Show the screen
        endScreen.style.display = 'flex';
    }
}

// LLM integration
// 1. Storage Logic
function saveApiKey() {
    console.log("Save button clicked.");
    const input = document.getElementById('api-key-input');

    if (input) {
        console.log("Input found. Value length:", input.value.length);
        const val = input.value.trim();
        if (val.length > 5) { // Most API keys are long
            localStorage.setItem('sanse_gemini_key', val);
            alert("Success! Key saved.");
            location.reload(); // Refresh to trigger the initApp check
        } else {
            alert("The key you pasted seems too short.");
        }
    } else {
        alert("Critical Error: HTML input field 'api-key-input' not found.");
    }
}

// 2. The AI Generation Engine
/**
 * SAN SE FLASHCARDS - COMPLETE AI ENGINE
 * Features: Gemini 2.5, Persistent History, Export to JSON
 */

// 1. GENERATE DECK FROM AI
async function generateAILesson() {
    const personaInput = document.getElementById('persona-input');
    const mapContainer = document.getElementById('theme-map');
    const btn = document.getElementById('generate-btn');
    const apiKey = localStorage.getItem('sanse_gemini_key');

    if (!apiKey) return alert("Please save your API key in settings first!");
    if (!personaInput.value || personaInput.value.length < 5) return alert("Please describe your persona first!");

    if (btn) {
        btn.disabled = true;
        btn.innerText = "⚡ Brewing Themes...";
    }
    mapContainer.innerHTML = "<p style='font-size:0.8rem; color:#666;'>🧬 Analyzing with Gemini 2.5 Flash...</p>";

    const prompt = `Act as a Chinese teacher. User persona: "${personaInput.value}". 
    Create 3 distinct vocabulary themes. For each theme, provide 10 words.
    Return ONLY a JSON object. Format:
    {"themes": [{"name": "Theme", "icon": "Emoji", "color": "#hex", "deck": [{"simplified": "...", "forms": [{"transcriptions": {"pinyin": "..."}, "meanings": ["..."]}]}]}]}`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const rawText = data.candidates[0].content.parts[0].text;
        const aiResponse = JSON.parse(rawText);

        // Save to History & Render
        saveToHistory(aiResponse.themes, personaInput.value);
        renderAIThemes(aiResponse.themes);

    } catch (error) {
        console.error("AI Error:", error);
        mapContainer.innerHTML = `<p style="color:#e76f51; font-size:0.75rem;">⚠️ Error: ${error.message}</p>`;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Generate Personalized Decks";
        }
    }
}

// 2. HISTORY & LOCAL STORAGE
function saveToHistory(themes, persona) {
    const history = JSON.parse(localStorage.getItem('sanse_history') || "[]");
    const newEntry = {
        date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        persona: persona,
        themes: themes
    };

    history.unshift(newEntry);
    localStorage.setItem('sanse_history', JSON.stringify(history.slice(0, 50))); // Keep last 50
    renderSessionLog();
}

function renderSessionLog() {
    const logList = document.getElementById('session-log-list');
    if (!logList) return;

    const history = JSON.parse(localStorage.getItem('sanse_history') || "[]");
    logList.innerHTML = history.length === 0 ? "<p style='font-size:0.7rem; color:#999;'>No history recorded yet.</p>" : "";

    history.forEach((entry, index) => {
        const item = document.createElement('div');
        item.style = "background: white; border: 1px solid #eee; padding: 12px; border-radius: 10px; font-size: 0.8rem; margin-bottom: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); text-align: left;";

        const names = entry.themes.map(t => `${t.icon} ${t.name}`).join(', ');

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <span style="font-weight: bold; color: #2a9d8f;">${entry.date}</span>
                <div style="display: flex; gap: 8px;">
                    <button onclick="exportSingleSession(${index})" title="Download JSON" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:0;">💾</button>
                    <button onclick="reloadFromHistory(${index})" style="background:#264653; color:white; border:none; padding:4px 10px; border-radius:5px; cursor:pointer; font-size:0.7rem;">Load</button>
                </div>
            </div>
            <div style="color: #666; font-style: italic; font-size: 0.75rem; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${entry.persona}"</div>
            <div style="color: #264653; font-weight: 500;">${names}</div>
        `;
        logList.appendChild(item);
    });
}

// 3. EXPORT TO JSON FILE
function exportSingleSession(index) {
    const history = JSON.parse(localStorage.getItem('sanse_history') || "[]");
    const data = history[index];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `sanse-deck-${data.date.replace(/[/:\s]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 4. UI HELPERS
function reloadFromHistory(index) {
    const history = JSON.parse(localStorage.getItem('sanse_history') || "[]");
    if (history[index]) {
        renderAIThemes(history[index].themes);
        document.getElementById('theme-map').scrollIntoView({ behavior: 'smooth' });
    }
}

function renderAIThemes(themes) {
    const mapContainer = document.getElementById('theme-map');
    if (!mapContainer) return;
    mapContainer.innerHTML = '';

    themes.forEach(theme => {
        const bubble = document.createElement('div');
        bubble.className = "theme-bubble";
        bubble.innerHTML = `<span>${theme.icon}</span> ${theme.name}`;
        bubble.style.backgroundColor = theme.color || "#264653";

        bubble.onclick = () => {
            if (typeof myCards !== 'undefined') {
                myCards = theme.deck;
                if (typeof resetForNewDeck === 'function') resetForNewDeck();
                if (typeof updateUI === 'function') updateUI();
                document.getElementById('card').scrollIntoView({ behavior: 'smooth' });
            }
        };
        mapContainer.appendChild(bubble);
    });
}

function clearHistory() {
    if (confirm("Wipe all generation history?")) {
        localStorage.removeItem('sanse_history');
        renderSessionLog();
    }
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    renderSessionLog();
    const history = JSON.parse(localStorage.getItem('sanse_history') || "[]");
    if (history.length > 0) renderAIThemes(history[0].themes);
});

// 3. Rendering the Map
function renderAIThemes(themes, isNew = true) {
    const mapContainer = document.getElementById('theme-map');
    if (isNew) {
        mapContainer.innerHTML = ''; // Only clear if it's a fresh generation
        // SAVE to localStorage
        localStorage.setItem('sanse_saved_decks', JSON.stringify(themes));
    }

    themes.forEach(theme => {
        const bubble = document.createElement('div');
        bubble.className = "theme-bubble";
        bubble.innerHTML = `<span>${theme.icon}</span> ${theme.name}`;
        bubble.style.backgroundColor = theme.color || "#264653";

        bubble.onclick = () => {
            myCards = theme.deck;
            resetForNewDeck();
            updateUI();
            document.getElementById('card').scrollIntoView({ behavior: 'smooth' });
        };
        mapContainer.appendChild(bubble);
    });
}

function loadSavedDecks() {
    const saved = localStorage.getItem('sanse_saved_decks');
    if (saved) {
        const themes = JSON.parse(saved);
        console.log("Loading saved AI decks...");
        renderAIThemes(themes, false); // 'false' because we aren't re-saving them
    }
}

// Call it immediately
loadSavedDecks();

function resetForNewDeck() {
    currentIndex = 0;
    side = 0;
    sessionCorrect = 0;
    sessionTotal = 0;
    hasVoted = false;

    // Reset UI elements
    const scoreEl = document.getElementById('session-score');
    if (scoreEl) scoreEl.innerText = "0 / 0";

    const endScreen = document.getElementById('end-screen');
    if (endScreen) endScreen.style.display = 'none';

    // Reactivate buttons
    document.querySelectorAll('button[onclick^="recordResult"]').forEach(btn => {
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    });
}

async function diagnosticListModels() {
    const apiKey = localStorage.getItem('sanse_gemini_key');
    if (!apiKey) {
        console.error("No API Key found in storage!");
        return;
    }

    console.log("--- 🧪 DIAGNOSTIC START ---");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error.message);
            return;
        }

        console.log("✅ Success! Your key has access to these models:");
        data.models.forEach(m => {
            // We are looking for models that support 'generateContent'
            if (m.supportedGenerationMethods.includes('generateContent')) {
                console.log(`Model ID: ${m.name} (Use this string!)`);
            }
        });
    } catch (err) {
        console.error("Network error during diagnostic:", err);
    }
    console.log("--- 🧪 DIAGNOSTIC END ---");
}

initApp();