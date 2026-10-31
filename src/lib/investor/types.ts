export type InvestorStatus = "not_registered" | "active" | "revoked";

export type InvestorActionState = {
  status: "idle" | "error";
  message: string;
};
