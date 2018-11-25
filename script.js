// Generate random room name if needed
if (!location.hash) {
  location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
}
const roomHash = location.hash.substring(1);
const target = document.getElementById("url");
const roomUrl = "https://jeongyonghyun.github.io/#" + roomHash;
target.innerHTML = roomUrl;

const qrTarget = document.getElementById("qrCode");
const qrAddr = '"https://chart.googleapis.com/chart?chs=200x200&amp;cht=qr&amp;chl='+roomUrl + '"';
qrTarget.setAttribute('src',qrAddr);
console.log("img src = ",qrAddr);


      
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

const name = prompt("Input your name");
drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
  room = drone.subscribe(roomName);
  room.on('open', error => {
    if (error) {
      onError(error);
    }
      console.log('Connected to Signaling server');
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
    dataChannel = pc.createDataChannel('chat');
    setupDataChannel();
  }else{
      pc.ondatachannel = event =>{
          dataChannel = event.channel;
          setupDataChannel();
      }
  }
    startListeningToSignals();
    
  // When a remote stream arrives display it in the #remoteVideo element
  pc.ontrack = event => {
    const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
    }
  };

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
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
    dataChannel.onmessage = event =>
    insertMessageToDOM(JSON.parse(event.data),false)
}

function checkDataChannelState(){
    console.log('WebRTC channel state is : ', dataChannel.readyState);
    if(dataChannel.readyState === 'open'){
        insertMessageToDOM({content :'WebRTC data channel is now open'});
    }
}

function insertMessageToDOM(options,isFromMe){
    const template = document.querySelector('template[data-template = "message"]');
    const nameEl = template.content.querySelector('.message__name');
    if(options.name){
        nameEl.innerText = options.name;
    }
    template.content.querySelector('.message__bubble').innerText = options.conten;
    const clone = document.importNode(template.content,true);
    const messageEl = clone.querySelector('.message');
    if(isFromMe){
        messageEl.classList.add('message--mine');
    }else{
        messageEl.classList.add('message--theirs');
    }
    
    const messagesEl = document.querySelector('.messages');
    messagesEl.appendChild(clone);
    
    messagesEl.scrollTop = messageEl.scrollHeight -messagesEl.clientHeight;
}

const form = document.querySelector('form');
form.addEventListener('submit',()=>{
    const input = document.querySelector('input[type="text"]');
    const value = input.value;
    input.value = ' ';
        
    const data = {
        name,
        content: value,
    };
    dataChannel.send(JSON.stringify(data));
    insertMessageToDOM(data,true);
});