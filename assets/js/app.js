let cards = [];
let currentIndex = 0;
let side = 0;

// 1. Fetch vocabulary from your own JSON file
async function loadCards() {
    const response = await fetch('/assets/cards.json');
    cards = await response.json();
    updateUI();
}

function flipCard() {
    side = (side + 1) % 3;
    updateUI();
}

function nextCard() {
    currentIndex = (currentIndex + 1) % cards.length;
    side = 0;
    updateUI();
}

function updateUI() {
    const textEl = document.getElementById('card-text');
    const subEl = document.getElementById('card-subtext');
    const progressEl = document.getElementById('progress-fill');

    const current = cards[currentIndex];

    if (side === 0) {
        textEl.innerText = current.h;
        subEl.innerText = "Tap for Pinyin";
    } else if (side === 1) {
        textEl.innerText = current.p;
        subEl.innerText = "Tap for English";
    } else {
        textEl.innerText = current.e;
        subEl.innerText = "Tap for Hanzi";
    }

    progressEl.style.width = ((currentIndex + 1) / cards.length * 100) + "%";
}

loadCards();
