export type AppRole = "pelaku_usaha" | "mitra" | "superadmin";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export function isAppRole(value: unknown): value is AppRole {
  return (
    value === "pelaku_usaha" ||
    value === "mitra" ||
    value === "superadmin"
  );
}
