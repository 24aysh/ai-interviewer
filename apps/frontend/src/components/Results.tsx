import { BACKEND_URL } from "@/lib/config"
import axios from "axios"
import { useEffect, useState } from "react"
import { useParams } from "react-router"

interface result {
    transcript: { type: "Assistant" | "User", content: string, createdAt: string }[]
    score: number,
    feedback: string,
    status: "Done" | "Pre" | "InProgress" // Prisma typo fallback
}

/**
 * Results component fetches the interview result via polling and displays the score,
 * feedback, and interview transcript once processing is complete.
 */
export function Results() {
    const { interviewId } = useParams();
    const [result, setResult] = useState<result>({
        score: 0,
        feedback: "",
        transcript: [],
        status: "Pre"
    });

    useEffect(() => {
        // Poll for results until the status is "Done"
        let intervalId = setInterval(() => {
            axios.get(`${BACKEND_URL}/api/v1/results/${interviewId}`).then(response => {
                setResult(response.data);
                if (response.data.status === "Done") {
                    clearInterval(intervalId);
                }
            }).catch(err => console.error("Error fetching results", err));
        }, 5 * 1000);

        // Fetch immediately on mount
        axios.get(`${BACKEND_URL}/api/v1/results/${interviewId}`).then(response => {
            setResult(response.data);
            if (response.data.status === "Done") {
                clearInterval(intervalId);
            }
        }).catch(err => console.error("Error fetching results", err));

        return () => {
            clearInterval(intervalId);
        }
    }, [interviewId]);

    return (
        <div className="min-h-screen w-screen flex justify-center p-8 bg-background">
            <div className="max-w-2xl w-full">
                <h2 className="text-3xl font-semibold mb-6">Interview Results</h2>
                
                {result.status !== "Done" ? (
                    <div className="text-muted-foreground">Evaluating your interview, please wait...</div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="p-4 border rounded-md">
                            <h3 className="text-xl font-medium mb-2">Score</h3>
                            <p className="text-2xl font-bold">{result.score} / 10</p>
                        </div>
                        
                        <div className="p-4 border rounded-md">
                            <h3 className="text-xl font-medium mb-2">Feedback</h3>
                            <p className="whitespace-pre-wrap">{result.feedback}</p>
                        </div>

                        <div className="p-4 border rounded-md">
                            <h3 className="text-xl font-medium mb-4">Transcript</h3>
                            <div className="flex flex-col gap-3">
                                {result.transcript?.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((x, i) => (
                                    <div key={i} className={`p-3 rounded-lg ${x.type === "Assistant" ? "bg-secondary text-secondary-foreground self-start" : "bg-primary text-primary-foreground self-end"}`}>
                                        <p className="text-xs opacity-70 mb-1">{x.type}</p>
                                        <p>{x.content}</p>
                                    </div>
                                ))}
                                {(!result.transcript || result.transcript.length === 0) && (
                                    <p className="text-muted-foreground">No transcript available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}