'use strict'

let myHostname = window.location.hostname;
console.log('Hostname: ' + myHostname);

let connection = null
let clientID = 0
let hasAddTrack = false;
let pc

const buttonInvite = document.getElementById('buttonInvite')
const buttonConnect = document.getElementById('buttonConnect')
const buttonDisconnect = document.getElementById('buttonDisconnect')
const buttonTalk = document.getElementById('buttonTalk')
const messageInputBox = document.getElementById('messageInputBox')
const receiveBox = document.getElementById('receiveBox')

buttonTalk.disabled = true
buttonDisconnect.disabled = true

// let AudioContext = window.AudioContext || window.webkitAudioContext
// let ac = new AudioContext()
// let scriptNode = ac.createScriptProcessor(2048, 1, 1)
// let source = ac.createBufferSource()


const localAudio = document.getElementById('localAudio')

const sendToServer = msg => {
  let msgJSON = JSON.stringify(msg)
  connection.send(msgJSON)
}

const connect = () => {
  let serverURL
  let scheme = 'ws'

  if (document.location.protocol === 'https:') {
    scheme += 's'
  }

  serverURL = scheme + '://' + myHostname + ':3000'
  connection = new WebSocket(serverURL, 'json')

  connection.onopen = evnt => {
    buttonTalk.disabled = false
    buttonConnect.disabled = true
    buttonDisconnect.disabled = false
  }

  connection.onmessage = evnt => {
    let msg = JSON.parse(evnt.data)

    switch (msg.type) {
      case 'id':
        clientID = msg.id
        break

      case 'msg':
        console.log('RECEIVED', msg)
        break

      case 'offer':
        return handleOfferMsg(msg)

      case 'answer':
        return handleAnswerMsg(msg)

      case 'candidate':
        return handleCandidateMsg(msg)

      case 'hangUp':
        return handleHangUpMsg(msg)

      default:
        console.log('Unknown message: ', msg)
    }
  }
}
buttonConnect.onclick = connect

const sendMsg = () => {
  let msg = {
    type: 'msg',
    id: clientID
  }
  sendToServer(msg)
}
buttonTalk.onclick = sendMsg

const createPeerConnection = () => {
  console.log('ESTABLISHING PEER CONNECTION')

  pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  })

  hasAddTrack = pc.addTrack !== undefined

  pc.onicecandidate = handleICECandidateEvent;
  pc.onnremovestream = handleRemoveStreamEvent;
  pc.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  pc.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  pc.onsignalingstatechange = handleSignalingStateChangeEvent;
  pc.onnegotiationneeded = handleNegotiationNeededEvent;

  if (hasAddTrack) {
    pc.ontrack = handleTrackEvent
  } else {
    pc.onaddstream = handleAddStreamEvent
  }
}

const handleNegotiationNeededEvent = () => {
  console.log('CREATING OFFER')

  pc.createOffer()
    .then(offer => (pc.setLocalDescription(offer)))
    .then(() => {
      sendToServer({
        id: clientID,
        type: 'offer',
        sdp: pc.localDescription
      })
    })
    .catch(err => console.error(err))
}

const handleTrackEvent = evnt => {
  console.log('HANDLE TRACK')
  localAudio.srcObject = evnt.streams[0]
}

const handleAddStreamEvent = evnt => {
  console.log('HANDLE STREAM')
  localAudio.srcObject = evnt.stream
}

const handleRemoveStreamEvent = evnt => {
  endConnection()
}

const handleICECandidateEvent = evnt => {
  console.log('HANDLE ICE CANDIDATE EVENT')
  if (evnt.candidate) {
    sendToServer({
      id: clientID,
      type: 'candidate',
      candidate: evnt.candidate
    })
  }
}

const handleICEConnectionStateChangeEvent = evnt => {
  switch (pc.iceConnectionState) {
    case 'closed':
    case 'failed':
    case 'disconnected':
      return endConnection()
    default:
      console.log('ICE connection state change')
  }
}

const handleSignalingStateChangeEvent = evnt => {
  switch (pc.signalingState) {
    case 'closed':
      return endConnection()

    default:
      console.log('Signal state change')
  }
}

const handleICEGatheringStateChangeEvent = evnt => {
  console.log('ICE GATHERING STATE CHANGE')
}

const endConnection = () => {
  if (pc) {
    pc.onaddstream = null
    pc.ontrack = null
    pc.onremovestream = null
    pc.onnicecandidate = null
    pc.oniceconnectionstatechange = null
    pc.onsignalingstatechange = null
    pc.onicegatheringstatechange = null
    pc.onnotificationneeded = null

    if (localAudio.srcObject) {
      localAudio.srcObject.getTracks().forEach(track => track.stop())
    }

    localAudio.src = null

    pc.close()
    pc = null

    buttonConnect.disabled = false
    buttonInvite.disabled = false
    buttonDisconnect.disabled = true
  }
}
buttonDisconnect.onclick = endConnection

const handleHangUpMsg = msg => {
  endConnection()
}

const endCall = () => {
  endConnection()
  sendToServer({
    id: clientID,
    type: 'hangUp'
  })
}

