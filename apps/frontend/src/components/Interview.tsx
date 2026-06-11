import { BACKEND_URL } from "@/lib/config";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

export function Interview(){
    const { interviewId } = useParams();
    const audioRef = useRef<HTMLAudioElement>(null);
    useEffect(() => {

        (async () => {
            const pc = new RTCPeerConnection();

            audioRef.current = document.createElement("audio");
            audioRef.current.autoplay = true;
            pc.ontrack = (e) => (audioRef.current!.srcObject = e.streams[0]!);

            // Add local audio track for microphone input in the browser
            const ms = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            // TODO : probably need a ephemeral token, and not use our api keys on the frontend
            const socket = new WebSocket('wss://api.deepgram.com/v1/listen',[
                'token',
                '9102af862e54ab43bea8b8562b1660197de10785'
            ])
            socket.onopen = () => {
                const mediaRecorder = new MediaRecorder(ms, {
                    mimeType: 'audio/webm',
                })
                mediaRecorder.start(250);
                mediaRecorder.addEventListener('dataavailable',(event) =>{
                    socket.send(event.data);
                })
            }
            socket.onmessage = (message) => {
                const received = JSON.parse(message.data);
                const transcript = received.channel.alternatives[0].transcript;
                if(transcript){
                    axios.post(`${BACKEND_URL}/api/v1/session/user/${interviewId}`,{
                        message : transcript
                    })
                }
            }
            // pc.addTrack(ms.getTracks()[0]!);

            // // Start the session using the Session Description Protocol (SDP)
            // const offer = await pc.createOffer();
            // await pc.setLocalDescription(offer);

            // const sdpResponse = await fetch(`${BACKEND_URL}/api/v1/session/${interviewId}`, {
            // method: "POST",
            // body: offer.sdp,
            // headers: {
            //     "Content-Type": "application/sdp",
            // },
            // });

            // const answer = {
            //     type: "answer",
            //     sdp: await sdpResponse.text(),
            // } as const;
            // await pc.setRemoteDescription(answer);
        })();    
    }, [interviewId]);
    return (
        <div>
            <audio autoPlay ref={audioRef}></audio>
        </div>
    )
}