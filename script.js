// Generate random room name if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);
const roomUrl = "https://jeongyonghyun.github.io/#" + roomHash;
const newUrl = encodeURIComponent(roomUrl);
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
var scope = 16;
var cameraSrc = "environment";

function onSuccess() {};
function onError(error) {
    console.error(error);
    document.getElementById("status").value = "cannot open the room";
    document.getElementById("connect").value = "Remote side is not connected";
    document.getElementById("connect").style.backgroundColor = "red";
    document.getElementById("connect").style.color = "white";
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
          document.getElementById("status").value = "this room is full";
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
           /*
            setTimeout(function(){
                navigator.geolocation.clearWatch(watchID);
            },30000000);
            */
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
        var video = $("#remoteVideo")[0];
        
        video.onloadedmetadata = function(){
            console.log("width is ",this.videoWidth);
            console.log("height is ",this.videoHeight); 
            var videoSize = this.videoWidth + " * " + this.videoHeight;
            document.getElementById("resolution").value = videoSize;
        }
    }
  };
     
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {facingMode : cameraSrc},
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
    const locVideo = document.querySelector('video#localVideo');
    const recordedVideo = document.querySelector('video#recordVideo');

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
    // gps data arrives from a remote user
    dataChannel.onmessage = (event) =>{
        console.log('got JSON data :',event.data);
        var getData = JSON.parse(event.data);
        var latit = getData.lat;
        var longi = getData.lng;
        
        document.getElementById("status").value = "now sending remote GPS";
        console.log('remote peer latitude :',latit);
        console.log('remote peer longitude :',longi);
        document.getElementById("remote_lat").value = latit;
        document.getElementById("remote_long").value = longi;
            const gps = document.querySelector('#map');
            let map;
            remoteLocation = {lat : latit, lng : longi};
            console.log("remoteLocation :", remoteLocation);
            document.getElementById("connect").value = "Remote side is now connected";
            document.getElementById("connect").style.backgroundColor = "lightgreen";
            document.getElementById("connect").style.color = "white";
            
            map = new google.maps.Map(gps,{
                center : remoteLocation,
                zoom : scope
            });
            
            var image = {
                url : "CDV.png",
                size : new google.maps.Size(40,40),
                origin : new google.maps.Point(0,0),
                anchor : new google.maps.Point(20,40)
            }
            var marker = new google.maps.Marker({
                title : 'CUbE is here',
                icon : image,
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
    }else if(dataChannel.readyState === 'closed'){
        document.getElementById("connect").value = "Remote side is disconnected";
        document.getElementById("connect").style.backgroundColor = "red";
        document.getElementById("connect").style.color = "white";
    }
}

