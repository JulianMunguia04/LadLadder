//console.log("connected")

const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://ladladder-production.up.railway.app/';
  
const socket = io(backendUrl, {
  withCredentials: true,
  transports: ['websocket', 'polling'] // Important for Railway
});

let gameStarted = false
//console.log(document.cookie)

const role = 'player';
const roomCode = window.location.pathname.split('/')[2];
let playerId;
let playerName;
socket.on("get-playerId", (id)=>{
  if(id && typeof id === 'string') {
    playerId = id;
    try {
      localStorage.setItem('userId', id);
      //console.log("Stored playerId: ", id);
    } catch(e) {
      //console.error("Failed to store playerId:", e);
    }
  }
});

socket.on("reconnected", (savedPlayer, roomCode, currentGameState, currentQuestion, allPlayers) =>{
  //console.log("reconnected", savedPlayer, roomCode, currentGameState, currentQuestion, allPlayers)
  playerId = savedPlayer._id;
  playerName = savedPlayer.name;
  if (currentGameState == "join"){
    //console.log("join-phase")
  }
  else if (currentGameState == "ranking"){
    //console.log(localStorage.getItem('phase-answered'))
    if (localStorage.getItem('phase-answered') == "true"){
      const namePhase = document.getElementById("name-phase");
      namePhase.classList.add("displayNone")
      const waitingDiv = document.querySelector(".waiting")
      waitingDiv.classList.remove("displayNone")
    }else if (localStorage.getItem('phase-answered') == "false"){
      answeringPhase()
      renderAnswerQuestion(currentQuestion.question)
      populatePlayers(allPlayers)
    }
  }
  else if(currentGameState == "prompt"){
    //console.log(localStorage.getItem('phase-answered'))
    if (localStorage.getItem('phase-answered') == "true"){
      const namePhase = document.getElementById("name-phase");
      namePhase.classList.add("displayNone")
      const waitingDiv = document.querySelector(".waiting")
      waitingDiv.classList.remove("displayNone")
    }else if (localStorage.getItem('phase-answered') == "false"){
      questionPhase()
      gameStarted = true
    }
    
  }else if (currentGameState == "end"){
    endGamePhase()
    localStorage.removeItem('userId');
    localStorage.removeItem("phase-answered")
  }else{
    //console.log("waiting")
  }
})

socket.on("answer-question", (question, allPlayers)=>{
  answeringPhase()
  renderAnswerQuestion(question)
  populatePlayers(allPlayers)
})

socket.on("room-access-failed", ()=>{
  //console.log("Room full, or already started")
  window.location.href = '/';
})

socket.on("connect", () => {
  //console.log("Connected to Socket.io server with ID:", socket.id);
});

window.onload = function() {
  userId = localStorage.getItem('userId');
  //console.log("userId: ", userId) 
  if (userId){
    socket.emit('reconnect-player', userId, roomCode)
  }
}

socket.on("start-game", ()=>{
  questionPhase()
  gameStarted = true
})

socket.on("ranked-results",(rankedResults, roomCode, positive)=>{
  //console.log(rankedResults, roomCode, positive)
})

socket.on("end-results",(bonusPointsInfo, sortedPlayers)=>{
  endGamePhase()
  localStorage.removeItem('userId');
})

socket.on('disconnect', (reason)=>{
  if (!gameStarted){
    localStorage.removeItem('userId');
  }
})

const joinGameButton = document.getElementById("join-button");
joinGameButton.addEventListener("click", () => {
  const name = document.getElementById("playerName").value;

  if (name) {
    // Emit the identify event with the player's name
    socket.emit('identify', role, roomCode, name);
    const namePhase = document.getElementById("name-phase");
    namePhase.classList.add(`displayNone`);
    const waitingDiv = document.querySelector(".waiting")
    waitingDiv.classList.remove("displayNone")
  } else {
    alert("Please enter your name before joining the game.");
  }
});

function questionPhase(){
  localStorage.removeItem("phase-answered")
  localStorage.setItem('phase-answered', "false");
  const namePhase = document.getElementById("name-phase");
  namePhase.classList.add("displayNone")
  const promptPhase = document.getElementById("prompt-phase");
  promptPhase.classList.remove("displayNone")
  const waitingDiv = document.querySelector(".waiting")
  waitingDiv.classList.add("displayNone")
}

