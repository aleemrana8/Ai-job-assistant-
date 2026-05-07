/**
 * AI Career Agent — User Profile Module
 * Stores and manages user CV data for matching & auto-apply preparation
 */

// Full user profile parsed from CV — Rana Muhammad Aleem Akhtar
const DEFAULT_PROFILE = {
  name: 'Rana Muhammad Aleem Akhtar',
  email: 'raleem811811@gmail.com',
  phone: '+92-315-166-48-43',
  linkedin: 'https://linkedin.com/in/aleem-akhtar–ba2295308',
  portfolio: 'https://MeetAleem.com',
  github: 'https://github.com/aleemakhtar811',
  years_of_experience: '1-3',
  preferred_roles: [
    'Project Manager', 'Product Manager', 'AI Project Manager',
    'Technical Project Manager', 'Program Manager', 'Scrum Master',
    'Agile Project Manager', 'Associate Product Manager', 'Junior Project Manager',
    'Project Coordinator', 'Technical Program Manager',
  ],
  preferred_locations: ['Remote', 'Worldwide'],
  remote_preference: 'Remote Only',
  preferred_salary: '',
  industries: ['Healthcare', 'AI', 'Automation', 'SaaS', 'Fintech', 'Tech', 'RCM'],
  education: [
    { degree: 'BS Software Engineering', institution: 'COMSATS University Islamabad', year: '2021-2025' },
    { degree: 'FSC Pre-Engineering', institution: 'Punjab College Multan', year: '2018-2020' },
  ],
  certifications: [],
  technical_skills: [
    'JavaScript', 'React.js', 'React Native', 'REST APIs', 'RAG', 'LLM',
    'SQL', 'Data Structures', 'OOP', 'Web Development', 'Node.js',
  ],
  management_skills: [
    'Agile', 'Scrum', 'Sprint Planning', 'Risk Management', 'KPI Tracking',
    'Stakeholder Communication', 'Solution Architecture', 'Roadmaps',
    'Requirements Gathering', 'Delivery Management', 'Decision Making',
    'Cross-functional Team Leadership', 'Project Planning',
  ],
  tools: [
    'Jira', 'Trello', 'n8n', 'LiveKit', 'ElevenLabs', 'CRM',
    'Selenium', 'Cypress', 'Excel', 'Cloudinary', 'Ant Design',
  ],
  ai_automation: ['n8n', 'LiveKit', 'ElevenLabs', 'ChatGPT', 'LLM', 'RAG'],
  soft_skills: [
    'Leadership', 'Communication', 'Coordination', 'Problem Solving',
    'Critical Thinking', 'Product Thinking', 'Team Collaboration',
    'Client Management', 'Stakeholder Management',
  ],
  domain_expertise: [
    'Healthcare Automation', 'Revenue Cycle Management (RCM)',
    'AI Agents', 'Conversational AI', 'Appointment Scheduling',
    'Medical Coding', 'Payment Posting', 'EOB/ERA Reconciliation',
    'SaaS Products', 'Community Platforms',
  ],
  experience: [
    {
      role: 'AI Team Lead / Technical Project Manager',
      company: 'CareCloud MTBC',
      period: 'Jan 2026 – Ongoing',
      highlights: [
        'Led healthcare Front Desk Agent handling 10K+ calls/month',
        'Deployed AI agents on LiveKit, n8n, ElevenLabs',
        'Led cross-functional team of AI engineers and operations',
      ],
    },
    {
      role: 'Project Manager',
      company: 'CareCloud MTBC',
      period: 'Aug 2025 – Dec 2025',
      highlights: [
        'Led RCM automation projects (medical coding, denial management, billing)',
        'Designed AI-powered automation solutions',
        'Managed healthcare appointment agents',
      ],
    },
    {
      role: 'Project Manager Intern',
      company: 'CareCloud MTBC',
      period: 'May 2025 – Aug 2025',
      highlights: [
        'Managed project tasks and timelines',
        'Coordinated with cross-functional teams',
        'Analyzed RCM processes',
      ],
    },
    {
      role: 'Project Manager',
      company: 'Fiverr (Freelance)',
      period: 'Feb 2022 – Ongoing',
      highlights: [
        'End-to-end client project management across multiple domains',
        'Delivered multiple projects with high satisfaction',
      ],
    },
  ],
  projects: [
    'Front Desk AI Agent (conversational AI for appointment scheduling)',
    'RCM Automation Platform (AI-driven revenue cycle management)',
    'TechSpace Community Web-App (React, Ant Design, Cloudinary)',
  ],
  strengths: [
    'AI-driven automation leadership',
    'Healthcare domain expertise',
    'Cross-functional team management',
    'Solution architecture mindset',
    'Hands-on technical + strategic leadership',
  ],
  target_seniority: ['Entry', 'Mid', 'Associate', 'Junior'],
  summary: 'Experienced Technical Project Manager with a solution-architecture mindset, specializing in AI-driven automation solutions. Combines hands-on software engineering expertise with strategic project leadership to translate complex business requirements into scalable technical architectures and measurable outcomes. Proven track record of driving AI innovation and integration across diverse product lines while leading cross-functional teams. Currently leading AI agents handling 10K+ calls/month at CareCloud MTBC.',
};

