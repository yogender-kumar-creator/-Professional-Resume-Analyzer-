const express = require("express");
const fileUpload = require("express-fileupload");
const pdfParse = require("pdf-parse");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(fileUpload());

const PORT = 5000;

// Utility to escape regex special chars from keywords
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Categorized technical skills from data
const TECH_SKILLS = {
  languages: ["Python", "JavaScript", "Java", "C++", "C", "TypeScript", "SQL", "Bash", "R", "Go", "Rust", "PLSQL"],
  frameworks: ["React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "Spring", "Laravel", "Next.js"],
  cloud: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Jenkins"],
  databases: ["MySQL", "PostgreSQL", "MongoDB", "Redis", "Cassandra", "DynamoDB", "Oracle", "SQL Server"],
  aiml: ["TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "OpenCV", "Keras"],
  tools: ["Git", "GitHub", "GitLab", "Jira", "Linux", "VS Code", "IntelliJ", "JIRA"]
};

const SOFT_SKILLS = ["Leadership", "Teamwork", "Communication", "Problem Solving", "Critical Thinking", "Project Management", "Collaboration", "Mentoring"];

const ACTION_VERBS = [
  "Developed", "Implemented", "Built", "Created", "Designed", "Led", "Managed", "Optimized",
  "Improved", "Achieved", "Increased", "Reduced", "Streamlined", "Collaborated", "Delivered",
  "Launched", "Executed", "Architected", "Engineered", "Mentored", "Established"
];

const RED_FLAGS = [
  "responsible for", "helped with", "assisted in", "tried to", "worked on", "participated in",
  "familiar with", "exposure to", "some experience", "basic knowledge"
];

const REQUIRED_SECTIONS = ["education", "experience", "skills", "projects", "profile", "summary"];

function analyzeResume(text) {
  const analysis = {
    sections: analyzeSections(text),
    skills: analyzeSkills(text),
    achievements: analyzeAchievements(text),
    actionVerbs: analyzeActionVerbs(text),
    redFlags: analyzeRedFlags(text),
    contact: analyzeContact(text),
    quantifiables: analyzeQuantifiables(text),
    length: analyzeLength(text),
    formatting: analyzeFormatting(text)
  };

  const score = calculateScore(analysis);
  const suggestions = generateSuggestions(analysis);
  const summary = generateSummary(analysis, text);

  return { analysis, score, suggestions, summary };
}

function analyzeSections(text) {
  const found = [];
  const missing = [];

  REQUIRED_SECTIONS.forEach(section => {
    const regex = new RegExp(section, 'i');
    if (regex.test(text)) {
      found.push(section);
    } else {
      missing.push(section);
    }
  });

  // Additional optional sections detection
  const optionalSections = ["certifications", "achievements", "awards", "publications", "projects", "hobbies"];
  const optionalFound = optionalSections.filter(s => new RegExp(s, 'i').test(text));

  return { found, missing, optional: optionalFound };
}

function analyzeSkills(text) {
  const foundSkills = { technical: [], soft: [], total: 0 };

  Object.values(TECH_SKILLS).flat().forEach(skill => {
    const escaped = escapeRegex(skill);
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) {
      foundSkills.technical.push(skill);
    }
  });

  SOFT_SKILLS.forEach(skill => {
    const escaped = escapeRegex(skill);
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) {
      foundSkills.soft.push(skill);
    }
  });

  foundSkills.total = foundSkills.technical.length + foundSkills.soft.length;
  return foundSkills;
}

function analyzeAchievements(text) {
  const achievements = [];
  const patterns = [
    /won|winner|first place|1st place|awarded|medal|recognition/gi,
    /top \d+|rank \d+|ranked #?\d+/gi,
    /certified|certification/gi,
    /published|patent|paper/gi,
  ];

  patterns.forEach(pat => {
    const matches = text.match(pat);
    if (matches) achievements.push(...matches);
  });

  return [...new Set(achievements)];
}

function analyzeActionVerbs(text) {
  const found = [];
  ACTION_VERBS.forEach(verb => {
    const escaped = escapeRegex(verb);
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(text)) found.push(verb);
  });
  return found;
}

function analyzeRedFlags(text) {
  const found = [];
  RED_FLAGS.forEach(flag => {
    const escaped = escapeRegex(flag);
    if (new RegExp(escaped, 'i').test(text)) found.push(flag);
  });
  return found;
}

