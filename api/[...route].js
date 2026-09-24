import { handleRequest } from '../lib/handler.mjs';

export default async function handler(req, res) {
  return handleRequest(req, res);
}
