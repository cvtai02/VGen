import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { RenderJobResultDto } from "api-clients";
import { renderClient } from "../api/clients.js";

export function RenderJobsPage() {
  const [jobs, setJobs] = useState<RenderJobResultDto[]>([]);

  async function load() {
    setJobs(await renderClient.listRenderJobs());
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <div className="heading-row">
        <h1>Render Jobs</h1>
        <button onClick={load}><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className="table">
        <div className="row header"><span>ID</span><span>Type</span><span>Status</span><span>Output</span></div>
        {jobs.map((job) => (
          <div className="row" key={job.id}>
            <span>{job.id}</span>
            <span>{job.type}</span>
            <span>{job.status}</span>
            <span>{job.output?.url ? <a href={job.output.url}>Open</a> : ""}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
