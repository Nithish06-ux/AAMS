import os
import cv2

# Global path to Haar Cascade XML (OpenCV includes this in its package resources)
CASCADE_PATH = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')

# Load the Haar Cascade classifier
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
if face_cascade.empty():
    raise IOError(f"Could not load Haar Cascade classifier from {CASCADE_PATH}")


def detect_faces(image_path, scale_factor=1.1, min_neighbors=5, min_size=(30, 30)):
    """
    Reads an image, converts it to grayscale, runs detectMultiScale,
    and returns a list of bounding boxes (x, y, w, h).
    
    Args:
        image_path (str): Path to the image file.
        scale_factor (float): Parameter specifying how much the image size is reduced at each image scale.
        min_neighbors (int): Parameter specifying how many neighbors each candidate rectangle should have to retain it.
        min_size (tuple): Minimum possible object size. Objects smaller than that are ignored.
        
    Returns:
        list of tuple: A list of bounding boxes, each defined as (x, y, w, h).
    """
    # 1. Read the image
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError(f"Could not read image at {image_path}")

    # 2. Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 3. Run detectMultiScale
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=scale_factor,
        minNeighbors=min_neighbors,
        minSize=min_size
    )

    # 4. Return list of bounding boxes (x, y, w, h)
    # OpenCV's detectMultiScale returns a numpy array of shape (N, 4) or an empty tuple if no faces found
    if len(faces) == 0:
        return []
    return [tuple(map(int, face)) for face in faces]


def main():
    samples_dir = 'samples'
    output_dir = 'output'
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(samples_dir):
        print(f"Error: samples directory '{samples_dir}' does not exist.")
        return

    # Find all images in samples directory
    supported_extensions = ('.png', '.jpg', '.jpeg', '.webp')
    image_files = [f for f in os.listdir(samples_dir) if f.lower().endswith(supported_extensions)]

    print(f"--- Running Face Detection Baseline ---")
    print(f"Total images found: {len(image_files)}")
    print("-" * 40)

    zero_detection_images = []
    
    for filename in image_files:
        image_path = os.path.join(samples_dir, filename)
        
        # Detect faces
        try:
            faces = detect_faces(image_path)
        except Exception as e:
            print(f"Failed to process {filename}: {e}")
            continue

        num_faces = len(faces)
        print(f"Image: {filename} -> {num_faces} face(s) detected")

        if num_faces == 0:
            zero_detection_images.append(filename)

        # Draw bounding boxes and save output
        image = cv2.imread(image_path)
        for (x, y, w, h) in faces:
            # Draw green bounding box (thickness 3)
            cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 3)

        # Save to output folder
        output_path = os.path.join(output_dir, filename)
        cv2.imwrite(output_path, image)

    print("-" * 40)
    print("Summary of Detection Run:")
    print(f"Processed {len(image_files)} image(s).")
    
    if zero_detection_images:
        print(f"[!] Warning: No faces were detected in the following {len(zero_detection_images)} image(s):")
        for img in zero_detection_images:
            print(f"    - {img}")
    else:
        print("Faces were detected in all processed images.")


if __name__ == '__main__':
    main()
