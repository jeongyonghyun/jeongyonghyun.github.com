// Generate random room name if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);
const target = document.getElementById("url");
const roomUrl = "https://jeongyonghyun.github.io/#" + roomHash;
const newUrl = encodeURIComponent(roomUrl);
target.innerHTML = roomUrl;
console.log(roomUrl);

googleQRUrl = "https://chart.googleapis.com/chart?chs=177x177&cht=qr&chl=";
$('#qrCode').attr('src', googleQRUrl + newUrl,'&choe=UTF-8');

// TODO: Replace with your own channel ID
const drone = new ScaleDrone('63wnzap0klxFE9at');
// Room name needs to be prefixed with 'observable-'
const roomName = 'observable-' + roomHash;
const configuration = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  }]
};
let room;
let pc;
let dataChannel;
let lat, long;

function onSuccess() {};
function onError(error) {
    console.error(error);
};

drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
  room = drone.subscribe(roomName);
  room.on('open', error => {
    if (error) {
      onError(error);
    }
  });
    
  // We're connected to the room and received an array of 'members'
  // connected to the room (including us). Signaling server is ready.
  room.on('members', members => {
    console.log('MEMBERS', members);
      if(members.length >= 3){
          return alert('this room is full');
      }
    // If we are the second user to connect to the room we will be creating the offer
    const isOfferer = members.length === 2;
    startWebRTC(isOfferer);
  });
});

// Send signaling data via Scaledrone
function sendMessage(message) {
  drone.publish({
    room: roomName,
    message
  });
}