let userProfile = { ...DEFAULT_PROFILE };

export function getProfile() {
  return userProfile;
}

export function updateProfile(updates) {
  userProfile = { ...userProfile, ...updates };
  return userProfile;
}

/**
 * Match a job against the user profile
 * Returns detailed match analysis with comprehensive scoring
 */
export function matchJob(job) {
  const title = (job.title || '').toLowerCase();
  const description = (job.description || job.summary || '').toLowerCase();
  const combined = title + ' ' + description;

  // Role relevance (0-3)
  let roleScore = 0;
  if (/technical\s*project\s*manager/i.test(title)) roleScore = 3;
  else if (/ai\s*project\s*manager/i.test(title)) roleScore = 3;
  else if (/project\s*manager/i.test(title)) roleScore = 3;
  else if (/product\s*manager/i.test(title)) roleScore = 3;
  else if (/program\s*manager/i.test(title)) roleScore = 2;
  else if (/scrum\s*master/i.test(title)) roleScore = 2;
  else if (/agile.*manager/i.test(title)) roleScore = 2;
  else if (/project\s*coordinator/i.test(title)) roleScore = 2;
  else if (/delivery\s*manager/i.test(title)) roleScore = 2;

  // Skills match — combine all profile skills
  const allSkills = [
    ...userProfile.technical_skills,
    ...userProfile.management_skills,
    ...userProfile.tools,
    ...userProfile.ai_automation,
    ...userProfile.soft_skills,
  ];
  const uniqueSkills = [...new Set(allSkills.map(s => s.toLowerCase()))];
  const matchedSkills = [];
  for (const s of allSkills) {
    if (combined.includes(s.toLowerCase()) && !matchedSkills.includes(s)) {
      matchedSkills.push(s);
    }
  }

  // Domain match bonus
  let domainBonus = 0;
  for (const domain of userProfile.domain_expertise) {
    if (combined.includes(domain.toLowerCase())) { domainBonus = 1; break; }
  }
  // Also check for healthcare/AI keywords which are core domains
  if (/healthcare|health\s*care|medical|rcm|revenue\s*cycle/i.test(combined)) domainBonus = 1;
  if (/ai\s*agent|automation|conversational\s*ai|llm|machine\s*learning/i.test(combined)) domainBonus = 1;

  // Check for skills mentioned in job but not in profile
  const missingSkills = [];
  const commonPMSkills = ['pmp', 'prince2', 'safe', 'kanban', 'okr', 'kpi', 'budget', 'p&l', 'six sigma', 'lean', 'tableau', 'power bi', 'msproject', 'smartsheet'];
  for (const skill of commonPMSkills) {
    if (combined.includes(skill) && !uniqueSkills.some(s => s.includes(skill))) {
      missingSkills.push(skill.toUpperCase());
    }
  }

  // Experience match (0-2)
  let expScore = 2; // default good — user has ~1.5 years + internships + freelance since 2022
  if (/8\+\s*years|10\+\s*years|15\+\s*years|director|vp\s|vice\s*president/i.test(combined)) expScore = 0;
  else if (/5\+\s*years|7\+\s*years/i.test(combined)) expScore = 0;
  else if (/3\+\s*years|4\+\s*years/i.test(combined)) expScore = 1;
  else if (/entry|junior|associate|0-2|1-3|2-4|early\s*career/i.test(combined)) expScore = 2;

  // Remote fit (0-1)
  const remoteFit = /remote|worldwide|anywhere|wfh|work\s*from\s*home/i.test((job.location || '') + ' ' + title) ? 1 : 0;

  // Skill match score (0-2)
  const skillScore = matchedSkills.length >= 5 ? 2 : matchedSkills.length >= 2 ? 1 : 0;

  // If job has very little description text, give benefit of doubt
  const descriptionBonus = combined.length < 100 ? 1 : 0;

  // Calculate total (1-10)
  const raw = roleScore + expScore + skillScore + remoteFit + domainBonus + descriptionBonus + 1; // +1 base
  const score = Math.min(Math.max(raw, 1), 10);

  // Generate reason
  const reasons = [];
  if (roleScore >= 3) reasons.push('Direct role match');
  else if (roleScore === 2) reasons.push('Related role');
  if (matchedSkills.length > 0) reasons.push(`${matchedSkills.length} skills overlap`);
  if (remoteFit) reasons.push('Remote position');
  if (expScore >= 2) reasons.push('Experience level fits');
  else if (expScore === 1) reasons.push('Slightly above experience level');
  if (domainBonus) reasons.push('Domain expertise match');

  return {
    score,
    skills_match: matchedSkills.slice(0, 12),
    skills_missing: missingSkills.slice(0, 6),
    reason: reasons.join('. ') || 'Potential match',
    auto_apply_eligible: score >= 8,
    experience_match: expScore >= 1,
    role_relevance: roleScore >= 2,
  };
}

