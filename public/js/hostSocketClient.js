const backendUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://ladladder-production.up.railway.app/';

//const socket = io(backendUrl, {
//  withCredentials: true,
//  transports: ['websocket', 'polling'] // Important for Railway
//});

const role = 'host';
const roomCode = window.location.pathname.split('/')[2];

//sound Effects
const crowdIndoorSound =new Howl({
  src: ['./sound-effects/crowd-indoor.mp3'],
  volume: 0.1,
  loop: true
})

const connectSound = new Howl({
  src: ['./sound-effects/connect.mp3'],
  volume: 0.5,
})

crowdIndoorSound.play();

//join Phase
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

let players = [
  {
    playerNumber: 1,
    name: "Julian"
  },
  {
    playerNumber: 2,
    name: "roman"
  },
  {
    playerNumber: 3,
    name: "may"
  }
];

document.addEventListener('DOMContentLoaded', () => {
  renderStartingPlayers(players);
});

