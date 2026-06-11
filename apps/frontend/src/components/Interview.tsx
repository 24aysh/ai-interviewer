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
    const [micDenied, setMicDenied] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const startSession = async () => {
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            audioRef.current = document.createElement("audio");
            audioRef.current.autoplay = true;
            pc.ontrack = (e) => (audioRef.current!.srcObject = e.streams[0]!);

            let ms: MediaStream;
            try {
                // Add local audio track for microphone input in the browser
                ms = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err) {
                // NotAllowedError  — user denied the permission prompt
                // NotFoundError    — no microphone device found
                if (
                    err instanceof DOMException &&
                    (err.name === "NotAllowedError" || err.name === "NotFoundError")
                ) {
                    if (isMounted) setMicDenied(true);
                }
                pc.close();
                return;
            }
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

    if (micDenied) {
        return (
            <div className="h-screen w-screen flex flex-col justify-center items-center gap-6 text-center px-4">
                <div className="flex flex-col items-center gap-3 max-w-sm">
                    {/* Microphone blocked icon */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-16 h-16 text-destructive opacity-80"
                        aria-hidden="true"
                    >
                        <line x1="2" y1="2" x2="22" y2="22" />
                        <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                        <path d="M5 10v2a7 7 0 0 0 12 5" />
                        <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                        <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
                    <h2 className="text-2xl font-semibold">Microphone access denied</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        This interview requires microphone access to capture your responses.
                        Allow microphone access in your browser settings and then reload the page to try again.
                    </p>
                    <div className="bg-muted rounded-md px-4 py-3 text-xs text-left w-full">
                        <p className="font-medium mb-1">How to enable microphone access:</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                            <li>Click the lock icon in your browser's address bar.</li>
                            <li>Set <span className="font-medium text-foreground">Microphone</span> to <span className="font-medium text-foreground">Allow</span>.</li>
                            <li>Reload the page.</li>
                        </ol>
                    </div>
                </div>
                <Button onClick={() => window.location.reload()}>
                    Reload and try again
                </Button>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col justify-center items-center gap-4">
            <h2 className="text-2xl font-semibold">Interview in Progress</h2>
            <p className="text-muted-foreground">Speak into your microphone...</p>
            <audio autoPlay ref={audioRef} className="hidden"></audio>
            <Button variant="destructive" onClick={handleEndInterview}>End Interview</Button>
        </div>
    )
}