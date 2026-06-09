import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {toast} from "sonner";
import axios from "axios";

export function Form() {
  const [github, setGithub] = useState("");
  const [linkedIn,setlinkedIn] = useState("");
  async function handleSubmit(){
    if(!github || !linkedIn){
      toast.error("Invalid Input", {
          description: "Please fill in both fields",
          position: "top-center",
        });
    }
    await axios.post(`{BACKEND_URL}/api/v1/pre-interview`,{
      github,
      linkedIn
    });
    return;
  }
    
  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div>
        <div className="flex justify-center">
          <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
            InterVue.AI
          </h2>
        </div>
        
        <div className="p-1">
          <Input placeholder="LinkedIn URL" onChange={e => setlinkedIn(e.target.value)}/>
        </div>
        <div className="p-1">
          <Input placeholder="Github URL" onChange={e => setGithub(e.target.value)}/>
        </div>
        <div className="flex justify-center p-1">
          <Button onClick={handleSubmit}>Start Interview</Button>
        </div>
      </div>
    </div> 
  );
  
}
