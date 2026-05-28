```python
# =========================================================
# CTRAX / TRAX SAFETY - HYBRID MODE CAMERA PIPELINE
# =========================================================

import cv2
import requests
import random
import time
from datetime import datetime

# =========================================================
# CONFIG
# =========================================================

API_URL = "https://ctraxsafety.com/add-sighting"

# Indianapolis coordinates (TEST MODE)
DEFAULT_LATITUDE = 39.7684
DEFAULT_LONGITUDE = -86.1581

CAMERA_ID = "TRAX-INDY-01"
ZONE = "Downtown"

# =========================================================
# TEST DATA
# =========================================================

plates = [
    "TRX904",
    "IND782",
    "SAFE911",
    "CTRX22",
    "TRAX01",
    "HYB334",
    "CAM808"
]

vehicles = [
    "Tesla Model Y",
    "Chevrolet Tahoe",
    "Ford Explorer",
    "Honda Accord",
    "BMW X5",
    "Toyota Camry",
    "Dodge Charger"
]

directions = [
    "North",
    "South",
    "East",
    "West",
    "North-East",
    "South-West"
]

# =========================================================
# OPEN CAMERA
# =========================================================

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Could not open camera")
    exit()

print("\n======================================")
print(" CTRAX / TRAX SAFETY HYBRID MODE")
print("======================================")
print(f"API Endpoint: {API_URL}")
print("Press Q to quit.\n")

# =========================================================
# MAIN LOOP
# =========================================================

last_detection_time = 0

while True:

    ret, frame = cap.read()

    if not ret:
        print("Failed to grab frame")
        break

    # Show camera feed
    cv2.imshow("TRAX Safety Camera", frame)

    current_time = time.time()

    # Create fake detection every 5 seconds
    if current_time - last_detection_time > 5:

        plate = random.choice(plates)
        vehicle = random.choice(vehicles)
        direction = random.choice(directions)

        speed = random.randint(20, 95)
        confidence = round(random.uniform(87, 99), 2)

        # Slight coordinate variation for moving pulse dots
        latitude = DEFAULT_LATITUDE + random.uniform(-0.01, 0.01)
        longitude = DEFAULT_LONGITUDE + random.uniform(-0.01, 0.01)

        detection = {
            "plate": plate,
            "confidence": confidence,
            "vehicle": vehicle,
            "speed": speed,
            "direction": direction,

            # HYBRID MODE GEOLOCATION
            "latitude": latitude,
            "longitude": longitude,

            # CAMERA INFO
            "cameraId": CAMERA_ID,
            "zone": ZONE,

            "timestamp": datetime.utcnow().isoformat()
        }

        print("\n========== NEW DETECTION ==========")
        print(f"Plate:      {plate}")
        print(f"Vehicle:    {vehicle}")
        print(f"Speed:      {speed} MPH")
        print(f"Direction:  {direction}")
        print(f"Latitude:   {latitude}")
        print(f"Longitude:  {longitude}")
        print("===================================\n")

        try:
            response = requests.post(API_URL, json=detection)

            print(f"Server Response: {response.status_code}")

            if response.status_code == 200:
                print("Detection uploaded successfully.\n")
            else:
                print(f"Upload failed: {response.text}\n")

        except Exception as e:
            print("ERROR sending detection:")
            print(e)

        last_detection_time = current_time

    # Press Q to quit
    key = cv2.waitKey(1)

    if key == ord('q'):
        break

# =========================================================
# CLEANUP
# =========================================================

cap.release()
cv2.destroyAllWindows()

print("\nTRAX Safety pipeline stopped.")
```
