import * as wss from './wss.js';
import * as constants from './constants.js';
import * as ui from './ui.js';
import * as store from './store.js';

let connectedUserDetails;
let peerConnection;
let dataChannel;

const defaultConstrains = {
    audio: true,
    video: true
}

const configuration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        },
        {
            urls: 'stun:stun1.l.google.com:19302'
        }
    ]
}

export const getLocalPreview = () =>{
    navigator.mediaDevices.getUserMedia(defaultConstrains)
    .then((stream) =>{
        ui.updateLocalVideo(stream);
        ui.showVideoCallButtons();
        store.setCallState(constants.callState.CALL_AVAILABLE);
        store.setLocalStream(stream);
    }).catch((err)=>{
        console.log('error occured when trying to get an access to camera: ', err);
    })
}

const createPeerConnection = () =>{
    peerConnection = new RTCPeerConnection(configuration);

    // for chat
    dataChannel = peerConnection.createDataChannel('chat');

    peerConnection.ondatachannel = (event) =>{
        const dataChannel = event.channel;
        dataChannel.onopen = () =>{
            console.log('peer connection is reday to receive data channel messages');
        }

        dataChannel.onmessage = (event) =>{
            // console.log('message came from data channel: ', event);
            const message = JSON.parse(event.data);
            ui.appendMessage(message);
        }
    }

    peerConnection.onicecandidate = (event) =>{
        // console.log('getting ice candidates form stun server');
        if(event.candidate){
            // send our ice candidates to other peer
            wss.sendDataUsingWebRTCSignaling({
                connectedUserSocketId: connectedUserDetails.socketId,
                type: constants.webRTCSignaling.ICE_CANDIDATE,
                candidate: event.candidate,
            });
        }
    }

    peerConnection.onconnectionstatechange = (event) =>{
        if(peerConnection.connectionState === 'connected'){
            console.log('successfully connected with other peer');
        }
    }

    // receiving tracks
    const remoteStream = new MediaStream();
    store.setRemoteStream(remoteStream);
    ui.updateRemoteVideo(remoteStream);

    peerConnection.ontrack = (event) =>{
        remoteStream.addTrack(event.track);
    }

    // add our stream to peer connection
    if(connectedUserDetails.callType === constants.callType.VIDEO_PERSONAL_CODE){
        const localStream = store.getState().localStream;

        for(const track of localStream.getTracks()){
            peerConnection.addTrack(track, localStream);
        }
    }
}

export const sendMessageUsingDataChannel = (message) =>{
    const stringifiedMessage = JSON.stringify(message);
    dataChannel.send(stringifiedMessage);
}

export const sendPreOffer = (callType, calleePersonalCode) =>{
    connectedUserDetails = {
        callType,
        socketId: calleePersonalCode
    }

    if(callType === constants.callType.CHAT_PERSONAL_CODE || callType === constants.callType.VIDEO_PERSONAL_CODE){
        const data = {
            callType,
            calleePersonalCode
        }
    
        ui.showCallinDialog(callingDialogRejectCallHandler);
        store.setCallState(constants.callState.CALL_UNAVAILABLE);
        wss.sendPreOffer(data);

        // console.log('ringtone start2-------------------');
        const ringtoneAudioPlayer = document.getElementById('ringtoneAudioPlayer');
        ringtoneAudioPlayer.volume = 0.7;
        ringtoneAudioPlayer.play();
    }
}

// callee side
export const handlePreOffer = (data) =>{
    const {callType, callerSocketId} = data;

    if(!checkCallPossibility()){
        return sendPreOfferAnswer(constants.preOfferAnswer.CALL_UNAVAILABLE, callerSocketId);
    }

    connectedUserDetails = {
        socketId: callerSocketId,
        callType,
    }

    store.setCallState(constants.callState.CALL_UNAVAILABLE);

    if(callType === constants.callType.CHAT_PERSONAL_CODE || callType === constants.callType.VIDEO_PERSONAL_CODE){
        ui.showIncomingCallDialog(callType, acceptCallHandler, rejectCallHandler);
    }
}

const acceptCallHandler = () =>{
    // console.log('call accepted');
    createPeerConnection();
    sendPreOfferAnswer(constants.preOfferAnswer.CALL_ACCEPTED);
    ui.showCallElements(connectedUserDetails.callType);
}

const rejectCallHandler = () =>{
    // console.log('call rejected');
    setIncomingCallsAvailable();
    sendPreOfferAnswer(constants.preOfferAnswer.CALL_REJECTED);
}

const callingDialogRejectCallHandler = () =>{
    // console.log('rejecting the call');
    const data = {
        connectedUserSocketId: connectedUserDetails.socketId
    }
    closePeerConnectionAndResetState();

    wss.sendUserHangedUp(data);

    // console.log('ringtone stopped4-------------------');
    const ringtoneAudioPlayer = document.getElementById('ringtoneAudioPlayer');
    ringtoneAudioPlayer.pause();
    ringtoneAudioPlayer.currentTime = 0;
}

const sendPreOfferAnswer = (preOfferAnswer, callerSocketId = null) =>{
    const socketId = callerSocketId ? callerSocketId : connectedUserDetails.socketId;

    const data = {
        callerSocketId: socketId,
        preOfferAnswer
    }

    ui.removeAllDialogs();
    wss.sendPreOfferAnswer(data);

    // console.log('ringtone stopped2-------------------');
    const ringtoneAudioPlayer = document.getElementById('ringtoneAudioPlayer');
    ringtoneAudioPlayer.pause();
    ringtoneAudioPlayer.currentTime = 0;
}

