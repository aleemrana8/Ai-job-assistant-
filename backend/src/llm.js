import OpenAI from 'openai';
import { getProfile } from './profile.js';

let _openai = null;
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Deep LLM analysis of a job posting against user profile
 * Returns detailed match info, tailored cover letter, and application strategy
 */
export async function analyzeJobWithLLM(job) {
  const profile = getProfile();
  const prompt = `You are an expert career advisor AI. Analyze this job posting against the candidate's profile and provide a detailed assessment.

## Job Posting:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || 'Remote'}
- Source: ${job.source || 'LinkedIn'}
- Description: ${job.summary || job.description || 'No detailed description available'}
- Link: ${job.link || 'N/A'}

## Candidate Profile:
- Name: ${profile.name}
- Current Role: AI Team Lead / Technical Project Manager at CareCloud MTBC
- Experience: ${profile.years_of_experience} years
- Technical Skills: ${profile.technical_skills.join(', ')}
- Management Skills: ${profile.management_skills.join(', ')}
- Tools: ${profile.tools.join(', ')}
- AI & Automation: ${profile.ai_automation.join(', ')}
- Domain Expertise: ${profile.domain_expertise.join(', ')}
- Education: ${profile.education.map(e => `${e.degree} - ${e.institution}`).join('; ')}
- Key Projects: ${profile.projects.join('; ')}
- Strengths: ${profile.strengths.join(', ')}

## Provide JSON response with:
1. "match_score" (1-10): How well the candidate matches
2. "match_reason": 2-3 sentence explanation of why this is a good/bad match
3. "skills_matched": Array of candidate's skills that match this job
4. "skills_missing": Array of skills the job requires that candidate lacks
5. "application_strategy": How to position the application (2-3 sentences)
6. "key_selling_points": Array of 3-5 points to highlight in application
7. "potential_concerns": Array of any concerns the employer might have
8. "recommended_action": "auto_apply" | "review" | "skip"
9. "confidence": "high" | "medium" | "low"

Respond ONLY with valid JSON, no markdown.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const text = response.choices[0].message.content.trim();
    const analysis = JSON.parse(text.replace(/```json\n?|```/g, ''));
    return { success: true, ...analysis };
  } catch (e) {
    console.error('[llm] Analysis failed:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Generate a tailored cover letter using OpenAI
 */
export async function generateCoverLetterLLM(job, analysis = null) {
  const profile = getProfile();
  const prompt = `Write a professional, concise cover letter for this job application. The letter should be tailored specifically to this role and company.

## Job:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location || 'Remote'}
- Description: ${job.summary || job.description || 'Project/Product Management role'}

## Candidate:
- Name: ${profile.name}
- Current Role: AI Team Lead / Technical Project Manager at CareCloud MTBC
- Experience: Leading AI agents handling 10K+ calls/month, RCM automation, cross-functional team leadership
- Skills: Agile, Scrum, Sprint Planning, React.js, Node.js, AI/LLM, n8n automation
- Domain: Healthcare AI, SaaS, Revenue Cycle Management
- Education: BS Software Engineering, COMSATS University
- Key Achievement: Deployed AI conversational agents, led healthcare automation projects

${analysis ? `## AI Analysis suggests highlighting: ${(analysis.key_selling_points || []).join(', ')}` : ''}

## Requirements:
- Keep it under 250 words
- Professional but personable tone
- Highlight 2-3 most relevant experiences
- Show enthusiasm for the specific company/role
- End with a clear call to action
- Format: plain text, ready to paste into application form

Write ONLY the cover letter text, no additional commentary.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
    });

    return response.choices[0].message.content.trim();
  } catch (e) {
    console.error('[llm] Cover letter generation failed:', e.message);
    return null;
  }
}

/**
 * Generate application answers for common questions using LLM
 */
export async function generateApplicationAnswers(job, questions = []) {
  const profile = getProfile();
  const prompt = `You are helping a candidate fill out a job application. Answer these application questions professionally and concisely.

## Job: ${job.title} at ${job.company}
## Candidate: ${profile.name} - Technical Project Manager, ${profile.years_of_experience} years experience

## Questions to answer:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## Candidate Background:
- Current: AI Team Lead at CareCloud MTBC (healthcare AI automation)
- Skills: Agile, Scrum, AI/ML, React, Node.js, Project Management
- Achievements: Led AI agents handling 10K+ calls/month, RCM automation
- Education: BS Software Engineering

Provide answers as JSON array of objects with "question" and "answer" fields. Keep answers concise (1-3 sentences each unless the question requires more detail).
Respond ONLY with valid JSON.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 800,
    });

    const text = response.choices[0].message.content.trim();
    return JSON.parse(text.replace(/```json\n?|```/g, ''));
  } catch (e) {
    console.error('[llm] Answer generation failed:', e.message);
    return [];
  }
}
