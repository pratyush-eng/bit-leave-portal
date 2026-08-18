import dataHandler from "./mongo/data";

export default function handler(req: any, res: any) {
  return dataHandler(req, res);
}
