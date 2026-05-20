// Run: mongosh "URI" --file scripts/02_transform.js

const dbName = "spotify";
const db = db.getSiblingDB(dbName);

console.log('Очищення колекції tracks');
db.tracks.drop();
console.log('Aggregation Pipeline');

db.tracks_raw.aggregate([
    {
        $project: {
            _id: 1,
            track_id: 1,
            track_name: 1,
            album_name: 1,
            explicit: 1,
            popularity: 1,
            duration_ms: 1,
            track_genre: 1,
            //tmp
            artists_raw: "$artists",

            audio_features: {
                danceability: "$danceability",
                energy: "$energy",
                loudness: "$loudness",
                speechiness: "$speechiness",
                acousticness: "$acousticness",
                instrumentalness: "$instrumentalness",
                liveness: "$liveness",
                valence: "$valence",
                tempo: "$tempo",
                key: "$key",
                mode: "$mode",
                time_signature: "$time_signature"
            },

            duration_sec: { $round: [{ $divide: ["$duration_ms", 1000] }, 1] },

            // popularity_tier
            popularity_tier: {
                $switch: {
                    branches: [
                        { case: { $gte: ["$popularity", 70] }, then: "high" },
                        { case: { $gte: ["$popularity", 40] }, then: "medium" }
                    ],
                    default: "low"
                }
            }
        }
    },
    {
        $addFields: {
            artists: {
                $map: {
                    input: { $split: ["$artists_raw", ";"] },
                    as: "artist",
                    in: { $trim: { input: "$$artist" } }
                }
            }
        }
    },
    {
        // clear
        $project: {
            artists_raw: 0
        }
    },
    {
        // new collections
        $out: "tracks"
    }
]);

console.log("Перевірка");
const count = db.tracks.countDocuments({});
console.log(`Кількість документів у 'tracks': ${count}`);

console.log("Приклад:");
printjson(db.tracks.findOne());