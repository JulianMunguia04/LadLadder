const playersContainer = document.getElementById("players-container")
const socket = io()

const role = 'host';
const roomCode = window.location.pathname.split('/')[2];

socket.on("player-join", (data) => {
  console.log(`Player joined: ${data.name} (Player ${data.playerNumber})`);
  addPlayer(data.name, data.playerNumber); // Add the player to the UI
});

socket.emit('identify', role, roomCode);

//joining
function addPlayer(playerName,playerNumber) {
  const playerDiv = document.createElement("div");
  playerDiv.classList.add(`player`);
  playerDiv.classList.add(`player-${playerNumber}`);
  playerDiv.textContent = playerName;
  playersContainer.appendChild(playerDiv);
}