export interface RenderQueuePayload {
  renderJobId: string;
}

export interface RenderJobQueue {
  enqueue(payload: RenderQueuePayload): Promise<void>;
}
