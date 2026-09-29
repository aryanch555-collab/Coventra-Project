import { LeadRecord } from '../types';

export function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim().length > 0) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let field = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuote && nextChar === '"') {
          field += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        fields.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] !== undefined ? values[index] : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

export function exportLeadsToCSV(leads: LeadRecord[], filename: string) {
  if (leads.length === 0) return;

  // Determine standard columns + dynamic extra fields
  const standardHeaders = [
    'ID',
    'Dataset Name',
    'Full Name',
    'Phone Number',
    'Company',
    'Title',
    'Email',
    'Location',
    'Industry',
    'Status',
    'Call Outcome',
    'Outcome Notes',
    'Processed By',
    'Processed At',
    'Created At'
  ];

  // Collect all unique extra field keys
  const extraKeysSet = new Set<string>();
  leads.forEach(l => {
    if (l.extraFields) {
      Object.keys(l.extraFields).forEach(k => extraKeysSet.add(k));
    }
  });
  const extraHeaders = Array.from(extraKeysSet);
  const allHeaders = [...standardHeaders, ...extraHeaders];

  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    allHeaders.map(escapeCSV).join(',')
  ];

  leads.forEach(lead => {
    const rowValues = [
      lead.id,
      lead.datasetName || '',
      lead.fullName || '',
      lead.phoneNumber || '',
      lead.company || '',
      lead.title || '',
      lead.email || '',
      lead.location || '',
      lead.industry || '',
      lead.status,
      lead.outcome || '',
      lead.outcomeNotes || '',
      lead.processedByName || '',
      lead.processedAt || '',
      lead.createdAt || ''
    ];

    extraHeaders.forEach(k => {
      rowValues.push(lead.extraFields?.[k] || '');
    });

    csvRows.push(rowValues.map(escapeCSV).join(','));
  });

  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const SAMPLE_CSV_DATA = `Full Name,Phone Number,Company,Job Title,Email,Location,Industry,Estimated Revenue,Notes
Eleanor Vance,+1 (555) 234-8901,Apex Horizon Global,Chief Operations Officer,eleanor.vance@apexhorizon.com,Chicago IL,Logistics & Supply,"$12M","Inquired last quarter regarding CRM pipeline consolidation."
Marcus Sterling,+1 (555) 345-6712,Sterling FinTech Advisors,VP of Client Acquisitions,m.sterling@sterlingfta.com,New York NY,Financial Services,"$28M","Prefers morning calls before 10 AM EST."
Samantha Reed,+1 (555) 456-9182,BioGenesis Labs,Director of Procurement,s.reed@biogenesis.org,Boston MA,Biotechnology,"$45M","Evaluating new cold outbound tooling this quarter."
David Chen,+1 (555) 567-1234,Quantum Leap Robotics,Head of Business Development,dchen@quantumleap-tech.io,Austin TX,Robotics & Automation,"$18M","Decision maker. Attended TechSummit last month."
Dr. Harrison Blake,+1 (555) 678-4321,OmniHealth Solutions,Chief Medical Officer,hblake@omnihealthcare.net,San Francisco CA,Healthcare SaaS,"$60M","Requires HIPAA compliance clarification first."
Chloe Montgomery,+1 (555) 789-5678,Elevate Commerce,Founder & CEO,chloe@elevatecommerce.co,Seattle WA,E-Commerce / Retail,"$8.5M","Direct founder. Fast decision cycle if ROI is clear."
Liam O'Connor,+1 (555) 890-6789,Titan Industrial Systems,Plant Operations Manager,loconnor@titanind.com,Detroit MI,Manufacturing,"$85M","Gatekeeper front desk usually screens, asks for direct line."
Sophia Al-Mansoor,+1 (555) 901-7890,Atlas Cloud Infrastructure,VP of Infrastructure,sophia@atlascloud.dev,Denver CO,Cloud Computing,"$34M","Looking to optimize team communication latency."
Carlos Ramirez,+1 (555) 012-8901,Solaria Clean Energy,Managing Director,carlos.r@solariapower.com,Phoenix AZ,Renewable Energy,"$15M","Expanding sales rep fleet across southwest territory."
Aria Takahashi,+1 (555) 123-9012,Kinetix Digital Studios,Chief Creative Officer,aria.t@kinetixdesign.jp,Los Angeles CA,Digital Media & Gaming,"$22M","Looking for flexible outbound campaigns for Q4."`;
