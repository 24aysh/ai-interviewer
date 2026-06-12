import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import axios from "axios";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { BACKEND_URL } from "../lib/config";
import { useNavigate } from "react-router";

/**
 * Form component to accept the user's Github URL and initiate the interview process.
 */
export function Form() {
  const [github, setGithub] = useState("");
  const [resume,setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const onFileChange = (event : React.ChangeEvent<HTMLInputElement> ) => {
		if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]!);
    }
	};

  const navigate = useNavigate();

  const onFileUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a resume");
      return;
    }

    try {
      const formData = new FormData();

      // Must match upload.single("resume")
      formData.append("resume", selectedFile);

      const resp = await axios.post(
        `${BACKEND_URL}/upload/resume`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setResume(resp.data.text);
      toast.success("Resume uploaded successfully");
    } catch (error) {
      console.error(error);

      toast.error("Resume upload failed");
    }
  };

  // Handle fake progress bar progression while loading
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

  // Submit the github URL to the backend to create an interview session
  async function handleSubmit() {
    if (!github) {
      toast.error("Invalid Input", {
        description: "Please enter your Github URL",
        position: "top-center",
      });
      return;
    }
    if (!selectedFile){
      toast.error("Invalid Input", {
        description: "Please upload your resume",
        position: "top-center",
      });
      return;
    }

    try {
      setLoading(true);
      const resp = await axios.post(`${BACKEND_URL}/api/v1/pre-interview`, {
        github,
        resume
      });

      setProgress(100);

      // Navigate to the interview interface with the created session ID
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
          <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mb-4">
            InterVue.AI
          </h2>
        </div>

        <div className="p-1 mb-2">
          <Input
            placeholder="Github URL"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
          />
          <div className="p-2 mb-1 flex justify-around">
            <Input type="file" onChange={onFileChange} accept=".pdf" placeholder="Upload your Resume" />
            <div className="pl-2 mb-1 flex justify-end">
              <Button onClick={onFileUpload}>Upload</Button>
            </div>
          </div>
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