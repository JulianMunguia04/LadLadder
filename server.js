const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require('mongoose')
require('dotenv').config();

console.log('MONGODB_URI:', process.env.MONGODB_URI);

const Room = require('./models/roomModel');
const Players = require('./models/playerModel');
const Questions = require('./models/questionModel');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
}
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5000", // Fallback for local dev
    methods: ["GET", "POST"]
  }
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", async (req, res) => {
  const room = await Room.find()
  res.sendFile(path.join(__dirname,"public/homepage.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/test", (req, res) => {
  console.log("Route / accessed");  // Debugging log
  res.render("index", { title: "Test Page" });
});

//Create new game
app.get("/host", async (req, res) => {
  try {
    const code = await createNewRoom();
    res.redirect(`/host/${code}`);
  } catch (error) {
    console.error('Error in /host route:', error);
    res.status(500).send('Error creating room');
  }
});

app.get("/host/:roomCode", async (req, res) => {
  const roomCode = req.params.roomCode;
  
  try {
    const currentRoom = await Room.findOne({ room: roomCode });
    
    if (currentRoom && !currentRoom.admin) {
      currentRoom.admin = roomCode;
      await currentRoom.save();
      res.render("host", { roomCode: roomCode });
    } else {
      console.log("No room or already has admin");
      res.redirect('/');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/join/:roomCode", async (req,res) =>{
  const roomCode = req.params.roomCode;
  try {
    const currentRoom = await Room.findOne({ room: roomCode });
    
    if (currentRoom && currentRoom.admin && currentRoom.players.length < 8) {
      currentRoom.admin = roomCode;
      await currentRoom.save();
      res.render("player", { roomCode: roomCode });
    } else {
      console.log("No room");
      res.redirect('/');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
})

app.get("/join", (req,res)=>{
  res.render("join")
})

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle identify event (for both host and player)
  socket.on('identify', async (role, roomCode, name) => {
    socket.role = role;
    socket.roomCode = roomCode;
    socket.name = name;

    if (role === 'host') {
      // Host joining the room
      socket.join(roomCode);
      console.log(`${roomCode} ${role} connected`);
    } else if (role === 'player') {
      // Player joining the room
      socket.join(roomCode);
      try {
        const currentRoom = await Room.findOne({ room: roomCode });

        if (currentRoom && currentRoom.players.length < 8 && !currentRoom.gameStarted) {
          const newPlayer = await createNewPlayer(socket.id, roomCode, name, currentRoom.players.length + 1);
          await newPlayer.save();
          currentRoom.players.push(newPlayer._id);
          socket._id = newPlayer._id;
          await currentRoom.save();
          socket.emit("get-playerId", newPlayer._id)
          
          const players = await getPlayersByNumber(roomCode)
          socket.to(roomCode).emit("player-join-leave", players);

          if (currentRoom.players.length >= 3) {
            console.log("Enough players");
            socket.to(roomCode).emit("min-players");
          }
        } else {
          console.log(`Room ${roomCode} is full or doesn't exist`);
          socket.emit("room-access-failed")
        }
      } catch (error) {
        console.error('Error adding player to room:', error);
      }
    }
  });

  // Handle game join event (simply log for now)
  socket.on("start-game", async (roomCode) => {
    try {
      const currentRoom = await Room.findOne({ room: socket.roomCode });
      currentRoom.gameStarted = true;
      currentRoom.save();
      socket.to(socket.roomCode).emit("start-game")   //start-game to players
      socket.emit("start-game", currentRoom.players.length)                //start-game to host
    } catch (error){
      console.log(error)
    }
  });

  socket.on("player-question", async (attributes, positive, question, roomCode) => {
    try {
      // 1. Create and save the new question
      const newQuestion = await createNewQuestion(attributes, positive, question, roomCode);
      await newQuestion.save(); // Ensure the question is saved
  
      // 2. Find the room and update it
      const currentRoom = await Room.findOne({ room: roomCode });
      if (!currentRoom) throw new Error("Room not found");
  
      // 3. Add the new question to the room
      currentRoom.questions.push(newQuestion._id);
      await currentRoom.save(); // Save the room with the new question
  
      // 4. Add a random question and wait for it to finish
      await addRandomGameQuestionToRoom(roomCode);
      await addRandomGameQuestionToRoom(roomCode);
  
      // 5. REFETCH the room to get the latest state (critical!)
      const updatedRoom = await Room.findOne({ room: roomCode }).populate('questions');
  
      // 6. Check if we need more questions
      if (updatedRoom.questions.length < updatedRoom.players.length * 3) {
        socket.to(roomCode).emit("player-question", (updatedRoom.questions.length/3), updatedRoom.players.length);
        socket.emit("player-question", (updatedRoom.questions.length/3), updatedRoom.players.length);
      } else {
        // 7. Start the game with the first question
        const firstQuestion = await Questions.findOne({_id:updatedRoom.questions[0]});
        const players = await Players.find({ _id: { $in: updatedRoom.players } }).select('_id name playerNumber');
        
        socket.to(roomCode).emit("answer-question", firstQuestion.question, players);
        socket.emit("answer-question", firstQuestion.question, players);
      }
    } catch (error) {
      console.error("Error in player-question handler:", error);
    }
  });

  socket.on("ranked-answer-submit", async (roomCode, playerId, rankedPlayers) => {
    try {
      // Find the current room
      const currentRoom = await Room.findOne({ room: roomCode });
      if (!currentRoom) {
        throw new Error("Room not found");
      }
  
      // Add the rankedPlayers to currentAnswers
      currentRoom.currentAnswers.push(rankedPlayers);
      await currentRoom.save();
  
      // Find the current player and update their answer
      const currentPlayer = await Players.findOne({ _id: playerId });
      if (!currentPlayer) {
        throw new Error("Player not found");
      }
  
      currentPlayer.answer = rankedPlayers;
      await currentPlayer.save();
  
      // Notify the room that an answer has been submitted
      socket.to(roomCode).emit("ranked-answer-submitted", currentRoom.currentAnswers.length, currentRoom.players.length);
  
      // Check if all players have submitted their answers
      if (currentRoom.currentAnswers.length === currentRoom.players.length) {
        console.log("show Results");
  
        // Process the answers to calculate average rankings
        const playerAvgRanking = await processAnswers(roomCode);
        if (!playerAvgRanking) {
          throw new Error("Failed to process answers");
        }
  
        // Fetch player details for the results
        const playerDetails = [];
        for (const playerId of playerAvgRanking) {
          const player = await Players.findOne({ _id: playerId });
          if (player) {
            playerDetails.push({
              _id: player._id,
              name: player.name,
              playerNumber: player.playerNumber,
            });
          }
        }
  
        // Get the current question details
        let questionNumber = currentRoom.question;
        const questionId = currentRoom.questions[questionNumber];
        const question = await Questions.findOne({ _id: questionId });
        if (!question) {
          throw new Error("Question not found");
        }
  
        const positiveQuestion = question.positive;
  
        // Emit the results to the room and the current player
        socket.to(roomCode).emit("ranked-results", playerDetails, roomCode, positiveQuestion, question);
        socket.emit("ranked-results", playerDetails, roomCode, positiveQuestion, question);
  
        // Allocate points based on the rankings
        await allocatePoints(playerAvgRanking, roomCode);
      }
    } catch (error) {
      console.error("Error in ranked-answer-submit:", error.message || error);
    }
  });

  socket.on("next-question", async (roomCode)=>{
    try {
      // Find the current room
      const currentRoom = await Room.findOne({ room: roomCode });
      if (!currentRoom) {
        throw new Error("Room not found");
      }
      currentRoom.currentAnswers = [];
      currentRoom.question += 1;
      currentRoom.save()
      if (currentRoom.questions[currentRoom.question] !== undefined){
        let currentQuestionId = currentRoom.questions[currentRoom.question]._id
        let currentQuestion = await Questions.findOne({ _id: currentQuestionId });
        let playerIds = currentRoom.players
        let allPlayers = await Players.find({ '_id': { $in: playerIds } }).select('_id name playerNumber')
        console.log(allPlayers) 
        socket.to(socket.roomCode).emit("answer-question", currentQuestion.question, allPlayers)//start-game players
        socket.emit("answer-question", currentQuestion.question, allPlayers)
      }
      else{
        const bonusPointsInfo = await bonusPoints(roomCode)
        const sortedPlayers = await getPlayersSortedByPoints(roomCode);
        socket.to(roomCode).emit("end-results", bonusPointsInfo, sortedPlayers);
        socket.emit("end-results", bonusPointsInfo, sortedPlayers);
      }  
    }catch(error){
      console.log(error)
    }
  })

  // Handle disconnect event (delete game if host disconnects)
  socket.on('disconnect', async () => {
    const { roomCode, role } = socket;
    
    if (role === 'host') {
      // Host disconnects, delete the room
      try {
        const result = await Room.deleteOne({ room: roomCode });

        if (result.deletedCount === 0) {
          console.log('Room not found or already deleted');
        } else {
          console.log(`Room with code ${roomCode} deleted.`);
          io.emit('user-disconnected', roomCode, role);
        }
        deleteRoomQuestions(roomCode)
        deleteRoomPlayers(roomCode)
      } catch (error) {
        console.error('Error deleting room:', error);
      }
    } else if (role === 'player') {
      // Player disconnects, remove them from the room
      try {
        const player = await Players.findOne({ socket: socket.id });
        await Players.deleteOne({ _id: socket._id });

        if (player) {
          const currentRoom = await Room.findOne({ room: roomCode });

          if (currentRoom) {
            currentRoom.players = currentRoom.players.filter(
              (playerId) => playerId.toString() !== player._id.toString()
            );
            await currentRoom.save();
            console.log(`Player ${player._id} removed from room ${roomCode}`);

            // Optionally, delete the player document from the Players collection
            await Players.deleteOne({ _id: player._id });
            console.log(`Player ${player._id} deleted from database`);

            // Notify other clients that a player has disconnected
            io.to(roomCode).emit('player-disconnected', { playerId: player._id, roomCode });
            const players = await getPlayersByNumber(roomCode)
            socket.to(roomCode).emit("player-join-leave", players);
          } else {
            console.log(`Room ${roomCode} not found`);
          }
        } else {
          console.log(`Player with socket ID ${socket.id} not found`);
        }
      } catch (error) {
        console.error('Error handling player disconnection:', error);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0",() => {
  console.log(`Server running at http://localhost:${PORT}`);
});

async function generateRoomCode () {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isCodeUnique = false;

  while (!isCodeUnique) {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const existingRoom = await Room.findOne({ room: code });

    if (!existingRoom) {
      isCodeUnique = true;
    }
  }

  return code;
}

async function createNewRoom() {
  const roomCode = await generateRoomCode();
  const newRoom = new Room ({
    players: [],
    questions: [],
    room: roomCode.toString(),
    question: 0,
    admin: '',
    gameStarted: false,
    currentAnswers: [],
  });
  try{
    await newRoom.save();
    console.log("New room created ", newRoom);
  }catch(error){
    console.error('Error Creating room', error)
  }
  return roomCode;
}

async function createNewPlayer(socketid, room, name, playerNumber){
    const newPlayer = new Players({
      intelligence: 0,
      morality: 0,
      charisma: 0,
      luck: 0,
      humor: 0,
      creativity: 0,
      achievement: 0,
      attraction: 0,
      strength: 0,
      effort: 0,
      points: 0,
      socket: socketid,
      room: room,
      answer: [],
      modesty: 0,
      playerNumber: playerNumber,
      name: name,
  });
  try{
    await newPlayer.save();
    console.log("Player joined ", room);
  }catch(error){
    console.error('Error adding Player', error)
  }
  return newPlayer;
}

async function createNewQuestion(attributes, positive, question, roomCode){
  const newQuestion = new Questions({
    attributes: attributes,
    positive: positive,
    question: question,
    room: roomCode,
    gameQuestion: false
  })
  try{
    await newQuestion.save();
    console.log("Question added");
    return newQuestion;
  }catch(error){
    console.error('Error Question not added', error)
  }
}

async function processAnswers(roomCode) {
  try {
    const currentRoom = await Room.findOne({ room: roomCode });
    if (!currentRoom || !currentRoom.players || !currentRoom.currentAnswers) {
      throw new Error("Invalid room data or missing players/answers");
    }

    const players = currentRoom.players;
    const currentAnswers = currentRoom.currentAnswers;

    console.log("Players:", players);
    console.log("Current Answers:", currentAnswers);

    const playersAsStrings = players.map((player) => player.toString());
    const currentAnswersAsStrings = currentAnswers.map((answer) =>
      answer.map((id) => id.toString())
    );

    console.log("Players as Strings:", playersAsStrings);
    console.log("Current Answers as Strings:", currentAnswersAsStrings);

    const transposedRankings = playersAsStrings.map((player, playerIndex) => {
      return currentAnswersAsStrings.map((answer) => {
        const rank = answer.indexOf(playersAsStrings[playerIndex]) + 1;
        return rank;
      });
    });

    console.log("Transposed Rankings:", transposedRankings);

    const averageRankings = transposedRankings.map((playerRankings) => {
      const sum = playerRankings.reduce((acc, rank) => acc + rank, 0);
      const average = sum / playerRankings.length;
      return average;
    });

    console.log("Average Rankings:", averageRankings);

    const sortedPlayers = averageRankings
      .map((rank, index) => ({ player: players[index], rank }))
      .sort((a, b) => a.rank - b.rank) 
      .map((item) => item.player);

    console.log("Sorted Players:", sortedPlayers);

    return sortedPlayers;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function allocatePoints(rankedPlayers, roomCode) {
  try {
    const currentRoom = await Room.findOne({ room: roomCode });
    if (!currentRoom) {
      throw new Error("Room not found");
    }

    const currentQuestionId = currentRoom.questions[currentRoom.question];
    const currentQuestion = await Questions.findOne({ _id: currentQuestionId });
    if (!currentQuestion) {
      throw new Error("Question not found");
    }

    const positiveQuestion = currentQuestion.positive; // Determines if the question is positive or negative
    const currentAttributes = currentQuestion.attributes;

    // Fetch all players in one query
    const playerIds = rankedPlayers.map(player => player._id);
    const players = await Players.find({ _id: { $in: playerIds } });

    // Create a map for quick lookup
    const playerMap = new Map(players.map(player => [player._id.toString(), player]));

    for (let i = 0; i < rankedPlayers.length; i++) {
      const currentPlayerId = rankedPlayers[i]._id;
      const currentPlayer = playerMap.get(currentPlayerId.toString());

      if (!currentPlayer) {
        console.warn(`Player not found: ${currentPlayerId}`);
        continue;
      }

      // Determine the multiplier based on whether the question is positive or negative
      const multiplier = positiveQuestion ? (i + 1) : (rankedPlayers.length - i);

      // Points for attributes
      currentAttributes.forEach(attribute => {
        if (currentPlayer[attribute] !== undefined) {
          currentPlayer[attribute] += (multiplier * 100);
        }
      });

      // Points
      currentPlayer.points += (multiplier * 100);

      // Modesty points
      const playerAnswer = currentPlayer.answer;
      if (Array.isArray(playerAnswer)) {
        const playerRank = playerAnswer.indexOf(currentPlayerId); // Player's self-ranked position
        if (playerRank !== -1) {
          // Calculate modesty difference
          let modestyDifference;
          if (positiveQuestion) {
            // For positive questions: modesty = (group rank - self rank)
            modestyDifference = i - playerRank;
          } else {
            // For negative questions: modesty = (self rank - group rank)
            modestyDifference = playerRank - i;
          }
          currentPlayer.modesty += (modestyDifference * 100);
        }
      }

      await currentPlayer.save();
    }

  } catch (error) {
    console.error("Error in allocatePoints:", error);
  }
}

async function bonusPoints(roomCode) {
  try {
    // 1. Find the room and players
    const currentRoom = await Room.findOne({ room: roomCode });
    if (!currentRoom) throw new Error("Room not found");

    const playerIds = currentRoom.players;
    const players = await Players.find({ _id: { $in: playerIds } });
    if (players.length === 0) throw new Error("No players found");

    const pointsPerAward = players.length * 100;
    const awards = [];
    const modestyAward = []; // Temporary storage for modesty award

    // 2. Find player with highest modesty (but don't push to array yet)
    let highestModestyPlayer = null;
    let highestModesty = -Infinity;
    for (const player of players) {
      if (player.modesty > highestModesty) {
        highestModesty = player.modesty;
        highestModestyPlayer = player;
      }
    }
    
    if (highestModestyPlayer) {
      highestModestyPlayer.points += pointsPerAward;
      await highestModestyPlayer.save();
      modestyAward.push({
        attribute: 'modesty',
        player: highestModestyPlayer,
        pointsAwarded: pointsPerAward
      });
      console.log(`${highestModestyPlayer.name} got ${pointsPerAward} modesty points!`);
    }

    // 3. Find and award top two attributes
    const attributes = [
      'intelligence', 'morality', 'charisma', 'luck',
      'humor', 'creativity', 'attraction', 'strength',
      'morality', 'effort'
    ];

    const topAttributes = {};
    for (const attr of attributes) {
      topAttributes[attr] = { value: -Infinity, player: null };
    }

    for (const player of players) {
      for (const attr of attributes) {
        if (player[attr] > topAttributes[attr].value) {
          topAttributes[attr].value = player[attr];
          topAttributes[attr].player = player;
        }
      }
    }

    const sortedAttributes = Object.entries(topAttributes)
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 2);

    for (const [attr, data] of sortedAttributes) {
      if (data.player) {
        data.player.points += pointsPerAward;
        await data.player.save();
        awards.push({
          attribute: attr,
          player: data.player,
          pointsAwarded: pointsPerAward
        });
        console.log(`${data.player.name} got ${pointsPerAward} points for best ${attr}!`);
      }
    }

    // Combine awards with modesty last
    const allAwards = [...awards, ...modestyAward];

    // Return both the awards array and total points distributed
    return {
      awards: allAwards,
      totalPointsDistributed: allAwards.length * pointsPerAward,
      playersCount: players.length
    };

  } catch (error) {
    console.error("Error in bonusPoints:", error.message);
    throw error;
  }
}

async function addRandomGameQuestionToRoom(roomCode) {
  try {
    // 1. Find the current room
    const currentRoom = await Room.findOne({ room: roomCode });
    if (!currentRoom) {
      throw new Error("Room not found");
    }

    // 2. Get all question IDs already in the room's questions array
    const existingQuestionIds = currentRoom.questions.map((q) => q._id.toString());

    // Convert existing question IDs to ObjectId
    const existingQuestionObjectIds = existingQuestionIds.map((id) => new mongoose.Types.ObjectId(id));

    // 3. Find a random question from the questions collection where gameQuestion is true and not already in the room
    const randomQuestion = await Questions.aggregate([
      { $match: { gameQuestion: true, _id: { $nin: existingQuestionObjectIds } } }, // Filter by gameQuestion and exclude existing questions
      { $sample: { size: 1 } }, // Get one random question
    ]);

    if (randomQuestion.length === 0) {
      throw new Error("No available game questions to add");
    }

    // 4. Add the random question to the room's questions array
    currentRoom.questions.push(randomQuestion[0]._id);
    await currentRoom.save();

    console.log(`Added game question: ${randomQuestion[0].question} to room ${roomCode}`);
    return randomQuestion[0]; // Return the added question (optional)
  } catch (error) {
    console.error("Error adding random game question to room:", error.message);
    throw error; // Re-throw the error for further handling
  }
}


async function getPlayersSortedByPoints(roomCode) {
  try {
    // 1. Find the room by its code
    const currentRoom = await Room.findOne({ room: roomCode });

    if (!currentRoom) {
      throw new Error("Room not found");
    }

    // 2. Get player IDs from the room
    const playerIds = currentRoom.players;

    // Ensure there are players in the room
    if (playerIds.length === 0) {
      throw new Error("No players found in the room");
    }

    // 3. Fetch player objects using their IDs
    const players = await Players.find({ _id: { $in: playerIds } });

    // 4. Sort players by points (from lowest to highest)
    const sortedPlayers = players.sort((a, b) => a.points - b.points);

    // 5. Return the sorted array of players
    return sortedPlayers;

  } catch (error) {
    console.log(error.message);
    return []; // Return an empty array in case of an error
  }
}

async function deleteRoomQuestions(roomCode) {
  try {
    // Delete all questions with matching room code
    const result = await Questions.deleteMany({ room: roomCode });
    
    console.log(`Deleted ${result.deletedCount} questions for room ${roomCode}`);
    return {
      success: true,
      deletedCount: result.deletedCount
    };
  } catch (error) {
    console.error("Error deleting room questions:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function deleteRoomPlayers(roomCode) {
  try {
    // Delete all players with matching room code
    const result = await Players.deleteMany({ room: roomCode });
    
    console.log(`Deleted ${result.deletedCount} players from room ${roomCode}`);
    return {
      success: true,
      deletedCount: result.deletedCount
    };
  } catch (error) {
    console.error("Error deleting room players:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function getPlayersByNumber(roomCode){
  try {
    // Find all documents matching the teamId and sort by playerNumber
    const players = await Players.find({ room: roomCode })
      .sort({ playerNumber: 1 }) // 1 for ascending order (low to high)
      .exec(); // .exec() returns a proper Promise
    
    return players;
  } catch (error) {
    console.error('Error finding and sorting documents:', error);
    throw error; // Re-throw the error so calling code can handle it
  }
}