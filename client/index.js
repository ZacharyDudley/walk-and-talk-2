const socket = new WebSocket('ws://localhost:3000/')
// const client = new WebSocket('ws://localhost:3000/')

const buttonConnect = document.getElementById('buttonConnect')
const buttonDisconnect = document.getElementById('buttonDisconnect')
const buttonTalk = document.getElementById('buttonTalk')
const messageInputBox = document.getElementById('messageInputBox')
const receiveBox = document.getElementById('receiveBox')

let AudioContext = window.AudioContext || window.webkitAudioContext
let ac = new AudioContext()
let gn = ac.createGain()
let source
gn.gain.value = 2


socket.onopen = () => {
  console.log('CLIENT OPEN')

  document.addEventListener('click', evnt => {
    if (evnt.target === buttonTalk) {
      let message = messageInputBox.value
      socket.send(message)
      messageInputBox.value = ''
      messageInputBox.focus()
    }
  })

  navigator.mediaDevices.getUserMedia({audio: true})
  .then(res => {
    source = ac.createMediaStreamSource(res)

    document.addEventListener('mousedown', event => {
      if (event.target === buttonTalk) {
        socket.send(source)
      }
    })

    // document.addEventListener('mouseup', event => {
    //   if (event.target === buttonTalk) {

    //   }
    // })

  })
  .catch(err => console.error('ERROR: ', err))


}

socket.onmessage = evnt => {
  console.log(evnt.data)
  // source.connect(gn)
  // gn.connect(ac.destination)

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

