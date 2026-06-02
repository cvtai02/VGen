import { RenderJobStatus } from "../../../core/shared-kernel/enums/render-job-status.js";
import { RenderJobType } from "../../../core/shared-kernel/enums/render-job-type.js";

const validTransitions = new Map<RenderJobStatus, RenderJobStatus[]>([
  [RenderJobStatus.Pending, [RenderJobStatus.Rendering, RenderJobStatus.Cancelled]],
  [RenderJobStatus.Rendering, [RenderJobStatus.Completed, RenderJobStatus.Failed, RenderJobStatus.Cancelled]],
  [RenderJobStatus.Failed, [RenderJobStatus.Pending]]
]);

export class RenderJobEntity {
  constructor(
    public readonly id: string,
    public readonly type: RenderJobType,
    private status: RenderJobStatus
  ) {}

  getStatus(): RenderJobStatus {
    return this.status;
  }

  transitionTo(nextStatus: RenderJobStatus): void {
    const allowed = validTransitions.get(this.status) ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid render job status transition: ${this.status} -> ${nextStatus}`);
    }
    this.status = nextStatus;
  }
}
