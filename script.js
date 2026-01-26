const deckEl = document.getElementById("deck");
const deckTopEl = document.getElementById("deck-top");
const cardsArea = document.getElementById("cards-area");
const countersEl = document.getElementById("counters");
const stackCards = deckEl.querySelectorAll(".stack-card");
const sounds = {
  draw: new Audio("Assets/Sound/playing-card-flipped-over-epic-stock-media-1-00-00.mp3"),
  shuffle: new Audio("Assets/Sound/playing-cards-riffled.mp3"),
  bang: new Audio("Assets/Sound/gunshot-handgun-bosnow-2-2-00-02.mp3"),
  ricochet: new Audio("Assets/Sound/cartoon-gunshot-richochet-bosnow-3-3-00-01.mp3"),
};

const cardImages = {
  click: "Assets/Cards/rr-click.jpg",
  bang: "Assets/Cards/rr-bang.jpg",
  jam: "Assets/Cards/rr-jam.jpg",
  back: "Assets/Cards/rr-card-back.jpg",
};

let deck = [];
let drawnCount = 0;
let points = 0;
let inPlay = true;
let tapTimeout = null;
let lastBang = false;
let suppressNextTap = false;
let topDrawnCleanup = null;
let topDrawnCard = null;
let introPlayed = false;
let pendingIntroSound = false;
let introReady = false;

const playSound = (audio, options = {}) => {
  if (!audio) {
    return;
  }
  const { overlap = false } = options;
  const target = overlap ? audio.cloneNode(true) : audio;
  target.currentTime = 0;
  target.play().catch(() => { });
};

