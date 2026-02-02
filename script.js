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

const bgMusic = new Audio("Assets/Sound/background-music-1.mp3");
bgMusic.loop = true;
let bgFadeTimer = null;

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

const playBgMusic = () => {
  if (bgFadeTimer) {
    clearInterval(bgFadeTimer);
    bgFadeTimer = null;
  }
  bgMusic.volume = 0;
  bgMusic.currentTime = 0;
  bgMusic.play().catch(() => { });
  const fadeDuration = 1200;
  const step = 50;
  let elapsed = 0;
  bgFadeTimer = setInterval(() => {
    elapsed += step;
    const t = Math.min(1, elapsed / fadeDuration);
    bgMusic.volume = t * 0.6;
    if (t >= 1) {
      clearInterval(bgFadeTimer);
      bgFadeTimer = null;
    }
  }, step);
};

const stopBgMusic = () => {
  if (bgFadeTimer) {
    clearInterval(bgFadeTimer);
    bgFadeTimer = null;
  }
  bgMusic.pause();
  bgMusic.currentTime = 0;
};

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

const resetGame = (options = {}) => {
  deck = buildDeck();
  if (deckTopEl) {
    deckTopEl.classList.remove("stop-animation");
  }
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
  if ((introReady || introPlayed) && !options.silent) {
    playSound(sounds.shuffle);
  }
};

