const playersContainer = document.getElementById("players-container")
const socket = io()

const role = 'host';
const roomCode = window.location.pathname.split('/')[2];

socket.emit('identify', role, roomCode);

addPlayer("Julian")

//joining
function addPlayer(playerName) {
  const playerDiv = document.createElement("div");
  playerDiv.classList.add("player");
  playerDiv.textContent = playerName;
  playersContainer.appendChild(playerDiv);
}