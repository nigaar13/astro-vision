from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import time
from PIL import Image
import io
import uvicorn
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal
import os
import traceback
import cv2
import numpy as np
import tempfile
import uuid
from ultralytics import YOLO

app = FastAPI(title="AstroVision API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Check if model files exist
waste_model_path = os.environ.get('YOLO_MODEL_PATH', 'best.pt')
drone_model_path = os.environ.get('DRONE_MODEL_PATH', 'best2.pt')
space_model_path = os.environ.get('SPACE_MODEL_PATH', 'space.pt')
space_anomaly_model_path = os.environ.get('SPACE_ANOMALY_MODEL_PATH', 'anomaly.pt')

# Check if model files exist
waste_model_exists = os.path.exists(waste_model_path)
drone_model_exists = os.path.exists(drone_model_path)
space_model_exists = os.path.exists(space_model_path)
space_anomaly_model_exists = os.path.exists(space_anomaly_model_path)

# Load the YOLO models
waste_model = None
drone_model = None
space_model = None
space_anomaly_model = None

# Biodegradable classification for waste types
BIODEGRADABLE_CLASSES = {
    'paper': True,
    'cardboard': True,
    'organic': True,
    'food': True,
    'wood': True,
    'leaves': True,
    'compost': True,
    'plastic': False,
    'metal': False,
    'glass': False,
    'electronic': False,
    'battery': False,
    'hazardous': False,
    'textile': False,
    'rubber': False,
    'styrofoam': False
}

# Load waste model
if waste_model_exists:
    try:
        waste_model = YOLO(waste_model_path)
        print(f"Waste model loaded successfully from {waste_model_path}")
    except Exception as e:
        print(f"Error loading waste model: {e}")
        traceback.print_exc()
else:
    print(f"Waste model file not found at {waste_model_path}")

# Load drone model
if drone_model_exists:
    try:
        drone_model = YOLO(drone_model_path)
        print(f"Drone model loaded successfully from {drone_model_path}")
    except Exception as e:
        print(f"Error loading drone model: {e}")
        traceback.print_exc()
else:
    print(f"Drone model file not found at {drone_model_path}")

# Load space model
if space_model_exists:
    try:
        space_model = YOLO(space_model_path)
        print(f"Space model loaded successfully from {space_model_path}")
    except Exception as e:
        print(f"Error loading space model: {e}")
        traceback.print_exc()
else:
    print(f"Space model file not found at {space_model_path}")

# Load space anomaly model
if space_anomaly_model_exists:
    try:
        space_anomaly_model = YOLO(space_anomaly_model_path)
        print(f"Space anomaly model loaded successfully from {space_anomaly_model_path}")
    except Exception as e:
        print(f"Error loading space anomaly model: {e}")
        traceback.print_exc()
else:
    print(f"Space anomaly model file not found at {space_anomaly_model_path}")

# Mock space model data for testing when real model isn't available
MOCK_SPACE_CLASSES = {
    'star': 0,
    'planet': 1,
    'galaxy': 2,
    'nebula': 3,
    'asteroid': 4,
    'comet': 5,
    'blackhole': 6
}

class Detection(BaseModel):
    box: List[float]
    class_name: str
    confidence: float
    frame: Optional[int] = None
    biodegradable: Optional[bool] = None

class DetectionResponse(BaseModel):
    detections: List[Detection]
    processing_time: float
    class_counts: Dict[str, int]
    waste_density: Optional[float] = None
    frame_count: Optional[int] = None
    fps: Optional[float] = None

class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None

class ModelStatus(BaseModel):
    loaded: bool
    path: str
    exists: bool

class HealthResponse(BaseModel):
    status: str
    models: Dict[str, ModelStatus]

@app.post("/detect", response_model=DetectionResponse, responses={500: {"model": ErrorResponse}})
async def detect(
    file: UploadFile = File(...),
    model: str = Form("yolo"),
    media_type: Literal["image", "video"] = Form("image"),
    mode: Literal["waste", "space"] = Form("waste"),
    confidence: float = Form(0.25)
):
    print(f"Received request: model={model}, media_type={media_type}, mode={mode}, confidence={confidence}, file={file.filename}")
    
    # Select the appropriate model based on mode and model ID
    if mode == 'waste':
        if model == 'yolo':
            model_obj = waste_model
            model_path = waste_model_path
        elif model == 'best2':
            model_obj = drone_model
            model_path = drone_model_path
        else:
            raise HTTPException(status_code=400, detail=f"Unknown waste model: {model}")
    elif mode == 'space':
        if model == 'space-objects':
            model_obj = space_model
            model_path = space_model_path
        elif model == 'space-anomalies':
            model_obj = space_anomaly_model
            model_path = space_anomaly_model_path
        else:
            raise HTTPException(status_code=400, detail=f"Unknown space model: {model}")
    else:
        raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}")
    
    # Check if model is loaded
    if model_obj is None:
        # If in space mode and no model is available, use mock data for testing
        if mode == 'space':
            print(f"Space model not available, using mock data")
            if media_type == 'image':
                return await mock_space_image(file)
            else:
                raise HTTPException(status_code=400, detail="Video processing not supported for mock space data")
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"Model not loaded. Check if the model file exists at {model_path} and the model can be loaded correctly."
            )
    
    try:
        # Process based on media type
        if media_type == 'image':
            return await process_image(file, model_obj, confidence, mode)
        elif media_type == 'video':
            return await process_video(file, model_obj, confidence, mode)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported media type: {media_type}")
            
    except Exception as e:
        print(f"Error processing file: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def mock_space_image(file: UploadFile):
    """Generate mock space detection data for testing when no model is available"""
    try:
        # Read image
        contents = await file.read()
        
        # Open and validate the image
        try:
            img = Image.open(io.BytesIO(contents))
            img.verify()  # Verify that it's a valid image
            img = Image.open(io.BytesIO(contents))  # Reopen after verify
        except Exception as e:
            print(f"Invalid image: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")
        
        # Get image dimensions
        img_width, img_height = img.size
        
        # Start timing
        start_time = time.time()
        
        # Simulate processing delay
        time.sleep(0.5)
        
        # Generate random detections
        detections = []
        class_counts = {}
        
        # Generate 3-7 random detections
        num_detections = np.random.randint(3, 8)
        
        for _ in range(num_detections):
            # Random class
            class_name = np.random.choice(list(MOCK_SPACE_CLASSES.keys()))
            
            # Random box (ensure it's within image bounds)
            box_width = np.random.randint(50, min(200, img_width // 2))
            box_height = np.random.randint(50, min(200, img_height // 2))
            x = np.random.randint(0, img_width - box_width)
            y = np.random.randint(0, img_height - box_height)
            
            # Random confidence between 0.6 and 0.98
            confidence = np.random.uniform(0.6, 0.98)
            
            # Update class counts
            if class_name in class_counts:
                class_counts[class_name] += 1
            else:
                class_counts[class_name] = 1
            
            detections.append(Detection(
                box=[float(x), float(y), float(box_width), float(box_height)],
                class_name=class_name,
                confidence=float(confidence)
            ))
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        response = DetectionResponse(
            detections=detections,
            processing_time=processing_time,
            class_counts=class_counts
        )
        
        print(f"Generated mock space data with {len(detections)} detections in {processing_time:.2f}s")
        return response
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Error generating mock space data: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def process_image(file: UploadFile, model, confidence_threshold: float = 0.25, mode: str = "waste"):
    try:
        # Read image
        contents = await file.read()
        
        # Open and validate the image
        try:
            img = Image.open(io.BytesIO(contents))
            img.verify()  # Verify that it's a valid image
            img = Image.open(io.BytesIO(contents))  # Reopen after verify
        except Exception as e:
            print(f"Invalid image: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")
        
        # Get image dimensions for density calculation
        img_width, img_height = img.size
        img_area = img_width * img_height
        
        # Start timing
        start_time = time.time()
        
        # Run inference with YOLOv8
        results = model(img, conf=confidence_threshold)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Process results
        detections = []
        class_counts = {}
        total_waste_area = 0
        
        # Convert YOLOv8 results to JSON-serializable format
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                # Get confidence
                conf = box.conf[0].item()
                # Get class
                cls = int(box.cls[0].item())
                # Get class name
                class_name = model.names[cls]
                
                # Calculate box area for density
                box_width = x2 - x1
                box_height = y2 - y1
                box_area = box_width * box_height
                total_waste_area += box_area
                
                # Update class counts
                if class_name in class_counts:
                    class_counts[class_name] += 1
                else:
                    class_counts[class_name] = 1
                
                # Create detection object
                detection_data = {
                    "box": [float(x1), float(y1), float(x2 - x1), float(y2 - y1)],
                    "class_name": class_name,
                    "confidence": float(conf)
                }
                
                # Add biodegradable flag for waste mode
                if mode == "waste":
                    # Determine if waste is biodegradable based on class name
                    biodegradable = BIODEGRADABLE_CLASSES.get(class_name.lower(), None)
                    if biodegradable is not None:
                        detection_data["biodegradable"] = biodegradable
                
                detections.append(Detection(**detection_data))
        
        # Calculate waste density (percentage of image covered by waste)
        waste_density = (total_waste_area / img_area) * 100 if img_area > 0 else 0
        
        response = DetectionResponse(
            detections=detections,
            processing_time=processing_time,
            class_counts=class_counts,
            waste_density=waste_density if mode == "waste" else None
        )
        
        print(f"Processed {mode} image with {len(detections)} detections in {processing_time:.2f}s")
        return response
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Error processing image: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

async def process_video(file: UploadFile, model, confidence_threshold: float = 0.25, mode: str = "waste"):
    try:
        # Save the uploaded video to a temporary file
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}.mp4")
        
        with open(temp_path, "wb") as buffer:
            contents = await file.read()
            buffer.write(contents)
        
        # Open the video file
        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_area = frame_width * frame_height
        
        print(f"Video properties: {frame_count} frames at {fps} FPS, dimensions: {frame_width}x{frame_height}")
        
        # Process a sample of frames (e.g., every 30th frame)
        sample_interval = max(1, int(frame_count / 10))  # Process ~10 frames
        frames_to_process = list(range(0, frame_count, sample_interval))
        
        # Start timing
        start_time = time.time()
        
        all_detections = []
        class_counts = {}
        total_waste_area = 0
        frames_processed = 0
        
        for frame_idx in frames_to_process:
            # Set the frame position
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            
            if not ret:
                continue
                
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame_pil = Image.fromarray(frame_rgb)
            
            # Run inference with YOLOv8
            results = model(frame_pil, conf=confidence_threshold)
            
            frame_waste_area = 0
            
            # Process results for this frame
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    # Get box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    # Get confidence
                    conf = box.conf[0].item()
                    # Get class
                    cls = int(box.cls[0].item())
                    # Get class name
                    class_name = model.names[cls]
                    
                    # Calculate box area for density
                    box_width = x2 - x1
                    box_height = y2 - y1
                    box_area = box_width * box_height
                    frame_waste_area += box_area
                    
                    # Update class counts
                    if class_name in class_counts:
                        class_counts[class_name] += 1
                    else:
                        class_counts[class_name] = 1
                    
                    # Create detection object
                    detection_data = {
                        "box": [float(x1), float(y1), float(x2 - x1), float(y2 - y1)],
                        "class_name": class_name,
                        "confidence": float(conf),
                        "frame": frame_idx
                    }
                    
                    # Add biodegradable flag for waste mode
                    if mode == "waste":
                        # Determine if waste is biodegradable based on class name
                        biodegradable = BIODEGRADABLE_CLASSES.get(class_name.lower(), None)
                        if biodegradable is not None:
                            detection_data["biodegradable"] = biodegradable
                    
                    all_detections.append(Detection(**detection_data))
            
            total_waste_area += frame_waste_area
            frames_processed += 1
        
        # Clean up
        cap.release()
        os.remove(temp_path)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Calculate average waste density across processed frames
        avg_waste_density = (total_waste_area / (frame_area * frames_processed)) * 100 if frames_processed > 0 else 0
        
        # Prepare response
        response = DetectionResponse(
            detections=all_detections,
            processing_time=processing_time,
            class_counts=class_counts,
            waste_density=avg_waste_density if mode == "waste" else None,
            frame_count=frame_count,
            fps=fps
        )
        
        print(f"Processed {mode} video with {len(all_detections)} detections across {len(frames_to_process)} frames in {processing_time:.2f}s")
        return response
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        print(f"Error processing video: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        models={
            "waste": ModelStatus(
                loaded=waste_model is not None,
                path=waste_model_path,
                exists=waste_model_exists
            ),
            "drone": ModelStatus(
                loaded=drone_model is not None,
                path=drone_model_path,
                exists=drone_model_exists
            ),
            "space": ModelStatus(
                loaded=space_model is not None,
                path=space_model_path,
                exists=space_model_exists
            ),
            "space_anomaly": ModelStatus(
                loaded=space_anomaly_model is not None,
                path=space_anomaly_model_path,
                exists=space_anomaly_model_exists
            )
        }
    )

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FASTAPI_DEBUG', 'True').lower() == 'true'
    host = os.environ.get('HOST', '0.0.0.0')
    
    print(f"Starting AstroVision API server on {host}:{port}, debug={debug}")
    uvicorn.run("astrovision_api:app", host=host, port=port, reload=debug)