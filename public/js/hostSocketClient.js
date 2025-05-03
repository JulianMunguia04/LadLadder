const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://ladladder-production.up.railway.app/';

const socket = io(backendUrl, {
  withCredentials: true,
  transports: ['websocket', 'polling'] // Important for Railway
});

const role = 'host';
const roomCode = window.location.pathname.split('/')[2];

socket.emit('identify', role, roomCode);

socket.on("player-join-leave", (players) => {
  renderStartingPlayers(players); // Add the player to the UI
  console.log("socket-connected")
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
})

socket.on("answer-question", (question, allPlayers)=>{
  rankPhase(question, allPlayers.length)
  console.log(question, allPlayers)
})

socket.on("ranked-answer-submitted", (answerCount, playersCount)=>{
  const answersCount = document.getElementById("answers-count")
  answersCount.innerHTML = `${answerCount}/${playersCount}`
})

socket.on("ranked-results",(rankedResults, roomCode, positive, question)=>{
  console.log(rankedResults, roomCode, positive)
  unRenderAll()
  renderSeats()
  resultsPhaseRender(rankedResults, positive, question)
})

nextQuestionButton = document.getElementById("next-question")
nextQuestionButton.addEventListener("click", ()=>{
  socket.emit("next-question", roomCode)
})

socket.on("end-results",(bonusPointsInfo, sortedPlayers)=>{
  endGamePhase(bonusPointsInfo, sortedPlayers)
})

