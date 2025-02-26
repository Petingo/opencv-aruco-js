let dictionary = null;

function initializeControls() {
    document.getElementById('generateBtn').addEventListener('click', generateMarkers);
    document.getElementById('downloadBtn').addEventListener('click', downloadImage);
    document.getElementById('printBtn').addEventListener('click', printMarkers);
    document.getElementById('dictionary').addEventListener('change', () => {
        dictionary = getDictionary();
    });
}

function getDictionary() {
    const dictValue = document.getElementById('dictionary').value;
    return cv.getPredefinedDictionary(cv[dictValue]);
}

function generateMarkers() {
    if (!cv || !dictionary) {
        console.error('OpenCV or dictionary not initialized');
        return;
    }

    const markerSize = Number(document.getElementById('markerSize').value);
    const startId = Number(document.getElementById('startId').value);
    const numMarkers = Number(document.getElementById('numMarkers').value);
    const columns = Number(document.getElementById('columns').value);
    const gap = Number(document.getElementById('gap').value);
    
    const rows = Math.ceil(numMarkers / columns);
    const totalWidth = columns * markerSize + (columns - 1) * gap;
    const totalHeight = rows * markerSize + (rows - 1) * gap;
    
    const canvas = document.getElementById('markersCanvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    
    const dst = new cv.Mat(totalHeight, totalWidth, cv.CV_8UC1, new cv.Scalar(255));
    
    for (let i = 0; i < numMarkers; i++) {
        const markerId = startId + i;
        const row = Math.floor(i / columns);
        const col = i % columns;
        
        const x = col * (markerSize + gap);
        const y = row * (markerSize + gap);
        
        let markerImg = new cv.Mat();
        dictionary.generateImageMarker(markerId, markerSize, markerImg, 1);
        
        let roi = dst.roi(new cv.Rect(x, y, markerSize, markerSize));
        markerImg.copyTo(roi);
        
        markerImg.delete();
        roi.delete();
    }
    
    cv.imshow('markersCanvas', dst);
    dst.delete();
}

function downloadImage() {
    const canvas = document.getElementById('markersCanvas');
    const link = document.createElement('a');
    link.download = 'aruco-markers.png';
    link.href = canvas.toDataURL();
    link.click();
}

function printMarkers() {
    const canvas = document.getElementById('markersCanvas');
    const win = window.open('');
    win.document.write(`
        <html>
            <head>
                <title>Print Aruco Markers</title>
                <style>
                    @media print {
                        img { max-width: 100%; }
                    }
                </style>
            </head>
            <body>
                <img src="${canvas.toDataURL()}" onload="window.print();window.close()">
            </body>
        </html>
    `);
} 