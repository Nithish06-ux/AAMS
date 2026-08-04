"""
Dataset Encryption Utility for Face Recognition Attendance System
=================================================================

Encrypts and decrypts biometric face image data using Fernet symmetric
encryption (AES-128-CBC under the hood). This protects sensitive facial
data at rest — a critical requirement for any biometric system.

Usage:
    # Encrypt the dataset (creates encrypted_dataset/ and secret.key)
    python encrypt_dataset.py encrypt

    # Decrypt back to a folder (for training or inspection)
    python encrypt_dataset.py decrypt

    # Show encryption status / summary
    python encrypt_dataset.py status
"""

import os
import sys
import json
import shutil
try:
    # pyrefly: ignore [missing-import]
    from cryptography.fernet import Fernet
except ImportError:
    raise ImportError("The 'cryptography' package is required. Install it with '.venv\\Scripts\\pip install cryptography'.")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATASET_DIR = "dataset"
ENCRYPTED_DIR = "encrypted_dataset"
KEY_FILE = "secret.key"
MANIFEST_FILE = os.path.join(ENCRYPTED_DIR, "manifest.json")
SUPPORTED_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.webp')


# ---------------------------------------------------------------------------
# Key Management
# ---------------------------------------------------------------------------
def generate_key():
    """Generate a new Fernet encryption key and save it to KEY_FILE."""
    key = Fernet.generate_key()
    with open(KEY_FILE, 'wb') as f:
        f.write(key)
    print(f"[+] New encryption key generated and saved to '{KEY_FILE}'.")
    print(f"    [!] Keep this file SECRET. Without it, data cannot be recovered.")
    return key


def load_key():
    """Load the encryption key from KEY_FILE."""
    if not os.path.exists(KEY_FILE):
        raise FileNotFoundError(
            f"Key file '{KEY_FILE}' not found. "
            "Run 'encrypt' first to generate a key, or restore your key file."
        )
    with open(KEY_FILE, 'rb') as f:
        key = f.read()
    return key


# ---------------------------------------------------------------------------
# Encrypt
# ---------------------------------------------------------------------------
def encrypt_dataset():
    """
    Walk the plaintext dataset/ folder, encrypt every image file with Fernet,
    and write the ciphertext into encrypted_dataset/ preserving the directory
    structure. A manifest.json is saved alongside with metadata.
    """
    if not os.path.isdir(DATASET_DIR):
        print(f"[!] Error: '{DATASET_DIR}' directory not found.")
        return

    # Generate a fresh key (or reuse existing)
    if os.path.exists(KEY_FILE):
        print(f"[*] Existing key file found. Reusing '{KEY_FILE}'.")
        key = load_key()
    else:
        key = generate_key()

    fernet = Fernet(key)

    # Prepare output directory
    if os.path.exists(ENCRYPTED_DIR):
        shutil.rmtree(ENCRYPTED_DIR)
    os.makedirs(ENCRYPTED_DIR)

    manifest = {
        "description": "Encrypted face recognition dataset",
        "algorithm": "Fernet (AES-128-CBC + HMAC-SHA256)",
        "persons": {},
        "total_files": 0,
        "total_encrypted_bytes": 0,
    }

    total_files = 0
    total_encrypted_bytes = 0

    # Walk dataset directory
    persons = sorted([
        d for d in os.listdir(DATASET_DIR)
        if os.path.isdir(os.path.join(DATASET_DIR, d))
    ])

    for person in persons:
        person_src = os.path.join(DATASET_DIR, person)
        person_dst = os.path.join(ENCRYPTED_DIR, person)
        os.makedirs(person_dst, exist_ok=True)

        person_file_count = 0

        for filename in sorted(os.listdir(person_src)):
            if not filename.lower().endswith(SUPPORTED_EXTENSIONS):
                continue

            src_path = os.path.join(person_src, filename)

            # Read raw bytes
            with open(src_path, 'rb') as f:
                plaintext = f.read()

            original_size = len(plaintext)

            # Encrypt
            ciphertext = fernet.encrypt(plaintext)
            encrypted_size = len(ciphertext)

            # Save with .enc extension
            enc_filename = filename + ".enc"
            dst_path = os.path.join(person_dst, enc_filename)
            with open(dst_path, 'wb') as f:
                f.write(ciphertext)

            total_files += 1
            total_encrypted_bytes += encrypted_size
            person_file_count += 1

            print(f"  [ENCRYPTED] {person}/{filename}  ({original_size:,} B -> {encrypted_size:,} B)")

        manifest["persons"][person] = person_file_count

    manifest["total_files"] = total_files
    manifest["total_encrypted_bytes"] = total_encrypted_bytes

    # Save manifest
    with open(MANIFEST_FILE, 'w') as f:
        json.dump(manifest, f, indent=4)

    print()
    print(f"[+] Encryption complete!")
    print(f"    • {total_files} files encrypted across {len(persons)} person(s).")
    print(f"    • Encrypted data saved to '{ENCRYPTED_DIR}/'.")
    print(f"    • Total encrypted size: {total_encrypted_bytes:,} bytes.")
    print(f"    • Manifest saved to '{MANIFEST_FILE}'.")
    print()
    print(f"    [!] You can now safely delete the plaintext '{DATASET_DIR}/' folder")
    print(f"       if you only want to keep encrypted data on disk.")


