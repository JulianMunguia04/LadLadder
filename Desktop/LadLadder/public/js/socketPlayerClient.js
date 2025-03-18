const socket = io("http://localhost:5000");

const role = 'player';
const roomCode = window.location.pathname.split('/')[2];

socket.on("connect", () => {
  console.log("Connected to Socket.io server with ID:", socket.id);
});

const joinGameButton = document.getElementById("join-button");
joinGameButton.addEventListener("click", () => {
  const name = document.getElementById("playerName").value;

  if (name) {
    // Emit the identify event with the player's name
    socket.emit('identify', role, roomCode, name);
  } else {
    alert("Please enter your name before joining the game.");
  }
});