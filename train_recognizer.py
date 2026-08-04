import os
import json
import cv2
import numpy as np

# Global path to Haar Cascade XML (OpenCV includes this in its package resources)
CASCADE_PATH = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

def extract_face(image_path, target_size=(200, 200)):
    """
    Reads an image, converts to grayscale, detects the face,
    crops and resizes it to the target size.
    Returns the processed face image, or None if no face is detected.
    """
    image = cv2.imread(image_path)
    if image is None:
        return None
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))
    
    if len(faces) == 0:
        # Fallback: if Haar Cascade fails, print warning and return None
        return None
    
    # Take the largest detected face area
    (x, y, w, h) = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
    face_crop = gray[y:y+h, x:x+w]
    face_resized = cv2.resize(face_crop, target_size)
    return face_resized


def load_dataset(dataset_dir):
    """
    Walks the dataset folder, detects and crops faces, and prepares
    train/test splits per person.
    """
    people = sorted([d for d in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, d))])
    label_to_name = {i: name for i, name in enumerate(people)}
    name_to_label = {name: i for i, name in enumerate(people)}
    
    train_data = []
    train_labels = []
    test_data = []
    test_labels = []
    test_metadata = [] # stores (image_path, expected_label, category)
    
    for person in people:
        person_dir = os.path.join(dataset_dir, person)
        label = name_to_label[person]
        
        # List all images in directory
        images = [f for f in os.listdir(person_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        for img_name in images:
            img_path = os.path.join(person_dir, img_name)
            face = extract_face(img_path)
            
            if face is None:
                print(f"[!] Warning: No face detected in {img_path}. Skipping.")
                continue
                
            # Categorize image by suffix: img_X_frontal, img_X_angled, img_X_lowlight
            category = "unknown"
            if "frontal" in img_name:
                category = "frontal"
            elif "angled" in img_name:
                category = "angled"
            elif "lowlight" in img_name:
                category = "lowlight"
            
            # 80/20 Split logic:
            # We explicitly put img_7 (angled) and img_10 (lowlight) into the test set to evaluate those categories.
            # All other images go to the training set.
            is_test = False
            if "img_7" in img_name or "img_10" in img_name:
                is_test = True
                
            if is_test:
                test_data.append(face)
                test_labels.append(label)
                test_metadata.append((img_path, label, category))
            else:
                train_data.append(face)
                train_labels.append(label)
                
    return train_data, train_labels, test_data, test_labels, test_metadata, label_to_name


def main():
    dataset_dir = 'dataset'
    print("Loading dataset and extracting faces...")
    train_data, train_labels, test_data, test_labels, test_metadata, label_to_name = load_dataset(dataset_dir)
    
    print(f"Loaded {len(train_data)} training samples and {len(test_data)} test samples.")
    
    # Save label mapping to JSON
    with open('labels.json', 'w') as f:
        json.dump(label_to_name, f, indent=4)
    print("Saved label-to-name mapping to labels.json.")

    # Train LBPH Face Recognizer
    print("Training LBPH Face Recognizer...")
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(train_data, np.array(train_labels))
    
    # Save the trained model
    recognizer.save("lbph_model.yml")
    print("Trained model saved as lbph_model.yml.")
    
    # Evaluate
    print("\n--- Evaluating on Held-out Test Set ---")
    correct = 0
    predictions = []
    
    # Confusion Matrix setup (number of classes x number of classes)
    num_classes = len(label_to_name)
    conf_matrix = np.zeros((num_classes, num_classes), dtype=int)
    
    failures_angled_lowlight = []
    
    for i, face in enumerate(test_data):
        img_path, true_label, category = test_metadata[i]
        true_name = label_to_name[true_label]
        
        # Predict
        pred_label, confidence = recognizer.predict(face)
        pred_name = label_to_name.get(pred_label, "Unknown")
        
        predictions.append(pred_label)
        conf_matrix[true_label][pred_label] += 1
        
        is_correct = (pred_label == true_label)
        if is_correct:
            correct += 1
            status = "PASS"
        else:
            status = "FAIL"
            
        print(f"Test Image: {os.path.basename(img_path)} ({category}) | True: {true_name} | Pred: {pred_name} | Conf (dist): {confidence:.2f} | Status: {status}")
        
        # Call out angled/lowlight cases
        if category in ["angled", "lowlight"]:
            failures_angled_lowlight.append({
                "filename": os.path.basename(img_path),
                "true_name": true_name,
                "pred_name": pred_name,
                "category": category,
                "confidence": confidence,
                "status": status
            })
            
    overall_accuracy = correct / len(test_data) if len(test_data) > 0 else 0
    print("-" * 50)
    print(f"Overall Accuracy: {overall_accuracy * 100:.2f}% ({correct}/{len(test_data)})")
    
    print("\nPer-Person Accuracy:")
    for label, name in label_to_name.items():
        total_person = sum(1 for tl in test_labels if tl == label)
        correct_person = sum(1 for idx, tl in enumerate(test_labels) if tl == label and predictions[idx] == label)
        person_acc = (correct_person / total_person * 100) if total_person > 0 else 0
        print(f"  - {name}: {person_acc:.2f}% ({correct_person}/{total_person})")
        
    print("\nConfusion Matrix (Rows: True, Cols: Pred):")
    # Pretty print confusion matrix
    header = "       " + "".join(f"{label_to_name[i]:>10}" for i in range(num_classes))
    print(header)
    for i in range(num_classes):
        row = f"{label_to_name[i]:<7}" + "".join(f"{conf_matrix[i][j]:>10}" for j in range(num_classes))
        print(row)
        
    print("\nAngled / Low-Light Test Case Breakdown:")
    for case in failures_angled_lowlight:
        print(f"  - [{case['category'].upper()}] Image: {case['filename']} | True: {case['true_name']} | Pred: {case['pred_name']} | Conf: {case['confidence']:.2f} | Result: {case['status']}")


def predict(image_path):
    """
    Inference helper function that loads the saved LBPH model and labels,
    and returns the predicted person + confidence for a new image.
    """
    if not os.path.exists("lbph_model.yml") or not os.path.exists("labels.json"):
        raise FileNotFoundError("Model files (lbph_model.yml / labels.json) not found.")
        
    # Load labels
    with open("labels.json", 'r') as f:
        labels_map = json.load(f)
    
    # Load recognizer
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.read("lbph_model.yml")
    
    # Extract face
    face = extract_face(image_path)
    if face is None:
        return "No face detected", 0.0
        
    # Predict
    pred_label, confidence = recognizer.predict(face)
    pred_name = labels_map.get(str(pred_label), "Unknown")
    
    return pred_name, confidence


if __name__ == '__main__':
    main()