# ---------------------------------------------------------------------------
# Decrypt
# ---------------------------------------------------------------------------
def decrypt_dataset(output_dir="dataset_decrypted"):
    """
    Decrypt all .enc files from encrypted_dataset/ back into a plaintext
    folder, preserving the directory structure.
    """
    if not os.path.isdir(ENCRYPTED_DIR):
        print(f"[!] Error: '{ENCRYPTED_DIR}' directory not found.")
        return

    key = load_key()
    fernet = Fernet(key)

    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)

    total_files = 0

    persons = sorted([
        d for d in os.listdir(ENCRYPTED_DIR)
        if os.path.isdir(os.path.join(ENCRYPTED_DIR, d))
    ])

    for person in persons:
        person_src = os.path.join(ENCRYPTED_DIR, person)
        person_dst = os.path.join(output_dir, person)
        os.makedirs(person_dst, exist_ok=True)

        for enc_filename in sorted(os.listdir(person_src)):
            if not enc_filename.endswith(".enc"):
                continue

            src_path = os.path.join(person_src, enc_filename)

            # Read ciphertext
            with open(src_path, 'rb') as f:
                ciphertext = f.read()

            # Decrypt
            plaintext = fernet.decrypt(ciphertext)

            # Remove the .enc extension to restore original filename
            original_filename = enc_filename[:-4]  # strip ".enc"
            dst_path = os.path.join(person_dst, original_filename)

            with open(dst_path, 'wb') as f:
                f.write(plaintext)

            total_files += 1
            print(f"  [DECRYPTED] {person}/{original_filename}  ({len(plaintext):,} B)")

    print()
    print(f"[+] Decryption complete!")
    print(f"    • {total_files} files decrypted to '{output_dir}/'.")


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------
def show_status():
    """Show the current encryption status of the dataset."""
    print("--- Dataset Encryption Status ---")
    print()

    # Check plaintext dataset
    if os.path.isdir(DATASET_DIR):
        persons = [d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))]
        total = sum(
            len([f for f in os.listdir(os.path.join(DATASET_DIR, p)) if f.lower().endswith(SUPPORTED_EXTENSIONS)])
            for p in persons
        )
        print(f"  [DIR] Plaintext dataset:    '{DATASET_DIR}/' - {total} images across {len(persons)} person(s).")
    else:
        print(f"  [DIR] Plaintext dataset:    '{DATASET_DIR}/' - NOT FOUND")

    # Check encrypted dataset
    if os.path.isdir(ENCRYPTED_DIR):
        if os.path.exists(MANIFEST_FILE):
            with open(MANIFEST_FILE, 'r') as f:
                manifest = json.load(f)
            print(f"  [ENC] Encrypted dataset:    '{ENCRYPTED_DIR}/' - {manifest['total_files']} files, "
                  f"{manifest['total_encrypted_bytes']:,} bytes.")
            print(f"     Algorithm: {manifest['algorithm']}")
        else:
            print(f"  [ENC] Encrypted dataset:    '{ENCRYPTED_DIR}/' - EXISTS (no manifest)")
    else:
        print(f"  [ENC] Encrypted dataset:    '{ENCRYPTED_DIR}/' - NOT FOUND")

    # Check key
    if os.path.exists(KEY_FILE):
        print(f"  [KEY] Encryption key:       '{KEY_FILE}' - PRESENT")
    else:
        print(f"  [KEY] Encryption key:       '{KEY_FILE}' - NOT FOUND")


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------
def main():
    if len(sys.argv) < 2:
        print("Usage: python encrypt_dataset.py <command>")
        print()
        print("Commands:")
        print("  encrypt   — Encrypt all images in dataset/ → encrypted_dataset/")
        print("  decrypt   — Decrypt encrypted_dataset/ → dataset_decrypted/")
        print("  status    — Show encryption status summary")
        return

    command = sys.argv[1].lower()

    if command == "encrypt":
        encrypt_dataset()
    elif command == "decrypt":
        decrypt_dataset()
    elif command == "status":
        show_status()
    else:
        print(f"[!] Unknown command: '{command}'")
        print("    Valid commands: encrypt, decrypt, status")


if __name__ == '__main__':
    main()