export const handlePreOfferAnswer = (data) =>{
    // console.log('pre offer answer came');
    // console.log('dataaa: ', data);
    const {preOfferAnswer} = data;

    ui.removeAllDialogs();

    if(preOfferAnswer === constants.preOfferAnswer.CALLEE_NOT_FOUND){
        // show dialog that callee has not been found
        ui.showInfoDialog(preOfferAnswer);
        setIncomingCallsAvailable()
    }

    if(preOfferAnswer === constants.preOfferAnswer.CALL_UNAVAILABLE){
        // show dialog that callee is not able to connect
        ui.showInfoDialog(preOfferAnswer);
        setIncomingCallsAvailable();
    }

    if(preOfferAnswer === constants.preOfferAnswer.CALL_REJECTED){
        // show dialog that call is rejected by the callee
        ui.showInfoDialog(preOfferAnswer);
        setIncomingCallsAvailable();
    }

    if(preOfferAnswer === constants.preOfferAnswer.CALL_ACCEPTED){
        ui.showCallElements(connectedUserDetails.callType);
        createPeerConnection();
        // send webRTC offer
        sendWebRTCOffer();
    }
}

const sendWebRTCOffer = async () =>{
    // creats offer that includes STP??? information
    const offer = await peerConnection.createOffer();
    // set offer as our local description
    await peerConnection.setLocalDescription(offer);
    // send the offer to callee side
    wss.sendDataUsingWebRTCSignaling({
        connectedUserSocketId: connectedUserDetails.socketId,
        type: constants.webRTCSignaling.OFFER,
        offer: offer,
    });
}

export const handleWebRTCOffer = async (data) =>{
    // console.log('web RTC offer came: ', data);
    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    wss.sendDataUsingWebRTCSignaling({
        connectedUserSocketId: connectedUserDetails.socketId,
        type: constants.webRTCSignaling.ANSWER,
        answer: answer
    });
}

export const handleWebRTCAnswer = async (data) =>{
    // console.log('handling webRTC answer');
    await peerConnection.setRemoteDescription(data.answer);
}

export const handleWebRTCCandidate = async (data) =>{
    // console.log('handling incoming webRTC candidates');
    try{
        await peerConnection.addIceCandidate(data.candidate);
    }
    catch(err){
        console.log('err occured when trying to add received ice candidate: ', err);
    }
}

let screenSharingStream;

export const switchBetweenCameraAndScreenSharing = async (screenSharingActive) =>{
    if(screenSharingActive){
        // switch back to camera
        // console.log('store state: ', store.getState());
        const localStream = store.getState().localStream;
        const senders = peerConnection.getSenders();

        const sender = senders.find((sender) =>{
            return sender.track.kind === localStream.getVideoTracks()[0].kind;
        });

        if(sender){
            sender.replaceTrack(localStream.getVideoTracks()[0]);
        }

        // stop scren sharing stream
        store.getState().screenSharingStream.getTracks().forEach((track) =>{
            track.stop();
        });

        store.setScreenSharingActive(!screenSharingActive);

        ui.updateLocalVideo(localStream);
    }
    else{
        // console.log('switching for screen sharing');
        try{
            // gives access for the screen sharing stream
            screenSharingStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });

            // console.log('screenSharingStream: ', screenSharingStream);

            store.setScreenSharingStream(screenSharingStream);

            // replace track which sender is sending
            const senders = peerConnection.getSenders();

            const sender = senders.find((sender) =>{
                return sender.track.kind === screenSharingStream.getVideoTracks()[0].kind;
            });

            if(sender){
                sender.replaceTrack(screenSharingStream.getVideoTracks()[0]);
            }

            store.setScreenSharingActive(!screenSharingActive);

            ui.updateLocalVideo(screenSharingStream);
        }
        catch(err){
            console.log('error occured when trying to get screen sharing stream: ', err);
        }
    }
}


// hang up

export const handleHangUp = () =>{
    const data = {
        connectedUserSocketId: connectedUserDetails.socketId
    }

    wss.sendUserHangedUp(data);
    closePeerConnectionAndResetState();
}

export const handleConnectedUserHangedUp = () =>{
    closePeerConnectionAndResetState();
}

const closePeerConnectionAndResetState = () =>{
    if(peerConnection){
        peerConnection.close();
        peerConnection = null;
    }

    // active mic and camera
    if(connectedUserDetails.callType === constants.callType.VIDEO_PERSONAL_CODE || connectedUserDetails.callType === constants.callType.VIDEO_STRANGER){
        store.getState().localStream.getVideoTracks()[0].enabled = true;
        store.getState().localStream.getAudioTracks()[0].enabled = true;
    }

    ui.updateUIAfterHangUp(connectedUserDetails.callType);
    setIncomingCallsAvailable();
    connectedUserDetails = null;
}


const checkCallPossibility = (callType) =>{
    const callState = store.getState().callState;

    if(callState === constants.callState.CALL_AVAILABLE){
        return true;
    }

    if(
        (callType === constants.callType.VIDEO_PERSONAL_CODE || callType === constants.callType.VIDEO_STRANGER) &&
        callState === constants.callState.CALL_AVAILABLE_ONLY_CHAT
    ){
        return false;
    }

    return false;
}

const setIncomingCallsAvailable = () =>{
    const localStream = store.getState().localStream;
    if(localStream){
        store.setCallState(constants.callState.CALL_AVAILABLE);
    }
    else{
        store.setCallState(constants.callState.CALL_AVAILABLE_ONLY_CHAT);
    }
}