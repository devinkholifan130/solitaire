// ===== SOLITAIRE GAME ENGINE WITH TUTORIAL & SOUND EFFECTS =====

// Card suits and ranks
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: 'red', diamonds: 'red', clubs: 'black', spades: 'black' };
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUES = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

// ===== AUDIO SYSTEM =====
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Sound effects
const sounds = {
    flip: () => playSound(800, 400, 0.1, 0.3),
    move: () => playSound(300, 200, 0.08, 0.2, 'sine'),
    drop: () => playSound(200, 100, 0.15, 0.4, 'triangle'),
    success: () => {
        playSound(523.25, 0, 0.2, 0.3, 'sine');
        setTimeout(() => playSound(659.25, 0, 0.2, 0.3, 'sine'), 100);
    },
    draw: () => playSound(600, 400, 0.1, 0.25, 'sine'),
    error: () => playSound(150, 100, 0.2, 0.2, 'sawtooth'),
    win: () => {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            setTimeout(() => playSound(freq, 0, 0.3, 0.3, 'triangle'), i * 150);
        });
    },
    stack: () => playSound(400, 250, 0.12, 0.3, 'sine'),
    hint: () => playSound(880, 1100, 0.15, 0.15, 'sine')
};

function playSound(startFreq, endFreq, duration, volume, type = 'sine') {
    if (!gameState.soundEnabled) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
}

// ===== TUTORIAL SYSTEM =====
let tutorialState = {
    active: false,
    currentStep: 0,
    steps: [
        {
            title: "🎯 Welcome to Solitaire!",
            description: "The goal is to move ALL cards to the Foundation piles (top right) in order from Ace → King by suit.",
            highlight: 'foundationArea',
            action: null
        },
        {
            title: "📚 The Tableau",
            description: "These 7 columns at the bottom are where you build DOWN in alternating colors. Example: Red 7 on Black 8.",
            highlight: 'tableauArea',
            action: null
        },
        {
            title: "🎴 Stockpile",
            description: "Click here to draw cards when you have no moves. Each draw costs -5 points.",
            highlight: 'stockPile',
            action: 'click-stock'
        },
        {
            title: "♠ Find an Ace",
            description: "Look for any Aces in your tableau. Double-click them to send to Foundation!",
            highlight: 'find-ace',
            action: 'find-ace'
        },
        {
            title: "🏗️ Building Tableau",
            description: "Move cards between columns by dragging. Remember: DOWN in alternating colors (red on black, black on red).",
            highlight: 'tableauArea',
            action: null
        },
        {
            title: "🎉 You're Ready!",
            description: "Now play the game! Remember: Expose face-down cards, move Aces first, and think ahead. Good luck!",
            highlight: null,
            action: null
        }
    ]
};

// Game state
let gameState = {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    score: 0,
    moves: 0,
    timerInterval: null,
    seconds: 0,
    isDragging: false,
    dragCards: [],
    dragSource: null,
    dragStartIndex: null,
    startX: 0,
    startY: 0,
    soundEnabled: true,
    tutorialMode: false,
    hintsEnabled: true
};

// ===== DECK CREATION =====
function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({
                suit, rank, value: RANK_VALUES[rank],
                color: SUIT_COLORS[suit], symbol: SUIT_SYMBOLS[suit],
                faceUp: false, id: `${rank}_${suit}`
            });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// ===== TUTORIAL FUNCTIONS =====
function toggleTutorial() {
    const modal = document.getElementById('tutorialModal');
    modal.classList.toggle('show');
    if (modal.classList.contains('show')) {
        sounds.hint();
    }
}

function startInteractiveTutorial() {
    toggleTutorial();
    tutorialState.active = true;
    tutorialState.currentStep = 0;
    gameState.tutorialMode = true;
    showTutorialStep(0);
    sounds.success();
}

function showTutorialStep(stepIndex) {
    const step = tutorialState.steps[stepIndex];
    const overlay = document.getElementById('tutorialOverlay');
    const title = document.getElementById('stepTitle');
    const desc = document.getElementById('stepDescription');
    const prevBtn = document.getElementById('prevStep');
    const nextBtn = document.getElementById('nextStep');
    
    // Clear all highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('active-highlight');
    });
    
    // Show step
    overlay.classList.add('show');
    title.textContent = step.title;
    desc.textContent = step.description;
    prevBtn.style.display = stepIndex === 0 ? 'none' : 'inline-block';
    nextBtn.textContent = stepIndex === tutorialState.steps.length - 1 ? 'Finish' : 'Next →';
    
    // Highlight element
    if (step.highlight) {
        highlightTutorialElement(step.highlight);
    }
    
    // Play hint sound
    sounds.hint();
}

