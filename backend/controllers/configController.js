function getMapsKey(req, res) {
  res.status(200).json({
    success: true,
    data: { key: process.env.GOOGLE_MAPS_API_KEY }
  });
}

module.exports = { getMapsKey };
