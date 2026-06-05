// ── Font helper (injected for use by analyzers) ──
const FONT = "'JetBrains Mono',ui-monospace,monospace";

// ── Core Helpers ──
function findLine(lines, substr) {
  for (let i = 0; i < lines.length; i++) if (lines[i].includes(substr)) return i + 1;
  return null;
}
function computeScore(issues) {
  const errors = issues.filter(i => i.severity === 'error').length;
  const warns = issues.filter(i => i.severity === 'warn').length;
  const infos = issues.filter(i => i.severity === 'info').length;
  return Math.max(10, Math.min(100, 100 - errors * 15 - warns * 8 - infos * 3));
}
function groupCategories(issues) {
  const groups = { syntax:{name:'Syntax & Structure',severity:'good',issues:[]},
    security:{name:'Security',severity:'good',issues:[]},
    performance:{name:'Performance',severity:'good',issues:[]},
    style:{name:'Code Style',severity:'good',issues:[]},
    best_practices:{name:'Best Practices',severity:'good',issues:[]},
    complexity:{name:'Complexity',severity:'good',issues:[]} };
  const sevRank = {error:0,warn:1,info:2};
  issues.forEach(i => {
    if (groups[i.category]) {
      groups[i.category].issues.push(i);
      const cur = sevRank[groups[i.category].severity]||2, nw = sevRank[i.severity]||2;
      if (nw < cur) groups[i.category].severity = i.severity;
    }
  });
  return groups;
}