const buildDeck = () => {
  const newDeck = [
    "click",
    "click",
    "click",
    "click",
    "click",
    "bang",
    "jam",
    "jam",
  ];
  for (let i = newDeck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

const getTotalCards = () => 8;

const resetGame = () => {
  deck = buildDeck();
  drawnCount = 0;
  points = 0;
  inPlay = true;
  lastBang = false;
  cardsArea.innerHTML = "";
  if (topDrawnCleanup) {
    topDrawnCleanup();
    topDrawnCleanup = null;
  }
  topDrawnCard = null;
  renderCounters();
  const shouldIntro = !introPlayed && introReady;
  if (shouldIntro) {
    introPlayed = true;
    playIntroStack();
    playSound(sounds.shuffle);
    return;
  }
  updateDeckStack();
  if (introReady || introPlayed) {
    playSound(sounds.shuffle);
  }
};

const stopRound = () => {
  if (!inPlay) {
    return;
  }
  points = drawnCount;
  inPlay = false;
  lastBang = false;
};

const createCardElement = (type) => {
  const card = document.createElement("div");
  card.className = "card";
  const inner = document.createElement("div");
  inner.className = "card-inner";

  const back = document.createElement("div");
  back.className = "card-face card-back";
  const backImg = document.createElement("img");
  backImg.src = cardImages.back;
  backImg.alt = "Card back";
  backImg.draggable = false;
  back.appendChild(backImg);

  const front = document.createElement("div");
  front.className = "card-face card-front";
  const frontImg = document.createElement("img");
  frontImg.src = cardImages[type];
  frontImg.alt = `${type} card`;
  frontImg.draggable = false;
  front.appendChild(frontImg);

  inner.appendChild(back);
  inner.appendChild(front);
  card.appendChild(inner);
  return card;
};

const updateDeckStack = () => {
  stackCards.forEach((card) => {
    card.style.display = "none";
  });
  const remaining = deck.length;
  if (deckTopEl) {
    deckTopEl.style.visibility = remaining > 0 ? "visible" : "hidden";
    deckTopEl.style.opacity = remaining > 0 ? "1" : "0";
    deckTopEl.style.setProperty("--i", "8");
  }
  const deckPlaceholder = deckEl.querySelector(".deck-placeholder");
  if (deckPlaceholder) {
    const showPlaceholder = remaining === 0;
    deckPlaceholder.classList.toggle("visible", showPlaceholder);
    deckPlaceholder.style.display = showPlaceholder ? "block" : "none";
  }
  const stackCount = Math.max(0, Math.min(stackCards.length, remaining - 1));
  stackCards.forEach((card, index) => {
    const visible = index < stackCount;
    card.style.display = visible ? "block" : "none";
    card.style.setProperty("--i", `${index + 1}`);
  });
};

function playIntroStack() {
  const totalCards = getTotalCards();
  const stackCount = Math.max(0, Math.min(stackCards.length, totalCards - 1));

  // Prepare stack items array first
  const stackItems = [
    ...Array.from(stackCards).slice(0, stackCount),
    deckTopEl,
  ].filter(Boolean);

  // Set up ALL transforms and visibility BEFORE changing display properties
  stackCards.forEach((card, index) => {
    const visible = index < stackCount;
    card.style.setProperty("--i", `${index + 1}`);
    if (visible) {
      card.style.visibility = "hidden";
      card.style.opacity = "0";
      card.classList.remove("stack-enter");
      card.classList.add("stack-offscreen");
      card.style.transform =
        "translate(var(--stack-x), calc(var(--stack-y) - 120vh)) rotate(calc(var(--stack-rot) - 6deg))";
    }
  });

  if (deckTopEl) {
    deckTopEl.style.setProperty("--i", "8");
    deckTopEl.style.visibility = "hidden";
    deckTopEl.style.opacity = "0";
    deckTopEl.classList.remove("stack-enter");
    deckTopEl.classList.add("stack-offscreen");
    deckTopEl.style.transform =
      "translate(var(--stack-x), calc(var(--stack-y) - 120vh)) rotate(calc(var(--stack-rot) - 6deg))";
  }

  // NOW change display properties after everything is positioned offscreen
  stackCards.forEach((card, index) => {
    const visible = index < stackCount;
    card.style.display = visible ? "block" : "none";
  });
  if (deckTopEl) {
    deckTopEl.style.display = totalCards > 0 ? "block" : "none";
  }
  deckEl.style.display = "grid";

  // Set animation delays
  stackItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 80}ms`;
    item.addEventListener(
      "animationend",
      () => {
        item.classList.remove("stack-enter");
        item.style.animationDelay = "";
        item.style.transform = "";
      },
      { once: true }
    );
  });

  // Force reflow
  deckEl.getBoundingClientRect();

  requestAnimationFrame(() => {
    document.body.classList.remove("intro-playing");
    requestAnimationFrame(() => {
      stackItems.forEach((item) => {
        item.style.visibility = "visible";
        item.style.opacity = "1";
        item.classList.remove("stack-offscreen");
        item.classList.add("stack-enter");
        item.style.transform = "";
      });
    });
  });
}



const renderCounters = () => {
  if (!countersEl) {
    return;
  }
  let container = countersEl.querySelector(".cube-row");
  if (!container) {
    container = document.createElement("div");
    container.className = "cube-row";
    countersEl.appendChild(container);
  }

  if (drawnCount === 0) {
    container.innerHTML = "";
    return;
  }

  const existing = container.querySelectorAll(".counter-dot").length;
  const targetCount = Math.min(drawnCount, 7);

  for (let i = existing; i < targetCount; i += 1) {
    const dot = document.createElement("span");
    dot.className = "counter-dot active";
    const tilt = (Math.random() * 18 - 9).toFixed(2);
    const offsetY = (Math.random() * 12 - 6).toFixed(1);
    dot.style.setProperty("--cube-rot", `${tilt}deg`);
    dot.style.setProperty("--cube-y", `${offsetY}px`);
    dot.classList.add("cube-enter");
    dot.addEventListener(
      "animationend",
      () => {
        dot.classList.remove("cube-enter");
      },
      { once: true }
    );
    container.appendChild(dot);
  }

  if (drawnCount === 0) {
    container.innerHTML = "";
  }
};

const dealCard = (type, onStart) => {
  const card = createCardElement(type);
  const stackIndex = Math.max(0, drawnCount - 1);
  const totalCards = getTotalCards();
  const offsetX = Math.min(stackIndex, totalCards) * 6;
  const offsetY = Math.min(stackIndex, totalCards) * 5;
  const tilt = (Math.random() * 6 - 3).toFixed(2);
  card.style.setProperty("--tilt", `${tilt}deg`);
  card.style.setProperty("--to-x", `${offsetX}px`);
  card.style.setProperty("--to-y", `${offsetY}px`);
  cardsArea.appendChild(card);

  const deckRect = (deckTopEl || deckEl).getBoundingClientRect();
  const areaRect = cardsArea.getBoundingClientRect();
  const cardWidth = card.offsetWidth;
  const cardHeight = card.offsetHeight;
  const fromX = deckRect.left + deckRect.width / 2 - (areaRect.left + cardWidth / 2);
  const fromY = deckRect.top + deckRect.height / 2 - (areaRect.top + cardHeight / 2);
  card.style.setProperty("--from-x", `${fromX}px`);
  card.style.setProperty("--from-y", `${fromY}px`);
  card.getBoundingClientRect();
  card.addEventListener(
    "animationend",
    () => {
      card.classList.remove("deal");
      cardsArea.classList.remove("dealing");
    },
    { once: true }
  );
  cardsArea.classList.add("dealing");
  requestAnimationFrame(() => {
    card.classList.add("deal");
    if (onStart) {
      onStart();
    }
  });
  topDrawnCard = card;
  topDrawnCleanup = enableCardDrag(card, topDrawnCleanup);
};

const drawCard = () => {
  if (!inPlay || deck.length === 0) {
    return;
  }
  const cardType = deck.pop();
  drawnCount += 1;
  renderCounters();
  dealCard(cardType, () => {
    updateDeckStack();
  });
  playSound(sounds.draw, { overlap: true });

  if (cardType === "bang") {
    inPlay = false;
    lastBang = true;
    const dots = countersEl ? countersEl.querySelectorAll(".counter-dot") : [];
    dots.forEach((dot, index) => {
      dot.style.animationDelay = `${index * 0.05}s`;
      dot.classList.add("fade-out");
    });
    setTimeout(() => playSound(sounds.bang, { overlap: true }), 80);
    return;
  }



  if (cardType === "jam") {
    if (deck.length === 0) {
      points = drawnCount;
      inPlay = false;
      lastBang = false;
    }
    return;
  }

  if (deck.length === 0) {
    points = drawnCount;
    inPlay = false;
    lastBang = false;
  }
};

const handleDeckTap = () => {
  if (pendingIntroSound) {
    pendingIntroSound = false;
    playSound(sounds.shuffle);
  }
  if (suppressNextTap) {
    suppressNextTap = false;
    return;
  }
  if (!inPlay && lastBang) {
    resetGame();
    return;
  }

  if (tapTimeout) {
    clearTimeout(tapTimeout);
    tapTimeout = null;
    if (!inPlay) {
      if (!lastBang) {
        resetGame();
      }
      return;
    }
    stopRound();
    resetGame();
    return;
  }

  tapTimeout = setTimeout(() => {
    tapTimeout = null;
    if (!inPlay) {
      return;
    }
    drawCard();
  }, 220);
};

const unlockIntroSound = () => {
  if (!pendingIntroSound) {
    return;
  }
  pendingIntroSound = false;
  playSound(sounds.shuffle);
};

document.addEventListener(
  "pointerdown",
  () => {
    unlockIntroSound();
  },
  { once: true }
);

document.body.addEventListener("pointerup", (event) => {
  if (!document.body.classList.contains("intro-start")) {
    return;
  }
  event.stopPropagation();
  introReady = true;
  document.body.classList.add("intro-playing");
  document.body.classList.remove("intro-start");
  resetGame();
});

const enableDrag = (targetEl, onStart, onEnd) => {
  if (!targetEl) {
    return () => { };
  }
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let dragging = false;

  const resetDrag = () => {
    targetEl.style.transition = "transform 180ms ease";
    targetEl.style.transform = "";
    setTimeout(() => {
      targetEl.style.transition = "";
    }, 200);
  };

  const onPointerMove = (event) => {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const stepX = event.clientX - lastX;
    const stepY = event.clientY - lastY;
    if (!dragging && Math.hypot(dx, dy) > 4) {
      dragging = true;
      targetEl.style.transition = "none";
      if (onStart) {
        onStart();
      }
    }
    if (dragging) {
      const tiltX = Math.max(-5, Math.min(5, stepY * -0.6));
      const tiltZ = Math.max(-6, Math.min(6, stepX * 0.6));
      targetEl.style.transform = `translate(${dx}px, ${dy}px) rotateX(${tiltX}deg) rotate(${tiltZ}deg)`;
    }
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const onPointerUp = () => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    if (dragging) {
      if (onEnd) {
        onEnd();
      }
      resetDrag();
    }
  };

  const onPointerDown = (event) => {
    event.stopPropagation();
    event.preventDefault();
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    lastY = event.clientY;
    dragging = false;
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  };

  targetEl.addEventListener("pointerdown", onPointerDown);

  return () => {
    targetEl.removeEventListener("pointerdown", onPointerDown);
  };
};

const enableCardDrag = (cardEl, previousCleanup) => {
  if (previousCleanup) {
    previousCleanup();
  }
  if (!cardEl) {
    return null;
  }
  let releaseTimer = null;
  return enableDrag(
    cardEl,
    () => {
      if (releaseTimer) {
        clearTimeout(releaseTimer);
        releaseTimer = null;
      }
      cardEl.classList.add("dragging");
      cardsArea.classList.add("dragging");
      suppressNextTap = true;
    },
    () => {
      suppressNextTap = true;
      releaseTimer = setTimeout(() => {
        cardEl.classList.remove("dragging");
        cardsArea.classList.remove("dragging");
        releaseTimer = null;
      }, 200);
    }
  );
};

const enableDeckDrag = () => {
  if (!deckTopEl) {
    return;
  }
  enableDrag(
    deckTopEl,
    () => {
      deckTopEl.classList.add("dragging");
      deckEl.classList.add("dragging");
      suppressNextTap = true;
    },
    () => {
      suppressNextTap = true;
      deckTopEl.classList.remove("dragging");
      deckEl.classList.remove("dragging");
    }
  );
};

deckEl.addEventListener("pointerup", handleDeckTap);
cardsArea.addEventListener("pointerup", handleDeckTap);
deckEl.addEventListener("dblclick", (event) => {
  event.preventDefault();
});


enableDeckDrag();
