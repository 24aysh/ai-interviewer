import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import axios from "axios";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { BACKEND_URL } from "../lib/config";
import { useNavigate } from "react-router";

export function Form() {
  const [github, setGithub] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      setProgress(0);
      return;
    }

    setProgress(13);

    const timer = setTimeout(() => {
      setProgress(66);
    }, 500);

    return () => clearTimeout(timer);
  }, [loading]);

  async function handleSubmit() {
    if (!github) {
      toast.error("Invalid Input", {
        description: "Please enter your Github URL",
        position: "top-center",
      });
      return;
    }

    try {
      setLoading(true);

      const resp = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, {
        github,
      });

      setProgress(100);

      navigate(`/interview/${resp.data.id}`);
    } catch (error) {
      toast.error("Error", {
        description: "Failed to connect to the server",
        position: "top-center",
      });

      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div>
        {loading && (
          <div className="mb-4 flex justify-center">
            <Progress value={progress} className="w-[60%]" />
          </div>
        )}

        <div className="flex justify-center">
          <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
            InterVue.AI
          </h2>
        </div>

        <div className="p-1">
          <Input
            placeholder="Github URL"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
          />
        </div>

        <div className="flex justify-center p-1">
          <Button disabled={loading} onClick={handleSubmit}>
            {loading && <Spinner data-icon="inline-start" />}
            {loading ? "Starting..." : "Start Interview"}
          </Button>
        </div>
      </div>
    </div>
  );
}