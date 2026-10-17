const mongoose = require('mongoose');

// One document per day, used to track occupancy over time
const snapshotSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  totalRooms: { type: Number, default: 0 },
  totalCapacity: { type: Number, default: 0 },
  totalOccupants: { type: Number, default: 0 },
  occupancyRate: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('OccupancySnapshot', snapshotSchema);
