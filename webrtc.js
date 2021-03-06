const localrecvonly = class {
    constructor(remoteVideo_id_str, wsUrl) {
        this.remoteVideo = document.getElementById(remoteVideo_id_str);
        this.peerConnection = null;
        this.dataChannel = null;
        this.candidates = [];
        this.hasReceivedSdp = false;
        this.iceServers = [{ 'urls': 'stun:stun.l.google.com:19302' }];
        this.peerConnectionConfig = {
          'iceServers': this.iceServers
        };
        this.ws = new WebSocket(wsUrl);
        this.ws.onopen = this.onWsOpen.bind(this);
        this.ws.onerror = this.onWsError.bind(this);
        this.ws.onmessage = this.onWsMessage.bind(this);
    }
    onWsError(error){
        console.error('ws onerror() ERROR:', error);
    }
    onWsOpen(event) {
        console.log('ws open()', this.ws.url);
        console.log(this.ws);
    }
    onWsMessage(event) {
        console.log('ws onmessage() data:', event.data);
        const message = JSON.parse(event.data);
        if (message.type === 'offer') {
            console.log('Received offer ...');
            const offer = new RTCSessionDescription(message);
            console.log('offer: ', offer);
            this.setOffer(offer);
        }
        else if (message.type === 'answer') {
            console.log('Received answer ...');
            const answer = new RTCSessionDescription(message);
            console.log('answer: ', answer);
            this.setAnswer(answer);
        }
        else if (message.type === 'candidate') {
            console.log('Received ICE candidate ...');
            const candidate = new RTCIceCandidate(message.ice);
            console.log('candidate: ', candidate);
            if (this.hasReceivedSdp) {
                this.addIceCandidate(candidate);
            } else {
                this.candidates.push(candidate);
            }
        }
        else if (message.type === 'close') {
            console.log('peer connection is closed ...');
        }
    };
    connect() {
        console.group();
        if (!(this.peerConnection)) {
            console.log('make Offer');
            this.makeOffer();
        }
        else {
            console.warn('peer connection already exists.');
        }
        console.groupEnd();
    }
    disconnect() {
        console.group();
        if (this.peerConnection) {
            if (this.peerConnection.iceConnectionState !== 'closed') {
                this.peerConnection.close();
                this.peerConnection = null;
                if (this.ws && this.ws.readyState === 1) {
                    const message = JSON.stringify({ type: 'close' });
                    this.ws.send(message);
                }
                console.log('sending close message');
                this.cleanupVideoElement(this.remoteVideo);
                return;
            }
        }
        console.log('peerConnection is closed.');
        console.groupEnd();
    }
    drainCandidate() {
        this.hasReceivedSdp = true;
        this.candidates.forEach((candidate) => {
            this.addIceCandidate(candidate);
        });
        this.candidates = [];
    }
    addIceCandidate(candidate) {
        if (this.peerConnection) {
            this.peerConnection.addIceCandidate(candidate);
        }
        else {
            console.error('PeerConnection does not exist!');
        }
    }
    sendIceCandidate(candidate) {
      console.log('---sending ICE candidate ---');
      const message = JSON.stringify({ type: 'candidate', ice: candidate });
      console.log('sending candidate=' + message);
      this.ws.send(message);
    }
    prepareNewConnection() {
        const peer = new RTCPeerConnection(this.peerConnectionConfig);
        this.dataChannel = peer.createDataChannel("serial");
        if ('ontrack' in peer) {
            if (isSafari()) {
                let tracks = [];
                peer.ontrack = (event) => {
                    console.log('-- peer.ontrack()');
                    tracks.push(event.track)
                    // safari ??????????????????????????????ontrack ???????????????????????? MediaStream ???????????????
                    let mediaStream = new MediaStream(tracks);
                    playVideo(this.remoteVideo, mediaStream);
                };
            }
            else {
                let mediaStream = new MediaStream();
                playVideo(this.remoteVideo, mediaStream);
                peer.ontrack = (event) => {
                    console.log('-- peer.ontrack()');
                    mediaStream.addTrack(event.track);
                    getStats(this.peerConnection, (result) => {
                        if (this.remoteVideo) {
                            if (this.remoteVideo.id == "remoteVideo_right") {
                                document.getElementById('rvs').innerHTML = 'frame width: ' + result.resolutions.recv.width + ' video latency: '+ result.video.latency + 'ms';
                            }
                            if (this.remoteVideo.id == "remoteVideo_left") {
                                document.getElementById('lvs').innerHTML = 'frame width: ' + result.resolutions.recv.width + ' video latency: '+ result.video.latency + 'ms';
                            }
                        }
                    }, 500);
                };
            }
        }
        else {
            peer.onaddstream = (event) => {
                console.log('-- peer.onaddstream()');
                playVideo(this.remoteVideo, event.stream);
            };
        }

        peer.onicecandidate = (event) => {
            console.log('-- peer.onicecandidate()');
            if (event.candidate) {
                console.log(event.candidate);
                this.sendIceCandidate(event.candidate);
            } else {
                console.log('empty ice event');
            }
        };

        peer.oniceconnectionstatechange = () => {
            console.log('-- peer.oniceconnectionstatechange()');
            console.log('ICE connection Status has changed to ' + peer.iceConnectionState);
            switch (peer.iceConnectionState) {
                case 'closed':
                case 'failed':
                case 'disconnected':
                    break;
            }
        };
        peer.addTransceiver('video', {direction: 'recvonly'});
        peer.addTransceiver('audio', {direction: 'recvonly'});

        this.dataChannel.onmessage = function (event) {
            if (event.data.byteLength == 12) {
                remote_time = (new Int32Array([new Uint8Array(event.data)[0] << 24])[0] + new Int32Array([new Uint8Array(event.data)[1] << 16])[0] + new Int32Array([new Uint8Array(event.data)[2] << 8])[0] + new Int32Array([ new Uint8Array(event.data)[3]])[0] )/1000.0 ;
                remote_lin_vel = (new Int32Array([new Uint8Array(event.data)[4] << 24])[0] + new Int32Array([ new Uint8Array(event.data)[5] << 16 ])[0] + new Int32Array([new Uint8Array(event.data)[6] << 8])[0] + new Int32Array([ new Uint8Array(event.data)[7]])[0] )/10000.0 ;
                remote_ang_vel = (new Int32Array([new Uint8Array(event.data)[8] << 24])[0] + new Int32Array([ new Uint8Array(event.data)[9] << 16 ])[0] + new Int32Array([new Uint8Array(event.data)[10] << 8])[0] + new Int32Array([ new Uint8Array(event.data)[11]])[0] )/10000.0 ;
                document.getElementById("sgss").innerHTML = '??????(s) ' + remote_time.toFixed(2) + '\n????????????(m/s) ' + remote_lin_vel.toFixed(2) + '\n????????????(deg/s)' + remote_ang_vel.toFixed(2);
                segway_info = remote_lin_vel.toFixed(2) + '(m/s)\n' + remote_ang_vel.toFixed(2) + '(deg/s)';
            }
        };
        return peer;
    }
    sendSdp(sessionDescription) {
        console.log('---sending sdp ---');
        const message = JSON.stringify(sessionDescription);
        console.log('sending SDP=' + message);
        this.ws.send(message);
    }
    async makeOffer() {
        this.peerConnection = this.prepareNewConnection();
        try {
            const sessionDescription = await this.peerConnection.createOffer({
                'offerToReceiveAudio': true,
                'offerToReceiveVideo': true
            });
            console.log('createOffer() success in promise, SDP=', sessionDescription.sdp);
            sessionDescription.sdp = removeCodec(sessionDescription.sdp, 'VP8');
            sessionDescription.sdp = removeCodec(sessionDescription.sdp, 'VP9');
            sessionDescription.sdp = removeCodec(sessionDescription.sdp, 'AV1');
            await this.peerConnection.setLocalDescription(sessionDescription);
            console.log('setLocalDescription() success in promise');
            this.sendSdp(this.peerConnection.localDescription);
        } catch (error) {
            console.error('makeOffer() ERROR:', error);
        }
    }
    async makeAnswer() {
        console.log('sending Answer. Creating remote session description...');
        if (!(this.peerConnection)) {
            console.error('peerConnection DOES NOT exist!');
            return;
        }
        try {
            const sessionDescription = await this.peerConnection.createAnswer();
            console.log('createAnswer() success in promise');
            await this.peerConnection.setLocalDescription(sessionDescription);
            console.log('setLocalDescription() success in promise');
            this.sendSdp(peerConnection.localDescription);
            this.drainCandidate();
        } catch (error) {
            console.error('makeAnswer() ERROR:', error);
        }
    }
    setOffer(sessionDescription) {
        if ((this.peerConnection)) {
            console.error('peerConnection already exists!');
        }
        this.peerConnection = this.prepareNewConnection();
        this.peerConnection.onnegotiationneeded = async function () {
            try {
                await this.peerConnection.setRemoteDescription(sessionDescription);
                console.log('setRemoteDescription(offer) success in promise');
                this.makeAnswer();
            } catch (error) {
                console.error('setRemoteDescription(offer) ERROR: ', error);
            }
        }
    }
    async setAnswer(sessionDescription) {
        if (!(this.peerConnection)) {
            console.error('peerConnection DOES NOT exist!');
            return;
        }
        try {
            await this.peerConnection.setRemoteDescription(sessionDescription);
            console.log('setRemoteDescription(answer) success in promise');
            this.drainCandidate();
        } catch (error) {
            console.error('setRemoteDescription(answer) ERROR: ', error);
        }
    }
}

