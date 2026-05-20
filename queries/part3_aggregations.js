// Run: mongosh "URI" --file scripts/queries/part3_aggregations.js

const db = db.getSiblingDB("spotify");

console.log("Топ-10 виконавців за середньою популярністю");
const topArtists = db.tracks.aggregate([
    { $unwind: "$artists" },
    {
        $group: {
            _id: "$artists",
            avg_popularity: { $avg: "$popularity" },
            track_count: { $sum: 1 }
        }
    },
    { $match: { track_count: { $gte: 5 } } },
    { $sort: { avg_popularity: -1 } },
    { $limit: 10 },
    {
        $project: {
            _id: 0,
            artist: "$_id",
            avg_popularity: { $round: ["$avg_popularity", 2] }
        }
    }
]);
printjson(topArtists.toArray());


console.log("Розподіл треків за настроєм");
const moodDistribution = db.tracks.aggregate([
    {
        $project: {
            mood: {
                $switch: {
                    branches: [
                        {
                            case: { $and: [{ $gte: ["$audio_features.valence", 0.5] }, { $gte: ["$audio_features.energy", 0.5] }] },
                            then: "happy"
                        },
                        {
                            case: { $and: [{ $lt: ["$audio_features.valence", 0.5] }, { $gte: ["$audio_features.energy", 0.5] }] },
                            then: "angry"
                        },
                        {
                            case: { $and: [{ $gte: ["$audio_features.valence", 0.5] }, { $lt: ["$audio_features.energy", 0.5] }] },
                            then: "calm"
                        },
                        {
                            case: { $and: [{ $lt: ["$audio_features.valence", 0.5] }, { $lt: ["$audio_features.energy", 0.5] }] },
                            then: "sad"
                        }
                    ],
                    default: "unknown"
                }
            }
        }
    },
    {
        $group: {
            _id: "$mood",
            count: { $sum: 1 }
        }
    },
    { $sort: { count: -1 } }
]);
printjson(moodDistribution.toArray());


console.log("Найбільш «танцювальний» жанр");
const danceableGenres = db.tracks.aggregate([
    {
        $group: {
            _id: "$track_genre",
            avg_danceability: { $avg: "$audio_features.danceability" },
            avg_energy: { $avg: "$audio_features.energy" },
            avg_valence: { $avg: "$audio_features.valence" },
            total_tracks: { $sum: 1 }
        }
    },
    { $match: { total_tracks: { $gte: 100 } } },
    { $sort: { avg_danceability: -1 } },
    { $limit: 5 },
    {
        $project: {
            _id: 0,
            genre: "$_id",
            avg_danceability: { $round: ["$avg_danceability", 3] },
            avg_energy: { $round: ["$avg_energy", 3] },
            avg_valence: { $round: ["$avg_valence", 3] },
            total_tracks: 1
        }
    }
]);
printjson(danceableGenres.toArray());