function startWebRTC(isOfferer) {
  console.log('Starting WebRTC in as ', isOfferer?'offerer':'waiter');
  pc = new RTCPeerConnection(configuration);

  // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
  // message to the other peer through the signaling server
  pc.onicecandidate = event => {
    if (event.candidate) {
      sendMessage({'candidate': event.candidate});
    }
  };

  // If user is offerer let the 'negotiationneeded' event create the offer
  if (isOfferer) {
    pc.onnegotiationneeded = () => {
      pc.createOffer().then(localDescCreated).catch(onError);
    }
   // dataChannel = pc.createDataChannel('chat');
    //setupDataChannel();
      //console.log("dataChannel :", dataChannel)
  }/*else{
      pc.ondatachannel = event =>{
          dataChannel = event.channel;
          //setupDataChannel();
      }
  }*/
    
    //startListeningToSignals();
 // find location
  if(navigator.geolocation){
            console.log("geolocation is available");
            var options = {
                enableHighAccuracy : true,
                timeout : Infinity,
                maximumAge : 0
            };
            var watchID = navigator.geolocation.watchPosition(showPosition,errorPosition,options);
            setTimeout(function(){
                navigator.geolocation.clearWatch(watchID);
            },30000000);
      
        }else{
            alert("you cant use this service");
        }
    
        function showPosition(position){
            lat = position.coords.latitude;
            long = position.coords.longitude;
            var centerLocation = {lat: lat, lng : long};
            console.log("Center location : ", centerLocation);
            printlocation(centerLocation); //added fn
            document.getElementById("lat").value = lat;
            document.getElementById("long").value = long;
            const gps = document.querySelector('#map');
            let map;
    
            map = new google.maps.Map(gps,{
                center : centerLocation,
                zoom : 17
            });
            
            var marker = new google.maps.Marker({
                position : centerLocation,
                animation : google.maps.Animation.BOUNCE
            });
            
             marker.setMap(map);     
        }
    
      
        function  printlocation(value){
            console.log("location :", value);
        }
        function errorPosition(error){
            alert(error.message);
        }
     ////////////////////////////////////////////////////////////////////////////////
    'use strict';

    var localConnection;
    var remoteConnection;
    var sendChannel;
    var receiveChannel;
    var pcConstraint;
    var dataConstraint;
    var dataChannelReceive = document.querySelector('input#receive'); //remote GPS latitude
    var startButton = document.querySelector('button#startButton');
    var closeButton = document.querySelector('button#closeButton');

    startButton.onclick = createConnection;
    closeButton.onclick = closeDataChannels;

    function enableStartButton() {
      startButton.disabled = false;
      startButton.textContent = "Now you can connect";
    }
    
    function createConnection() {
      var servers = null;
      pcConstraint = null;
      dataConstraint = null;

      localConnection = new RTCPeerConnection(servers, pcConstraint);

      sendChannel = localConnection.createDataChannel('sendDataChannel',
        dataConstraint);

      sendChannel.onopen = onSendChannelStateChange;
      sendChannel.onclose = onSendChannelStateChange;

        /// remote connction
      remoteConnection = new RTCPeerConnection(servers, pcConstraint);

      remoteConnection.ondatachannel = receiveChannelCallback;

      localConnection.createOffer().then(
        gotDescription1
      );
      startButton.disabled = true;
      startButton.textContent = "connecting";
      closeButton.disabled = false;
      console.log("createConnection function is active");
    }
    
    ////////////// this is the most important one
    function sendData() {
        //showPosition();
        //var data = centerLocation; // need to change to GPS (data to centerlocation)
     //sendChannel.send(data);
    }
    
    function closeDataChannels() {

      sendChannel.close();
      receiveChannel.close();
      localConnection.close();
      remoteConnection.close();
      localConnection = null;
      remoteConnection = null;
      startButton.disabled = false;
      closeButton.disabled = true;
     // dataChannelSend.value = '';
      //dataChannelReceive.value = '';
      enableStartButton();
    }

    function gotDescription1(desc) {
      localConnection.setLocalDescription(desc);
      remoteConnection.setRemoteDescription(desc);
      remoteConnection.createAnswer().then(
        gotDescription2
      );
        console.log("gotDescription1 started");
    }

    function gotDescription2(desc) {
      remoteConnection.setLocalDescription(desc);
      localConnection.setRemoteDescription(desc);
      console.log("gotDescription2 started");
    }

    function getOtherPc(pc) {
      return (pc === localConnection) ? remoteConnection : localConnection;
    }

    function getName(pc) {
      return (pc === localConnection) ? 'localPeerConnection' : 'remotePeerConnection';
    }

    function receiveChannelCallback(event) {
      receiveChannel = event.channel;
      receiveChannel.onmessage = onReceiveMessageCallback;
      receiveChannel.onopen = onReceiveChannelStateChange;
      receiveChannel.onclose = onReceiveChannelStateChange;
    }


    function onReceiveMessageCallback(event) {
      dataChannelReceive.value = event.data;
        console.log("event.data : ",event.data);
    }

    function onSendChannelStateChange() {
      var readyState = sendChannel.readyState;
      if (readyState === 'open') {
          console.log("sendchannel is ready");
        //dataChannelSend.focus();
        closeButton.disabled = false;
      } else {
        closeButton.disabled = true;
        console.log("sendchannel is closed");
      }
    }

    function onReceiveChannelStateChange() {
      var readyState = receiveChannel.readyState;
    }    

////////////////////////////////////////////////////////////////////////////////  
    
  // When a remote stream arrives display it in the #remoteVideo element
  pc.ontrack = event => {
     const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
      recordButton.disabled = false;
      //gum.srcObject = stream;
    }
  };
    
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {facingMode : "environment"},
  }).then(stream => {
    // Display your local video in #localVideo element
    localVideo.srcObject = stream;
    // Add your stream to be sent to the conneting peer
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
  }, onError);


  // Listen to signaling data from Scaledrone
  room.on('data', (message, client) => {
    // Message was sent by us
    if (client.id === drone.clientId) {
      return;
    }

    if (message.sdp) {
      // This is called after receiving an offer or answer from another peer
      pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        // When receiving an offer lets answer it
        if (pc.remoteDescription.type === 'offer') {
          pc.createAnswer().then(localDescCreated).catch(onError);
        }
      }, onError);
    } else if (message.candidate) {
      // Add the new ICE candidate to our connections remote description
      pc.addIceCandidate(
        new RTCIceCandidate(message.candidate), onSuccess, onError
      );
    }
  });

