let createGameFrame = 1;
  const totalCreateGameFrames = 35;
  const createGameImage = document.getElementById("create-game-image");
  let createGameInterval;
  let createGameIsHovered = false;

  function updateCreateGameFrame(forward) {
    if (forward) {
      if (createGameFrame < totalCreateGameFrames) createGameFrame++;
    } else {
      if (createGameFrame > 1) createGameFrame--;
    }
    createGameImage.src = `./images/create-game/${createGameFrame}.png`;
  }

  function startCreateGameAnimation() {
    createGameIsHovered = true;
    clearInterval(createGameInterval);
    createGameInterval = setInterval(() => updateCreateGameFrame(true), 15);
  }

  function reverseCreateGameAnimation() {
    createGameIsHovered = false;
    clearInterval(createGameInterval);
    createGameInterval = setInterval(() => {
      if (!createGameIsHovered) updateCreateGameFrame(false);
      else clearInterval(createGameInterval); // Stop reversing if hovered again
    }, 15);
  }

  createGameImage.addEventListener("mouseenter", startCreateGameAnimation);
  createGameImage.addEventListener("mouseleave", reverseCreateGameAnimation);

  let joinGameFrame = 1;
  const totalJoinGameFrames = 35; // Adjust total frames as needed
  const joinGameImage = document.getElementById("join-game-image");
  let joinGameInterval;
  let joinGameIsHovered = false;

  function updateJoinGameFrame(forward) {
    if (forward) {
      if (joinGameFrame < totalJoinGameFrames) joinGameFrame++;
    } else {
      if (joinGameFrame > 1) joinGameFrame--;
    }
    joinGameImage.src = `./images/join-game/${joinGameFrame}.png`;
  }

  function startJoinGameAnimation() {
    joinGameIsHovered = true;
    clearInterval(joinGameInterval);
    joinGameInterval = setInterval(() => updateJoinGameFrame(true), 15);
  }

  function reverseJoinGameAnimation() {
    joinGameIsHovered = false;
    clearInterval(joinGameInterval);
    joinGameInterval = setInterval(() => {
      if (!joinGameIsHovered) updateJoinGameFrame(false);
      else clearInterval(joinGameInterval); // Stop reversing if hovered again
    }, 15);
  }

  joinGameImage.addEventListener("mouseenter", startJoinGameAnimation);
  joinGameImage.addEventListener("mouseleave", reverseJoinGameAnimation);

  const canvas = document.getElementById("fullscreen-canvas");
  const ctx = canvas.getContext("2d");

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let spotlightX = mouseX;
  let spotlightY = mouseY;
  const radius = 150;
  const lerpFactor = 0.1; // Adjust for smoother/slower movement

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw semi-transparent black background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply lerping for smooth delayed motion
    spotlightX += (mouseX - spotlightX) * lerpFactor;
    spotlightY += (mouseY - spotlightY) * lerpFactor;

    // Create a radial gradient for the yellow spotlight
    const gradient = ctx.createRadialGradient(spotlightX, spotlightY, 20, spotlightX, spotlightY, radius);
    gradient.addColorStop(0, "rgba(248, 248, 172, 0.5)"); // Bright yellow in center
    gradient.addColorStop(0.7, "rgba(248, 248, 172, 0.2)"); // Softer yellow fade
    gradient.addColorStop(1, "rgba(248, 248, 172, 0)");   // Fully transparent at edges

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(draw); // Keep updating animation
  }

  window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();