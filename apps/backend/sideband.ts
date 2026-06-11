import { WebSocket } from "ws";
import { prisma } from "./db";
export async function initSideBand(callId: string,interviewId: string){
    const url = "wss://api.openai.com/v1/realtime?call_id=" + callId;
    const ws = new WebSocket(url, {
        headers: {
            Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        },
    });

    const interview = await prisma.interview.findFirst({
        where:{
            id:interviewId
        }
    })

    ws.on("open", function open() {
        // Send client events over the WebSocket once connected
        ws.send(
            JSON.stringify({
            type: "session.update",
            session: {
                type: "realtime",
                instructions: `You are supposed to interview this guy's computer science knowledge based on their github. Ask around 2-3 questions based on each topic. Only use English while interviewing. Here is everything about the users github, it will give you rough idea about the projects
                ## Github data
                ${interview?.githubMetaData}
                `,
            },
            })
        );
    });

    // Listen for and parse server events
    ws.on("message", async function incoming(message) {
        const parsedMessage = JSON.parse(message.toString());
        if(parsedMessage.type == "response.done") {
            let contents : {type: string, transcript: string}[] = []
            parsedMessage.response.output.map(
                (x: { content: { type: string; transcript: string }[] }) => {
                    contents = [...contents, ...x.content];
                }
            );            
            const assistantMessage = contents.filter(x => x.type === "output_audio").map(x => x.transcript).join(" ");
            await prisma.message.create({
                data :{
                    interviewId,
                    type : "Assistant",
                    message:assistantMessage
                }
            })
        }
    });
}

