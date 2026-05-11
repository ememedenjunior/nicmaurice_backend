const mongoose = require("mongoose");

const systemStateSchema = new mongoose.Schema({
  registrationOpen: { type: Boolean, default: false },
  registrationStart: Date,
  registrationEnd: Date,
  isFrozen: { type: Boolean, default: false },
});

module.exports = mongoose.model("SystemState", systemStateSchema);