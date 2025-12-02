import os, requests, json

url = "http://127.0.0.1:8000/upload_test"
base_dir = r"D:\HA_Technologies\New_Version_Feelwise-project\archive"

for actor in os.listdir(base_dir):
    actor_path = os.path.join(base_dir, actor)
    if not os.path.isdir(actor_path):
        continue
    for wav in os.listdir(actor_path):
        if wav.endswith(".wav"):
            file_path = os.path.join(actor_path, wav)
            with open(file_path, "rb") as f:
                response = requests.post(url, files={"file": f})
            result = response.json()

            print("\n==============================")
            print(f"🎵 File: {file_path}")
            print(f"➡️  Raw label: {result.get('raw_label')}")
            print(f"➡️  Mapped emotion: {result.get('emotion')}")
            
            # Top-3 predictions
            top3 = result.get("top3", [])
            print("➡️  Top-3 predictions:")
            for label, prob in top3:
                print(f"   - {label}: {prob:.4f}")

            # Full probabilities (optional debug)
            print("➡️  Full probabilities:")
            print(json.dumps(result.get("probabilities", {}), indent=2))
