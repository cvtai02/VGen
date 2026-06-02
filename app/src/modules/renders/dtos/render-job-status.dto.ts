export interface RenderJobStatusDto {
  status: "Pending" | "Rendering" | "Completed" | "Failed" | "Cancelled";
}
