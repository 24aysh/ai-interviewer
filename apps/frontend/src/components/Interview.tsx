import { BACKEND_URL } from "@/lib/config";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "./ui/button";

/**
 * Interview component handles the WebRTC voice connection and real-time transcript submission.
 */
export function Interview(){
    const { interviewId } = useParams();
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        let isMounted = true;

        const startSession = async () => {
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            audioRef.current = document.createElement("audio");
            audioRef.current.autoplay = true;
            pc.ontrack = (e) => (audioRef.current!.srcObject = e.streams[0]!);

            // Add local audio track for microphone input in the browser
            const ms = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            mediaStreamRef.current = ms;

            // Deepgram transcription websocket
            const socket = new WebSocket('wss://api.deepgram.com/v1/listen',[
                'token',
                '9102af862e54ab43bea8b8562b1660197de10785'
            ])
            socketRef.current = socket;

            socket.onopen = () => {
                const mediaRecorder = new MediaRecorder(ms, {
                    mimeType: 'audio/webm',
                })
                mediaRecorder.start(250);
                mediaRecorder.addEventListener('dataavailable',(event) =>{
                    if(socket.readyState === WebSocket.OPEN) {
                        socket.send(event.data);
                    }
                })
            }
            socket.onmessage = (message) => {
                const received = JSON.parse(message.data);
                const transcript = received.channel?.alternatives?.[0]?.transcript;
                if(transcript){
                    axios.post(`${BACKEND_URL}/api/v1/session/user/${interviewId}`,{
                        message : transcript
                    })
                }
            }

            pc.addTrack(ms.getTracks()[0]!);

            // Start the session using the Session Description Protocol (SDP)
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const sdpResponse = await fetch(`${BACKEND_URL}/api/v1/session/${interviewId}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    "Content-Type": "application/sdp",
                },
            });

            if (isMounted) {
                const answer = {
                    type: "answer",
                    sdp: await sdpResponse.text(),
                } as const;
                await pc.setRemoteDescription(answer);
            }
        };

        startSession();

        return () => {
            isMounted = false;
            pcRef.current?.close();
            socketRef.current?.close();
            mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, [interviewId]);

    const handleEndInterview = () => {
        navigate(`/results/${interviewId}`);
    };

    return (
        <div className="h-screen w-screen flex flex-col justify-center items-center gap-4">
            <h2 className="text-2xl font-semibold">Interview in Progress</h2>
            <p className="text-muted-foreground">Speak into your microphone...</p>
            <audio autoPlay ref={audioRef} className="hidden"></audio>
            <Button variant="destructive" onClick={handleEndInterview}>End Interview</Button>
        </div>
    )
}