//Making Questions
let selectedAttributes = [];
const optionButtons = document.querySelectorAll(".options");
const sendQuestion = document.getElementById("send-question")

optionButtons.forEach(button => {
  button.addEventListener("click", () => {
    if (button.classList.contains("attribute-selected")) {
      button.classList.remove("attribute-selected");
      selectedAttributes = selectedAttributes.filter(attribute => attribute !== button.className.split(' ')[1]);
    } else {
      if (selectedAttributes.length < 2) {
        button.classList.add("attribute-selected");
        selectedAttributes.push(button.className.split(' ')[1]);
      }
    }

    //console.log(selectedAttributes);
  });
});

positive = true;
const goodOrBad = document.getElementById("good-or-bad");
goodOrBad.addEventListener("click", ()=>{
  if (!goodOrBad.classList.contains("false")){
    goodOrBad.classList.add("false")
    positive = false;
    goodOrBad.textContent="Bad"
    //console.log(positive)
    sendQuestion.classList.add("false")
  }
  else{
    goodOrBad.classList.remove("false")
    positive=true;
    goodOrBad.textContent="Good"
    //console.log(positive)
    sendQuestion.classList.remove("false")
  }
})

//Send Question
sendQuestion.addEventListener("click", ()=>{
  const input = document.getElementById("question-input");
  if (input.value && selectedAttributes.length == 2){
    socket.emit("player-question", selectedAttributes,positive, input.value, roomCode)
    //console.log(selectedAttributes, positive, input.value, roomCode)
    const promptPhase = document.getElementById("prompt-phase");
    promptPhase.classList.add("displayNone")
    const waitingDiv = document.querySelector(".waiting")
    waitingDiv.classList.remove("displayNone")
    localStorage.removeItem("phase-answered")
    localStorage.setItem('phase-answered', "true");
  }
})


//Answering Phase

function answeringPhase(){
  localStorage.removeItem("phase-answered")
  localStorage.setItem('phase-answered', "false");
  const namePhase = document.getElementById("name-phase");
  namePhase.classList.add(`displayNone`);
  const promptPhase = document.getElementById("prompt-phase");
  promptPhase.classList.add("displayNone")
  const answerPhase = document.getElementById("rank-phase");
  answerPhase.classList.remove("displayNone")
  const waitingDiv = document.querySelector(".waiting")
  waitingDiv.classList.add("displayNone")
}

function renderAnswerQuestion(question){
  const rankQuestion = document.getElementById("rank-question")
  rankQuestion.innerText = question
}

let selectedPlayer = null;

// Handle player selection and deselection
function handlePlayerSelect(playerDiv) {
  if (selectedPlayer === playerDiv) {
    // Deselect if clicked again
    playerDiv.classList.remove('selected-player');
    selectedPlayer = null;
  } else {
    // Deselect previous selection
    if (selectedPlayer) {
      selectedPlayer.classList.remove('selected-player');
    }
    
    // Select new player
    selectedPlayer = playerDiv;
    playerDiv.classList.add('selected-player');
  }
}

// Handle placing a selected player in a ranking slot
function placeSelectedPlayer(rankSlot) {
  if (!selectedPlayer) return;

  // If slot already has a player, return it to players container
  if (rankSlot.firstChild) {
    document.getElementById('players-container').appendChild(rankSlot.firstChild);
  }

  // Place selected player in slot
  rankSlot.appendChild(selectedPlayer);
  selectedPlayer.classList.remove('selected-player');
  selectedPlayer = null;
}

// Handle clicking a ranked player to return it to players container
function handleRankedPlayerClick(event) {
  const playerDiv = event.target.closest('.player-item');
  if (!playerDiv) return;
  
  // Return player to container
  document.getElementById('players-container').appendChild(playerDiv);
  
  // If this was the selected player, deselect it
  if (selectedPlayer === playerDiv) {
    selectedPlayer.classList.remove('selected-player');
    selectedPlayer = null;
  }
  
  // Stop event propagation to prevent the slot click handler from firing
  event.stopPropagation();
}