function analyzeContact(text) {
  return {
    email: /\S+@\S+\.\S+/.test(text),
    phone: /(?:\+?\d{1,3})?[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/.test(text),
    linkedin: /linkedin\.com/i.test(text),
    github: /github\.com/i.test(text)
  };
}

function analyzeQuantifiables(text) {
  const quantPatterns = [
    /\d+%/g,
    /\$\d+(\.\d+)?[kKmM]?/g,
    /increased by \d+/gi,
    /reduced by \d+/gi,
    /improved by \d+/gi,
    /\d+ years/gi,
    /\d+ months/gi
  ];

  const found = [];
  quantPatterns.forEach(pat => {
    const matches = text.match(pat);
    if (matches) found.push(...matches);
  });

  return [...new Set(found)];
}

function analyzeLength(text) {
  const words = text.trim().split(/\s+/).length;
  return {
    words,
    optimal: words > 200 && words < 1000,
    tooShort: words <= 200,
    tooLong: words >= 1000
  };
}

function analyzeFormatting(text) {
  return {
    hasHeaders: /(?:[A-Z]{3,} {0,2})/.test(text),
    hasBullets: /(?:^[-*•]\s+)/m.test(text),
    consistentCasing: true // a placeholder for deeper formatting analysis
  };
}

function calculateScore(analysis) {
  let score = 0;

  // Section coverage up to 25 points
  score += analysis.sections.found.length * 5;
  score += analysis.sections.optional.length * 2;

  // Skills up to 20 points
  if (analysis.skills.technical.length >= 6) score += 12;
  else if (analysis.skills.technical.length >= 3) score += 8;
  else if (analysis.skills.technical.length >= 1) score += 4;

  if (analysis.skills.soft.length >= 3) score += 8;
  else if(analysis.skills.soft.length >= 1) score += 4;

  // Action verbs up to 15 points
  if (analysis.actionVerbs.length >= 6) score += 15;
  else if (analysis.actionVerbs.length >= 3) score += 10;
  else if (analysis.actionVerbs.length >= 1) score += 5;

  // Quantifiables up to 15 points
  if (analysis.quantifiables.length >= 4) score += 15;
  else if (analysis.quantifiables.length >= 2) score += 10;
  else if (analysis.quantifiables.length >= 1) score += 5;

  // Contact completeness up to 10 points
  if (analysis.contact.email) score += 3;
  if (analysis.contact.phone) score += 2;
  if (analysis.contact.linkedin) score += 3;
  if (analysis.contact.github) score += 2;

  // Achievements up to 10 points
  if (analysis.achievements.length >= 2) score += 10;
  else if (analysis.achievements.length >= 1) score += 5;

  // Length criteria up to 5 points
  if (analysis.length.optimal) score += 5;

  // Deduct for red flags and length issues
  score -= analysis.redFlags.length * 3;
  if (analysis.length.tooShort) score -= 5;
  if (analysis.length.tooLong) score -= 3;

  return Math.min(Math.max(0, Math.round(score)), 100);
}

function generateSuggestions(analysis) {
  const suggestions = [];

  if (analysis.sections.missing.length > 0) {
    suggestions.push(`Add missing sections: ${analysis.sections.missing.join(', ')}`);
  }
  if (analysis.skills.technical.length < 5) {
    suggestions.push("Expand your technical skills section with relevant tools and languages.");
  }
  if (analysis.actionVerbs.length < 4) {
    suggestions.push("Use stronger action verbs like 'Developed', 'Led', 'Implemented' in your descriptions.");
  }
  if (analysis.quantifiables.length < 2) {
    suggestions.push("Include quantifiable achievements (percentages, dollars, growth metrics).");
  }
  if (!analysis.contact.linkedin) {
    suggestions.push("Add a LinkedIn profile link.");
  }
  if (!analysis.contact.github && analysis.skills.technical.length >= 3) {
    suggestions.push("Include a GitHub or portfolio link to demonstrate work.");
  }
  if (analysis.redFlags.length > 0) {
    suggestions.push("Replace weak or passive phrases with confident and active language.");
  }
  if (analysis.length.tooShort) {
    suggestions.push("Expand your resume with additional experience or skills.");
  }
  if (analysis.length.tooLong) {
    suggestions.push("Condense your resume to the most relevant information.");
  }
  if (analysis.achievements.length === 0) {
    suggestions.push("Add certifications, awards, or professional achievements.");
  }

  return suggestions.slice(0, 6);
}

function generateSummary(analysis, originalText) {
  const skillCount = analysis.skills.total;
  const hasWorkExp = /experience|work|projects|internship/i.test(originalText);
  const level = skillCount > 8 ? "experienced" : skillCount > 4 ? "proficient" : "novice";

  if(skillCount === 0) {
    return "Resume lacks clear skills. Consider elaborating your professional and technical competencies.";
  }

  const topSkills = analysis.skills.technical.slice(0, 4).join(", ");
  const experiencePhrase = hasWorkExp ? "demonstrated work experience" : "strong academic background";

  return `${level.charAt(0).toUpperCase() + level.slice(1)} professional with expertise in ${topSkills}. Shows ${experiencePhrase} and notable accomplishments.`;
}


// Main endpoint
app.post("/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.resume) return res.status(400).json({ error: "No file uploaded" });

    const file = req.files.resume;
    console.log(`📂 Received file: ${file.name} (${Math.round(file.size / 1024)} KB)`);

    const pdfData = await pdfParse(file.data);
    const text = pdfData.text || "";
    console.log(`📄 Extracted ${text.split(/\s+/).length} words from PDF`);

    const result = analyzeResume(text);

    res.json({
      resume_rating: result.score,
      highlights: [...result.analysis.skills.technical, ...result.analysis.skills.soft],
      summary: result.summary,
      suggestions: result.suggestions,
      missing_skills: Object.values(TECH_SKILLS).flat().filter(s => !result.analysis.skills.technical.includes(s)).slice(0, 10),
      detailed_analysis: {
        sections_found: result.analysis.sections.found,
        action_verbs_count: result.analysis.actionVerbs.length,
        quantifiable_achievements: result.analysis.quantifiables,
        red_flags: result.analysis.redFlags,
        contact_info: result.analysis.contact,
        word_count: result.analysis.length.words
      }
    });
  } catch (err) {
    console.error("❌ Server Error:", err.message);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Advanced Resume Analyzer running on http://localhost:${PORT}`);
});
