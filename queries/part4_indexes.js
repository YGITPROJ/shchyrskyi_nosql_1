// Run: mongosh "YOUR_MONGODB_URI" --file scripts/02_transform.js

const db = db.getSiblingDB("spotify");

console.log("=== Завдання 1. Аналіз запиту та індексація ===");

// 1. Аналіз БЕЗ індексу
console.log("План виконання до створення індексу:");
const explainBefore = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");
printjson(explainBefore.executionStats);

// 2. Створення індексу (Compound Index)
// Використовуємо стратегію ESR (Equality, Sort, Range)
console.log("\nСтворення індексу за правилом ESR...");
db.tracks.createIndex({
  track_genre: 1,
  popularity: -1,
  "audio_features.danceability": 1
});

// 3. Аналіз ПІСЛЯ створення індексу
console.log("План виконання після створення індексу:");
const explainAfter = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");
printjson(explainAfter.executionStats);


console.log("\n=== Завдання 2. Індекс для фонової роботи ===");

// Створюємо складений індекс
db.tracks.createIndex({
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1,
  explicit: 1
});

console.log("Перевірка використання індексу для фонових треків:");
const explainChill = db.tracks.find({
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 },
  explicit: false
}).explain("executionStats");
printjson(explainChill.executionStats);