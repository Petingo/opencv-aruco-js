let video = null;
let stream = null;
let detector = null;
let overlayImage = null;
let overlayImageElement = null;

// Parameters for AR overlay
let targetMarkerId = 0;
let imageScale = 1.0;
let anchorPoint = 'center';

let camera_matrix;
let dist_coeffs;

async function onOpenCvReady() {
    // initially cv will be a Promise
    cv.then((cvInstance) => {
        // replace cv with the real object
        window.cv = cvInstance;
        
        // now cv is ready to be used
        document.getElementById('checker').innerHTML = 'OpenCV.js is ready.';
        initializeCamera();
        initializeControls();
    });
}

async function initializeCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video = document.getElementById('videoInput');
        video.srcObject = stream;
        video.play();

        // Camera calibration parameters (you should calibrate your camera to get accurate values)
        camera_matrix = new cv.Mat(3, 3, cv.CV_64F, [
            1000, 0, video.width/2,
            0, 1000, video.height/2,
            0, 0, 1
        ]);

        dist_coeffs = new cv.Mat(1, 5, cv.CV_64F, [0, 0, 0, 0, 0]);
        
        // Start processing when video is ready
        video.onloadedmetadata = () => {
            initializeDetector();
            processVideo();
        };
    } catch (err) {
        console.error('Error accessing camera:', err);
    }
}

function initializeDetector() {
    // Create detector parameters
    let params = new cv.aruco_DetectorParameters();
    params.adaptiveThreshConstant = Number(document.getElementById('adaptiveThreshConstant').value);
    params.minMarkerPerimeterRate = Number(document.getElementById('minMarkerPerimeterRate').value);
    params.polygonalApproxAccuracyRate = Number(document.getElementById('polygonalApproxAccuracyRate').value);
    
    // Create dictionary
    let dictionary = getDictionary();
    detector = new cv.aruco_ArucoDetector(dictionary, params);
}

function getDictionary() {
    const dictValue = document.getElementById('dictionary').value;
    return new cv.aruco_Dictionary(cv[dictValue]);
}

function initializeControls() {
    // Detection parameter controls
    document.getElementById('dictionary').addEventListener('change', initializeDetector);
    document.getElementById('adaptiveThreshConstant').addEventListener('change', initializeDetector);
    document.getElementById('minMarkerPerimeterRate').addEventListener('change', initializeDetector);
    document.getElementById('polygonalApproxAccuracyRate').addEventListener('change', initializeDetector);

    // AR overlay controls
    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
    document.getElementById('markerId').addEventListener('change', (e) => {
        targetMarkerId = Number(e.target.value);
    });
    document.getElementById('imageScale').addEventListener('change', (e) => {
        imageScale = Number(e.target.value);
    });
    document.getElementById('anchorPoint').addEventListener('change', (e) => {
        anchorPoint = e.target.value;
    });
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            overlayImageElement = new Image();
            overlayImageElement.onload = function() {
                overlayImage = cv.imread(overlayImageElement);
            };
            overlayImageElement.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function processVideo() {
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let cap = new cv.VideoCapture(video);
    let corners = new cv.MatVector();
    let ids = new cv.Mat();
    
    const FPS = 30;
    function process() {
        try {
            cap.read(src);
            detector.detectMarkers(src, corners, ids);
            
            // Draw detected markers
            if (ids.rows > 0) {
                cv.aruco_drawDetectedMarkers(src, corners, ids);
                document.getElementById('detectedIds').textContent = 
                    'Detected markers: ' + Array.from(ids.data32S);
                
                // Draw 3D axes for each marker
                let rvecs = new cv.Mat();
                let tvecs = new cv.Mat();
                cv.aruco_estimatePoseSingleMarkers(corners, 0.05, camera_matrix, dist_coeffs, rvecs, tvecs);
                
                for(let i = 0; i < ids.rows; i++) {
                    cv.aruco_drawAxis(src, camera_matrix, dist_coeffs, 
                              rvecs.row(i), tvecs.row(i), 0.1);
                    
                    // Overlay image if marker ID matches
                    if (overlayImage && ids.data32S[i] === targetMarkerId) {
                        overlayImageOnMarker(src, corners, i);
                    }
                }
                
                rvecs.delete();
                tvecs.delete();
            }
            
            cv.imshow('canvasOutput', src);
            
            requestAnimationFrame(process);
        } catch (err) {
            console.error('Error in process:', err);
        }
    }
    
    process();
}

function overlayImageOnMarker(src, corners, markerIndex) {
    // Get marker corners
    let markerCorners = corners.get(markerIndex);
    
    // Calculate transformation matrix
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        overlayImage.cols, 0,
        overlayImage.cols, overlayImage.rows,
        0, overlayImage.rows
    ]);
    
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        markerCorners.data32F[0], markerCorners.data32F[1],
        markerCorners.data32F[2], markerCorners.data32F[3],
        markerCorners.data32F[4], markerCorners.data32F[5],
        markerCorners.data32F[6], markerCorners.data32F[7]
    ]);
    
    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    
    // Apply perspective transformation
    let overlayWarped = new cv.Mat();
    let dsize = new cv.Size(src.cols, src.rows);
    cv.warpPerspective(overlayImage, overlayWarped, M, dsize, 
                      cv.INTER_LINEAR, cv.BORDER_TRANSPARENT);
    
    // Blend images
    cv.addWeighted(src, 1, overlayWarped, 1, 0, src);
    
    // Cleanup
    srcTri.delete();
    dstTri.delete();
    M.delete();
    overlayWarped.delete();
}


// window.onload = function() {
//     if (cv.getBuildInformation) {
//         console.log('OpenCV.js is ready');
//     } else {
//         console.log('OpenCV.js is still loading...');
//     }
// };