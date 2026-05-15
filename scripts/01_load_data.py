import os
import pandas as pd
from pymongo import MongoClient
from tqdm import tqdm
from dotenv import load_dotenv


def main():
    # 1. Завантажуємо налаштування
    load_dotenv()
    MONGO_URI = os.getenv("MONGO_URI")
    DB_NAME = "spotify"
    CSV_PATH = "dataset.csv"  # Файл вже у корені проєкту
    BATCH_SIZE = 1000

    if not MONGO_URI:
        print("Помилка: MONGO_URI не знайдено у файлі .env")
        return

    if not os.path.exists(CSV_PATH):
        print(f"Помилка: Файл {CSV_PATH} не знайдено в корені проекту!")
        return

    # 2. Підключення до Atlas
    print("--- Підключення до MongoDB Atlas ---")
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # Очищуємо колекцію для ідемпотентності
    db["tracks_raw"].drop()
    print("Колекція 'tracks_raw' очищена.")

    # 3. Обробка через Pandas
    print("--- Зчитування та обробка даних ---")
    df = pd.read_csv(CSV_PATH)

    if "Unnamed: 0" in df.columns:
        df = df.drop(columns=["Unnamed: 0"])

    # Приведення типів для коректної роботи в NoSQL
    df["explicit"] = df["explicit"].astype(bool)

    int_cols = ["popularity", "duration_ms", "key", "mode", "time_signature"]
    for col in int_cols:
        df[col] = df[col].fillna(0).astype(int)

    float_cols = [
        "danceability",
        "energy",
        "loudness",
        "speechiness",
        "acousticness",
        "instrumentalness",
        "liveness",
        "valence",
        "tempo",
    ]
    for col in float_cols:
        df[col] = df[col].fillna(0.0).astype(float)

    # Фільтрація пустих значень у ключових полях
    records = df.dropna(subset=["artists", "track_name"]).to_dict("records")
    total_records = len(records)
    print(f"Підготовлено до завантаження: {total_records} записів.")

    # 4. Завантаження батчами
    print(f"--- Завантаження в колекцію tracks_raw (батчі по {BATCH_SIZE}) ---")
    for i in tqdm(range(0, total_records, BATCH_SIZE)):
        db["tracks_raw"].insert_many(records[i : i + BATCH_SIZE])

    print("\n--- Успіх! ---")
    print(f"Документів у базі: {db['tracks_raw'].count_documents({})}")
    print("Приклад даних:")
    print(db["tracks_raw"].find_one())


if __name__ == "__main__":
    main()