function populatePlayers(playersEach) {
  const playersContainer = document.getElementById('players-container');
  playersContainer.innerHTML = "";
  const rankingSection = document.getElementById('ranking-section');
  rankingSection.innerHTML = "";

  playersEach.forEach((player, index) => {
    // Create player div
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('player-item');
    playerDiv.classList.add(`player-${player.playerNumber}`);
    playerDiv.setAttribute('data-id', player._id);
    playerDiv.textContent = player.name;
    
    // Add click handler for selection
    playerDiv.addEventListener('click', handlePlayerSelect.bind(null, playerDiv));
    playersContainer.appendChild(playerDiv);

    // Create rank slot
    const rankSlot = document.createElement('div');
    rankSlot.classList.add('rank-slot');
    rankSlot.setAttribute('data-index', index);
    
    // Add click handler for placing selected player or returning ranked player
    rankSlot.addEventListener('click', (event) => {
      // If clicking directly on a player in the slot, let that handler deal with it
      if (event.target.classList.contains('player-item')) return;
      
      if (selectedPlayer) {
        placeSelectedPlayer(rankSlot);
      } else if (rankSlot.firstChild) {
        // If no player is selected but slot has a player, return it
        handleRankedPlayerClick({target: rankSlot.firstChild});
      }
    });
    
    rankSlot.addEventListener('click', (event) => {
      const playerDiv = event.target.closest('.player-item');

      // If clicking a player inside slot → remove it
      if (playerDiv) {
        document.getElementById('players-container').appendChild(playerDiv);

        if (selectedPlayer === playerDiv) {
          selectedPlayer.classList.remove('selected-player');
          selectedPlayer = null;
        }
        return;
      }

      // Otherwise → place selected player
      if (selectedPlayer) {
        placeSelectedPlayer(rankSlot);
      }
    });
    
    rankingSection.appendChild(rankSlot);
  });
}

// Dynamically add event listeners to rank slots
document.addEventListener("DOMContentLoaded", () => {
  // Add listener for dynamically added rank slots
  document.querySelectorAll('.rank-slot').forEach(rankSlot => {
    rankSlot.addEventListener('click', handleRankSlotClick);
  });
});

// Adding event listener for rank slots to allow clicking to move players back to container
document.querySelectorAll('.rank-slot').forEach(rankSlot => {
  rankSlot.addEventListener('click', handleRankSlotClick);
});

function handleDragStart(event) {
  event.dataTransfer.setData("text/plain", event.target.dataset.id);
  event.target.classList.add('dragging');
}

function handleDragEnd(event) {
  event.target.classList.remove('dragging');
}

// Allow drop in ranking section
function allowDrop(event) {
  event.preventDefault();
}

// Handle drop event
function drop(event) {
  event.preventDefault();
  const playerId = event.dataTransfer.getData("text/plain");
  const draggedPlayer = document.querySelector(`[data-id="${playerId}"]`);
  const rankingSection = document.getElementById('ranking-section');
  rankingSection.appendChild(draggedPlayer);
}

document.addEventListener("DOMContentLoaded", () => {
  const submitRankingButton = document.getElementById('submit-ranking');
  if (submitRankingButton) {
    submitRankingButton.addEventListener('click', function () {
      const rankingSection = document.getElementById('ranking-section');
      const rankSlots = rankingSection.querySelectorAll('.rank-slot');
      const rankedPlayers = [];
      let allRanked = true;

      rankSlots.forEach(slot => {
        const playerDiv = slot.querySelector('.player-item');
        if (playerDiv) {
          rankedPlayers.push(playerDiv.dataset.id);
        } else {
          allRanked = false;
          rankedPlayers.push(null);
        }
      });

      if (!allRanked) {
        alert("Please rank all players before submitting!");
        return;
      }

      const waitingDiv = document.querySelector(".waiting");
      waitingDiv.classList.remove("displayNone");

      // Emit the ranked array to server
      socket.emit("ranked-answer-submit", roomCode, playerId, rankedPlayers);

      const rankPhase = document.getElementById("rank-phase");
      rankPhase.classList.add("displayNone");
      localStorage.removeItem("phase-answered");
      localStorage.setItem('phase-answered', "true");
    });
  } else {
    //console.log("Submit ranking button not found");
  }
});

function endGamePhase(){
  const namePhase = document.getElementById("name-phase");
  namePhase.classList.add(`displayNone`);
  const endGame = document.getElementById("end-game-phase")
  endGame.classList.remove("displayNone")
  const waitingDiv = document.querySelector(".waiting")
  waitingDiv.innerText = "Results On Screen"
  waitingDiv.classList.remove("displayNone")
}
