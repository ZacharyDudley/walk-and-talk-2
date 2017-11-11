'use strict'

const socket = new WebSocket('ws://localhost:3000/')
socket.binaryType = 'arraybuffer'

const buttonConnect = document.getElementById('buttonConnect')
const buttonDisconnect = document.getElementById('buttonDisconnect')
const buttonTalk = document.getElementById('buttonTalk')
const messageInputBox = document.getElementById('messageInputBox')
const receiveBox = document.getElementById('receiveBox')

let AudioContext = window.AudioContext || window.webkitAudioContext
let ac = new AudioContext()
let scriptNode = ac.createScriptProcessor(2048, 1, 1)
let source = ac.createBufferSource()

let startTime
let localStream
let pc1
let pc2
let offerToReceiveAudio
let localAudio = document.querySelector('localAudio')
let remoteAudio = document.querySelector('remoteAudio')

const getName = pc => { return pc === pc1 ? 'pc1' : 'pc2' }
const getOtherPc = pc => { return pc === pc1 ? pc2 : pc1 }

const trace = text => {
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1)
  }
  if (window.performance) {
    var now = (window.performance.now() / 1000).toFixed(3)
    console.log(now + ': ' + text)
  } else {
    console.log(text)
  }
}

const gotStream = stream => {
  trace('Received Local Stream')
  localAudio.srcObject = stream
  window.localStream = localStream = stream
  buttonConnect.disabled = false
}

const start = () => {
  trace('Requesting Local Stream')

  navigator.mediaDevices.getUserMedia({audio: true})
  .then(res => gotStream(res))
  // .then(res => onSuccess(res))
  .catch(err => console.error('getUserMedia ERROR: ', err.name))
}

const call = () => {
  trace('Starting Call')
  startTime = window.performance.now()
  let audioTracks = localStream.getAudioTracks()

  if (audioTracks.length) {
    trace('Using audio device: ' + audioTracks[0].label)
  }

  let servers = null

  window.pc1 = pc1 = new RTCPeerConnection(servers)
  trace('Created Local Peer Connection Object - PC1')
  pc1.onicecandidate = evnt => { onIceCandidate(pc1, evnt) }

  window.pc2 = pc2 = new RTCPeerConnection(servers)
  trace('Created Remote Peer Connection Object - PC2')
  pc2.onicecandidate = evnt => { onIceCandidate(pc2, evnt) }

  pc1.oniceconnectionstatechange = evnt => { onIceStateChange(pc1, evnt) }
  pc2.oniceconnectionstatechange = evnt => { onIceStateChange(pc2, evnt) }

  pc2.onaddstream = gotRemoteStream

  pc1.addStream(localStream)

  pc1.createOffer(offerToReceiveAudio)
    .then(onCreateOfferSuccess, onCreateSessionDescriptionError)
}

const onCreateSessionDescriptionError = err => {
  trace('Failed to create session description: ' + err.toString())
}

const onCreateOfferSuccess = desc => {
  trace('Offer from pc1\n' + desc.sdp)
  trace('pc1 setLocalDescription start')
  pc1.setLocalDescription(desc)
    .then( () => {
      onSetLocalSuccess(pc1)
    })
    .catch( onSetSessionDescriptionError )

  trace('pc2 setRemoteDescription start')
  pc2.setRemoteDescription(desc)
    .then( () => {
      onSetRemoteSuccess(pc2)
    })
    .catch( onSetSessionDescriptionError )

  pc2.createAnswer()
    .then( onCreateAnswerSuccess, onCreateSessionDescriptionError )
}

const onSetLocalSuccess = pc => {
  trace(getName(pc) + ' setLocalDescription complete');
}

const onSetRemoteSuccess = pc => {
  trace(getName(pc) + ' setRemoteDescription complete');
}

const onSetSessionDescriptionError = error => {
  trace('Failed to set session description: ' + error.toString());
}

const gotRemoteStream = evnt => {
  window.remoteStream = remoteAudio.srcObject = evnt.stream
  trace('PC2 received remote stream')
}

const onCreateAnswerSuccess = desc => {
  pc2.setLocalDescription(desc)
  .then( () => {
    onSetLocalSuccess(pc2)
  })
  .catch( onSetSessionDescriptionError )

  pc1.setRemoteDescription(desc)
    .then( () => {
      onSetRemoteSuccess(pc1)
    })
    .catch( onSetSessionDescriptionError )
}

const onIceCandidate = (pc, evnt) => {
  if (evnt.candidate) {
    getOtherPc(pc).addIceCandidate( new RTCIceCandidate(evnt.candidate) )
      .then(() => { onAddIceCandidateSuccess(pc) })
      .catch(err => onAddIceCandidateError(pc, err))
  }
}

const onAddIceCandidateSuccess = pc => {
  trace(getName(pc) + ' addIceCandidate success')
}

const onAddIceCandidateError = (pc, err) => {
  trace(getName(pc) + ' failed to add ICE Candidate: ' + err.toString())
}

const onIceStateChange = (pc, event) => {
  if (pc) {
    trace(getName(pc) + ' ICE state: ' + pc.iceConnectionState);
    console.log('ICE state change event: ', event);
  }
}



scriptNode.onaudioprocess = audioProcessingEvent => {
  let inputBuffer = audioProcessingEvent.inputBuffer
  let outputBuffer = audioProcessingEvent.outputBuffer

  for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
    var inputData = inputBuffer.getChannelData(channel)
    var outputData = outputBuffer.getChannelData(channel)

    for (var sample = 0; sample < inputBuffer.length; sample++) {
      outputData[sample] = inputData[sample]
    }
  }
}

const onSuccess = stream => {
  window.stream = stream

  if (window.URL) {
    localAudio.src = window.URL.createObjectURL(stream)
  } else {
    localAudio.src = stream
  }

  gotStream(stream)

  let chunks = []
  let mediaRecorder = new MediaRecorder(stream)

  /*  ---------------------------------------  */
  //  HOLD BUTTON OR Z KEY TO TALK
  document.addEventListener('mousedown', event => {
    if (event.target === buttonTalk && mediaRecorder.state !== 'recording') {
      mediaRecorder.start()
    }
  })
  document.addEventListener('mouseup', event => {
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
  })
  document.addEventListener('keydown', event => {
    if (event.keyCode === 90 && mediaRecorder.state !== 'recording') {
      mediaRecorder.start()
    }
  })
  document.addEventListener('keyup', event => {
    if (event.keyCode === 90) {
      mediaRecorder.stop()
    }
  })
  /*  ---------------------------------------  */

  mediaRecorder.ondataavailable = evnt => {
    chunks.push(evnt.data)
    if (chunks) {
      mediaRecorder.sendData(chunks)
      chunks = []
    }
  }

  mediaRecorder.sendData = buffer => {
    let blob = new Blob(buffer, {type: 'audio/wav'})
    console.log('BLOB', blob)
    socket.send(blob)
  }
}

socket.onopen = () => {
  console.log('CLIENT OPEN')

  source.connect(scriptNode)
  scriptNode.connect(ac.destination)

  // buttonTalk.onclick = call
  // start()
  navigator.mediaDevices.getUserMedia({audio: true})
  .then(res => onSuccess(res))
  .catch(err => console.error('ERROR: ', err))
}

socket.onmessage = evnt => {
  ac.decodeAudioData(evnt.data, buffer => {
    console.log(buffer)
    let myBuffer = buffer
    source.buffer = myBuffer
    source.start()
  })
}


window.addEventListener('beforeunload', () => {
  socket.close()
})
