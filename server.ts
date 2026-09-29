import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Persistent server-side store for accounts and leads queue
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'app-db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface UserAccount {
  uid: string;
  name: string;
  email: string;
  password: string;
  role: 'manager' | 'agent';
  createdAt: string;
}

interface LeadRecord {
  id: string;
  datasetId: string;
  datasetName: string;
  datasetType?: 'production' | 'sample_test';
  rowNumber: number;
  fullName: string;
  phoneNumber: string;
  company?: string;
  title?: string;
  email?: string;
  location?: string;
  industry?: string;
  estimatedRevenue?: string;
  notes?: string;
  extraFields?: Record<string, string>;
  status: 'unassigned' | 'in_progress' | 'completed';
  claimedByUid?: string;
  claimedByName?: string;
  claimedAt?: string;
  outcome?: string;
  outcomeNotes?: string;
  processedAt?: string;
  processedByUid?: string;
  processedByName?: string;
  createdAt: string;
}

interface DatabaseState {
  users: UserAccount[];
  leads: LeadRecord[];
}

function loadDb(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading DB file:', err);
  }

  // Initial default accounts
  const defaultState: DatabaseState = {
    users: [
      {
        uid: 'mgr_001',
        name: 'Eleanor Sterling',
        email: 'manager@callflow.internal',
        password: 'ManagerPass2026!',
        role: 'manager',
        createdAt: new Date().toISOString()
      },
      {
        uid: 'agt_001',
        name: 'Sarah Jenkins',
        email: 'sarah.agent@callflow.internal',
        password: 'AgentPass2026!',
        role: 'agent',
        createdAt: new Date().toISOString()
      },
      {
        uid: 'agt_002',
        name: 'David Miller',
        email: 'david.agent@callflow.internal',
        password: 'AgentPass2026!',
        role: 'agent',
        createdAt: new Date().toISOString()
      }
    ],
    leads: []
  };

  saveDb(defaultState);
  return defaultState;
}

function saveDb(state: DatabaseState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

// In-memory reference
let dbState: DatabaseState = loadDb();

// Helper: Extract user from Authorization header
function getAuthUser(req: Request): UserAccount | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  // Find user by UID or email embedded in token
  // Token format: usr_<base64> or uid or email
  const user = dbState.users.find(u => u.uid === token || u.email.toLowerCase() === token.toLowerCase());
  return user || null;
}

// ================= API ROUTES =================

// 1. Unified Sign In
app.post('/api/auth/signin', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const user = dbState.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(401).json({ success: false, error: 'No account found with this email. Please request an account from your manager.' });
  }

  if (user.password !== password) {
    return res.status(401).json({ success: false, error: 'Invalid password. Please check your credentials.' });
  }

  // Return authenticated session with token and assigned role
  return res.json({
    success: true,
    token: user.uid,
    user: {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }
  });
});

// 2. Server-side Action: Manager provisions account (Verifies caller is manager)
app.post('/api/manager/provision-account', (req: Request, res: Response) => {
  const caller = getAuthUser(req);
  if (!caller || caller.role !== 'manager') {
    return res.status(403).json({ success: false, error: 'Unauthorized: Only managers can provision user accounts.' });
  }

  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, error: 'Name, email, password, and role are required.' });
  }

  if (role !== 'agent' && role !== 'manager') {
    return res.status(400).json({ success: false, error: 'Invalid role specified.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  if (dbState.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ success: false, error: `An account for "${email}" already exists.` });
  }

  const newUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newUser: UserAccount = {
    uid: newUid,
    name: String(name).trim(),
    email: cleanEmail,
    password: String(password),
    role: role,
    createdAt: new Date().toISOString()
  };

  dbState.users.push(newUser);
  saveDb(dbState);

  // Manager remains signed in: server responds with success and new user details
  return res.json({
    success: true,
    user: {
      uid: newUser.uid,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    }
  });
});

// 3. Manager: Fetch managed users list
app.get('/api/manager/users', (req: Request, res: Response) => {
  const caller = getAuthUser(req);
  if (!caller || caller.role !== 'manager') {
    return res.status(403).json({ success: false, error: 'Unauthorized: Manager access required.' });
  }

  const sanitized = dbState.users.map(u => ({
    uid: u.uid,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt
  }));

  return res.json({ success: true, users: sanitized });
});

