const express = require('express');
const http = require('http');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// 1. connect socket.io
const io = require('socket.io')(server);

app.use(express.static("public"));

app.get('/', (req, res) =>{
    res.sendFile(__dirname + '/public/index.html');
});

// store connected user id to server
let connectedPeers = [];

// 2. new connection event (mine and peers). io is a socket.io server
io.on('connection', (socket) =>{
    // console.log('new connection=============');
    connectedPeers.push(socket.id);
    // console.log(connectedPeers);

    socket.on('pre-offer', (data) =>{
        // console.log('pre-ofer-came-from-client');
        const {calleePersonalCode, callType} = data;

        // console.log('connectedPeers: ', connectedPeers);
        // console.log('calleePersonalCode: ', calleePersonalCode);
        
        // check if id exist
        const connectedPeer = connectedPeers.find((peerSockeId) =>{
            return peerSockeId == calleePersonalCode;
        });

        if(connectedPeer){
            const data = {
                callerSocketId: socket.id,
                callType,
            }

            // emit event to peer
            io.to(calleePersonalCode).emit('pre-offer', data);
        }
        else{
            const data = {
                preOfferAnswer: 'CALLEE_NOT_FOUND',
            }
            io.to(socket.id).emit('pre-offer-answer', data);
        }     
    });

    socket.on('pre-offer-answer', (data)=>{
        // console.log('pre offer answer came');
        // console.log('data: ', data);

        // check if id exist
        const connectedPeer = connectedPeers.find((peerSockeId) =>{
            return peerSockeId == data.callerSocketId;
        });

        if(connectedPeer){
            io.to(data.callerSocketId).emit('pre-offer-answer', data);
        }
    });

    socket.on('webRTC-signaling', (data) =>{
        // console.log('data2: ', data);

        // check if id exist
        const connectedPeer = connectedPeers.find((peerSockeId) =>{
            return peerSockeId == data.connectedUserSocketId;
        });

        if(connectedPeer){
            io.to(data.connectedUserSocketId).emit('webRTC-signaling', data);
        }
    });

    socket.on('user-hanged-up', (data) =>{
        // console.log('data3: ', data);

        // check if id exist
        const connectedPeer = connectedPeers.find((peerSockeId) =>{
            return peerSockeId == data.connectedUserSocketId;
        });

        if(connectedPeer){
            io.to(data.connectedUserSocketId).emit('user-hanged-up');
        } 
    });

    // disconnected event
    socket.on('disconnect', () =>{
        // console.log('user disconnected');
        const newConnectedPeers = connectedPeers.filter((peerSocketId)=> {
            return peerSocketId !== socket.id;
        });

        connectedPeers = newConnectedPeers;
        // console.log('disconnected, new connectedpeers: ', connectedPeers)

    })
});

server.listen(PORT, () =>{
    console.log(`listening on ${PORT}`);
});
