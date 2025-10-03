// simple algorithm: words / wordsPerMinute => minutes (rounded up)
function estimateReadingTime(text) {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  const wordsPerMinute = 200; // adjust as needed
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
}

module.exports = estimateReadingTime;