function playVideo(element, stream) {
    if (element) {
        element.srcObject = stream;
        element.muted = false;
    }
}

function browser() {
  const ua = window.navigator.userAgent.toLocaleLowerCase();
  if (ua.indexOf('edge') !== -1) {
    return 'edge';
  }
  else if (ua.indexOf('chrome')  !== -1 && ua.indexOf('edge') === -1) {
    return 'chrome';
  }
  else if (ua.indexOf('safari')  !== -1 && ua.indexOf('chrome') === -1) {
    return 'safari';
  }
  else if (ua.indexOf('opera')   !== -1) {
    return 'opera';
  }
  else if (ua.indexOf('firefox') !== -1) {
    return 'firefox';
  }
  return ;
}

function isSafari() {
  return browser() === 'safari';
}


function cleanupVideoElement(element) {
  element.pause();
  element.srcObject = null;
}


/* getOffer() function is currently unused.
function getOffer() {
  initiator = false;
  createPeerConnection();
  sendXHR(
    ".GetOffer",
    JSON.stringify(peer_connection.localDescription),
    function (respnse) {
      peer_connection.setRemoteDescription(
        new RTCSessionDescription(respnse),
        function () {
          peer_connection.createAnswer(
            function (answer) {
              peer_connection.setLocalDescription(answer);
            }, function (e) { });
        }, function (e) {
          console.error(e);
        });
    }, true);
}
*/

