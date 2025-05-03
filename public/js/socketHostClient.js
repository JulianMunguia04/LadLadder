const playersContainer = document.getElementById("players-container")
const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://ladladder-production.up.railway.app/';
  
const socket = io(backendUrl, {
  withCredentials: true,
  transports: ['websocket', 'polling'] // Important for Railway
});

const role = 'host';
const roomCode = window.location.pathname.split('/')[2];

const joinButton = document.getElementById('start-game');

const nextQuestionButton = document.getElementById("next-question")

socket.on("ranked-answer-submitted", (answerCount, playersCount)=>{
  const answersCount = document.getElementById("answers-count")
  answersCount.innerHTML = `${answerCount}/${playersCount}`
})

socket.on("answer-question", (question, allPlayers)=>{
  rankPhase(question, allPlayers.length)
  console.log(question, allPlayers)
})

socket.on("player-question", (questionCount, playerCount)=>{
  const questionsCount = document.getElementById("questions-count")
  questionsCount.textContent = `${questionCount}/${playerCount}`
  console.log("playeruqestion")
})

socket.on("player-join-leave", (players) => {
  renderStartingPlayers(players); // Add the player to the UI
});

socket.on("min-players", ()=>{
  addJoinButton()
  console.log("enough players")
})

socket.on("start-game", (playersCount)=>{
  questionPhase(playersCount)
})

socket.on("ranked-results",(rankedResults, roomCode, positive, question)=>{
  console.log(rankedResults, roomCode, positive)
  resultsPhase(rankedResults, positive, question)
})

socket.on("end-results",(bonusPointsInfo, sortedPlayers)=>{
  console.log(bonusPointsInfo, sortedPlayers)
  endGamePhase(bonusPointsInfo, sortedPlayers)
})

socket.emit('identify', role, roomCode);

//Button Functions
joinButton.addEventListener("click", ()=>{
  startGame();
})

nextQuestionButton.addEventListener("click", ()=>{
  socket.emit("next-question", roomCode)
})

//joining
function renderStartingPlayers(players) {
  playersContainer.innerHTML = "";
  for (let i = 0; i < players.length; i++){
    const playerDiv = document.createElement("div");
    playerDiv.classList.add(`player`);
    playerDiv.classList.add(`player-${players[i].playerNumber}`);
    playerDiv.textContent = players[i].name;
    playersContainer.appendChild(playerDiv);
  } 
}

function addJoinButton(){
  const joinButton = document.getElementById('start-game');
  joinButton.classList.remove(`displayNone`)
}

function startGame(){
  socket.emit("start-game", roomCode)
}

function questionPhase(playerCount){
  const joinPhase = document.getElementById("join-phase")
  joinPhase.classList.add(`displayNone`)
  const promptingPhase = document.getElementById("prompting-phase")
  promptingPhase.classList.remove("displayNone")

  const questionsCount = document.getElementById("questions-count")
  questionsCount.textContent = `0/${playerCount}`
}

function rankPhase(question, playersCount){
  const promptingPhase = document.getElementById("prompting-phase")
  promptingPhase.classList.add("displayNone")
  const rankPhase = document.getElementById("rank-phase")
  rankPhase.classList.remove("displayNone")
  const questionH1 = document.getElementById("rank-question")
  questionH1.innerText = question
  const answersCount = document.getElementById("answers-count")
  answersCount.innerHTML = `0/${playersCount}`
  const resultsPhase = document.getElementById("results-phase")
  resultsPhase.classList.add("displayNone")
}