function highlightTutorialElement(elementId) {
    setTimeout(() => {
        if (elementId === 'find-ace') {
            // Find first ace in tableau
            for (let col = 0; col < 7; col++) {
                const pile = gameState.tableau[col];
                const ace = pile.find(c => c.rank === 'A' && c.faceUp);
                if (ace) {
                    const cardEl = document.querySelector(`[data-card-id="${ace.id}"]`);
                    if (cardEl) {
                        cardEl.classList.add('tutorial-pulse');
                        setTimeout(() => cardEl.classList.remove('tutorial-pulse'), 2000);
                    }
                    break;
                }
            }
        } else {
            const el = document.getElementById(elementId);
            if (el) {
                el.classList.add('active-highlight');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, 300);
}

function nextTutorialStep() {
    if (tutorialState.currentStep < tutorialState.steps.length - 1) {
        tutorialState.currentStep++;
        showTutorialStep(tutorialState.currentStep);
    } else {
        endInteractiveTutorial();
    }
}

function prevTutorialStep() {
    if (tutorialState.currentStep > 0) {
        tutorialState.currentStep--;
        showTutorialStep(tutorialState.currentStep);
    }
}

function endInteractiveTutorial() {
    document.getElementById('tutorialOverlay').classList.remove('show');
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('active-highlight');
    });
    gameState.tutorialMode = false;
    sounds.success();
}

// ===== GAME INITIALIZATION =====
function startGame() {
    const deck = shuffleDeck(createDeck());

    gameState = {
        stock: [], waste: [], foundations: [[], [], [], []],
        tableau: [[], [], [], [], [], [], []],
        score: 0, moves: 0, timerInterval: null, seconds: 0,
        isDragging: false, dragCards: [], dragSource: null,
        dragStartIndex: null, startX: 0, startY: 0,
        soundEnabled: true, tutorialMode: false, hintsEnabled: true
    };

    // Deal to tableau
    for (let col = 0; col < 7; col++) {
        for (let row = col; row < 7; row++) {
            const card = deck.pop();
            card.faceUp = (row === col);
            gameState.tableau[col].push(card);
            if (row === col) setTimeout(() => sounds.flip(), col * 100);
        }
    }

    gameState.stock = deck.reverse();

    const overlay = document.getElementById('winOverlay');
    if (overlay) overlay.classList.remove('show');

    startTimer();
    updateStats();
    renderGame();
    
    setTimeout(() => sounds.success(), 500);
    
    // Show hint for beginners
    if (gameState.hintsEnabled) {
        setTimeout(showBeginnerHint, 2000);
    }
}

function showBeginnerHint() {
    // Check for aces and highlight them
    let hasAce = false;
    for (let col = 0; col < 7; col++) {
        const pile = gameState.tableau[col];
        if (pile.some(c => c.rank === 'A' && c.faceUp)) {
            hasAce = true;
            break;
        }
    }
    
    if (hasAce && !gameState.tutorialMode) {
        const stockPile = document.getElementById('stockPile');
        const tooltip = document.createElement('div');
        tooltip.className = 'beginner-hint';
        tooltip.textContent = '💡 Tip: Look for Aces and double-click them!';
        stockPile.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 5000);
    }
}

