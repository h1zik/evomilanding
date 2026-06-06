export interface WaitlistSubmission {
  id: string;
  name: string;
  whatsapp: string;
  scent: string;
  submittedAt: string;
}

export type NewWaitlistSubmission = Pick<WaitlistSubmission, "name" | "whatsapp"> & {
  /** @deprecated Tidak dipakai — form waitlist tidak lagi meminta pilihan aroma */
  scent?: string;
};
