import * as store from './store.js';

let mediaRecorder;

const vp9Codec = 'video/webm; codecs=vp=9';
const vp9Options = { mineType: vp9Codec };
const recordedChunks = [];

async function captureAudio(
    mediaContraints = {
        video: false,
        audio: true,
    }
){
    const audioStream = await navigator.mediaDevices.getUserMedia(mediaContraints);
    return audioStream;
}

export const startRecording = async () =>{
    const remoteStream = store.getState().remoteStream;

    const audioStream = await captureAudio();
    const stream = new MediaStream([
        ...audioStream.getAudioTracks(),
        ...remoteStream.getVideoTracks(),
    ]);

    if(MediaRecorder.isTypeSupported(vp9Codec)){
        mediaRecorder = new MediaRecorder(stream, vp9Options);
    }
    else{
        mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.start();
    mediaRecorder.ondataavailable = handleDataAvailable;
}

export const pauseRecording = () =>{
    mediaRecorder.pause();
}

export const resumeRecording = () =>{
    mediaRecorder.resume();
}

export const stopRecording = () =>{
    mediaRecorder.stop();
}

const downloadRecordedVideo = () =>{
    const blob = new Blob(recordedChunks, {
        type: 'video/webm'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style = 'display: none;';
    a.href = url;
    a.download = 'recording.webm';
    a.click();
    window.URL.revokeObjectURL(url);
}

const handleDataAvailable = (event) =>{
    if(event.data.size > 0){
        recordedChunks.push(event.data);
        downloadRecordedVideo();
    }
}