// ===== TIMER =====
function startTimer() {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    gameState.seconds = 0;
    gameState.timerInterval = setInterval(() => {
        gameState.seconds++;
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const mins = String(Math.floor(gameState.seconds / 60)).padStart(2, '0');
    const secs = String(gameState.seconds % 60).padStart(2, '0');
    const el = document.getElementById('timer');
    if (el) el.textContent = `${mins}:${secs}`;
}

function stopTimer() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

// ===== STATS =====
function updateStats() {
    const scoreEl = document.getElementById('score');
    const movesEl = document.getElementById('moves');
    if (scoreEl) scoreEl.textContent = gameState.score;
    if (movesEl) movesEl.textContent = gameState.moves;
    updateTimerDisplay();
}

function addScore(points) {
    gameState.score += points;
    if (gameState.score < 0) gameState.score = 0;
    updateStats();
}

function addMove() {
    gameState.moves++;
    updateStats();
}

// ===== RENDERING =====
function renderGame() {
    renderStock();
    renderWaste();
    renderFoundations();
    renderTableau();
    updateStats();
}

function renderStock() {
    const stockEl = document.getElementById('stockPile');
    stockEl.innerHTML = '';
    stockEl.classList.remove('empty');

    if (gameState.stock.length === 0) {
        stockEl.classList.add('empty');
        stockEl.innerHTML = '<div class="card-placeholder">↻</div>';
    } else {
        stockEl.innerHTML = `
            <div class="card-back"></div>
            <div class="card-count">${gameState.stock.length}</div>
        `;
    }
}

function renderWaste() {
    const wasteEl = document.getElementById('wastePile');
    wasteEl.innerHTML = '';

    if (gameState.waste.length === 0) return;

    const card = gameState.waste[gameState.waste.length - 1];
    card.faceUp = true;
    const cardEl = createCardElement(card, 'waste', gameState.waste.length - 1);
    wasteEl.appendChild(cardEl);
}

function renderFoundations() {
    for (let i = 0; i < 4; i++) {
        const pileEl = document.getElementById(`foundation-${i}`);
        pileEl.innerHTML = `<span class="foundation-label">${SUIT_SYMBOLS[SUITS[i]]}</span>`;

        if (gameState.foundations[i].length > 0) {
            const card = gameState.foundations[i][gameState.foundations[i].length - 1];
            card.faceUp = true;
            const cardEl = createCardElement(card, 'foundation', i);
            pileEl.appendChild(cardEl);
        }
    }
}

function renderTableau() {
    for (let col = 0; col < 7; col++) {
        const pileEl = document.getElementById(`tableau-${col}`);
        pileEl.innerHTML = '';

        const pile = gameState.tableau[col];
        if (pile.length === 0) continue;

        pile.forEach((card, index) => {
            const cardEl = createCardElement(card, 'tableau', col, index);
            pileEl.appendChild(cardEl);
        });
    }
}

function createCardElement(card, source, pileIndex, cardIndex = -1) {
    const el = document.createElement('div');
    el.className = `card ${card.color} ${card.faceUp ? '' : 'face-down'}`;
    el.dataset.source = source;
    el.dataset.pileIndex = pileIndex;
    el.dataset.cardIndex = cardIndex;
    el.dataset.cardId = card.id;

    if (!card.faceUp) {
        el.innerHTML = '<div class="card-back"></div>';
    } else {
        el.innerHTML = `
            <div class="card-face">
                <div class="card-corner">
                    <span class="card-rank">${card.rank}</span>
                    <span class="card-suit-small">${card.symbol}</span>
                </div>
                <span class="card-center">${card.symbol}</span>
                <div class="card-corner card-corner-bottom">
                    <span class="card-rank">${card.rank}</span>
                    <span class="card-suit-small">${card.symbol}</span>
                </div>
            </div>
        `;
    }

    if (source === 'tableau' && cardIndex >= 0) {
        const topOffset = card.faceUp ? 28 : 18;
        el.style.top = `${cardIndex * topOffset}px`;
        el.style.zIndex = cardIndex + 1;
    }

    if (card.faceUp) {
        el.addEventListener('mousedown', onCardMouseDown);
        el.addEventListener('touchstart', onCardTouchStart, { passive: false });
        el.addEventListener('dblclick', onCardDoubleClick);
    }

    return el;
}

// ===== STOCK DRAW =====
function drawFromStock() {
    if (gameState.stock.length === 0) {
        if (gameState.waste.length === 0) return;
        gameState.stock = gameState.waste.reverse();
        gameState.stock.forEach(c => c.faceUp = false);
        gameState.waste = [];
        addScore(-20);
        sounds.stack();
    } else {
        const card = gameState.stock.pop();
        card.faceUp = true;
        gameState.waste.push(card);
        sounds.draw();
    }

    addMove();
    renderGame();
}

// ===== DRAG & DROP (sama seperti sebelumnya) =====
function onCardMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();

    const el = e.currentTarget;
    const source = el.dataset.source;
    const pileIndex = parseInt(el.dataset.pileIndex);
    const cardIndex = parseInt(el.dataset.cardIndex);

    if (source === 'tableau') {
        const pile = gameState.tableau[pileIndex];
        const cardsToDrag = pile.slice(cardIndex);
        if (cardsToDrag.some(c => !c.faceUp)) return;

        gameState.dragSource = 'tableau';
        gameState.dragCards = cardsToDrag;
        gameState.dragStartIndex = cardIndex;
        gameState.dragPileIndex = pileIndex;
        sounds.move();
    } else if (source === 'waste') {
        if (gameState.waste.length === 0) return;
        gameState.dragSource = 'waste';
        gameState.dragCards = [gameState.waste[gameState.waste.length - 1]];
        gameState.dragPileIndex = 0;
        sounds.move();
    } else if (source === 'foundation') {
        if (gameState.foundations[pileIndex].length === 0) return;
        gameState.dragSource = 'foundation';
        gameState.dragCards = [gameState.foundations[pileIndex].pop()];
        gameState.dragPileIndex = pileIndex;
        sounds.move();
    } else {
        return;
    }

    gameState.isDragging = true;
    gameState.startX = e.clientX;
    gameState.startY = e.clientY;

    createDragElement(e.clientX, e.clientY);

    document.addEventListener('mousemove', onCardMouseMove);
    document.addEventListener('mouseup', onCardMouseUp);
}

function onCardTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX, clientY: touch.clientY, button: 0
    });
    e.currentTarget.dispatchEvent(mouseEvent);
}