/**
 * Generate a tailored cover letter for a job
 * Based on user's actual cover letter style
 */
export function generateCoverLetter(job) {
  const profile = userProfile;
  const title = job.title || 'the position';
  const company = job.company || 'your company';
  const description = (job.description || job.summary || '').toLowerCase();

  // Determine key talking points based on job description
  const talkingPoints = [];
  if (/ai|automation|machine\s*learning|llm/i.test(description)) {
    talkingPoints.push('leading AI-driven automation solutions, including conversational AI agents handling 10K+ calls/month');
  }
  if (/healthcare|medical|health/i.test(description)) {
    talkingPoints.push('designing and deploying healthcare automation solutions including Front Desk Agents and RCM platforms');
  }
  if (/agile|scrum|sprint/i.test(description)) {
    talkingPoints.push('managing agile sprint execution, stakeholder communication, and technical delivery with KPI tracking');
  }
  if (/rcm|revenue|billing|coding/i.test(description)) {
    talkingPoints.push('architecting RCM automation workflows for medical coding, payment posting, and EOB/ERA reconciliation');
  }
  if (talkingPoints.length === 0) {
    talkingPoints.push('translating complex business requirements into scalable technical architectures with measurable outcomes');
  }

  // Build relevant skills list based on job
  const relevantSkills = [];
  const allSkills = [...profile.management_skills, ...profile.technical_skills, ...profile.tools, ...profile.ai_automation];
  for (const skill of allSkills) {
    if (description.includes(skill.toLowerCase()) && relevantSkills.length < 6) {
      relevantSkills.push(skill);
    }
  }
  if (relevantSkills.length < 3) {
    relevantSkills.push(...profile.management_skills.slice(0, 4 - relevantSkills.length));
  }

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const letter = `${profile.name}
Islamabad · ${profile.email} · ${profile.phone} · ${profile.portfolio}
LinkedIn: ${profile.linkedin} · GitHub: ${profile.github}

${today}

Dear Hiring Manager,

I am a Technical Project Manager with a strong software-engineering background and practical experience leading AI-driven automation and product delivery. I have successfully translated complex business requirements into scalable technical solutions, led cross-functional teams, and delivered measurable improvements in operational efficiency. I am writing to express my strong interest in the ${title} position at ${company}.

In my current role at CareCloud MTBC, I have been ${talkingPoints[0]}. ${talkingPoints.length > 1 ? 'I have also focused on ' + talkingPoints[1] + '.' : ''} I partner closely with engineering, QA, and operations teams to define clear roadmaps, manage sprint execution, and ensure releases meet business objectives while maintaining high technical quality.

My strengths include ${relevantSkills.slice(0, 4).join(', ')}, and a practical understanding of frontend and backend technologies (React, REST APIs, Node.js) that helps me bridge product strategy and engineering execution. I bring a pragmatic mindset to prioritization, a track record of improving processes through automation, and a focus on delivering value to users and the business.

I am excited about this opportunity at ${company} where I can drive projects from discovery through launch, optimize delivery practices, and support product evolution. I welcome the chance to discuss how my background and skills can support your team.

Sincerely,
${profile.name}
${profile.email} · ${profile.phone}`;

  return letter;
}

/**
 * Prepare a complete "Ready to Apply" package for a job
 */
export function prepareApplication(job, matchResult) {
  const profile = userProfile;
  return {
    job_id: job.id,
    job_title: job.title,
    company: job.company,
    apply_link: job.link,
    score: matchResult.score,
    auto_apply_eligible: matchResult.auto_apply_eligible,
    application_data: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      linkedin: profile.linkedin,
      portfolio: profile.portfolio,
    },
    cover_letter: generateCoverLetter(job),
    status: matchResult.auto_apply_eligible ? 'Ready to Apply' : 'Review',
    prepared_at: new Date().toISOString(),
  };
}