const invite = evnt => {
  if (!pc) {
    createPeerConnection()

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(localStream => {
        if (hasAddTrack) {
          localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream)
          })
        } else {
          pc.addStream(localStream)
        }
      })
      .catch(handleGetUserMediaError)

      buttonInvite.disabled = true
      console.log('INVITING', pc.id)
  } else {
    console.log('ALREADY: ', pc)
  }
}
buttonInvite.onclick = invite

const handleOfferMsg = msg => {
  let localStream = null

  createPeerConnection()

  let desc = new RTCSessionDescription(msg.sdp)

  pc.setRemoteDescription(desc)
    .then(() => navigator.mediaDevices.getUserMedia({ audio: true }))
    .then(stream => {
      localStream = stream

      if (hasAddTrack) {
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream)
        })
      } else {
        pc.addStream(localStream)
      }
    })
    .then(() => pc.createAnswer())
    .then(answer => pc.setLocalDescription(answer))
    .then(() => {
      sendToServer({
        id: clientID,
        type: 'answer',
        sdp: pc.localDescription
      })
    })
    .catch(handleGetUserMediaError)

    console.log('WAS OFFERED BY: ', pc.id)
}

const handleAnswerMsg = msg => {
  let desc = new RTCSessionDescription(msg.sdp)
  pc.setRemoteDescription(desc)
    .catch(err => console.error(err))
  console.log('ANSWERED: ', pc.id)
}

const handleCandidateMsg = msg => {
  let candidate = new RTCIceCandidate(msg.candidate)

  pc.addIceCandidate(candidate)
    .catch(err => console.error(err))

  buttonInvite.disabled = true
}

const handleGetUserMediaError = err => {
  switch (err.name) {
    case 'NotFoundError':
      console.log('Mic not found')
      break

    case 'SecurityError':
      console.log(err)
      break

    case 'PermissionDeniedError':
      break

    default:
      console.log('ERROR: ' + err.message)
      break
  }

  endConnection()
}


// scriptNode.onaudioprocess = audioProcessingEvent => {
//   let inputBuffer = audioProcessingEvent.inputBuffer
//   let outputBuffer = audioProcessingEvent.outputBuffer

//   for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
//     var inputData = inputBuffer.getChannelData(channel)
//     var outputData = outputBuffer.getChannelData(channel)

//     for (var sample = 0; sample < inputBuffer.length; sample++) {
//       outputData[sample] = inputData[sample]
//     }
//   }
// }


// const onSuccess = stream => {
//   pc = new RTCPeerConnection()
//   pc.addStream(stream)
//   // localAudio.srcObject = stream

//   let chunks = []
//   let mediaRecorder = new MediaRecorder(stream)

  /*  ---------------------------------------  */
  /*  HOLD 'z' TO TALK  */
  // window.addEventListener('keydown', event => {
  //   if (event.keyCode === 90 && mediaRecorder.state !== 'recording') {
  //     mediaRecorder.start()
  //   }
  // })
  // window.addEventListener('keyup', event => {
  //   if (event.keyCode === 90) {
  //     mediaRecorder.stop()
  //   }
  // })
  // document.addEventListener('mousedown', event => {
  //   if (event.target === buttonTalk && mediaRecorder.state !== 'recording') {
  //     mediaRecorder.start()
  //   }
  // })
  // document.addEventListener('mouseup', event => {
  //   if (mediaRecorder.state === 'recording') {
  //     mediaRecorder.stop()
  //   }
  // })
  /*  ---------------------------------------  */

  // mediaRecorder.ondataavailable = evnt => {
  //   chunks.push(evnt.data)
  //   if (chunks) {
  //     mediaRecorder.sendData(chunks)
  //     chunks = []
  //   }
  // }

  // mediaRecorder.sendData = buffer => {
  //   let blob = new Blob(buffer, {type: 'audio/wav'})
  //   console.log('BLOB', blob)
  //   socket.send(blob)
  // }
// }

// socket.onopen = () => {
//   console.log('CLIENT OPEN')

//   source.connect(scriptNode)
//   scriptNode.connect(ac.destination)

//   navigator.mediaDevices.getUserMedia({audio: true})
//   .then(res => onSuccess(res))
//   .catch(err => console.error('ERROR: ', err))
// }

// socket.onmessage = evnt => {
//   ac.decodeAudioData(evnt.data, buffer => {
//     console.log(buffer)
//     let myBuffer = buffer
//     source.buffer = myBuffer
//     source.start()
//   })
// }


// window.addEventListener('beforeunload', () => {
//   socket.close()
// })

// /*  ---------------------------------------  */
// /*  HOLD 'z' TO TALK  */
// window.addEventListener('keydown', event => {
//   if (event.keyCode === 90) {
//     // ac.resume()
//   }
// })
// window.addEventListener('keyup', event => {
//   if (event.keyCode === 90) {
//     // ac.suspend()
//   }
// })

// /*  HOLD DOWN BUTTON TO TALK  */
// document.addEventListener('mousedown', event => {
//   if (event.target === buttonTalk) {
//     // ac.resume()
//   }
// })
// document.addEventListener('mouseup', event => {
//   if (event.target === buttonTalk) {
//     // ac.suspend()
//   }
// })
// /*  ---------------------------------------  */
