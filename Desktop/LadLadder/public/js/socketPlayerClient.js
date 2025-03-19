const socket = io("http://localhost:5000");

const role = 'player';
const roomCode = window.location.pathname.split('/')[2];

socket.on("connect", () => {
  console.log("Connected to Socket.io server with ID:", socket.id);
});

socket.on("start-game", ()=>{
  questionPhase()
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