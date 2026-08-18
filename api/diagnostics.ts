import diagnosticsHandler from "./mongo/diagnostics";

export default function handler(req: any, res: any) {
  return diagnosticsHandler(req, res);
}
