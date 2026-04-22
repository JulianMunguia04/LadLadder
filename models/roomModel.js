const mongoose = require("mongoose")

const roomSchema = new mongoose.Schema({
  players: Array,
  questions: Array,
  room: String,
  question: Number,
  admin: String,
  gameStarted: Boolean,
  currentAnswers: Array,
  currentGameState: String
}, { collection: 'rooms' })

module.exports = mongoose.model("Rooms", roomSchema)