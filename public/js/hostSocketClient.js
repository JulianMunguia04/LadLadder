const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://ladladder-production.up.railway.app/';

const socket = io(backendUrl, {
  withCredentials: true,
  transports: ['websocket', 'polling'] // Important for Railway
});

const role = 'host';
const roomCode = window.location.pathname.split('/')[2];

function copyJoinLink() {
  const currentUrl = window.location.href;

  const joinUrl = currentUrl.replace('/host/', '/join/');

  navigator.clipboard.writeText(joinUrl)
}

socket.emit('identify', role, roomCode);

socket.on("player-join-leave", (players) => {
  renderStartingPlayers(players); // Add the player to the UI
  //console.log("socket-connected")
});

socket.on("start-game", (playersCount)=>{
  playIntro()
  setTimeout(() => {
    unRenderAll()
    promptingPhaseRender(playersCount)
  }, 2000);
  setTimeout(() => {
    cheerAndQuiet(3000)
  }, 2000);
  quietAudience(3000);
})

socket.on("player-question", (questionCount, playerCount)=>{
  const questionsCount = document.getElementById("prompting-count")
  questionsCount.textContent = `${questionCount}/${playerCount}`
  if (questionCount >= 1){
    beepSound.play()
  }
})

socket.on("answer-question", (question, allPlayers)=>{
  rankPhase(question, allPlayers.length)
  //console.log(question, allPlayers)
  wooshInSound.play()
  setTimeout(() => {
    wooshOutSound.play()
  }, 2500);
})

socket.on("ranked-answer-submitted", (answerCount, playersCount)=>{
  const answersCount = document.getElementById("answers-count")
  answersCount.innerHTML = `${answerCount}/${playersCount}`
  beepSound.play()
})

socket.on("ranked-results",(rankedResults, roomCode, positive, question)=>{
  //console.log(rankedResults, roomCode, positive)
  unRenderAll()
  renderSeats()
  resultsPhaseRender(rankedResults, positive, question)
})

nextQuestionButton = document.getElementById("next-question")
nextQuestionButton.addEventListener("click", ()=>{
  socket.emit("next-question", roomCode)
})

socket.on("end-results", (bonusPointsInfo, sortedPlayers) => {
  /*console.log("Received end-results:", { 
    bonusPointsInfo, 
    sortedPlayers,
    awards: bonusPointsInfo?.awards?.map(a => ({
      attribute: a.attribute,
      playerNumber: a.player?.playerNumber,
      name: a.player?.name
    }))
  });*/
  playIntro()
  
  setTimeout(()=>{
    gameOverSound.play()
  }, 2000)
  unRenderAll()
  renderSeats()
  rankSeats.classList.add("display-none")
  setTimeout(() => {
    unRenderAll();
    endGamePhase(bonusPointsInfo, sortedPlayers);
  }, 6000);
});

//sound Effects
const crowdIndoorSound =new Howl({
  src: ['/sound-effects/crowd-indoor.mp3'],
  volume: 0.03,
  loop: true
})

const connectSound = new Howl({
  src: ['/sound-effects/connect.mp3'],
  volume: 0.5,
})

const crowdCheerSound = new Howl({
  src: ['/sound-effects/crowd-cheering.mp3'],
  volume: 0.15,
})

const drumRollSound = new Howl({
  src: ['/sound-effects/drum-roll.mp4'],
  volume: 0.15
})

const playerPositiveRankSound = new Howl({
  src: ['/sound-effects/positive-ding.mp4'],
  volume: 0.12
})

const playerNegativeRankSound = new Howl({
  src: ['/sound-effects/negative-ding.mp4'],
  volume: 0.15
})

const crowdOohSound = new Howl({
  src: ['/sound-effects/crowd-ooh.mp4'],
  volume: 0.15
})

const titlesound = new Howl ({
  src: ['/sound-effects/button-sound-2.mp4'],
  volume: 0.15
})

