export default function handler(req: any, res: any) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ 
    status: "raw_handler_alive", 
    time: new Date().toISOString() 
  }));
}
