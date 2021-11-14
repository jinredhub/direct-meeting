import * as store from './store.js';
import * as wss from './wss.js';
import * as webRTCHandler from './webRTCHandler.js';
import * as constants from './constants.js';
import * as ui from './ui.js';
import * as recordingUtils from './recordingUtils.js';

// initialization of socket io connection
const socket = io('/'); // conect to server. port will added automatically.
wss.registerSocketEvents(socket);

webRTCHandler.getLocalPreview();

// register event listener for personal code copy button
const personalCodeCopyButton = document.getElementById('personal_code_copy_button');
personalCodeCopyButton.addEventListener('click', () =>{
    // get personal code from store
    const personalCode = store.getState().socketId;
    navigator.clipboard && navigator.clipboard.writeText(personalCode);

    // show popup
    const popup = document.getElementById('popup-copied');
    popup.classList.remove('display_none');
    
    setTimeout(() =>{
        popup.classList.add('display_none');
    }, 4000);
});

// register event listeners for connection buttons
const personalCodeVideoButton = document.getElementById('personal_code_video_button');

personalCodeVideoButton.addEventListener('click', () =>{
    // get the code fromt he input
    const calleePersonalCode = document.getElementById('personal_code_input').value;
    const callType = constants.callType.VIDEO_PERSONAL_CODE;

    webRTCHandler.sendPreOffer(callType, calleePersonalCode);
});

const personalCodeInput = document.getElementById('personal_code_input');
personalCodeInput.addEventListener('keyup', (ev) =>{
    // console.log('ev: ', ev);
    
    if(ev.key === 'Enter'){
        // get the code fromt he input
        const calleePersonalCode = document.getElementById('personal_code_input').value;
        const callType = constants.callType.VIDEO_PERSONAL_CODE;

        webRTCHandler.sendPreOffer(callType, calleePersonalCode);
    }
});

// event listeners for video call buttons

const micButton = document.getElementById('mic_button');
micButton.addEventListener('click', () =>{
    const localStream = store.getState().localStream;
    // check if mic is on
    const micEnabled = localStream.getAudioTracks()[0].enabled;
    localStream.getAudioTracks()[0].enabled = !micEnabled;
    ui.updateMicButton(micEnabled);
});

const cameraButton = document.getElementById('camera_button');
cameraButton.addEventListener('click', () =>{
    const localStream = store.getState().localStream;
    // check if video is on
    const cameraEnabled = localStream.getVideoTracks()[0].enabled;
    localStream.getVideoTracks()[0].enabled = !cameraEnabled;
    ui.updateCameraButton(cameraEnabled);
});


const switchForScreenSharingButton = document.getElementById('screen_sharing_button');
switchForScreenSharingButton.addEventListener('click', () =>{
    const screenSharingActive = store.getState().screenSharingActive;
    webRTCHandler.switchBetweenCameraAndScreenSharing(screenSharingActive);
});


// messenger

const newMessageInput = document.getElementById('new_message_input');
newMessageInput.addEventListener('keydown', (event) =>{
    const key = event.key;

    if(key === 'Enter'){
        webRTCHandler.sendMessageUsingDataChannel(event.target.value);
        ui.appendMessage(event.target.value, true);
        newMessageInput.value = '';
    }
});

const sendMessageButton = document.getElementById('send_message_button');
sendMessageButton.addEventListener('click', () =>{
    const message = newMessageInput.value;
    webRTCHandler.sendMessageUsingDataChannel(message);
    ui.appendMessage(message, true);
    newMessageInput.value = '';
});

// recording

const startRecordingButton = document.getElementById('start_recording_button');
startRecordingButton.addEventListener('click', () =>{
    recordingUtils.startRecording();
    ui.showRecordingPanel();
});

const stopRecordingButton = document.getElementById('stop_recording_button');
stopRecordingButton.addEventListener('click', () =>{
    recordingUtils.stopRecording();
    ui.resetRecordingButtons();  
});

// const pauseRecordingButton = document.getElementById('pause_recording_button');
// pauseRecordingButton.addEventListener('click', () =>{
//     recordingUtils.pauseRecording();
//     ui.switchRecordingButtons(true);
// });

// const resumeRecordingButton = document.getElementById('resume_recording_button');
// resumeRecordingButton.addEventListener('click', () =>{
//     recordingUtils.resumeRecording();
//     ui.switchRecordingButtons();
// });


// hang up

const hangUpButton = document.getElementById('hang_up_button');
hangUpButton.addEventListener('click', () =>{
    webRTCHandler.handleHangUp();
});

const hangUpChatButton = document.getElementById('finish_chat_call_button');
hangUpChatButton.addEventListener('click', () =>{
    webRTCHandler.handleHangUp();
});