const wooshInSound = new Howl ({
  src: ['/sound-effects/woosh-in.mp4'],
  volume: 0.15
})
const wooshOutSound = new Howl ({
  src: ['/sound-effects/woosh-out.mp4'],
  volume: 0.15
})

const beepSound = new Howl ({
  src: ['/sound-effects/beep-sound-1.mp4'],
  volume: 0.15
})

const gameOverSound = new Howl ({
  src: ['/sound-effects/game-over.wav'],
  volume: 0.15
})

crowdIndoorSound.play();

//join Phase
const joinPhase = document.querySelector(".join-phase")
const joinPhaseHeader = document.getElementById("join-phase-header")
const startButton = document.getElementById('start-game');
const playersJoinContainer = document.getElementById("players-join-container");

function renderStartingPlayers(players) {
  playersJoinContainer.innerHTML = "";
  for (let i = 0; i < players.length; i++) {
    const playerDiv = document.createElement("div");
    playerDiv.classList.add("player");
    playerDiv.classList.add(`player-${players[i].playerNumber}`);
    playerDiv.textContent = players[i].name;
    playersJoinContainer.appendChild(playerDiv);
  }
  if (players.length >= 3){
    startButton.classList.remove("display-none")
  }
  else{
    startButton.classList.add("display-none")
  }
  connectSound.play();
}

startButton.addEventListener("click", ()=>{
  socket.emit("start-game", roomCode)
})

const animationDuration = 6000
function playIntro(){
  const div = document.createElement('div');
  div.id = 'logo-transition';

  const img = document.createElement('img');
  img.src = '/images/ladladderlogo.png'; 

  div.appendChild(img);

  document.body.appendChild(div);
  setTimeout(() => {
    div.remove(); 
  }, animationDuration);
}

//prompting phase
const promptingPhase = document.querySelector(".prompting-phase")
function promptingPhaseRender(playerCount){
  promptingPhase.classList.remove("display-none")
  seats.classList.remove("display-none")
  
  const questionsCount = document.getElementById("prompting-count")
  questionsCount.textContent = `0/${playerCount}`
}

//rankingphase
const rankSeats = document.getElementById("rank-seats")
const rankingPhase = document.querySelector(".rank-phase")
function rankPhase(question, playersCount){
  unRenderAll()
  rankingPhase.classList.remove("display-none")
  rankSeats.classList.remove("display-none")
  const questionH1 = document.getElementById("rank-question")
  questionH1.innerText = question
  const answersCount = document.getElementById("answers-count")
  answersCount.innerHTML = `0/${playersCount}`
  const resultsPhase = document.getElementById("results-phase")
  resultsPhase.classList.add("displayNone")
}

