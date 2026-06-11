import { useState } from "react";
import { Results } from "./components/Results";

import "./index.css";
import { Interview } from "./components/Interview";
import { Form } from "./components/Forms";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route } from "react-router";

export function App() {
  const [page, setPage] = useState<"form" | "interview" | "result">("form");
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Form/>}></Route>
          <Route path="/interview/:interviewId" element={<Interview/>}></Route>
          <Route path="/results/:interviewId" element={<Results/>}></Route>
        </Routes>
      </BrowserRouter>
      <Toaster/>

    </div>
  );
}

export default App;
