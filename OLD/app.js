// const buttonConnect = document.getElementById('buttonConnect')
// const buttonDisconnect = document.getElementById('buttonDisconnect')
// const buttonTalk = document.getElementById('buttonTalk')
// const messageInputBox = document.getElementById('messageInputBox')
// const receiveBox = document.getElementById('receiveBox')

// let localConnection = null
// let remoteConnection = null
// let sendChannel = null
// let receiveChannel = null


// const handleCreateDescriptionError = err => {
//   console.error('CANNOT MAKE OFFER: ', err)
// }

// const handleLocalAddCandidateSuccess = () => {
//   buttonConnect.disabled = true
// }

// const handleRemoteAddCandidateSuccess = () => {
//   buttonDisconnect.disabled = false
// }

// const handleAddCandidateError = () => {
//   console.log('CANNOT ADD ICE CANDIDATE')
// }

// const sendMessage = () => {
//   let message = messageInputBox.value
//   sendChannel.send(message)
//   messageInputBox.value = ''
//   messageInputBox.focus()
// }

// const handleSendChannelStatusChange = evnt => {
//   if (sendChannel) {
//     let state = sendChannel.readyState

//     if (state === 'open') {
//       buttonConnect.disabled = true
//       buttonDisconnect.disabled = false
//       buttonTalk.disabled = false
//     } else {
//       buttonConnect.disabled = false
//       buttonDisconnect.disabled = true
//       buttonTalk.disabled = true
//     }
//   }
// }

// const handleReceiveMessage = evnt => {
//   let el = document.createElement('p')
//   let textNode = document.createTextNode(evnt.data)

//   el.appendChild(textNode)
//   receiveBox.appendChild(el)
// }

// const handleReceiveMessageStatusChange = evnt => {
//   if (receiveChannel) {
//     console.log('RECEIVE CHANNEL STATUS CHANGED: ', receiveChannel.readyState)
//   }
// }

// const receiveChannelCallback = evnt => {
//   receiveChannel = evnt.channel
//   receiveChannel.onmessage = handleReceiveMessage
//   receiveChannel.onopen = handleReceiveMessageStatusChange
//   receiveChannel.onclose = handleReceiveMessageStatusChange
// }

// const connectPeers = () => {
//   localConnection = new RTCPeerConnection()

//   sendChannel = localConnection.createDataChannel('sendChannel')
//   sendChannel.onopen = handleSendChannelStatusChange
//   sendChannel.onclose = handleSendChannelStatusChange

//   remoteConnection = new RTCPeerConnection()
//   remoteConnection.ondatachannel = receiveChannelCallback

//   localConnection.onicecandidate = evnt => {
//     !evnt.candidate || remoteConnection.addIceCandidate(evnt.candidate).catch(handleAddCandidateError)
//   }

//   remoteConnection.onicecandidate = evnt => {
//     !evnt.candidate || localConnection.addIceCandidate(evnt.candidate).catch(handleAddCandidateError)
//   }

//   localConnection.createOffer()
//     .then(offer => localConnection.setLocalDescription(offer))
//     .then(() => {
//       remoteConnection.setRemoteDescription(localConnection.localDescription)
//     })
//     .then(() => {
//       remoteConnection.createAnswer()
//     })
//     .then(answer => {
//       remoteConnection.setLocalDescription(answer)
//     })
//     .then(() => {
//       localConnection.setRemoteDescription(remoteConnection.localDescription)
//     })
//     .catch(handleCreateDescriptionError)
// }

// const disconnectPeers = () => {
//   sendChannel.close()
//   receiveChannel.close()
//   localConnection.close()
//   remoteConnection.close()

//   sendChannel = null
//   receiveChannel = null
//   localConnection = null
//   remoteConnection = null

//   buttonConnect.disabled = false
//   buttonDisconnect.disabled = true
//   buttonTalk.disabled = true
// }

// const startUp = () => {
//   buttonConnect.addEventListener('click', connectPeers)
//   buttonDisconnect.addEventListener('click', disconnectPeers)
//   buttonTalk.addEventListener('mousedown', sendMessage)
//   // buttonTalk.addEventListener('mouseup', )
// }

// window.addEventListener('load', startUp)


(() => {
  const messages = document.querySelector('#messages');
  const wsButton = document.querySelector('#wsButton');
  const logout = document.querySelector('#logout');
  const login = document.querySelector('#login');

  const showMessage = (message) => {
    messages.textContent += `\n${message}`;
    messages.scrollTop = messages.scrollHeight;
  };

  const handleResponse = (response) => {
    return response.ok
      ? response.json().then((data) => JSON.stringify(data, null, 2))
      : Promise.reject(new Error('Unexpected response'));
  };

  login.onclick = () => {
    fetch('/login', { method: 'POST', credentials: 'same-origin' })
      .then(handleResponse)
      .then(showMessage)
      .catch((err) => showMessage(err.message));
  };

  logout.onclick = () => {
    fetch('/logout', { method: 'DELETE', credentials: 'same-origin' })
      .then(handleResponse)
      .then(showMessage)
      .catch((err) => showMessage(err.message));
  };

  let ws;

  wsButton.onclick = () => {
    if (ws) {
      ws.onerror = ws.onopen = ws.onclose = null;
      ws.close();
    }

    ws = new WebSocket(`ws://${location.host}`);
    ws.onerror = () => showMessage('WebSocket error');
    ws.onopen = () => showMessage('WebSocket connection established');
    ws.onclose = () => showMessage('WebSocket connection closed');
  };
})();
