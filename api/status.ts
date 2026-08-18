import statusHandler from "./mongo/status";

export default function handler(req: any, res: any) {
  return statusHandler(req, res);
}