//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%//
'use strict';

/* globals MediaRecorder */

const mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
let mediaRecorder;
let recordedBlobs;
let sourceBuffer;
const remotedVideo = document.querySelector('video#remoteVideo'); //
const streamedVideo = document.querySelector('video#gum');
const recordedVideo = document.querySelector('video#recorded');
    
//const errorMsgElement = document.querySelector('span#errorMsg');
const recordButton = document.querySelector('button#record');
const playButton = document.querySelector('button#play');
const downloadButton = document.querySelector('button#download'); 
    
recordButton.onclick = toggleRecording;
playButton.onclick = play;
downloadButton.onclick = download;
    
const stream = remotedVideo.captureStream();
console.log("start stream capture from remote video : ", stream);
    
function handleSourceOpen(event) {
  console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
  console.log('Source buffer: ', sourceBuffer);
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}
    
function handleStop(event) {
  console.log('Recorder stopped: ', event);
  const superBuffer = new Blob(recordedBlobs, {type: 'video/webm'});
  recordedVideo.src = window.URL.createObjectURL(superBuffer);
}
    
function toggleRecording() {
  if (recordButton.textContent === 'Start Recording') {
    startRecording(); 
  } else {
    stopRecording();
    recordButton.textContent = 'Start Recording';
    recordButton.style.fontSize = '14px';
    recordButton.style.backgroundColor = 'grey';
    playButton.disabled = false;
    downloadButton.disabled = false;
  }
}    
    
function startRecording() {
  let options = {mimeType: 'video/webm;codecs=vp9'};
  recordedBlobs = [];
  try {
    mediaRecorder = new MediaRecorder(stream, options);
  } catch (e0) {
    console.log('Unable to create MediaRecorder with options Object: ', e0);
    try {
      options = {mimeType: 'video/webm,codecs=vp9'};
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e1) {
      console.log('Unable to create MediaRecorder with options Object: ', e1);
      try {
        options = 'video/vp8'; // Chrome 47
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e2) {
        alert('MediaRecorder is not supported by this browser.\n\n' +
          'Try Firefox 29 or later, or Chrome 47 or later, ' +
          'with Enable experimental Web Platform features enabled from chrome://flags.');
        console.error('Exception while creating MediaRecorder:', e2);
        return;
      }
    }
  }
  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.textContent = 'Stop';
  recordButton.style.fontSize = '28px';
  recordButton.style.backgroundColor = 'red';
  playButton.disabled = true;
  downloadButton.disabled = true;
  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(10); // collect 100ms of data
  console.log('MediaRecorder started', mediaRecorder);
}   

function stopRecording() {
  mediaRecorder.stop();
  console.log('Recorded Blobs: ', recordedBlobs);
  recordedVideo.controls = true;
}
    
function play() {
  recordedVideo.play();
}
    
function download() {
  const blob = new Blob(recordedBlobs, {type: 'video/webm'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  const t = new Date();
  a.download = t+ '.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}
    
}
/*
function startListeningToSignals(){
    room.on('data',(message,client)=>{
        if(client.id === drone.clientId){
            return;
        }
        if(message.sdp){
            pc.setRemoteDescription(new RTCSessionDescription(message.sdp),()=>{
                console.log('pc.remoteDescription.type',pc.remoteDescription.type);
                
                if(pc.remoteDescription.type === 'offer'){
                    console.log('Answering offer');
                    pc.createAnswer(localDescCreated,onError);
                }
            },onError);
        }else if(message.candidate){
            pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
    });
}*/


function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendMessage({'sdp': pc.localDescription}),
    onError
  );
}


