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


// let gn = ac.createGain()
// gn.gain.value = 2

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
  let chunks = []
  let mediaRecorder = new MediaRecorder(stream)

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