function createDragElement(x, y) {
    removeDragElement();

    const dragContainer = document.createElement('div');
    dragContainer.id = 'dragContainer';
    dragContainer.style.cssText = `
        position: fixed; z-index: 10000; pointer-events: none;
        left: ${x - 50}px; top: ${y - 72}px;
    `;

    gameState.dragCards.forEach((card, i) => {
        const el = createCardElement(card, 'drag', 0, i);
        el.classList.add('dragging');
        el.style.position = 'absolute';
        el.style.left = '0';
        el.style.top = `${i * 28}px`;
        el.style.zIndex = i + 1;
        el.style.cursor = 'grabbing';
        dragContainer.appendChild(el);
    });

    document.body.appendChild(dragContainer);
    gameState.dragCards.forEach(card => { card._hidden = true; });
    renderGame();
}

function removeDragElement() {
    const existing = document.getElementById('dragContainer');
    if (existing) existing.remove();
}

function onCardMouseMove(e) {
    if (!gameState.isDragging) return;
    const dragContainer = document.getElementById('dragContainer');
    if (dragContainer) {
        dragContainer.style.left = `${e.clientX - 50}px`;
        dragContainer.style.top = `${e.clientY - 72}px`;
    }
    highlightDropTargets(e.clientX, e.clientY);
}

function highlightDropTargets(x, y) {
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    const dragCard = gameState.dragCards[0];

    for (let col = 0; col < 7; col++) {
        const pileEl = document.getElementById(`tableau-${col}`);
        const rect = pileEl.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom + 50) {
            if (canPlaceOnTableau(dragCard, col)) {
                pileEl.classList.add('drag-over');
            }
        }
    }

    for (let i = 0; i < 4; i++) {
        if (gameState.dragCards.length > 1) continue;
        const pileEl = document.getElementById(`foundation-${i}`);
        const rect = pileEl.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            if (canPlaceOnFoundation(dragCard, i)) {
                pileEl.classList.add('drag-over');
            }
        }
    }
}

function onCardMouseUp(e) {
    if (!gameState.isDragging) return;

    document.removeEventListener('mousemove', onCardMouseMove);
    document.removeEventListener('mouseup', onCardMouseUp);

    const x = e.clientX;
    const y = e.clientY;
    let moved = false;

    for (let col = 0; col < 7; col++) {
        const pileEl = document.getElementById(`tableau-${col}`);
        const rect = pileEl.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom + 50) {
            if (canPlaceOnTableau(gameState.dragCards[0], col)) {
                placeOnTableau(col);
                moved = true;
                break;
            }
        }
    }

    if (!moved && gameState.dragCards.length === 1) {
        for (let i = 0; i < 4; i++) {
            const pileEl = document.getElementById(`foundation-${i}`);
            const rect = pileEl.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                if (canPlaceOnFoundation(gameState.dragCards[0], i)) {
                    placeOnFoundation(i);
                    moved = true;
                    break;
                }
            }
        }
    }

    if (!moved) {
        sounds.error();
        returnToSource();
    } else {
        sounds.drop();
    }

    gameState.isDragging = false;
    gameState.dragCards = [];
    gameState.dragSource = null;
    gameState.dragStartIndex = null;
    removeDragElement();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    renderGame();
    checkWin();
}

