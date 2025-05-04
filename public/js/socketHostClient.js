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
  unRenderAll()
  
  const awardsPhase = document.getElementById("awards-phase");
  const finalResults = document.getElementById("final-results");
  const finalContainer = document.getElementById("final-container");

  // Reset states
  awardsPhase.innerHTML = '';
  awardsPhase.classList.remove("display-none", "displayNone"); // Handle both cases
  finalResults.classList.add("display-none", "displayNone");
  
  // Ensure we have a clean slate
  await new Promise(resolve => setTimeout(resolve, 50));

  for (const award of bonusPointsInfo.awards) {
    // Clear previous content
    awardsPhase.innerHTML = '';
    
    // Create fresh elements with animation-ready structure
    awardsPhase.innerHTML = `
      <h1 id="awards-header" style="opacity:0">
        Player With the Most: <span style="text-decoration:underline">${award.attribute}</span>
      </h1>
      <img id="award-trophy" src="./images/awards/${award.attribute.toLowerCase()}.svg" style="opacity:0">
      <div id="players-awards-container" class="awards-player" style="opacity:0">
        <div class="player-awards-flex">
          <h3 class="awards-points" style="opacity:0">+${award.pointsAwarded}</h3>
          <div id="awarded-player" class="player-awards player-${award.player.playNumber}" style="opacity:0">
            ${award.player.name}
          </div>
        </div>
      </div>
    `;

    // Force reflow and start animations
    void awardsPhase.offsetWidth;
    
    // Apply animations with !important
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

    // Wait for animations to complete
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Clean up
    document.head.removeChild(style);
    awardsPhase.innerHTML = '';
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Show final results
  awardsPhase.classList.add("display-none");
  finalResults.classList.remove("display-none");

  // Display rankings
  finalContainer.innerHTML = '';
  sortedPlayers.forEach((player, index) => {
    const playerDiv = document.createElement("div");
    playerDiv.className = `final-player player-${player.playNumber}`;
    playerDiv.innerHTML = `
      <h2>${index + 1}. ${player.name}</h2>
      <h3>${player.points} Points</h3>
    `;
    finalContainer.appendChild(playerDiv);
  });
}