// Stack Overflow ????????????: https://stackoverflow.com/a/52760103
// https://stackoverflow.com/questions/52738290/how-to-remove-video-codecs-in-webrtc-sdp
function removeCodec(orgsdp, codec) {
  const internalFunc = (sdp) => {
    const codecre = new RegExp('(a=rtpmap:(\\d*) ' + codec + '\/90000\\r\\n)');
    const rtpmaps = sdp.match(codecre);
    if (rtpmaps == null || rtpmaps.length <= 2) {
      return sdp;
    }
    const rtpmap = rtpmaps[2];
    let modsdp = sdp.replace(codecre, "");

    const rtcpre = new RegExp('(a=rtcp-fb:' + rtpmap + '.*\r\n)', 'g');
    modsdp = modsdp.replace(rtcpre, "");

    const fmtpre = new RegExp('(a=fmtp:' + rtpmap + '.*\r\n)', 'g');
    modsdp = modsdp.replace(fmtpre, "");

    const aptpre = new RegExp('(a=fmtp:(\\d*) apt=' + rtpmap + '\\r\\n)');
    const aptmaps = modsdp.match(aptpre);
    let fmtpmap = "";
    if (aptmaps != null && aptmaps.length >= 3) {
      fmtpmap = aptmaps[2];
      modsdp = modsdp.replace(aptpre, "");

      const rtppre = new RegExp('(a=rtpmap:' + fmtpmap + '.*\r\n)', 'g');
      modsdp = modsdp.replace(rtppre, "");
    }

    let videore = /(m=video.*\r\n)/;
    const videolines = modsdp.match(videore);
    if (videolines != null) {
      //If many m=video are found in SDP, this program doesn't work.
      let videoline = videolines[0].substring(0, videolines[0].length - 2);
      const videoelems = videoline.split(" ");
      let modvideoline = videoelems[0];
      videoelems.forEach((videoelem, index) => {
        if (index === 0) return;
        if (videoelem == rtpmap || videoelem == fmtpmap) {
          return;
        }
        modvideoline += " " + videoelem;
      })
      modvideoline += "\r\n";
      modsdp = modsdp.replace(videore, modvideoline);
    }
    return internalFunc(modsdp);
  }
  return internalFunc(orgsdp);
}
