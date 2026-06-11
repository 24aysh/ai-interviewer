import { BACKEND_URL } from "@/lib/config"
import axios from "axios"
import { useEffect, useState } from "react"
import { useParams } from "react-router"

interface result{
    transcript : {type: "Assistant" | "User", content :string, createdAt : Date}[]
    score: number,
    feedback: string,
    status: "Done" | "Pre" | "InProgress"
}

export function Results(){
    const {interviewId} = useParams();
    const [result,setResult] = useState<result>({
        score:0,
        feedback:"",
        transcript:[],
        status : "Pre"
    })
    useEffect( ()=>{

        let intervalId = setInterval(() => {
            axios.get(`${BACKEND_URL}/api/v1/results/${interviewId}`).then(response => {
                setResult(response.data);
                if(response.data.status == "Done"){
                    clearInterval(intervalId);
                }
            })
        }, 5*1000);
        return () => {
            clearInterval(intervalId)
        }

    },[interviewId])
    return (
        <div>
            {result.status == "Done" && <div>
                 Score - {result.score}
                Feedback - {result.feedback}
                Transcript - 
                {result.transcript.sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime()).map( x => <div>
                    {x.type} - {x.content}
                </div>) }
            </div>}
        </div>
    )
}