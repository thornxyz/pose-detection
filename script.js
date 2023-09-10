const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const feedbackDiv = document.querySelector('.feedback');
const recordButton = document.querySelector('.record');
let audio; 
let lastBadPostureTime = 0; 
let badPostureDuration = 0; 
let isRecording = false; 
let recordedAngle = null; 
let goodPostureAngle = null; 
let soundDelayTimer = null; 

function onResults(results) {
    if (!results.poseLandmarks) {
        return;
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = 'source-in';
    canvasCtx.fillStyle = '#00FF00';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    
    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = 'source-over';
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
    drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

    const landmarks = results.poseLandmarks;
    const a = landmarks[11];
    const b = landmarks[0];
    const c = landmarks[12];
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    const angle = Math.abs((radians * 180.0) / Math.PI);

    let normalizedAngle = angle;
    if (normalizedAngle > 180.0) {
        normalizedAngle = 360 - normalizedAngle;
    }

    const poseLandmarksDiv = document.querySelector('.pose-landmarks');
    poseLandmarksDiv.innerHTML = `Angle: ${normalizedAngle.toFixed(2)} degrees`;

    if (isRecording) {
        recordedAngle = normalizedAngle; 
        feedbackDiv.textContent = 'Recording...';
    } else if (recordedAngle !== null) { 
        if (Math.abs(normalizedAngle - recordedAngle) > 10) {
            const currentTime = new Date().getTime();
            const postureDuration = (currentTime - lastBadPostureTime) / 1000; 

            if (postureDuration >= 3 && !soundDelayTimer) {
                soundDelayTimer = setTimeout(() => {
                    feedbackDiv.textContent = 'BAD';
                    playAlertSound(); 
                }, 3000); 
            } else {
                feedbackDiv.textContent = 'BAD';
            }
        } else {
            feedbackDiv.textContent = 'GOOD';
            lastBadPostureTime = 0; 
            badPostureDuration = 0; 
            clearTimeout(soundDelayTimer); 
            soundDelayTimer = null; 
        }
    }
}

const pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
    }
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: true,
    smoothSegmentation: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
camera.start();

function recordAngle() {
    if (!isRecording) {
        isRecording = true;
        recordButton.textContent = 'Stop Recording';
        feedbackDiv.textContent = 'Recording Angle...';
    } else {
        isRecording = false;
        recordButton.textContent = 'Record Angle';
        feedbackDiv.textContent = 'Recording Stopped';
        goodPostureAngle = recordedAngle; 
    }
}

function playAlertSound() {
   
    if (!audio || audio.paused) {
        audio = new Audio('sound.wav'); 
        audio.play(); 
    }
}


function changeBackgroundColor() {
    const feedbackElement = document.querySelector('.feedback');
    const feedElement = document.querySelector('.feed');

    if (feedbackElement.textContent.trim().toLowerCase() === 'bad') {
        feedElement.style.backgroundColor = '#992600';
    } else if (feedbackElement.textContent.trim().toLowerCase() === 'good') {
        feedElement.style.backgroundColor = '#008000';
    } else {
        
        feedElement.style.backgroundColor = '#008000'; 
    }
}

changeBackgroundColor();

const observer = new MutationObserver(changeBackgroundColor);
observer.observe(document.querySelector('.feedback'), { childList: true });
