import { useState } from "react";
import { Results } from "./components/Results";

import "./index.css";
import { Interview } from "./components/Interview";
import { Form } from "./components/Forms";
import { Toaster } from "sonner";


export function App() {
  const [page, setPage] = useState<"form" | "interview" | "result">("form");
  return (
    <div>
      {page == "form" && <Form/>}
      {page == "interview" && <Interview/>}
      {page == "interview" && <Results/>}
      <Toaster/>

    </div>
  );
}

export default App;