//results phase
const resultsPhase = document.getElementById("results-phase")
async function resultsPhaseRender(playerDetails, positiveQuestion, question){
  resultsPhase.classList.remove("display-none")
  const questionHeader = document.getElementById("question-header")
  questionHeader.innerText = question.question
  const playerResultsContainer = document.getElementById("players-results-container")
  playerResultsContainer.innerHTML = ""
  const nextQuestion = document.getElementById("next-question")
  nextQuestion.classList.add("display-none")

  if (positiveQuestion){
    for (let i = 0; i < playerDetails.length; i++){
      const playerDivFlex = document.createElement("div");
      playerDivFlex.classList.add(`player-container-flex`);

      const playerDiv = document.createElement("div");
      if (i === playerDetails.length-1){
        //console.log(i, playerDetails.length)
        playerDiv.classList.add(`player-last`);
        cheerAndQuiet(4000)
        quietAudience(4000) 
      }
      else{
        playerDiv.classList.add(`player`);
      }
      playerDiv.classList.add(`player-${playerDetails[i].playerNumber}`);
      playerDiv.textContent = playerDetails[i].name;

      const playerPoints = document.createElement("h3")
      if (i=== playerDetails.length-1){
        playerPoints.classList.add("points-final")
      }else{
        playerPoints.classList.add("points")
      }
      playerPoints.textContent = `+${(1+i)*100}`

      playerDivFlex.appendChild(playerPoints)
      playerDivFlex.appendChild(playerDiv)

      playerResultsContainer.appendChild(playerDivFlex);
      playerPositiveRankSound.play()
    
      if (i == playerDetails.length-2){
        await delay(400)
        drumRollSound.play()
        await delay(1000);
      }else{
        await delay(500);
      }
    }
  }
  else{
    for (let i = 0; i < playerDetails.length; i++){
      const playerDivFlex = document.createElement("div");
      playerDivFlex.classList.add(`player-container-flex`);

      const playerDiv = document.createElement("div");
      if (i === playerDetails.length-1){
        playerDiv.classList.add(`player-last`);
        crowdOohSound.play()
        quietAudience(4000) 
      }
      else{
        playerDiv.classList.add(`player`);
      }
      playerDiv.classList.add(`player-${playerDetails[i].playerNumber}`);
      playerDiv.textContent = playerDetails[i].name;

      const playerPoints = document.createElement("h3")
      if (i=== playerDetails.length-1){
        playerPoints.classList.add("points-final")
      }else{
        playerPoints.classList.add("points")
      }
      playerPoints.textContent = `+${(playerDetails.length -i)*100}`

      playerDivFlex.appendChild(playerPoints)
      playerDivFlex.appendChild(playerDiv)

      playerResultsContainer.appendChild(playerDivFlex);
      playerNegativeRankSound.play()
      if (i == playerDetails.length-2){
        await delay(400)
        drumRollSound.play()
        await delay(1000);
      }else{
        await delay(500);
      }
    }
  }
  await delay(500);
  nextQuestion.classList.remove("display-none")

  await delay(6500); // wait 6.5 seconds
  nextQuestion.click();
}
//end-game
async function endGamePhase(bonusPointsInfo, sortedPlayers) {
  renderSeats()
    // Add validation
    if (!bonusPointsInfo?.awards?.length) {
      console.error("Invalid awards data", bonusPointsInfo);
      return;
    }
  
    // Debug logging
    /*console.log("Starting awards phase with:", {
      awards: bonusPointsInfo,
      players: sortedPlayers
    });*/
  const awardsPhase = document.getElementById("awards-phase");
  const finalResults = document.getElementById("final-results");
  const finalContainer = document.getElementById("final-container");

  // Reset states
  awardsPhase.innerHTML = '';
  awardsPhase.classList.remove("display-none");
  finalResults.classList.add("display-none");
  
  for (const award of bonusPointsInfo.awards) {
    // Clear previous content
    awardsPhase.innerHTML = '';
    
    // Create fresh elements with proper data structure
    awardsPhase.innerHTML = `
      <h1 id="awards-header" style="opacity:0">
        Player With the Most: <span style="text-decoration:underline">${award.attribute}</span>
      </h1>
      <img id="award-trophy" src="/images/awards/${award.attribute.toLowerCase()}.png" style="opacity:0">
      <div id="players-awards-container">
        <div class="player-awards-flex">
          <h3 class="awards-points" style="opacity:0">+${award.pointsAwarded}</h3>
          <div id="awarded-player" class="player-awards player-${award.player.playerNumber}" style="opacity:0">
            ${award.player.name}
          </div>
        </div>
      </div>
    `;

    // Force reflow and start animations
    void awardsPhase.offsetWidth;
    
    // Apply animations with !important
    setTimeout(()=>{
      wooshInSound.play()
    }, 1200)
    
    const style = document.createElement('style');
    style.textContent = `
      #awards-header {
        animation: points 1s forwards !important;
      }
      #award-trophy {
        animation: trophy 2s 1s forwards !important;
      }
      #awarded-player {
        animation: awarded 1s 3.5s forwards !important;
      }
      .awards-points {
        animation: points 1s 4s forwards !important;
      }
    `;
    document.head.appendChild(style);
    setTimeout(()=>{
      cheerAndQuiet(4000)
    }, 3200)
    // Wait for animations to complete
    await new Promise(resolve => setTimeout(resolve, 7000));
    
    // Clean up
    document.head.removeChild(style);
    awardsPhase.innerHTML = '';
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Show final results
  awardsPhase.classList.add("display-none");
  finalResults.classList.remove("display-none");
  wooshInSound.play()
  setTimeout(() => {
    wooshOutSound.play()
  }, 2500);

  // Display rankings - using proper playerNumber field
  finalContainer.innerHTML = '';
  const newGame = document.getElementById("new-game")
  await delay(2500)
  for (let i = 0; i < sortedPlayers.length; i++){
    //console.log(i)
    const playerDivFlex = document.createElement("div");
    playerDivFlex.classList.add(`player-container-flex`);

    const playerDiv = document.createElement("div");
      if (i === sortedPlayers.length-1){
        //console.log(i, sortedPlayers.length)
        playerDiv.classList.add(`player-last`);
        cheerAndQuiet(14000)
        quietAudience(7000) 
      }
      else{
        playerDiv.classList.add(`player`);
      }
    playerDiv.classList.add(`player-${sortedPlayers[i].playerNumber}`);
    playerDiv.textContent = sortedPlayers[i].name;

    const playerPoints = document.createElement("h3")
    if (i=== sortedPlayers.length-1){
      playerPoints.classList.add("points-final")
    }else{
      playerPoints.classList.add("points")
    }
    playerPoints.textContent = `+${sortedPlayers[i].points}`

    playerDivFlex.appendChild(playerPoints)
    playerDivFlex.appendChild(playerDiv)

    finalContainer.appendChild(playerDivFlex);
    if (i == sortedPlayers.length-2){
      await delay(400)
      drumRollSound.play()
      await delay(1000);
    }else{
      await delay(500);
    }
  }
  
  await delay(500);
  newGame.classList.remove("display-none")
}

//universal
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const seats = document.getElementById('seats')
function renderSeats(){
  seats.classList.remove("display-none")
}
function unRenderAll(){
  joinPhase.classList.add("display-none")
  joinPhaseHeader.classList.add("display-none")
  promptingPhase.classList.add("display-none")
  resultsPhase.classList.add("display-none")
  seats.classList.add("display-none")
  rankingPhase.classList.add("display-none")
  rankSeats.classList.add("display-none")
}

//sound functions
function quietAudience(time) {
  let quiet = true;

  const intervalId = setInterval(() => {
    const currentVol = crowdIndoorSound.volume();

    if (quiet) {
      if (currentVol > 0.01) {
        const newVol = Math.max(0.03, currentVol - 0.01);
        crowdIndoorSound.volume(newVol);
        //console.log("quieter", newVol.toFixed(2));
      }
    } else {
      if (currentVol < 0.03) {
        const newVol = Math.min(0.1, currentVol + 0.01);
        crowdIndoorSound.volume(newVol);
        //console.log("louder", newVol.toFixed(2));
      }
    }
  }, 100);

  setTimeout(() => {
    quiet = false;
    const stopCheck = setInterval(() => {
      if (crowdIndoorSound.volume() >= 0.1) {
        clearInterval(intervalId);
        clearInterval(stopCheck);
        //console.log("volume reset to normal");
      }
    }, 100);
  }, time);
}

function cheerAndQuiet(time) {
  // Play the cheer sound
  crowdCheerSound.volume(0.15)
  crowdCheerSound.seek(0).play();

  // After 3 seconds, start lowering the volume
  setTimeout(() => {
    const intervalId = setInterval(() => {
      const currentVol = crowdCheerSound.volume();

      if (currentVol > 0.01) { // Stop lowering volume when it's close to 0
        const newVol = Math.max(0, currentVol - 0.01);
        crowdCheerSound.volume(newVol);
        //console.log("quieter", newVol.toFixed(2));
      } else {
        // Stop the interval when the volume is at 0
        clearInterval(intervalId);
        crowdCheerSound.stop();
      }
    }, 300); // Decrease volume every 100ms
  }, time); // Wait for 3 seconds before starting to quiet down
}

//resultsPhaseRender(players, true, "Who's most likely to have a one night stand")