function resultsPhase(playerDetails, positiveQuestion, question){
  const promptingPhase = document.getElementById("results-phase")
  promptingPhase.classList.remove("displayNone")
  const rankPhase = document.getElementById("rank-phase")
  rankPhase.classList.add("displayNone")

  const playerResultsContainer = document.getElementById("players-results-container")
  playerResultsContainer.classList.add("flex-row")
  playerResultsContainer.innerHTML = "";
  const questionHeader = document.getElementById("question-header");
  questionHeader.textContent = question.question

  if (positiveQuestion){
    for (let i = 0; i < playerDetails.length; i++){
      const playerDivFlex = document.createElement("div");
      playerDivFlex.classList.add(`player-container-flex`);

      const playerDiv = document.createElement("div");
      playerDiv.classList.add(`player`);
      playerDiv.classList.add(`player-${playerDetails[i].playerNumber}`);
      playerDiv.textContent = playerDetails[i].name;

      const playerPoints = document.createElement("h3")
      playerPoints.textContent = `+${(1+i)*100}`

      playerDivFlex.appendChild(playerPoints)
      playerDivFlex.appendChild(playerDiv)

      playerResultsContainer.appendChild(playerDivFlex);
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
      playerPoints.textContent = `+${(playerDetails.length -i)*100}`

      playerDivFlex.appendChild(playerPoints)
      playerDivFlex.appendChild(playerDiv)

      playerResultsContainer.appendChild(playerDivFlex);
    }
  }
}

async function endGamePhase(bonusPointsInfo, sortedPlayers) {
  try {
    // Get DOM elements
    const resultsPhase = document.getElementById("results-phase");
    const awardsPhase = document.getElementById("awards-phase");
    const finalResults = document.getElementById("final-results");
    const finalContainer = document.getElementById("final-container");
    const awardsHeader = document.getElementById("awards-header");
    const awardsPoints = document.getElementById("awards-points");
    const awardedPlayer = document.getElementById("awarded-player");

    // Validate elements exist
    if (!resultsPhase || !awardsPhase || !finalResults || !finalContainer || 
        !awardsHeader || !awardsPoints || !awardedPlayer) {
      throw new Error("Required DOM elements not found");
    }

    // Clear previous results
    finalContainer.innerHTML = '';
    
    // Switch to awards phase
    resultsPhase.classList.add("displayNone");
    awardsPhase.classList.remove("displayNone");
    finalResults.classList.add("displayNone");

    // Show awards one by one
    for (const award of bonusPointsInfo.awards) {
      awardsHeader.innerText = `Most ${award.attribute}:`;
      awardsPoints.innerText = `+${award.pointsAwarded}`;
      
      // Update player display with animation
      awardedPlayer.className = 'awarded-player';
      awardedPlayer.classList.add(`player-${award.player.playerNumber}`);
      awardedPlayer.innerText = award.player.name;
      awardedPlayer.classList.add('award-animation');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      awardedPlayer.classList.remove('award-animation');
    }

    // Switch to final results
    awardsPhase.classList.add("displayNone");
    finalResults.classList.remove("displayNone");

    // Show players in order with animation
    for (let j = 0; j < sortedPlayers.length; j++) {
      const player = sortedPlayers[j];
      
      const playerFinalDiv = document.createElement("div");
      playerFinalDiv.classList.add("player-final", `player-${player.playerNumber}`);
      playerFinalDiv.style.opacity = "0";
      playerFinalDiv.style.transform = "translateY(20px)";

      const playerFinalPointsDiv = document.createElement("div");
      playerFinalPointsDiv.classList.add("player-final-points");
      playerFinalPointsDiv.innerText = player.points;

      const playerFinalName = document.createElement("div");
      playerFinalName.classList.add("player-final-name");
      playerFinalName.innerText = player.name;

      playerFinalDiv.appendChild(playerFinalPointsDiv);
      playerFinalDiv.appendChild(playerFinalName);
      finalContainer.appendChild(playerFinalDiv);

      // Animate entry
      setTimeout(() => {
        playerFinalDiv.style.opacity = "1";
        playerFinalDiv.style.transform = "translateY(0)";
        playerFinalDiv.style.transition = "all 0.5s ease-out";
      }, 10);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error("Error in endGamePhase:", error);
    // Fallback to immediate results display if something fails
    document.getElementById("results-phase")?.classList.remove("displayNone");
    document.getElementById("awards-phase")?.classList.add("displayNone");
    document.getElementById("final-results")?.classList.add("displayNone");
  }
}