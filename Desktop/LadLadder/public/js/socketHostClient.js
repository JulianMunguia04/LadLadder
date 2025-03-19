const playersContainer = document.getElementById("players-container")
const socket = io()

const role = 'host';
const roomCode = window.location.pathname.split('/')[2];

const joinButton = document.getElementById('start-game');

socket.on("player-join", (data) => {
  console.log(`Player joined: ${data.name} (Player ${data.playerNumber})`);
  addPlayer(data.name, data.playerNumber); // Add the player to the UI
});

socket.on("min-players", ()=>{
  addJoinButton()
  console.log("enough players")
})

socket.on("start-game", (playersCount)=>{
  questionPhase(playersCount)
})

socket.emit('identify', role, roomCode);

//Button Functions
joinButton.addEventListener("click", ()=>{
  startGame();
})

//joining
function addPlayer(playerName,playerNumber) {
  const playerDiv = document.createElement("div");
  playerDiv.classList.add(`player`);
  playerDiv.classList.add(`player-${playerNumber}`);
  playerDiv.textContent = playerName;
  playersContainer.appendChild(playerDiv);
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