//sound Effects
const crowdIndoorSound =new Howl({
  src: ['/sound-effects/crowd-indoor.mp3'],
  volume: 0.1,
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
      playerDiv.classList.add(`player`);
      playerDiv.classList.add(`player-${playerDetails[i].playerNumber}`);
      playerDiv.textContent = playerDetails[i].name;

      const playerPoints = document.createElement("h3")
      playerPoints.classList.add("points")
      playerPoints.textContent = `+${(1+i)*100}`

      playerDivFlex.appendChild(playerPoints)
      playerDivFlex.appendChild(playerDiv)

      playerResultsContainer.appendChild(playerDivFlex);
      await delay(1000);
    }
  }
  else{
    for (let i = 0; i < playerDetails.length; i++){
      const playerDivFlex = document.createElement("div");
      playerDivFlex.classList.add(`player-container-flex`);

      const playerDiv = document.createElement("div");
      playerDiv.classList.add(`player`);
      playerDiv.classList.add(`player-${playerDetails[i].playerNumber}`);
      playerDiv.textContent = playerDetails[i].name;

      const playerPoints = document.createElement("h3")
      playerPoints.classList.add("points")
      playerPoints.textContent = `+${(playerDetails.length -i)*100}`

      playerDivFlex.appendChild(playerPoints)
      playerDivFlex.appendChild(playerDiv)

      playerResultsContainer.appendChild(playerDivFlex);
      await delay(1000);
    }
  }
  await delay(500);
  nextQuestion.classList.remove("display-none")
}
//end-game
async function endGamePhase(bonusPointsInfo, sortedPlayers) {
  try {
    // Get DOM elements
    const resultsPhase = document.getElementById("results-phase");
    const awardsPhase = document.getElementById("awards-phase");
    const finalResults = document.getElementById("final-results");
    const finalContainer = document.getElementById("final-container");
    const awardsHeader = document.getElementById("awards-header");
    const awardedPlayer = document.getElementById("awarded-player");
    const playersAwardsContainer = document.getElementById("players-awards-container");
    const awardTrophy = document.getElementById("award-trophy");
    const pointsElement = document.querySelector(".awards-points");

    // Validate elements exist
    if (!resultsPhase || !awardsPhase || !finalResults || !finalContainer || 
        !awardsHeader || !awardedPlayer || !playersAwardsContainer || !awardTrophy || !pointsElement) {
      throw new Error("Required DOM elements not found");
    }

    // Clear previous results and prepare containers
    finalContainer.innerHTML = '';
    playersAwardsContainer.classList.remove("display-none");
    
    // Switch to awards phase
    resultsPhase.classList.add("display-none");
    awardsPhase.classList.remove("display-none");
    finalResults.classList.add("display-none");

    // Show awards one by one with animations
    for (const award of bonusPointsInfo.awards) {
      // Update award information
      awardsHeader.innerHTML = `Player With the Most: <span style="text-decoration:underline">${award.attribute}</span>`;
      pointsElement.textContent = `+${award.pointsAwarded}`;
      
      // Update player display
      awardedPlayer.className = 'player-awards';
      awardedPlayer.classList.add(`player-${award.player.playerNumber}`);
      awardedPlayer.textContent = award.player.name;
      
      // Reset animations
      awardedPlayer.classList.remove('award-animation');
      awardTrophy.classList.remove('award-animation');
      
      // Trigger reflow to restart animations
      void awardedPlayer.offsetWidth;
      void awardTrophy.offsetWidth;
      
      // Add animations
      awardedPlayer.classList.add('award-animation');
      awardTrophy.classList.add('award-animation');
      
      // Wait for animation to complete plus some extra time
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Switch to final results phase
    awardsPhase.classList.add("display-none");
    finalResults.classList.remove("display-none");

    // Show players in order with staggered animations
    for (const [index, player] of sortedPlayers.entries()) {
      const playerFinalDiv = document.createElement("div");
      playerFinalDiv.className = `player-final player-final-${player.playerNumber}`;
      playerFinalDiv.style.opacity = "0";
      playerFinalDiv.style.transform = "translateY(20px)";

      const playerFinalPointsDiv = document.createElement("div");
      playerFinalPointsDiv.className = "player-final-points";
      playerFinalPointsDiv.textContent = player.points;

      const playerFinalName = document.createElement("div");
      playerFinalName.className = "player-final-name";
      playerFinalName.textContent = player.name;

      playerFinalDiv.appendChild(playerFinalPointsDiv);
      playerFinalDiv.appendChild(playerFinalName);
      finalContainer.appendChild(playerFinalDiv);

      // Animate entry with staggered delay
      setTimeout(() => {
        playerFinalDiv.style.opacity = "1";
        playerFinalDiv.style.transform = "translateY(0)";
      }, index * 200);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error("Error in endGamePhase:", error);
    // Fallback to immediate results display if something fails
    document.getElementById("results-phase")?.classList.remove("display-none");
    document.getElementById("awards-phase")?.classList.add("display-none");
    document.getElementById("final-results")?.classList.add("display-none");
  }
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
      if (currentVol > 0.03) {
        const newVol = Math.max(0.03, currentVol - 0.01);
        crowdIndoorSound.volume(newVol);
        console.log("quieter", newVol.toFixed(2));
      }
    } else {
      if (currentVol < 0.1) {
        const newVol = Math.min(0.1, currentVol + 0.01);
        crowdIndoorSound.volume(newVol);
        console.log("louder", newVol.toFixed(2));
      }
    }
  }, 100);

  setTimeout(() => {
    quiet = false;
    const stopCheck = setInterval(() => {
      if (crowdIndoorSound.volume() >= 0.1) {
        clearInterval(intervalId);
        clearInterval(stopCheck);
        console.log("volume reset to normal");
      }
    }, 100);
  }, time);
}

function cheerAndQuiet(time) {
  // Play the cheer sound
  crowdCheerSound.play();

  // After 3 seconds, start lowering the volume
  setTimeout(() => {
    const intervalId = setInterval(() => {
      const currentVol = crowdCheerSound.volume();

      if (currentVol > 0.01) { // Stop lowering volume when it's close to 0
        const newVol = Math.max(0, currentVol - 0.01);
        crowdCheerSound.volume(newVol);
        console.log("quieter", newVol.toFixed(2));
      } else {
        // Stop the interval when the volume is at 0
        clearInterval(intervalId);
        console.log("sound fully quiet");
      }
    }, 100); // Decrease volume every 100ms
  }, time); // Wait for 3 seconds before starting to quiet down
}

//resultsPhaseRender(players, true, "Who's most likely to have a one night stand")