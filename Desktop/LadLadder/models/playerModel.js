const mongoose = require("mongoose")

const playerSchema = new mongoose.Schema({
  arts: Number,
  athleticism: Number,
  attractiveness: Number,
  charm: Number,
  creativity: Number,
  empathy: Number,
  humor: Number,
  intelligence: Number,
  morality: Number,
  points: Number,
  socialSkills: Number,
  socket: String,
  room: String,
  answer: Array,
  modesty: Number,
  playerNumber: Number,
  name: String,
}, { collection: 'players' })

module.exports = mongoose.model("players", playerSchema)