// 4. Server-side Action: Agent requests next lead (ATOMIC ASSIGNMENT of ONE record)
// Verifies caller is an agent, returns ONLY that single lead.
app.post('/api/agent/next-lead', (req: Request, res: Response) => {
  const caller = getAuthUser(req);
  if (!caller) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  // Verify caller is an agent
  if (caller.role !== 'agent') {
    return res.status(403).json({ success: false, error: 'Forbidden: This action is restricted exclusively to agents.' });
  }

  // 1. Check if agent already has an in-progress record
  const existingLead = dbState.leads.find(
    l => l.status === 'in_progress' && l.claimedByUid === caller.uid
  );

  if (existingLead) {
    return res.json({
      success: true,
      lead: existingLead,
      message: 'Active lead resumed.'
    });
  }

  // 2. Atomically find and claim the next unassigned lead
  const unassignedIndex = dbState.leads.findIndex(l => l.status === 'unassigned');
  if (unassignedIndex === -1) {
    return res.json({
      success: true,
      lead: null,
      message: 'Queue is complete. No unassigned leads available.'
    });
  }

  const lead = dbState.leads[unassignedIndex];
  lead.status = 'in_progress';
  lead.claimedByUid = caller.uid;
  lead.claimedByName = caller.name;
  lead.claimedAt = new Date().toISOString();

  saveDb(dbState);

  // Return ONLY this single lead
  return res.json({
    success: true,
    lead: lead
  });
});

// 5. Server-side Action: Agent completes lead and claims next
app.post('/api/agent/complete-lead', (req: Request, res: Response) => {
  const caller = getAuthUser(req);
  if (!caller || caller.role !== 'agent') {
    return res.status(403).json({ success: false, error: 'Forbidden: Agent action.' });
  }

  const { leadId, outcome, outcomeNotes } = req.body;
  if (!leadId || !outcome) {
    return res.status(400).json({ success: false, error: 'leadId and outcome required.' });
  }

  const lead = dbState.leads.find(l => l.id === leadId);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead not found.' });
  }

  if (lead.claimedByUid !== caller.uid) {
    return res.status(403).json({ success: false, error: 'Forbidden: You do not own this lead.' });
  }

  // Mark completed
  lead.status = 'completed';
  lead.outcome = outcome;
  lead.outcomeNotes = outcomeNotes ? String(outcomeNotes).trim() : '';
  lead.processedAt = new Date().toISOString();
  lead.processedByUid = caller.uid;
  lead.processedByName = caller.name;

  // Automatically fetch next lead in queue
  let nextLead: LeadRecord | null = null;
  const nextIndex = dbState.leads.findIndex(l => l.status === 'unassigned');
  if (nextIndex !== -1) {
    nextLead = dbState.leads[nextIndex];
    nextLead.status = 'in_progress';
    nextLead.claimedByUid = caller.uid;
    nextLead.claimedByName = caller.name;
    nextLead.claimedAt = new Date().toISOString();
  }

  saveDb(dbState);

  return res.json({
    success: true,
    completedLeadId: leadId,
    nextLead: nextLead
  });
});

// 6. Manager: Upload or Sync leads dataset
app.post('/api/manager/sync-leads', (req: Request, res: Response) => {
  const caller = getAuthUser(req);
  if (!caller || caller.role !== 'manager') {
    return res.status(403).json({ success: false, error: 'Unauthorized: Manager access required.' });
  }

  const { leads, replaceAll } = req.body;
  if (!Array.isArray(leads)) {
    return res.status(400).json({ success: false, error: 'Invalid leads array.' });
  }

  if (replaceAll) {
    dbState.leads = leads;
  } else {
    // Append or merge
    for (const newLead of leads) {
      const idx = dbState.leads.findIndex(l => l.id === newLead.id);
      if (idx !== -1) {
        dbState.leads[idx] = newLead;
      } else {
        dbState.leads.push(newLead);
      }
    }
  }

  saveDb(dbState);
  return res.json({ success: true, count: dbState.leads.length });
});

// 7. Manager: Query all leads
app.get('/api/manager/leads', (req: Request, res: Response) => {
  const caller = getAuthUser(req);
  if (!caller || caller.role !== 'manager') {
    return res.status(403).json({ success: false, error: 'Unauthorized: Manager access required.' });
  }

  return res.json({ success: true, leads: dbState.leads });
});

// ================= VITE DEV / PRODUCTION MOUNT =================

const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