function onCardDoubleClick(e) {
    const el = e.currentTarget;
    const source = el.dataset.source;
    const cardIndex = parseInt(el.dataset.cardIndex);
    const pileIndex = parseInt(el.dataset.pileIndex);

    let card;
    if (source === 'tableau') {
        const pile = gameState.tableau[pileIndex];
        if (cardIndex !== pile.length - 1) return;
        card = pile[cardIndex];
    } else if (source === 'waste') {
        if (gameState.waste.length === 0) return;
        card = gameState.waste[gameState.waste.length - 1];
    } else {
        return;
    }

    for (let i = 0; i < 4; i++) {
        if (canPlaceOnFoundation(card, i)) {
            if (source === 'tableau') {
                gameState.tableau[pileIndex].pop();
                addScore(10);
            } else if (source === 'waste') {
                gameState.waste.pop();
            }

            gameState.foundations[i].push(card);
            addMove();
            addScore(10);

            if (source === 'tableau') {
                flipTopCard(pileIndex);
            }

            sounds.success();
            renderGame();
            checkWin();
            return;
        }
    }
    
    sounds.error();
}

// ===== MOVE VALIDATION =====
function canPlaceOnTableau(card, colIndex) {
    const pile = gameState.tableau[colIndex];
    if (pile.length === 0) return card.rank === 'K';
    const topCard = pile[pile.length - 1];
    if (!topCard.faceUp) return false;
    return card.color !== topCard.color && card.value === topCard.value - 1;
}

function canPlaceOnFoundation(card, foundationIndex) {
    const foundation = gameState.foundations[foundationIndex];
    const suit = SUITS[foundationIndex];
    if (card.suit !== suit) return false;
    if (foundation.length === 0) return card.rank === 'A';
    const topCard = foundation[foundation.length - 1];
    return card.value === topCard.value + 1;
}

// ===== PLACE CARDS =====
function placeOnTableau(colIndex) {
    const pile = gameState.tableau[colIndex];

    if (gameState.dragSource === 'tableau') {
        gameState.tableau[gameState.dragPileIndex] =
            gameState.tableau[gameState.dragPileIndex].slice(0, gameState.dragStartIndex);
    } else if (gameState.dragSource === 'waste') {
        gameState.waste.pop();
    }

    gameState.dragCards.forEach(card => pile.push(card));
    addMove();

    if (gameState.dragSource === 'waste') addScore(5);
    if (gameState.dragSource === 'foundation') addScore(-15);

    if (gameState.dragSource === 'tableau') {
        flipTopCard(gameState.dragPileIndex);
    }
    
    sounds.stack();
}

function placeOnFoundation(foundationIndex) {
    const card = gameState.dragCards[0];

    if (gameState.dragSource === 'tableau') {
        gameState.tableau[gameState.dragPileIndex].pop();
        addScore(10);
        flipTopCard(gameState.dragPileIndex);
    } else if (gameState.dragSource === 'waste') {
        gameState.waste.pop();
    }

    gameState.foundations[foundationIndex].push(card);
    addMove();
    addScore(10);
    
    sounds.success();
}

function returnToSource() {}

function flipTopCard(pileIndex) {
    const pile = gameState.tableau[pileIndex];
    if (pile.length === 0) return;
    const topCard = pile[pile.length - 1];
    if (!topCard.faceUp) {
        topCard.faceUp = true;
        addScore(5);
        sounds.flip();
    }
}

// ===== WIN CHECK =====
function checkWin() {
    const totalFoundation = gameState.foundations.reduce((sum, f) => sum + f.length, 0);
    if (totalFoundation === 52) {
        stopTimer();
        addScore(100);
        sounds.win();

        setTimeout(() => {
            const overlay = document.getElementById('winOverlay');
            const mins = String(Math.floor(gameState.seconds / 60)).padStart(2, '0');
            const secs = String(gameState.seconds % 60).padStart(2, '0');

            document.getElementById('finalScore').textContent = gameState.score;
            document.getElementById('finalMoves').textContent = gameState.moves;
            document.getElementById('finalTime').textContent = `${mins}:${secs}`;

            overlay.classList.add('show');
        }, 300);
    }
}

// ===== TOUCH SUPPORT =====
document.addEventListener('touchmove', (e) => {
    if (!gameState.isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    onCardMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!gameState.isDragging) return;
    const touch = e.changedTouches[0];
    onCardMouseUp({ clientX: touch.clientX, clientY: touch.clientY });
});

// ===== INIT ON LOAD =====
window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('gameBoard')) {
        document.addEventListener('click', () => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
        }, { once: true });
        
        startGame();
    }
});