// ── Language Detection ──
function detectLanguage(code) {
  const s = code.trim();
  if (/^#!/.test(s) || /\bdef\s+\w+\s*\(/.test(s) || /\bimport\s+\w+/.test(s) && /print\s*\(/.test(s)) return 'python';
  if (/^#!.*(bash|sh)/.test(s) || /^\s*(if|then|fi|esac|case)\b/m.test(s)) return 'bash';
  if (/\bfn\s+\w+/.test(s) && /\b(?:let|mut|unwrap|impl)\b/.test(s)) return 'rust';
  if (/\bpackage\s+\w+/.test(s) && /\bfunc\s+\w+/.test(s) && /\bfmt\./.test(s)) return 'go';
  if (/\bclass\s+\w+.*{/.test(s) && /\bvoid\s+\w+/.test(s) && /#include/.test(s)) return 'cpp';
  if (/\bpublic\s+class\s+\w+/.test(s) && /\bSystem\.out/.test(s)) return 'java';
  if (/\busing\s+System/.test(s) && /\bnamespace\s+\w+/.test(s)) return 'csharp';
  if (/\binterface\s+\w+/.test(s) || /\btype\s+\w+\s*=/.test(s) || /:\s*any\b/.test(s)) return 'typescript';
  if (/^<\?php/.test(s)) return 'php';
  if (/\brequire\s+['"]/.test(s) || /\bdef\s+\w+/.test(s) && /\bend\b/.test(s)) return 'ruby';
  if (/\bimport\s+UIKit/.test(s) || /\boverride\s+func\b/.test(s)) return 'swift';
  if (/\bfun\s+\w+\s*=/.test(s) && /\brunBlocking/.test(s)) return 'kotlin';
  if (/^<html/.test(s) || /^<!DOCTYPE/.test(s)) return 'html';
  if (/[{]\s*[a-z-]+\s*:/.test(s) && /[@]media/.test(s)) return 'css';
  if (/\bfunction\s+\w+/.test(s) || /\bconst\s+\w+\s*=/.test(s) || /\blet\s+\w+\s*=/.test(s) || /\bconsole\./.test(s)) return 'javascript';
  return 'javascript';
}
function getLangLabel(l) {
  const m = {javascript:'JavaScript',typescript:'TypeScript',python:'Python',html:'HTML',css:'CSS',java:'Java',cpp:'C++',csharp:'C#',go:'Go',rust:'Rust',php:'PHP',ruby:'Ruby',swift:'Swift',kotlin:'Kotlin',bash:'Bash',auto:'Auto Detected'};
  return m[l]||l;
}

// ── All 16 Analyzers ──
const analyzers = {
  auto: (code) => analyzers[detectLanguage(code)](code),
  javascript: function(code) {
    const lines = code.split('\n'); const issues = []; const suggestions = [];
    if (code.includes('var ')) { issues.push({severity:'warn',category:'syntax',line:findLine(lines,'var '),msg:'Use let/const instead of var'}); suggestions.push({line:findLine(lines,'var '),msg:'var is function-scoped and can cause hoisting issues',fix:'const x = value or let x = value'}); }
    if (/==[^=]/.test(code) || /!=[^=]/.test(code)) { issues.push({severity:'warn',category:'syntax',line:null,msg:'Use === and !== instead of == and !='}); suggestions.push({line:null,msg:'Loose equality can cause unexpected type coercion',fix:'Use === for strict equality'}); }
    if (code.includes('eval(')) { issues.push({severity:'error',category:'security',line:findLine(lines,'eval('),msg:'Avoid eval() — XSS & code injection risk'}); suggestions.push({line:findLine(lines,'eval('),msg:'eval executes arbitrary code',fix:'Use JSON.parse() or Function constructor safely'}); }
    if (code.includes('innerHTML')) { issues.push({severity:'warn',category:'security',line:findLine(lines,'innerHTML'),msg:'innerHTML can cause XSS — use textContent'}); suggestions.push({line:findLine(lines,'innerHTML'),msg:'Prefer textContent to prevent XSS attacks',fix:'element.textContent = value'}); }
    if ((code.match(/for\s*\(/g)||[]).length>2) issues.push({severity:'info',category:'performance',line:null,msg:'Consider using array methods (map/filter/reduce) instead of loops'});
    if (code.includes('console.log') && (code.match(/console\.log/g)||[]).length>3) issues.push({severity:'info',category:'best_practices',line:null,msg:'Remove console.log in production code'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Great JS code!' : score>=60?'Decent code with room for improvement.' : 'Significant issues found.',issues,suggestions,categories:groupCategories(issues)};
  },
  typescript: function(code) {
    const lines = code.split('\n'); const issues = []; const suggestions = [];
    if (code.includes(': any')) { issues.push({severity:'warn',category:'style',line:findLine(lines,': any'),msg:'Avoid :any — use proper types'}); suggestions.push({line:findLine(lines,': any'),msg:'Replace any with specific type',fix:'Use interface or type alias'}); }
    if (!code.match(/interface\s+\w+|type\s+\w+\s*=/)) issues.push({severity:'info',category:'best_practices',line:null,msg:'No interfaces or type aliases found'});
    if (code.includes('// @ts-ignore')) { issues.push({severity:'warn',category:'best_practices',line:findLine(lines,'// @ts-ignore'),msg:'Avoid @ts-ignore — fix the type issue'}); }
    if ((code.match(/console\.log/g)||[]).length>3) issues.push({severity:'info',category:'best_practices',line:null,msg:'Remove console.log in production'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'TypeScript looks good!':'TypeScript improvements available',issues,suggestions,categories:groupCategories(issues)};
  },
  python: function(code) {
    const lines = code.split('\n'); const issues = []; const suggestions = [];
    if (code.includes('try:') && !code.includes('except')) { issues.push({severity:'error',category:'syntax',line:findLine(lines,'try:'),msg:'try block without except'}); }
    if (code.includes('from x import *') || code.includes('import *')) { issues.push({severity:'warn',category:'style',line:findLine(lines,'import *'),msg:'Avoid wildcard imports'}); suggestions.push({line:findLine(lines,'import *'),msg:'Wildcard imports pollute namespace',fix:'import specific names'}); }
    const funcMatches = code.match(/def\s+([a-zA-Z_]\w*)\s*\(/g);
    if (funcMatches) funcMatches.forEach(f => { const name = f.replace('def ','').replace('(',''); if (name !== name.toLowerCase()) { issues.push({severity:'warn',category:'style',line:findLine(lines,f),msg:"Function '"+name+"' should be snake_case"}); suggestions.push({line:findLine(lines,f),msg:'Python convention: use snake_case',fix:'def '+name.toLowerCase()+'('}); }});
    if (code.includes('input(') && !code.includes('import re')) { issues.push({severity:'warn',category:'security',line:findLine(lines,'input('),msg:'Validate user input'}); }
    if (code.includes('os.system(') || code.includes('subprocess.call(')) { issues.push({severity:'warn',category:'security',line:null,msg:'Use subprocess.run() with shell=False'}); }
    const strConcat = code.match(/=.*\+/g);
    if ((code.includes('+=') && code.includes('str')) || (strConcat && strConcat.length>2)) { issues.push({severity:'info',category:'best_practices',line:null,msg:'Use f-strings instead of string concatenation'}); suggestions.push({line:null,msg:'f-strings are more readable and faster',fix:'f"Hello {name}"'}); }
    const score = computeScore(issues);
    return {score,summary:score>=80?'Clean Python!':score>=60?'Decent Python code':'Significant issues found.',issues,suggestions,categories:groupCategories(issues)};
  },
  html: function(code) {
    const lines = code.split('\n'); const issues = []; const suggestions = [];
    if (!code.match(/<!DOCTYPE/i)) { issues.push({severity:'error',category:'syntax',line:null,msg:'Missing DOCTYPE declaration'}); suggestions.push({line:null,msg:'Always include DOCTYPE for standards mode',fix:'<!DOCTYPE html>'}); }
    if (!code.includes('charset') && !code.includes('<meta charset')) { issues.push({severity:'warn',category:'best_practices',line:null,msg:'Missing character set declaration'}); }
    if (!code.includes('viewport')) { issues.push({severity:'warn',category:'best_practices',line:null,msg:'Missing viewport meta tag for mobile responsiveness'}); }
    if (code.includes('<img') && !code.includes('alt=')) { issues.push({severity:'warn',category:'accessibility',line:null,msg:'Images missing alt attributes'}); }
    const unclosed = (code.match(/<script/g)||[]).length - (code.match(/<\/script>/g)||[]).length;
    if (unclosed > 0) issues.push({severity:'error',category:'syntax',line:null,msg:'Unclosed <script> tag detected'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Clean HTML!':score>=60?'Some improvements needed':'Multiple issues found.',issues,suggestions,categories:groupCategories(issues)};
  },
  css: function(code) {
    const issues = []; const suggestions = [];
    if (!code.includes('{')) { issues.push({severity:'error',category:'syntax',line:null,msg:'No CSS rules found'}); }
    if (code.includes('!important')) { issues.push({severity:'warn',category:'style',line:findLine(code.split('\n'),'!important'),msg:'Avoid !important — use specificity instead'}); }
    const pxCount = (code.match(/\d+px/g)||[]).length;
    if (code.includes('px') && pxCount > 5) { issues.push({severity:'info',category:'best_practices',line:null,msg:'Consider using rem/em instead of px for scalability'}); }
    if (!code.includes('@media')) { issues.push({severity:'info',category:'best_practices',line:null,msg:'Consider adding media queries for responsive design'}); }
    const score = computeScore(issues);
    return {score,summary:score>=80?'Clean CSS!':'Some improvements available',issues,suggestions,categories:groupCategories(issues)};
  },
  java: function(code) {
    const issues = []; const suggestions = [];
    if (!code.includes('class ')) { issues.push({severity:'error',category:'syntax',line:null,msg:'No class definition found'}); }
    if (!code.includes('public static void main')) { issues.push({severity:'warn',category:'syntax',line:null,msg:'Missing main() method'}); }
    if (code.includes('System.out.println')||code.includes('System.out.print')) { issues.push({severity:'info',category:'best_practices',line:null,msg:'Use a logger instead of System.out'}); }
    if ((code.match(/new\s+\w+\(/g)||[]).length>3) issues.push({severity:'info',category:'best_practices',line:null,msg:'Consider dependency injection'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Solid Java code!':'Some improvements needed',issues,suggestions,categories:groupCategories(issues)};
  },
  cpp: function(code) {
    const issues = []; const suggestions = [];
    if (!code.includes('#include')) { issues.push({severity:'error',category:'syntax',line:null,msg:'Missing #include directives'}); }
    if (!code.includes('int main')) { issues.push({severity:'error',category:'syntax',line:null,msg:'Missing main() function'}); }
    if (code.includes('using namespace std')) { issues.push({severity:'warn',category:'style',line:findLine(code.split('\n'),'using namespace std'),msg:'Avoid "using namespace std" in headers'}); }
    if (code.includes('new ') && !code.includes('delete ')) { issues.push({severity:'warn',category:'best_practices',line:null,msg:'new without delete — memory leak risk'}); }
    if (code.includes('malloc(') && !code.includes('free(')) { issues.push({severity:'warn',category:'best_practices',line:null,msg:'malloc without free — memory leak'}); }
    const score = computeScore(issues);
    return {score,summary:score>=80?'Good C++ practices!':'Some issues to address',issues,suggestions,categories:groupCategories(issues)};
  },
  csharp: function(code) {
    const issues = []; const suggestions = [];
    if (code.includes('List<object>')||code.includes('ArrayList')) { issues.push({severity:'warn',category:'style',line:null,msg:'Use strongly-typed collections'}); }
    if ((code.match(/async\s+\w+/g)||[]).length>0 && !code.includes('await')) issues.push({severity:'warn',category:'best_practices',line:null,msg:'async method without await'});
    if (code.includes('try\n') && !code.includes('catch')) issues.push({severity:'error',category:'syntax',line:null,msg:'try block without catch'});
    if ((code.match(/Console\.WriteLine/g)||[]).length>5) issues.push({severity:'info',category:'best_practices',line:null,msg:'Consider using a logging framework'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Clean C# code!':'Some C# improvements needed',issues,suggestions,categories:groupCategories(issues)};
  },
  go: function(code) {
    const issues = []; const suggestions = [];
    if (!code.includes('err != nil') && !code.includes('if err')) { issues.push({severity:'warn',category:'best_practices',line:null,msg:'No error handling (err != nil) detected'}); suggestions.push({line:null,msg:'Go convention: always check errors',fix:'if err != nil { return err }'}); }
    if (code.includes('_ = ') || code.includes('_ ,')) issues.push({severity:'info',category:'style',line:null,msg:'Using blank identifiers — handle errors properly'});
    if ((code.match(/fmt\.Println/g)||[]).length>5) issues.push({severity:'info',category:'best_practices',line:null,msg:'Consider structured logging'});
    const singleChar = code.match(/\b[a-z]\s*:=/g);
    if (singleChar && singleChar.length>3) issues.push({severity:'info',category:'style',line:null,msg:'Avoid single-letter variable names'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Solid Go code!':'Go improvements available',issues,suggestions,categories:groupCategories(issues)};
  },
  rust: function(code) {
    const issues = []; const suggestions = [];
    if (code.includes('unwrap()')) { issues.push({severity:'warn',category:'best_practices',line:null,msg:'Avoid unwrap() — use pattern matching or ?'}); suggestions.push({line:null,msg:'unwrap() panics on error',fix:'Use match or ? operator'}); }
    if (code.includes('expect(')) issues.push({severity:'info',category:'best_practices',line:null,msg:'Consider ? operator instead of expect()'});
    if (code.includes('unsafe {')) { issues.push({severity:'error',category:'security',line:null,msg:'Unsafe blocks bypass safety guarantees'}); }
    if (!code.includes('fn main') && !code.includes('#[test]')) issues.push({severity:'info',category:'style',line:null,msg:'No main function or test attribute'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Great Rust code!':'Rust improvements available',issues,suggestions,categories:groupCategories(issues)};
  },
  php: function(code) {
    const issues = []; const suggestions = [];
    if (code.includes('mysql_')||code.includes('mysqli_')) { issues.push({severity:'error',category:'security',line:null,msg:'Use PDO/prepared statements instead of mysql_'}); suggestions.push({line:null,msg:'Prepared statements prevent SQL injection',fix:'Use PDO with parameterized queries'}); }
    if (code.includes('$_GET')||code.includes('$_POST')||code.includes('$_REQUEST')) issues.push({severity:'warn',category:'security',line:null,msg:'Validate all superglobal input'});
    if (code.includes('echo ') && !code.includes('htmlspecialchars')) issues.push({severity:'info',category:'security',line:null,msg:'Escape output with htmlspecialchars'});
    if (code.includes('<?') && !code.includes('<?php')) issues.push({severity:'warn',category:'syntax',line:null,msg:'Use <?php instead of short tags'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Good PHP code!':'PHP improvements needed',issues,suggestions,categories:groupCategories(issues)};
  },
  ruby: function(code) {
    const issues = []; const suggestions = [];
    if (code.includes('eval ')) { issues.push({severity:'error',category:'security',line:null,msg:'Avoid eval() — security risk'}); }
    if (code.includes('@@')||code.includes('$global')) issues.push({severity:'warn',category:'style',line:null,msg:'Avoid class/global variables (@@, $)'});
    if (code.includes('puts ') && (code.match(/puts\s/g)||[]).length>5) issues.push({severity:'info',category:'best_practices',line:null,msg:'Use a logger instead of puts'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Clean Ruby code!':'Ruby improvements available',issues,suggestions,categories:groupCategories(issues)};
  },
  swift: function(code) {
    const issues = []; const suggestions = [];
    if (code.includes('var ') && code.match(/\bvar\s+\w+\s*:/g) && !code.includes('let ')) issues.push({severity:'info',category:'style',line:null,msg:'Use let instead of var when value doesn\'t change'});
    if (code.includes('force_cast')||code.includes('as!')) { issues.push({severity:'warn',category:'best_practices',line:null,msg:'Force casting (as!) can crash'}); }
    if ((code.match(/print\(/g)||[]).length>5) issues.push({severity:'info',category:'best_practices',line:null,msg:'Use OSLog instead of print()'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Well-structured Swift!':'Swift improvements available',issues,suggestions,categories:groupCategories(issues)};
  },
  kotlin: function(code) {
    const issues = []; const suggestions = [];
    if (code.includes('!!')) { issues.push({severity:'warn',category:'best_practices',line:null,msg:'Avoid !! — use safe calls (?. ) or Elvis operator'}); suggestions.push({line:null,msg:'!! throws NullPointerException on null',fix:'Use ?.let { } or ?: Elvis operator'}); }
    if (code.includes('runBlocking')) issues.push({severity:'info',category:'best_practices',line:null,msg:'runBlocking blocks thread — prefer coroutineScope'});
    if (code.includes('println(') && !code.includes('logger')) issues.push({severity:'info',category:'best_practices',line:null,msg:'Use a logger instead of println()'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Nice Kotlin code!':'Kotlin improvements available',issues,suggestions,categories:groupCategories(issues)};
  },
  bash: function(code) {
    const issues = []; const suggestions = [];
    if (!code.match(/^#!/)) { issues.push({severity:'warn',category:'style',line:1,msg:'Missing shebang (#!/bin/bash or #!/bin/sh)'}); }
    if (!code.includes('set -e') && !code.includes('set -o errexit')) { issues.push({severity:'warn',category:'best_practices',line:null,msg:'Consider "set -e" to exit on error'}); suggestions.push({line:null,msg:'set -e stops script on first error',fix:'Add set -e at top of script'}); }
    if (code.match(/`[^`]+`/)) issues.push({severity:'info',category:'style',line:null,msg:'Use $() instead of backticks for command substitution'});
    if (code.includes('sudo ') && (code.match(/sudo /g)||[]).length>3) issues.push({severity:'warn',category:'security',line:null,msg:'Excessive sudo usage'});
    if ((code.match(/^function\s+/gm)||[]).length>0) issues.push({severity:'info',category:'style',line:null,msg:'Use "funcname()" instead of "function funcname()"'});
    const score = computeScore(issues);
    return {score,summary:score>=80?'Solid Bash scripting!':'Bash improvements available',issues,suggestions,categories:groupCategories(issues)};
  }
};

// ── AI Enhance: generate smarter suggestions ──
function aiEnhance(issues, suggestions, lang) {
  const aiTips = [];
  const langTips = {
    javascript: ['Consider using modern ES6+ features like destructuring, spread operator, and optional chaining.',
      'Use const by default, let only when rebinding is necessary.',
      'Prefer arrow functions for concise callbacks and lexical this binding.'],
    python: ['Use type hints for better code readability and IDE support.',
      'Prefer pathlib over os.path for file operations.',
      'Consider using dataclasses for simple data containers.'],
    typescript: ['Enable strict mode in tsconfig.json for full type safety.',
      'Use discriminated unions for complex state management.',
      'Prefer type inference over explicit types where possible.'],
    go: ['Use gofmt to automatically format your code.',
      'Prefer table-driven tests with subtests using t.Run().',
      'Use interfaces sparingly — accept interfaces, return structs.'],
    rust: ['Use clippy for additional linting beyond the compiler.',
      'Prefer iterators over manual indexing for better performance.',
      'Use Rc/Arc for shared ownership, Box for heap allocation.'],
    default: ['Add error handling for edge cases and unexpected inputs.',
      'Consider writing unit tests for critical functions.',
      'Add comments explaining the "why" not the "what".']
  };
  const tips = langTips[lang] || langTips.default;
  tips.forEach(t => aiTips.push(t));
  // Suggest improvements based on detected issues
  if (issues.length > 0) {
    aiTips.push('Focus on fixing errors first, then warnings, then style improvements.');
    aiTips.push('Run your linter regularly as part of your development workflow.');
  }
  return [...new Set(aiTips)].slice(0, 5);
}

// ── UI Rendering ──
function renderResults(result, lang) {
  const resultsDiv = document.getElementById('results');
  const placeholder = document.getElementById('placeholderView');
  const statusMsg = document.getElementById('statusMsg');
  const resultLang = document.getElementById('resultLang');

  if (!result) {
    placeholder.style.display = 'flex';
    resultsDiv.classList.remove('active');
    resultLang.textContent = '';
    return;
  }

  placeholder.style.display = 'none';
  resultsDiv.classList.add('active');
  resultLang.textContent = '✦ ' + getLangLabel(lang);

  // Score ring
  const sr = document.getElementById('scoreRing');
  const score = result.score;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  sr.innerHTML = `
    <div class="score-ring">
      <svg class="score-ring-svg" viewBox="0 0 68 68">
        <circle cx="34" cy="34" r="28" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="5"/>
        <circle cx="34" cy="34" r="28" fill="none" stroke="${color}" stroke-width="5"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
          stroke-linecap="round" transform="rotate(-90 34 34)" style="transition: stroke-dashoffset 1s ease"/>
        <text x="34" y="34" text-anchor="middle" dominant-baseline="central" class="score-ring-value" font-size="20">${score}</text>
      </svg>
      <div class="score-info">
        <h3>${result.summary}</h3>
        <p>${result.issues.length} issue${result.issues.length!==1?'s':''} found across 5 categories</p>
        <span class="score-lang-badge">${getLangLabel(lang)}</span>
      </div>
    </div>`;

  // Categories
  const catDiv = document.getElementById('categories');
  const cats = result.categories;
  let catHTML = '';
  for (const [key, cat] of Object.entries(cats)) {
    if (!cat.issues || cat.issues.length === 0) continue;
    catHTML += `<div class="category-group">
      <div class="category-header ${cat.severity}">${cat.name} (${cat.issues.length})</div>
      <div class="category-items">`;
    cat.issues.forEach(iss => {
      const icon = iss.severity === 'error' ? '🔴' : iss.severity === 'warn' ? '⚠️' : '💡';
      catHTML += `<div class="category-item">
        <span class="category-item-icon">${icon}</span>
        <div class="category-item-text">${iss.msg}
          ${iss.line ? `<span class="category-item-line">Line ${iss.line}</span>` : ''}
        </div>`;
      const sug = result.suggestions.find(s => s.msg === (iss.msg.includes(' — ') ? iss.msg.split(' — ')[0] : iss.msg));
      if (sug && sug.fix) catHTML += `<span class="category-item-fix" style="cursor:pointer" onclick="showFix('${sug.msg.replace(/'/g,"\\'")}','${sug.fix.replace(/'/g,"\\'")}')">💡 Fix</span>`;
      catHTML += `</div>`;
    });
    catHTML += `</div></div>`;
  }
  catDiv.innerHTML = catHTML;

  // AI Section
  const aiDiv = document.getElementById('aiSection');
  const aiTips = aiEnhance(result.issues, result.suggestions, lang);
  aiDiv.innerHTML = `<div style="margin-bottom:8px;display:flex;align-items:center;gap:6px">
    <span style="font-size:14px">✨</span>
    <span style="font-size:13px;font-weight:600;color:var(--accent2)">AI Enhancement Tips</span>
  </div>
  <div style="display:flex;flex-direction:column;gap:4px">
    ${aiTips.map(t => `<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 8px;font-size:12px;color:var(--text3);line-height:1.5">
      <span style="color:var(--green);flex-shrink:0">→</span>${t}</div>`).join('')}
  </div>`;

  statusMsg.textContent = `✅ Review complete — Score: ${score}/100`;
}

function showFix(msg, fix) {
  document.getElementById('suggestionModal').classList.add('active');
  document.getElementById('modalTitle').textContent = '💡 Suggested Fix';
  document.getElementById('modalBody').innerHTML = `
    <p>${msg}</p>
    <h4 style="font-size:13px;color:var(--text2);margin-bottom:6px">Recommended Fix:</h4>
    <div class="code-block">${fix}</div>`;
}

// ── Run Review ──
function runReview() {
  const code = document.getElementById('codeInput').value.trim();
  if (!code) {
    document.getElementById('statusMsg').textContent = '⚠️ Paste some code first!';
    return;
  }
  const lang = document.getElementById('langSelect').value;
  const btn = document.getElementById('reviewBtn');
  const statusMsg = document.getElementById('statusMsg');
  btn.disabled = true;
  btn.textContent = '⏳ Reviewing...';
  statusMsg.textContent = 'Running analysis...';

  // Hide previous results
  document.getElementById('placeholderView').style.display = 'none';
  document.getElementById('results').classList.remove('active');

  setTimeout(() => {
    try {
      const effectiveLang = lang === 'auto' ? detectLanguage(code) : lang;
      const analyzer = analyzers[lang] || analyzers.javascript;
      const result = analyzer(code);
      renderResults(result, effectiveLang);
      btn.textContent = '▶ Run Review';
      btn.disabled = false;
    } catch(e) {
      statusMsg.textContent = '❌ Error: ' + e.message;
      btn.textContent = '▶ Run Review';
      btn.disabled = false;
    }
  }, 400);
}

// ── AI Enhance button ──
function aiEnhanceReview() {
  const code = document.getElementById('codeInput').value.trim();
  if (!code) {
    document.getElementById('statusMsg').textContent = '⚠️ Paste code first!';
    return;
  }
  const lang = document.getElementById('langSelect').value;
  const effectiveLang = lang === 'auto' ? detectLanguage(code) : lang;
  runReview();
  setTimeout(() => {
    document.getElementById('statusMsg').textContent = '✨ AI tips added below results';
  }, 800);
}

// ── Load Example ──
function loadExample() {
  let lang = document.getElementById('langSelect').value;
  const examples = {
    javascript: `// User authentication middleware
function authenticateUser(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    res.status(401);
    res.json({ error: 'No token provided' });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    const user = db.users.find(u => u.id == decoded.id);
    if (!user) throw new Error('User not found');
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}`,
    python: `# Web scraper with caching
import requests
from bs4 import BeautifulSoup
from functools import lru_cache
import time

@lru_cache(maxsize=128)
def fetch_page(url):
    response = requests.get(url)
    response.raise_for_status()
    return response.text

def extract_links(html):
    soup = BeautifulSoup(html, 'html.parser')
    links = []
    for a in soup.find_all('a'):
        href = a.get('href')
        if href and href.startswith('http'):
            links.append({'url': href, 'text': a.text.strip()})
    return links`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
</head>
<body>
  <header><h1>Welcome</h1></header>
  <main>
    <img src="hero.jpg">
    <p>Hello world!</p>
  </main>
  <script src="app.js"><\/script>
</body>
</html>`,
    css: `/* Main stylesheet */
:root { --primary: #007bff; --text: #333; }
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }
.card { background: white; border-radius: 8px !important; padding: 16px; }`,
    java: `import java.util.*;
public class UserService {
    private Map<String, User> users = new HashMap<>();
    public User findUser(String id) { return users.get(id); }
    public void saveUser(User user) {
        users.put(user.getId(), user);
        System.out.println("User saved: " + user.getName());
    }
    public static void main(String[] args) {
        UserService svc = new UserService();
        svc.saveUser(new User("1", "Alice"));
    }
}`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;
class Task {
public:
    Task(int id, string name) : id_(id), name_(name) {}
    void execute() { cout << "Running: " << name_ << endl; }
private:
    int id_; string name_;
};
int main() {
    auto task = new Task(1, "Build");
    task->execute();
    return 0;
}`,
    typescript: `interface User { id: string; name: string; email: string; }
type ApiResponse<T> = { data: T | null; error: string | null; };
async function fetchUser(id: string): Promise<ApiResponse<User>> {
  const res: any = await fetch('/api/users/' + id);
  const data = await res.json();
  console.log('User fetched:', data);
  return { data, error: null };
}`,
    go: `package main
import "fmt"
func main() {
    name := "World"
    fmt.Println("Hello, " + name)
}`,
    rust: `fn main() {
    let names = vec!["Alice", "Bob"];
    let first = names.first().unwrap();
    println!("{}", first);
}`,
    php: `<?php
$id = $_GET['id'];
echo "User ID: " . $id;
?>`,
    ruby: `def get_user(id)
  response = Net::HTTP.get_response(URI("https://api.example.com/users/#{id}"))
  JSON.parse(response.body)
rescue => e
  puts "Error: #{e.message}"
  nil
end`,
    swift: `import UIKit
class ViewController: UIViewController {
    var items: [String] = []
    override func viewDidLoad() {
        super.viewDidLoad()
        print("Loaded")
    }
}`,
    kotlin: `fun main() = runBlocking {
    val repo = UserRepository()
    val result = repo.loadUsers()
    println("Loaded ${result.size} users")
}`,
    bash: `#!/bin/bash
echo "Building..."
go build -o build/app ./cmd/
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi`
  };
  if (lang === 'auto') {
    const keys = Object.keys(examples);
    const picked = keys[Math.floor(Math.random() * keys.length)];
    document.getElementById('codeInput').value = examples[picked] || examples.javascript;
    document.getElementById('codeInput').dispatchEvent(new Event('input'));
    document.getElementById('statusMsg').textContent = '📄 Example loaded — ' + getLangLabel(picked);
    return;
  }
  document.getElementById('codeInput').value = examples[lang] || examples.javascript;
  document.getElementById('codeInput').dispatchEvent(new Event('input'));
  document.getElementById('statusMsg').textContent = '📄 Example loaded — ' + getLangLabel(lang);
}

// ── Event bindings ──
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reviewBtn').addEventListener('click', runReview);
  document.getElementById('exampleBtn').addEventListener('click', loadExample);
  document.getElementById('aiEnhanceBtn').addEventListener('click', aiEnhanceReview);
  document.getElementById('codeInput').addEventListener('input', () => {
    if (document.getElementById('codeInput').value.trim()) {
      document.getElementById('statusMsg').textContent = 'Ready';
    }
  });
  // Close modal on overlay click
  document.getElementById('suggestionModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.target.classList.remove('active');
  });
  loadExample();
});
