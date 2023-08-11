const ISora = class {
    name = null;
    debug = true;
    sora = null;
    options = {
        multistream : true,
        video : false,
        audio : true
    };
    sendrecv = null;
    mediaStream_id = null;
    localStream = null;
    constructor(name) {
        this.name = name;
    }
    setCallback() {
        this.sendrecv.on("track", (event) => {
            console.log(event);
            const stream = event.streams[0];
            if (event.track.kind == "video") {
                document.querySelector(`#${this.name}Video`).srcObject = stream;
                document.querySelector(`#${this.name}Video`).autoplay = true;
                document.querySelector(`#${this.name}Video`).muted = false;
                this.mediaStream_id = event.streams[0].id;
                // getStats(sendrecv.pc, function(result) {
                //     console.log(result.video.latency + 'ms');
                // }, 500);
            }
            if (event.track.kind == 'audio') {
                const audio = document.createElement('audio');
                audio.id = "audio-" + event.streams[0].id;
                audio.srcObject = event.streams[0];
                audio.controls = true;
                audio.autoplay = true;
                audio.style = "display: none;"
                document.getElementById('remote-videos').appendChild(audio);
            }
        });
    }
    observe_video() {
        if (document.getElementById(`audio-${this.mediaStream_id}`)) {
            document.getElementById(`audio-${this.mediaStream_id}`).remove();
        }
    }
    connect() {
        this.sora = Sora.connection(document.getElementById('url_input').value, this.debug);
        this.sendrecv = this.sora.sendrecv(
            document.getElementById(`channel_id_${this.name}_input`).value,
            null,
            this.options
        );
        this.setCallback();
        navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((stream) => {
            this.localStream = stream;
            this.localStream.getAudioTracks()[0].enabled = false;
            console.log(this.localStream);
            this.sendrecv.connect(this.localStream);
        })
        .catch((e) => {
                console.error(e);
        });
    }
    mic_on_off_clicked() {
        if (document.getElementsByName('mic_on_off')[0].checked) {
            this.localStream.getAudioTracks()[0].enabled = true;
        }
        else {
            this.localStream.getAudioTracks()[0].enabled = false;
        }
    }
}