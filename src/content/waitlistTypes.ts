export interface WaitlistSubmission {
  id: string;
  name: string;
  whatsapp: string;
  scent: string;
  submittedAt: string;
}

export type NewWaitlistSubmission = Pick<WaitlistSubmission, "name" | "whatsapp" | "scent">;
