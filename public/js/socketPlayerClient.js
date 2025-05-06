console.log("connected")

const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://ladladder-production.up.railway.app/';
  
const socket = io(backendUrl, {
  withCredentials: true,
  transports: ['websocket', 'polling'] // Important for Railway
});

const role = 'player';
const roomCode = window.location.pathname.split('/')[2];
let playerId;
socket.on("get-playerId", (id)=>{
  playerId = id 
  console.log(playerId)
})

socket.on("answer-question", (question, allPlayers)=>{
  answeringPhase()
  renderAnswerQuestion(question)
  populatePlayers(allPlayers)
})

socket.on("room-access-failed", ()=>{
  console.log("Room full, or already started")
  window.location.href = '/';
})

socket.on("connect", () => {
  console.log("Connected to Socket.io server with ID:", socket.id);
});

socket.on("start-game", ()=>{
  questionPhase()
})

socket.on("ranked-results",(rankedResults, roomCode, positive)=>{
  console.log(rankedResults, roomCode, positive)
})

socket.on("end-results",(bonusPointsInfo, sortedPlayers)=>{
  endGamePhase()
})

const joinGameButton = document.getElementById("join-button");
joinGameButton.addEventListener("click", () => {
  const name = document.getElementById("playerName").value;

  if (name) {
    // Emit the identify event with the player's name
    socket.emit('identify', role, roomCode, name);
    const namePhase = document.getElementById("name-phase");
    namePhase.classList.add(`displayNone`);
    const playerDiv = document.createElement("div");
    playerDiv.textContent = "waiting for Others";
    playerDiv.classList.add("waiting")
    const main = document.getElementById("main")
    main.appendChild(playerDiv);
  } else {
    alert("Please enter your name before joining the game.");
  }
});

function questionPhase(){
  const namePhase = document.getElementById("name-phase");
  namePhase.classList.add("displayNone")
  const promptPhase = document.getElementById("prompt-phase");
  promptPhase.classList.remove("displayNone")
  const waitingDiv = document.querySelector(".waiting")
  waitingDiv.remove()
}

//Making Questions
let selectedAttributes = [];
const optionButtons = document.querySelectorAll(".options");

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

    console.log(selectedAttributes);
  });
});

positive = true;
const goodOrBad = document.getElementById("good-or-bad");
goodOrBad.addEventListener("click", ()=>{
  if (!goodOrBad.classList.contains("false")){
    goodOrBad.classList.add("false")
    positive = false;
    goodOrBad.textContent="Bad"
    console.log(positive)
  }
  else{
    goodOrBad.classList.remove("false")
    positive=true;
    goodOrBad.textContent="Good"
    console.log(positive)
  }
})

//Send Question
const sendQuestion = document.getElementById("send-question")
sendQuestion.addEventListener("click", ()=>{
  const input = document.getElementById("question-input");
  if (input.value && selectedAttributes.length == 2){
    socket.emit("player-question", selectedAttributes,positive, input.value, roomCode)
    console.log(selectedAttributes, positive, input.value, roomCode)
    const promptPhase = document.getElementById("prompt-phase");
    promptPhase.classList.add("displayNone")
  }
})


//Answering Phase

function answeringPhase(){
  const promptPhase = document.getElementById("prompt-phase");
  promptPhase.classList.add("displayNone")
  const answerPhase = document.getElementById("rank-phase");
  answerPhase.classList.remove("displayNone")
}

function renderAnswerQuestion(question){
  const rankQuestion = document.getElementById("rank-question")
  rankQuestion.innerText = question
}

function populatePlayers(playersEach) {
  const playersContainer = document.getElementById('players-container');
  playersContainer.innerHTML = "";
  const rankingSection = document.getElementById('ranking-section');
  rankingSection.innerHTML = "";

  playersEach.forEach((player, index) => {
    const playerDiv = document.createElement('div');
    playerDiv.classList.add('player-item');
    playerDiv.classList.add(`player-${player.playerNumber}`);
    playerDiv.setAttribute('data-id', player._id);
    playerDiv.textContent = player.name;

    // Add event listener for player selection
    playerDiv.addEventListener('click', () => handlePlayerSelect(playerDiv));

    playersContainer.appendChild(playerDiv);

    // Create placeholder slot for ranking
    const rankSlot = document.createElement('div');
    rankSlot.classList.add('rank-slot');
    rankSlot.setAttribute('data-index', index);
    
    // Add event listener for placing selected player into the slot
    rankSlot.addEventListener('click', () => placeSelectedPlayer(rankSlot));

    rankingSection.appendChild(rankSlot);
  });
}

let selectedPlayer = null;

// Handle player selection and deselection
function handlePlayerSelect(playerDiv) {
  if (selectedPlayer === playerDiv) {
    // Deselect if tapped again
    playerDiv.classList.remove('selected-player');
    selectedPlayer = null;
  } else {
    // Deselect previous selection
    if (selectedPlayer) {
      selectedPlayer.classList.remove('selected-player');
    }

    selectedPlayer = playerDiv;
    selectedPlayer.classList.add('selected-player');

    // Add double-click to unrank and return to unranked section
    selectedPlayer.ondblclick = () => {
      document.getElementById('players-container').appendChild(selectedPlayer);
      selectedPlayer.classList.remove('selected-player');
      selectedPlayer = null;
    };
  }
}

// Allow players to be moved between ranking slots or back to the player container
function placeSelectedPlayer(rankSlot) {
  if (!selectedPlayer) {
    console.log('No player selected');
    return;  // Ensure a player is selected before placing them
  }

  // If slot already has a player, swap them
  if (rankSlot.firstChild) {
    const existingPlayer = rankSlot.firstChild;

    // Move the existing player back to the unranked list
    document.getElementById('players-container').appendChild(existingPlayer);
  }

  // Remove selected player from their current location (if any)
  if (selectedPlayer.parentElement.classList.contains('rank-slot')) {
    selectedPlayer.parentElement.innerHTML = ''; // Clear old slot
  }

  // Place selected player in new slot
  rankSlot.innerHTML = ''; // Just to be safe
  rankSlot.appendChild(selectedPlayer);

  // Remove 'selected-player' class once it's placed
  selectedPlayer.classList.remove('selected-player');
  selectedPlayer = null;
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

// Handle click on players inside ranking slots to move them back to player container
function handleRankSlotClick(event) {
  const rankSlot = event.target.closest('.rank-slot');
  if (rankSlot && rankSlot.firstChild) {
    const playerDiv = rankSlot.firstChild;
    // Move the player back to the players container
    document.getElementById('players-container').appendChild(playerDiv);
    playerDiv.classList.remove('selected-player'); // Optionally remove selected style
    rankSlot.innerHTML = '';  // Clear the rank slot
  }
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

    rankSlots.forEach(slot => {
      const playerDiv = slot.querySelector('.player-item');
      if (playerDiv) {
        rankedPlayers.push(playerDiv.dataset.id); // Player ID in that rank
      } else {
        rankedPlayers.push(null); // Empty slot
      }
    });

    // Emit the ranked array to server, preserving order (including blanks)
    socket.emit("ranked-answer-submit", roomCode, playerId, rankedPlayers);

    const rankPhase = document.getElementById("rank-phase");
    rankPhase.classList.add("displayNone");
  });
} else {
  console.log("Submit ranking button not found");
}
})

function endGamePhase(){
  const endGame = document.getElementById("end-game-phase")
  endGame.classList.remove("displayNone")
}

