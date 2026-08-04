import os
from train_recognizer import predict

# Ensure model files exist
if not os.path.exists("lbph_model.yml") or not os.path.exists("labels.json"):
    print("Error: Model has not been trained yet. Please run train_recognizer.py first.")
    exit(1)

# Test images to run prediction on
test_cases = [
    ("dataset/alice/img_7_angled.jpg", "Alice (Angled)"),
    ("dataset/bob/img_10_lowlight.jpg", "Bob (Low Light)"),
    ("dataset/charlie/img_1_frontal.jpg", "Charlie (Frontal)")
]

print("--- Running Inference Demo ---")
for img_path, description in test_cases:
    if os.path.exists(img_path):
        try:
            person, confidence = predict(img_path)
            print(f"Image: {img_path} ({description})")
            print(f"  -> Predicted: {person}")
            print(f"  -> Confidence (Distance): {confidence:.2f}")
            print("-" * 30)
        except Exception as e:
            print(f"Failed to predict for {img_path}: {e}")
    else:
        print(f"Test image {img_path} not found.")
