const mongoose = require("mongoose")

const roomSchema = new mongoose.Schema({
  players: Array,
  questions: Array,
  room: String,
  question: Number,
  admin: String,
  gameStarted: Boolean,
}, { collection: 'rooms' })

module.exports = mongoose.model("Rooms", roomSchema)