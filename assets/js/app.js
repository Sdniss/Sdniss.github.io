let myCards = [];
let currentIndex = 0;
let side = 0;
let voices = [];

// Change the base path to your new structure
const DATA_BASE_PATH = '/assets/data/';


async function changeDeck(subPath) {
    currentIndex = 0;
    side = 0;

    // subPath will be something like "hsk-data/1.json"
    const fullPath = `${DATA_BASE_PATH}${subPath}`;
    console.log(`Fetching from: ${fullPath}`);

    try {
        // Adding a cache-buster (?v=...) ensures you see updates immediately after pushing to GitHub
        const response = await fetch(`${fullPath}?v=${Date.now()}`);

        if (!response.ok) throw new Error(`File not found: ${fullPath}`);

        const data = await response.json();

        // Safety check: ensure data is an array
        myCards = Array.isArray(data) ? data : [];

        updateUI();
        console.log(`Loaded ${myCards.length} cards.`);
    } catch (e) {
        console.error("Deck load error:", e);
        // Show the error on the card so you know exactly what happened
        document.getElementById('card-text').innerText = "⚠️ File not found";
        document.getElementById('card-subtext').innerText = subPath;
    }
}

/**
 * 1. Initial Load: Setup voices, sliders, and fetch the deck
 */

async function initApp() {
    // Setup slider labels
    const sliders = ['rate', 'pitch', 'volume'];
    sliders.forEach(id => {
        const slider = document.getElementById(`${id}-slider`);
        const display = document.getElementById(`${id}-val`);
        if (slider && display) {
            slider.addEventListener('input', () => {
                display.innerText = slider.value;
            });
        }
    });

    // Handle voice loading (different browsers load these at different times)
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
    populateVoiceList(); // Initial try

    const selector = document.getElementById('json-select');
    if (selector) {
        // This triggers the first load automatically based on the HTML default
        changeDeck(selector.value);
    }
}

/**
 * 2. Voice Management: Populates the dropdown menu
 */
function populateVoiceList() {
    voices = window.speechSynthesis.getVoices();
    const voiceSelect = document.getElementById('voice-select');
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '';

    // 1. Filter for all Chinese voices (CN, HK, TW, etc.)
    const zhVoices = voices.filter(v => v.lang.includes('zh'));

    zhVoices.forEach((voice) => {
        const option = document.createElement('option');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-name', voice.name);

        // 2. Logic to set the default to zh-CN
        // We look for 'zh-CN' or 'zh_CN' specifically.
        // We also prefer Google or Online Neural voices if available.
        const isCN = voice.lang === 'zh-CN' || voice.lang === 'zh_CN';
        const isGoogle = voice.name.includes('Google');

        if (isCN && isGoogle) {
            option.selected = true;
        } else if (isCN && !voiceSelect.querySelector('[selected]')) {
            // Fallback: if no Google CN voice yet, pick any CN voice as default
            option.selected = true;
        }

        voiceSelect.appendChild(option);
    });
}

/**
 * 3. Audio Logic: Reads the Chinese text using slider & dropdown settings
 */
function playAudio() {
    window.speechSynthesis.cancel();

    if (!myCards[currentIndex]) return;

    const utterance = new SpeechSynthesisUtterance(myCards[currentIndex].simplified);

    // Grab values from DOM
    const rate = document.getElementById('rate-slider')?.value || 0.8;
    const pitch = document.getElementById('pitch-slider')?.value || 1.1;
    const volume = document.getElementById('volume-slider')?.value || 1.0;
    const voiceSelect = document.getElementById('voice-select');

    utterance.lang = 'zh-CN';
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Apply the specific voice from the switcher
    if (voiceSelect && voiceSelect.selectedOptions.length > 0) {
        const selectedVoiceName = voiceSelect.selectedOptions[0].getAttribute('data-name');
        const selectedVoice = voices.find(v => v.name === selectedVoiceName);
        if (selectedVoice) utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
}

/**
 * 4. UI Engine: Handles flipping and navigation
 */
function flipCard() {
    side = (side + 1) % 3;
    if (side === 0) playAudio();
    updateUI();
}

function nextCard() {
    if (currentIndex < myCards.length - 1) {
        currentIndex++;
        side = 0;
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

/**
 * 5. Update UI: Manages alignment, scaling, and data paths
 */
function updateUI() {
    const textEl = document.getElementById('card-text');
    const subEl = document.getElementById('card-subtext');
    const progressEl = document.getElementById('progress-fill');

    const current = myCards[currentIndex];
    if (!current) return;

    let textEl_txt = "";
    let subEl_txt = "";

    // Data Path Logic
    if (side === 0) {
        textEl_txt = current.simplified;
        textEl.style.textAlign = "center";
        subEl_txt = "Hanzi (Tap for Pinyin)";
    } else if (side === 1) {
        textEl_txt = current.forms[0].transcriptions.pinyin;
        textEl.style.textAlign = "center";
        subEl_txt = "Pinyin (Tap for English)";
    } else {
        textEl_txt = '- ' + current.forms[0].meanings.join("\n- ");
        textEl.style.textAlign = "left";
        subEl_txt = "English (Tap for Hanzi)";
    }

    // Dynamic Font Scaling
    const charCount = textEl_txt.length;
    let fontSize = "4rem";
    if (charCount > 10) fontSize = "3rem";
    if (charCount > 20) fontSize = "2rem";
    if (charCount > 40) fontSize = "1.5rem";

    textEl.style.fontSize = fontSize;

    // Only update if the element actually exists
        if (textEl) {
            textEl.style.fontSize = fontSize;
            textEl.innerText = textEl_txt;
        }

        if (subEl) {
            subEl.innerText = subEl_txt;
        }

        if (progressEl && myCards.length > 0) {
            progressEl.style.width = ((currentIndex + 1) / myCards.length * 100) + "%";
        }
}

// Start the app
initApp();
