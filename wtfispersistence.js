//old files being uploaded 
//how the fuck do you add persistence 
//I am too stupid for this 

// Load the required libraries
const faceapi = require('face-api.js');
const cv = require('opencv4nodejs');

// Load the face detection and recognition models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(startCamera);

// Start the camera and perform face recognition
async function startCamera() {
  // Get the video stream from the user's camera
  const video = document.getElementById('video');
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  // Wait for the video stream to start and then detect faces in each frame
  video.addEventListener('play', async () => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    const faceMatcher = await createFaceMatcher();

    setInterval(async () => {
      // Draw the current frame of the video to the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert the canvas to an OpenCV Mat object
      const mat = cv.imread(canvas);

      // Detect the faces in the OpenCV Mat
      const faces = await detectFaces(mat);

      // Perform face recognition on each detected face
      faces.forEach(face => {
        const descriptor = faceapi.computeFaceDescriptor(face);
        const match = faceMatcher.findBestMatch(descriptor);
        const box = new cv.Rect(face.detection.box.x, face.detection.box.y, face.detection.box.width, face.detection.box.height);
        cv.rectangle(mat, box, new cv.Vec(0, 255, 0), 2);
        cv.putText(mat, match.toString(), new cv.Point(box.x, box.y), cv.FONT_HERSHEY_SIMPLEX, 0.8, new cv.Vec(0, 255, 0), 2);
      });

      // Show the OpenCV Mat in the canvas
      context.putImageData(new ImageData(new Uint8ClampedArray(mat.getData()), canvas.width, canvas.height), 0, 0);
    }, 100);
  });
}

// Create a face matcher for face recognition
async function createFaceMatcher() {
  // Load the reference images
  const referenceImages = await Promise.all([
    faceapi.fetchImage('/referenceImages/1.jpg'),
    faceapi.fetchImage('/referenceImages/2.jpg'),
    faceapi.fetchImage('/referenceImages/3.jpg')
  ]);

  // Extract the face descriptors from the reference images
  const referenceDescriptors = await Promise.all(referenceImages.map(async (image) => {
    const detection = await faceapi.detectSingleFace(image).withFaceLandmarks().withFaceDescriptor();
    return detection.descriptor;
  }));

  // Create a face matcher using the reference descriptors
  return new faceapi.FaceMatcher(referenceDescriptors);
}

// Detect faces in an OpenCV Mat object
async function detectFaces(mat) {
  // Convert the OpenCV Mat to a canvas
  const canvas = cv.imencode('.png', mat);
  const image = await faceapi.bufferToImage(canvas);
  
  // Detect the faces in the image
  const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();

  // Convert the face detections to OpenCV Mats
  const faces = await Promise.all(detections.map(async (detection) => {
    const box = detection.detection.box;
    const face = mat.getRegion(new cv.Rect(box.x
