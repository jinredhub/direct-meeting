import * as store from './store.js';
import * as ui from './ui.js';
import * as webRTCHandler from './webRTCHandler.js';
import * as constants from './constants.js';

let socketIO = null;

export const registerSocketEvents = (socket) =>{
    socketIO = socket;

    // when we successfully get a respond from the server
    socket.on('connect', () =>{
        console.log('successfuly connected to socket.io server');
        store.setSocketId(socket.id);
        ui.updatePersonalCode(socket.id);
    });

    // receive an pre-offer
    socket.on('pre-offer', (data) =>{
        webRTCHandler.handlePreOffer(data);

        // console.log('ringtone start--------------------');
        const ringtoneAudioPlayer = document.getElementById('ringtoneAudioPlayer');
        ringtoneAudioPlayer.play();
    });

    // reveive an answer accepted/rejected
    socket.on('pre-offer-answer', (data)=>{
        webRTCHandler.handlePreOfferAnswer(data);

        // console.log('ringtone stopped--------------------');
        const ringtoneAudioPlayer = document.getElementById('ringtoneAudioPlayer');
        ringtoneAudioPlayer.pause();
        ringtoneAudioPlayer.currentTime = 0;
    });

    socket.on('user-hanged-up', () =>{
        webRTCHandler.handleConnectedUserHangedUp();

        // console.log('ringtone stopped3--------------------');
        const ringtoneAudioPlayer = document.getElementById('ringtoneAudioPlayer');
        ringtoneAudioPlayer.pause();
        ringtoneAudioPlayer.currentTime = 0;
    });

    socket.on('webRTC-signaling', (data) =>{
        switch (data.type){
            case constants.webRTCSignaling.OFFER:
                webRTCHandler.handleWebRTCOffer(data);
                break;
            case constants.webRTCSignaling.ANSWER:
                webRTCHandler.handleWebRTCAnswer(data);
                break;
            case constants.webRTCSignaling.ICE_CANDIDATE:
                webRTCHandler.handleWebRTCCandidate(data);
                break;
            default:
                return;
        }
    });
}

export const sendPreOffer = (data) =>{
    socketIO.emit('pre-offer', data);
}

export const sendPreOfferAnswer = (data) =>{
    socketIO.emit('pre-offer-answer', data);
}

export const sendDataUsingWebRTCSignaling = (data) =>{
    socketIO.emit('webRTC-signaling', data);
}

export const sendUserHangedUp = (data) =>{
    socketIO.emit('user-hanged-up', data);
}