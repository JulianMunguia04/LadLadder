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

const crowdCheerSound = new Howl({
  src: ['./sound-effects/crowd-cheering.mp3'],
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

startButton.addEventListener("click", ()=>{
  playIntro()
  setTimeout(() => {
    unRenderAll()
    promptingPhaseRender(2)
  }, 2000);
  setTimeout(() => {
    cheerAndQuiet(3000)
  }, 2000);
  quietAudience(3000);
})

const animationDuration = 6000
function playIntro(){
  const div = document.createElement('div');
  div.id = 'logo-transition';

  const img = document.createElement('img');
  img.src = './images/ladladderlogo.png'; 

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

//results phase
const resultsPhase = document.getElementById("result-phase")
async function resultsPhaseRender(playerDetails, positiveQuestion, question){
  const questionHeader = document.getElementById("question-header")
  questionHeader.innerText = question
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
  seats.classList.add("display-none")
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

resultsPhaseRender(players, true, "Who's most likely to have a one night stand")