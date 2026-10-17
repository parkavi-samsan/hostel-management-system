const Room = require('../models/Room');
const OccupancySnapshot = require('../models/OccupancySnapshot');

const todayKey = () => new Date().toISOString().slice(0, 10);

// Saves (or updates) today's occupancy figures. Never throws.
async function recordSnapshot() {
  try {
    const rooms = await Room.find().select('capacity occupants');
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const totalOccupants = rooms.reduce((sum, r) => sum + r.occupants.length, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupants / totalCapacity) * 100) : 0;

    await OccupancySnapshot.findOneAndUpdate(
      { date: todayKey() },
      { totalRooms: rooms.length, totalCapacity, totalOccupants, occupancyRate },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error('Snapshot error:', err.message);
  }
}

module.exports = { recordSnapshot };
