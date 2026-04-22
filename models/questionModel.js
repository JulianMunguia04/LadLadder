const mongoose = require("mongoose")

const questionSchema = new mongoose.Schema({
  attributes: Array,
  positive: Boolean,
  question: String,
  room: String,
  gameQuestion:Boolean
}, { collection: 'questions' })

module.exports = mongoose.model("Questions", questionSchema)