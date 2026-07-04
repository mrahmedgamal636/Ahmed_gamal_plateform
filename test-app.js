import express from 'express';
const app = express();
app.post('/api', (req, res) => res.send('ok'));
export default app;
