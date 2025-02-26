// Shared utility functions and OpenCV initialization
export async function initOpenCV() {
    return new Promise((resolve) => {
        cv.then((cvInstance) => {
            window.cv = cvInstance;
            console.log('OpenCV.js is ready');
            resolve(cvInstance);
        });
    });
}

export function getDictionary(dictValue) {
    return cv.getPredefinedDictionary(cv[dictValue]);
} 