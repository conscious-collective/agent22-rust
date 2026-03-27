export type DaemonStatus = "starting" | "running" | "stopped" | "error";

export interface DaemonStatusResponse {
  status: DaemonStatus;
  pid?: number;
  error_message?: string;
}

export interface AppError {
  kind: "DaemonNotRunning" | "Api" | "Network" | "Serialization" | "Io" | "Process";
  message: string;
}