const animateReturnAndReset = () => {
  if (drawnCount === 0) {
    resetGame();
    return;
  }

  if (topDrawnCleanup) {
    topDrawnCleanup();
    topDrawnCleanup = null;
  }
  topDrawnCard = null;

  const cards = Array.from(cardsArea.children);
  if (cards.length === 0) {
    resetGame();
    return;
  }

  playSound(sounds.shuffle);

  if (deckEl) {
    deckEl.classList.add("receiving");
  }

  // Calculate delay to sync with shuffle sound approx 1s
  const totalDuration = 500;
  const delayPerCard = Math.min(60, totalDuration / cards.length);

  cards.forEach((card, index) => {
    // Reverse index for visual effect (top cards go first?) or bottom first? 
    // Usually top cards (last drawn) return first looks better for "rewind".
    // But physically, maybe bottom first is easier? Let's do last drawn (top) first.
    const reverseIndex = cards.length - 1 - index;

    // We want the last drawn card (highest index) to go first.
    // loops runs 0 to length-1.
    // card at index length-1 should have 0 delay.
    const delay = (cards.length - 1 - index) * delayPerCard;

    card.style.animationDelay = `${delay}ms`;
    const inner = card.querySelector(".card-inner");
    if (inner) inner.style.animationDelay = `${delay}ms`;

    card.classList.add("return");
  });

  setTimeout(() => {
    if (deckEl) {
      deckEl.classList.remove("receiving");
    }
    resetGame({ silent: true });
  }, totalDuration + 50);
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
    deckTopEl.style.setProperty("--i", `${Math.min(remaining, 8)}`);
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

const dealCard = (type, onStart, fromPos) => {
  const card = createCardElement(type);
  const stackIndex = Math.max(0, drawnCount - 1);
  const totalCards = getTotalCards();
  const offsetX = Math.min(stackIndex, totalCards) * 6;
  const offsetY = Math.min(stackIndex, totalCards) * 5;
  const tilt = (Math.random() * 6 - 3).toFixed(2);
  card.style.setProperty("--tilt", `${tilt}deg`);
  card.style.setProperty("--to-x", `${offsetX}px`);
  card.style.setProperty("--to-y", `${offsetY}px`);

  if (fromPos && fromPos.transform) {
    card.style.setProperty("--from-x", `${fromPos.transform.x}px`);
    card.style.setProperty("--from-y", `${fromPos.transform.y}px`);
    card.style.setProperty("--from-tilt", fromPos.transform.rotate);
    card.classList.add("custom-start");
  }

  cardsArea.appendChild(card);

  if (fromPos && fromPos.transform) {
    // Already set via CSS variables and custom-start class
  } else if (fromPos) {
    const areaRect = cardsArea.getBoundingClientRect();
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    fromX = fromPos.x - (areaRect.left + cardWidth / 2);
    fromY = fromPos.y - (areaRect.top + cardHeight / 2);
    card.style.setProperty("--from-x", `${fromX}px`);
    card.style.setProperty("--from-y", `${fromY}px`);
  } else {
    const deckRect = (deckTopEl || deckEl).getBoundingClientRect();
    const areaRect = cardsArea.getBoundingClientRect();
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    fromX = deckRect.left + deckRect.width / 2 - (areaRect.left + cardWidth / 2);
    fromY = deckRect.top + deckRect.height / 2 - (areaRect.top + cardHeight / 2);
    card.style.setProperty("--from-x", `${fromX}px`);
    card.style.setProperty("--from-y", `${fromY}px`);
  }

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

const drawCard = (fromPos) => {
  if (!inPlay || deck.length === 0) {
    return;
  }
  const cardType = deck.pop();
  drawnCount += 1;
  renderCounters();
  dealCard(cardType, () => {
    updateDeckStack();
  }, fromPos);
  playSound(sounds.draw, { overlap: true });

  if (cardType === "bang") {
    inPlay = false;
    lastBang = true;
    if (deckTopEl) {
      deckTopEl.classList.add("stop-animation");
    }
    const dots = countersEl ? countersEl.querySelectorAll(".counter-dot") : [];
    dots.forEach((dot, index) => {
      dot.style.animationDelay = `${index * 0.05}s`;
      dot.classList.add("fade-out");
    });
    stopBgMusic();
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
    animateReturnAndReset();
    playBgMusic();
    return;
  }

  if (tapTimeout) {
    clearTimeout(tapTimeout);
    tapTimeout = null;
    if (!inPlay) {
      if (!lastBang) {
        animateReturnAndReset();
      }
      return;
    }
    stopRound();
    animateReturnAndReset();
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
  playBgMusic();
  document.body.classList.add("intro-playing");
  document.body.classList.remove("intro-start");
  resetGame();
});

const enableDrag = (targetEl, onStart, onEnd, onMove) => {
  if (!targetEl) {
    return () => { };
  }
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let baseMatrix = null;

  const resetDrag = () => {
    targetEl.style.transition = "transform 400ms cubic-bezier(0.2, 1, 0.3, 1)";
    targetEl.style.transform = "";
    targetEl.classList.remove("paused");
    setTimeout(() => {
      targetEl.style.transition = "";
    }, 450);
  };

  const onPointerMove = (event) => {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!dragging && Math.hypot(dx, dy) > 5) {
      dragging = true;
      targetEl.style.transition = "none";
      if (onStart) {
        onStart();
      }
    }

    if (dragging) {
      if (onMove) {
        onMove(dx, dy, event.clientX, event.clientY, baseMatrix);
      } else {
        const tiltX = Math.max(-5, Math.min(5, dy * -0.6));
        const tiltZ = Math.max(-6, Math.min(6, dx * 0.6));
        const offX = baseMatrix ? baseMatrix.m41 + dx : dx;
        const offY = baseMatrix ? baseMatrix.m42 + dy : dy;
        targetEl.style.transform = `translate(${offX}px, ${offY}px) rotateX(${tiltX}deg) rotate(${tiltZ}deg)`;
      }
    }
  };

  const onPointerUp = (event) => {
    document.removeEventListener("pointermove", onPointerMove, { capture: true });
    document.removeEventListener("pointerup", onPointerUp, { capture: true });
    document.removeEventListener("pointercancel", onPointerUp, { capture: true });

    if (dragging) {
      if (onEnd) {
        onEnd(event.clientX, event.clientY, event.clientX - startX, event.clientY - startY);
      }
      requestAnimationFrame(() => {
        if (targetEl.isConnected) {
          resetDrag();
        }
      });
    }
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();

    const style = window.getComputedStyle(targetEl);
    baseMatrix = new DOMMatrix(style.transform);
    targetEl.style.transform = style.transform;
    targetEl.classList.add("paused");

    startX = event.clientX;
    startY = event.clientY;
    dragging = false;

    document.addEventListener("pointermove", onPointerMove, { capture: true });
    document.addEventListener("pointerup", onPointerUp, { capture: true });
    document.addEventListener("pointercancel", onPointerUp, { capture: true });
    if (targetEl.hasPointerCapture(event.pointerId)) {
      targetEl.releasePointerCapture(event.pointerId);
    }
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
    (endX, endY, totalDx, totalDy) => {
      suppressNextTap = true;
      deckTopEl.classList.remove("dragging");
      deckEl.classList.remove("dragging");

      const threshold = 60;
      if (totalDy > threshold) {
        const style = window.getComputedStyle(deckTopEl);
        const matrix = new DOMMatrix(style.transform);
        const rotation = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);

        // Adjust for cardsArea scale/position
        const areaRect = cardsArea.getBoundingClientRect();
        const deckRect = deckTopEl.getBoundingClientRect();
        const cardWidth = deckTopEl.offsetWidth;
        const cardHeight = deckTopEl.offsetHeight;

        const relativeX = deckRect.left + deckRect.width / 2 - (areaRect.left + cardWidth / 2);
        const relativeY = deckRect.top + deckRect.height / 2 - (areaRect.top + cardHeight / 2);

        drawCard({
          x: endX,
          y: endY,
          transform: {
            x: relativeX,
            y: relativeY,
            rotate: `${rotation}deg`
          }
        });
        deckTopEl.style.transition = "none";
        deckTopEl.style.transform = "";
        deckTopEl.classList.remove("paused");
      }
    },
    (dx, dy, _clientX, _clientY, startMatrix) => {
      const dampingX = 1;
      const dampingY = 1;
      const tiltX = Math.max(-10, Math.min(10, dy * -0.1));
      const tiltZ = Math.max(-10, Math.min(10, dx * 0.2));

      const offX = startMatrix ? startMatrix.m41 + dx * dampingX : dx * dampingX;
      const offY = startMatrix ? startMatrix.m42 + dy * dampingY : dy * dampingY;

      deckTopEl.style.transform = `translate(${offX}px, ${offY}px) rotateX(${tiltX}deg) rotate(${tiltZ}deg)`;
    }
  );
};

deckEl.addEventListener("pointerup", handleDeckTap);
cardsArea.addEventListener("pointerup", handleDeckTap);
deckEl.addEventListener("dblclick", (event) => {
  event.preventDefault();
});


enableDeckDrag();
