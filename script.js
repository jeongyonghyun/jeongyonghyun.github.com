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
  //dataChannel = pc.createDataChannel('gps');
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
      dataChannel = pc.createDataChannel('gps');
      setupDataChannel();
    // console.log("dataChannel :", dataChannel)
  }else{
      pc.ondatachannel = event =>{
          dataChannel = event.channel;
          setupDataChannel();
      };
  };
    
 startListeningToSignals();

 // find location
    let lat, long;
    let centerLocation;
    let remoteLocation;
    
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
            centerLocation = {lat: lat, lng : long};
            console.log("Center location : ", centerLocation);
            
            document.getElementById("lat").value = lat;
            document.getElementById("long").value = long;
            /*
            const gps = document.querySelector('#map');
            let map;
    
            map = new google.maps.Map(gps,{
                center : centerLocation,
                zoom : 16
            });
            
            var marker = new google.maps.Marker({
                position : centerLocation,
                animation : google.maps.Animation.BOUNCE
            });
            
             marker.setMap(map);*/
            
            dataChannel.send(JSON.stringify(centerLocation));  
        }

        function errorPosition(error){
            alert(error.message);
        }
    
  // When a remote stream arrives display it in the #remoteVideo element
  pc.ontrack = event => {
     const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
      recordButton.disabled = false;
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

'use strict';

/* globals MediaRecorder */

const mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
let mediaRecorder;
let recordedBlobs;
let sourceBuffer;
const locVideo = document.querySelector('video#localVideo');
const recordedVideo = document.querySelector('video#recordVideo');
const recordButton = document.querySelector('button#record');
const playButton = document.querySelector('button#play');
const downloadButton = document.querySelector('button#download'); 
    
recordButton.onclick = toggleRecording;
playButton.onclick = play;
downloadButton.onclick = download;
    
var stream = locVideo.captureStream();
console.log("start stream capture from local video : ", stream);
    
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
  mediaRecorder.start(100); // collect 100ms of data
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
}

function localDescCreated(desc) {
  pc.setLocalDescription(
    desc,
    () => sendMessage({'sdp': pc.localDescription}),
    onError
  );
}

function setupDataChannel(){
    checkDataChannelState();
    dataChannel.onopen = checkDataChannelState;
    dataChannel.onclose = checkDataChannelState;
    dataChannel.onmessage = (event) =>{
        console.log('got JSON data :',event.data);
        var gpsData = JSON.parse(event.data);
        var latit = gpsData.lat;
        var longi = gpsData.lng;
        console.log('remote peer latitude :',latit);
        console.log('remote peer longitude :',longi);
        document.getElementById("remote_lat").value = latit;
        document.getElementById("remote_long").value = longi;
           const gps = document.querySelector('#map');
            let map;
            remoteLocation = {lat : latit, lng : longi};
            console.log("remoteLocation :", remoteLocation);
            map = new google.maps.Map(gps,{
                center : remoteLocation,
                zoom : 14
            });
            
            var marker = new google.maps.Marker({
                position : remoteLocation,
                animation : google.maps.Animation.BOUNCE
            });
            
             marker.setMap(map);
    }
}

function checkDataChannelState(){
    console.log('WenbRTC channel state is : ',dataChannel.readyState);
    if(dataChannel.readyState === 'open'){
       console.log('WebRTC is open now');
    }
}

