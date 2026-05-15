// Run: mongosh "YOUR_MONGODB_URI" --file scripts/02_transform.js

const db = db.getSiblingDB("spotify");

console.log("=== Завдання 1. Треки для вечірки ===");
const partyTracks = db.tracks.find({
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    "duration_ms": { $gte: 180000, $lte: 300000 }
}).limit(5); // Обмежимо вивід для читабельності
printjson(partyTracks.toArray());


console.log("\n=== Завдання 2. Виконавці, у яких усі треки популярні ===");
const popularArtists = db.tracks.aggregate([
    { $unwind: "$artists" }, // Розбиваємо масив, щоб працювати з кожним артистом окремо
    {
        $group: {
            _id: "$artists",
            track_count: { $sum: 1 },
            min_popularity: { $min: "$popularity" },
            avg_popularity: { $avg: "$popularity" }
        }
    },
    {
        $match: {
            track_count: { $gte: 3 },
            min_popularity: { $gte: 60 }
        }
    },
    { $sort: { avg_popularity: -1 } },
    { $limit: 20 },
    {
        $project: {
            _id: 0,
            artist: "$_id",
            track_count: 1,
            min_popularity: 1,
            avg_popularity: { $round: ["$avg_popularity", 1] }
        }
    }
]);
printjson(popularArtists.toArray());


console.log("\n=== Завдання 3. Нетипові треки (Outliers) ===");
const outliers = db.tracks.aggregate([
    {
        $group: {
            _id: "$track_genre",
            avg_tempo: { $avg: "$audio_features.tempo" },
            std_dev: { $stdDevPop: "$audio_features.tempo" },
            all_tracks: { $push: "$$ROOT" } // Тимчасово зберігаємо всі треки жанру
        }
    },
    {
        $project: {
            _id: 0,
            genre: "$_id",
            avg_tempo: { $round: ["$avg_tempo", 1] },
            outlier_threshold: { $add: ["$avg_tempo", { $multiply: [2, "$std_dev"] }] },
            all_tracks: 1
        }
    },
    {
        $project: {
            genre: 1,
            avg_tempo: 1,
            outlier_threshold: 1,
            outlier_tracks: {
                $filter: {
                    input: "$all_tracks",
                    as: "track",
                    cond: { $gt: ["$$track.audio_features.tempo", "$outlier_threshold"] }
                }
            }
        }
    },
    { $match: { "outlier_tracks.0": { $exists: true } } }, // Лишаємо тільки жанри, де є викиди
    { $limit: 3 } // Для прикладу
]);
printjson(outliers.toArray());


console.log("\n=== Завдання 4: Треки для фонової роботи ===");
const chillTracks = db.tracks.find({
    "audio_features.loudness": { $lt: -10 },
    "audio_features.speechiness": { $lt: 0.1 },
    "audio_features.instrumentalness": { $gt: 0.5 },
    "explicit": false
}).limit(5);
printjson(chillTracks.toArray());