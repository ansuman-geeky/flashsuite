const https = require('https');
const fs = require('fs');
const path = require('path');

// Manually load .env file if key is missing from environment variables
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const parts = trimmed.split('=');
                if (parts.length >= 2) {
                    const key = parts[0].trim();
                    let val = parts.slice(1).join('=').trim();
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.substring(1, val.length - 1);
                    }
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            }
        });
    }
} catch (err) {
    console.error("Error parsing .env file manually:", err);
}

/**
 * OpenRouter Service Integration
 */
class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY || '';
        this.model = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';
        // Use a strong model for AI detection analysis
        this.detectionModel = process.env.OPENROUTER_DETECT_MODEL || 'z-ai/glm-4.5-air:free';
        this.apiUrl = 'openrouter.ai';
    }

    /**
     * Send rewrite request to OpenRouter API
     * @param {string} text - AI generated text
     * @param {string} mode - Humanization mode (Standard, Academic, SEO, Professional, Casual)
     * @param {number} tone - Tone slider score (0 - 100)
     * @returns {Promise<string>} - Humanized text
     */
    async humanizeText(text, mode = 'Standard', tone = 50) {
        if (!this.apiKey) {
            console.warn("WARNING: OPENROUTER_API_KEY is not defined. Using client-side simulation mode.");
            return this.simulateRewrite(text, mode, tone);
        }

        // Refine system instructions based on mode and tone values
        let modeInstruction = "";
        switch (mode.toLowerCase()) {
            case 'academic':
                modeInstruction = "Use formal scholarly language, academic phrasing, and clear, rigorous structure. Avoid casual jargon but vary sentence lengths to read naturally.";
                break;
            case 'seo':
                modeInstruction = "Optimize for search engine readability. Keep paragraphs punchy, use transition words, maintain natural keyword distribution, and improve scannability.";
                break;
            case 'professional':
                modeInstruction = "Deliver corporate-level communication. Clear, precise, authoritative, yet natural and human-written. Avoid empty jargon.";
                break;
            case 'casual':
                modeInstruction = "Adopt a warm, conversational, friendly, and highly human tone. Use natural contractions, light humor if relevant, and varied rhythms.";
                break;
            default:
                modeInstruction = "Provide a standard humanized output. Balanced tone, organic rhythm, and smooth flow.";
        }

        const toneInstruction = tone > 50 
            ? `Leaning more towards professional, structured, and formal vocabulary.` 
            : `Leaning more towards natural, flowing, easy-to-read, and conversational language.`;

        const systemPrompt = `You are a professional human copywriter. Your task is to rewrite AI-generated text to make it sound completely human-written.
Rules:
1. Rewrite naturally, varying sentence structures and lengths.
2. Preserve 100% of the original meaning and core facts.
3. Remove robotic AI patterns, repetitive transitions, and formulaic paragraph openers.
4. Use natural contractions and expressions where appropriate.
5. Mode requirement: ${modeInstruction}
6. Tone constraint: ${toneInstruction}
7. Return ONLY the rewritten text, without any introductory commentary, explanations, quotes, or conversational notes.`;

        const requestBody = JSON.stringify({
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Please humanize this text:\n\n${text}` }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.apiUrl,
                port: 443,
                path: '/api/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://flashsuite.pro',
                    'X-Title': 'FlashSuite HumanizeAI',
                    'Content-Length': Buffer.byteLength(requestBody)
                },
                timeout: 30000 // 30 seconds timeout
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const parsed = JSON.parse(responseData);
                            if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
                                resolve(parsed.choices[0].message.content.trim());
                            } else {
                                reject(new Error('Invalid response structure from OpenRouter API'));
                            }
                        } catch (err) {
                            reject(new Error('Failed to parse OpenRouter response JSON'));
                        }
                    } else {
                        reject(new Error(`OpenRouter API responded with status ${res.statusCode}: ${responseData}`));
                    }
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('OpenRouter API request timed out'));
            });

            req.write(requestBody);
            req.end();
        });
    }

    /**
     * Sophisticated local rule-based rewrite engine if API key is missing
     */
    simulateRewrite(text, mode, tone) {
        if (!text) return Promise.resolve('');

        // Deterministic pseudo-random generator based on text length to avoid Math.random variance
        let seed = text.length;
        function pseudoRandom() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        }

        // Step 1: Sentence and paragraph parsing
        let paragraphs = text.split(/\n\s*\n/);
        let humanizedParagraphs = paragraphs.map(para => {
            if (!para.trim()) return para;

            let pText = para.trim();

            // Synonym mapping for AI indicators and transitional words
            const synonymMap = {
                'additionally': 'also',
                'furthermore': 'what\'s more',
                'moreover': 'plus',
                'consequently': 'as a result',
                'therefore': 'so',
                'subsequently': 'then',
                'in conclusion': 'to sum up',
                'firstly': 'first off',
                'secondly': 'next',
                'lastly': 'finally',
                'utilize': 'use',
                'delve into': 'explore',
                'delve': 'go',
                'realm': 'area',
                'tapestry': 'mix',
                'testament to': 'proof of',
                'pivotal': 'key',
                'demystify': 'explain',
                'revolutionize': 'transform',
                'notably': 'especially',
                'undeniably': 'certainly',
                'foster': 'build',
                'fostering': 'growing',
                'meticulously': 'carefully',
                'customarily': 'usually',
                'assist': 'help',
                'assistance': 'help',
                'obtain': 'get',
                'purchase': 'buy',
                'request': 'ask for',
                'require': 'need',
                'provides': 'gives',
                'provide': 'give',
                'numerous': 'many',
                'sufficient': 'enough',
                'terminate': 'stop',
                'initiate': 'start',
                'conclude': 'finish',
                'frequently': 'often',
                'exhibit': 'show',
                'demonstrate': 'show',
                'elucidate': 'explain',
                'substantiate': 'prove',
                'commence': 'start',
                'implement': 'put in place',
                'synthesize': 'combine',
                'facilitate': 'ease',
                'optimize': 'improve'
            };

            // Replace words case-insensitively
            Object.keys(synonymMap).forEach(key => {
                const regex = new RegExp('\\b' + key + '\\b', 'gi');
                pText = pText.replace(regex, (match) => {
                    const isCapital = match.charAt(0) === match.charAt(0).toUpperCase();
                    const replacement = synonymMap[key];
                    return isCapital ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
                });
            });

            // Step 2: Inject contractions depending on tone slider
            const contractions = [
                { pattern: /\bdo not\b/gi, replacement: "don't" },
                { pattern: /\bcannot\b/gi, replacement: "can't" },
                { pattern: /\bwill not\b/gi, replacement: "won't" },
                { pattern: /\bis not\b/gi, replacement: "isn't" },
                { pattern: /\bare not\b/gi, replacement: "aren't" },
                { pattern: /\bit is\b/gi, replacement: "it's" },
                { pattern: /\bthere is\b/gi, replacement: "there's" },
                { pattern: /\bwe are\b/gi, replacement: "we're" },
                { pattern: /\bthey are\b/gi, replacement: "they're" },
                { pattern: /\bwas not\b/gi, replacement: "wasn't" },
                { pattern: /\bwere not\b/gi, replacement: "weren't" },
                { pattern: /\bshould not\b/gi, replacement: "shouldn't" },
                { pattern: /\bwould not\b/gi, replacement: "wouldn't" },
                { pattern: /\bhas not\b/gi, replacement: "hasn't" },
                { pattern: /\bhave not\b/gi, replacement: "haven't" },
                { pattern: /\bI am\b/gi, replacement: "I'm" },
                { pattern: /\byou are\b/gi, replacement: "you're" },
                { pattern: /\bhe is\b/gi, replacement: "he's" },
                { pattern: /\bshe is\b/gi, replacement: "she's" }
            ];

            const contractionChance = (100 - tone) / 100;
            contractions.forEach(c => {
                if (pseudoRandom() < contractionChance) {
                    pText = pText.replace(c.pattern, c.replacement);
                }
            });

            // Step 3: Sentence splitting and passive voice reduction
            let sentences = pText.split(/(?<=[.!?])\s+/);

            sentences = sentences.map(s => {
                s = s.trim();
                if (!s) return s;

                // Split long run-on sentences (> 18 words) around conjunctions (and, but, or, so)
                const words = s.split(/\s+/);
                if (words.length > 18) {
                    const conjunctionIndex = words.findIndex((w, idx) => 
                        idx > 5 && idx < words.length - 5 && ['and', 'but', 'or', 'so'].includes(w.toLowerCase().replace(/[^a-z]/g, ''))
                    );
                    if (conjunctionIndex !== -1) {
                        const wordAtConj = words[conjunctionIndex];
                        const part1 = words.slice(0, conjunctionIndex).join(' ');
                        let part2 = words.slice(conjunctionIndex + 1).join(' ');
                        part2 = part2.charAt(0).toUpperCase() + part2.slice(1);
                        
                        let transition = '';
                        if (wordAtConj.toLowerCase() === 'but') transition = 'However, ';
                        else if (wordAtConj.toLowerCase() === 'and') transition = 'Also, ';
                        else if (wordAtConj.toLowerCase() === 'so') transition = 'Therefore, ';
                        
                        return `${part1}. ${transition}${part2}`;
                    }
                }

                // Passive to active structure hint conversion for common phrases
                s = s.replace(/\bby whom it was written\b/gi, 'who wrote it')
                     .replace(/\bdecision was made by the\b/gi, 'decision maker')
                     .replace(/\bis considered to be\b/gi, 'is')
                     .replace(/\bhas the ability to\b/gi, 'can')
                     .replace(/\bin order to\b/gi, 'to')
                     .replace(/\bfor the purpose of\b/gi, 'to')
                     .replace(/\bwith the exception of\b/gi, 'except');

                return s;
            });

            // Step 4: Mode-based transformation
            const modeLower = mode.toLowerCase();
            if (modeLower === 'casual') {
                const openers = ['Well, ', 'Honestly, ', 'Look, ', 'Basically, ', 'To be honest, ', 'Actually, ', 'As it turns out, '];
                const randomOpener = openers[Math.floor(pseudoRandom() * openers.length)];
                if (sentences.length > 0 && !sentences[0].startsWith(randomOpener)) {
                    sentences[0] = randomOpener + sentences[0].charAt(0).toLowerCase() + sentences[0].slice(1);
                }
                
                if (sentences.length > 0 && pseudoRandom() > 0.5) {
                    let lastIdx = sentences.length - 1;
                    if (sentences[lastIdx].endsWith('.')) {
                        sentences[lastIdx] = sentences[lastIdx].slice(0, -1) + ', you know?';
                    }
                }
            } else if (modeLower === 'seo') {
                sentences = sentences.map(s => {
                    if (s.split(/\s+/).length > 15 && pseudoRandom() > 0.5) {
                        return s + ' Let\'s check it out.';
                    }
                    return s;
                });
            } else if (modeLower === 'academic') {
                sentences = sentences.map(s => {
                    return s.replace(/\buse\b/gi, 'employ')
                            .replace(/\blook into\b/gi, 'examine')
                            .replace(/\bproof of\b/gi, 'empirical evidence of')
                            .replace(/\bguess\b/gi, 'hypothesize');
                });
            } else if (modeLower === 'professional') {
                sentences = sentences.map(s => {
                    return s.replace(/\b(just|really|very|basically|honestly)\b/gi, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                });
            }

            return sentences.join(' ');
        });

        return Promise.resolve(humanizedParagraphs.join('\n\n'));
    }

    /**
     * Helper to make HTTP request to OpenRouter API
     */
    _callOpenRouter(model, messages, maxTokens = 1000) {
        const requestBody = JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.05,
            max_tokens: maxTokens
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.apiUrl,
                port: 443,
                path: '/api/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://flashsuite.pro',
                    'X-Title': 'FlashSuite AI Detector',
                    'Content-Length': Buffer.byteLength(requestBody)
                },
                timeout: 15000 // 15 seconds timeout per request
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => { responseData += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseData);
                    } else {
                        reject(new Error(`OpenRouter API error ${res.statusCode}: ${responseData}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('OpenRouter API request timed out'));
            });

            req.write(requestBody);
            req.end();
        });
    }

    /**
     * Use the LLM to analyze text and detect AI-generated content.
     * Uses chain-of-thought prompting for accurate analysis.
     * Tries candidate models in sequence in case of failure or rate limits.
     * @param {string} text - Text to analyze
     * @returns {Promise<object>} - Detection results with scores
     */
    async detectAI(text) {
        if (!this.apiKey) {
            console.warn("WARNING: OPENROUTER_API_KEY not set. Cannot perform LLM-based AI detection.");
            return null;
        }

        // Run statistical pre-analysis to provide to the LLM as context
        const stats = this._computeTextStats(text);

        const systemPrompt = `You are an expert AI-generated text detection system used by professional content verification platforms. Your job is to determine if text was written by an AI language model (ChatGPT, Claude, Gemini, Llama, etc.) or by a human.

Analyze the text carefully. Modern AI writes very polished, grammatically perfect text that sounds "too clean", whereas human writing is more conversational, has typos, varied sentence lengths, contractions, and first-person pronouns.

Here are pre-computed statistical features of the text:
- Word count: ${stats.wordCount}
- Sentence count: ${stats.sentenceCount}  
- Avg sentence length: ${stats.avgSentenceLength.toFixed(1)} words
- Sentence length std deviation: ${stats.stdDev.toFixed(2)} (AI typically < 5, humans > 6)
- Contractions found: ${stats.contractionCount} (AI uses very few)
- Passive voice instances: ${stats.passiveCount}
- Type-token ratio: ${stats.typeTokenRatio.toFixed(3)} (vocabulary diversity, AI is typically 0.4-0.6)
- AI transition words found: ${stats.transitionCount} (moreover, furthermore, additionally, etc.)
- AI buzzwords found: ${stats.buzzwordCount} (delve, tapestry, pivotal, leverage, etc.)
- AI signature phrases found: ${stats.phraseCount} (in today's digital age, it is worth noting, etc.)
- Sentences starting with same word: ${stats.repetitiveStarters}
- Questions in text: ${stats.questionCount}
- First person pronouns (I, my, me): ${stats.firstPersonCount}
- Exclamation marks: ${stats.exclamationCount}

KEY AI DETECTION RULES:
1. If std deviation < 4 AND no contractions AND transition words > 0 → almost certainly AI (85-95%)
2. If text is perfectly grammatical with no typos, no slang, no contractions → likely AI (70-90%)
3. If text uses words like "delve", "tapestry", "beacon", "pivotal", "foster", "leverage", "landscape", "comprehensive", "robust", "innovative", "streamline", "facilitate", "paradigm", "holistic", "synergy", "cornerstone" → very likely AI
4. If text follows intro→body→conclusion pattern with uniform paragraphs → likely AI
5. If type-token ratio is 0.4-0.55 with high word count → likely AI (repetitive vocabulary)
6. If text has many first-person pronouns, contractions, varied sentence lengths, typos → likely human
7. Short texts (< 50 words) are harder to classify → give lower confidence

Respond with ONLY this JSON (no markdown, no explanation, no thinking):
{"ai_generated": <0-100>, "human_refined": <0-100>, "human_written": <0-100>, "source": "<ChatGPT/OpenAI or Claude/Anthropic or Gemini/Google or Mixed AI or None>", "confidence": "<High or Medium or Low>"}

The three scores MUST sum to exactly 100.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
        ];

        // Prioritized list of free models to try for AI detection
        const modelsToTry = [
            'z-ai/glm-4.5-air:free',
            'qwen/qwen3-next-80b-a3b-instruct:free',
            'meta-llama/llama-3.3-70b-instruct:free',
            'google/gemma-4-26b-a4b-it:free',
            'openrouter/free'
        ];

        // If user configured a custom detection model in environment, try it first
        if (process.env.OPENROUTER_DETECT_MODEL && !modelsToTry.includes(process.env.OPENROUTER_DETECT_MODEL)) {
            modelsToTry.unshift(process.env.OPENROUTER_DETECT_MODEL);
        }

        let lastError = null;
        for (const model of modelsToTry) {
            try {
                console.log(`[AI Detection] Requesting OpenRouter with model: ${model}`);
                const responseData = await this._callOpenRouter(model, messages, 1000);
                
                const parsed = JSON.parse(responseData);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
                    let content = parsed.choices[0].message.content || '';
                    
                    // Handle models that output reasoning or thinking separate from content
                    if (!content.trim() && parsed.choices[0].message.reasoning) {
                        content = parsed.choices[0].message.reasoning;
                    }
                    
                    content = content.trim();
                    // Strip markdown code fences if present
                    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
                    
                    // Extract JSON object
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) {
                        console.warn(`[AI Detection] No JSON match found. Raw content from model was:\n---\n${content}\n---`);
                        throw new Error('No JSON found in model response content');
                    }
                    
                    const result = JSON.parse(jsonMatch[0]);
                    
                    // Validate and normalize scores
                    result.ai_generated = Math.round(Number(result.ai_generated) || 0);
                    result.human_refined = Math.round(Number(result.human_refined) || 0);
                    result.human_written = Math.round(Number(result.human_written) || 0);
                    
                    const total = result.ai_generated + result.human_refined + result.human_written;
                    if (total !== 100) {
                        const factor = 100 / (total || 1);
                        result.ai_generated = Math.round(result.ai_generated * factor);
                        result.human_refined = Math.round(result.human_refined * factor);
                        result.human_written = 100 - result.ai_generated - result.human_refined;
                    }

                    // Cross-validate with statistical analysis
                    if (stats.stdDev < 3.5 && stats.contractionCount === 0 && result.ai_generated < 50) {
                        console.log('Statistical override: boosting AI score (low stdDev + no contractions)');
                        result.ai_generated = Math.max(result.ai_generated, 65);
                        result.human_written = Math.max(0, 100 - result.ai_generated - result.human_refined);
                    }
                    if (stats.buzzwordCount >= 2 && result.ai_generated < 60) {
                        console.log('Statistical override: boosting AI score (multiple buzzwords)');
                        result.ai_generated = Math.max(result.ai_generated, 60);
                        result.human_written = Math.max(0, 100 - result.ai_generated - result.human_refined);
                    }
                    
                    // If statistics strongly suggest human but LLM is unsure, discount AI score
                    if (stats.stdDev >= 5.5 && stats.contractionCount >= 2 && result.ai_generated > 15) {
                        console.log('Statistical override: lowering AI score (high stdDev + contractions)');
                        const discount = Math.min(20, result.ai_generated - 10);
                        result.ai_generated = Math.round(result.ai_generated - discount);
                        result.human_refined = Math.max(0, result.human_refined - 5);
                        result.human_written = 100 - result.ai_generated - result.human_refined;
                    }
                    
                    console.log(`[AI Detection] Success using ${model}:`, JSON.stringify(result));
                    return result;
                } else {
                    throw new Error('Empty choice content or invalid choices array structure');
                }
            } catch (err) {
                console.warn(`[AI Detection] Model ${model} failed:`, err.message);
                lastError = err;
                // Move on to the next model in the list
            }
        }

        throw new Error(`All candidate AI detection models failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
    }

    /**
     * Compute comprehensive statistical features for AI detection.
     * These stats are provided to the LLM as context and used for cross-validation.
     */
    _computeTextStats(text) {
        const cleanText = text.trim();
        const words = cleanText.split(/\s+/).filter(w => w.length > 0);
        const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const wordCount = words.length || 1;
        const sentenceCount = sentences.length || 1;

        // Sentence length statistics
        const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).filter(w => w.length > 0).length);
        const avgSentenceLength = wordCount / sentenceCount;
        const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceCount;
        const stdDev = Math.sqrt(variance);

        // Contractions
        const contractionMatches = cleanText.match(/\b\w+['']\w+\b/g) || [];
        const contractionCount = contractionMatches.length;

        // Passive voice
        const passiveMatches = cleanText.match(/\b(is|are|was|were|been|be)\s+\w+ed\b/gi) || [];
        const passiveCount = passiveMatches.length;

        // Type-token ratio (vocabulary diversity)
        const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')));
        const typeTokenRatio = uniqueWords.size / wordCount;

        // AI transition words
        const aiTransitions = ['moreover', 'furthermore', 'additionally', 'consequently', 'therefore', 'subsequently', 'firstly', 'secondly', 'lastly', 'notably', 'specifically', 'essentially', 'fundamentally'];
        let transitionCount = 0;
        words.forEach(w => {
            if (aiTransitions.includes(w.toLowerCase().replace(/[^a-z]/g, ''))) transitionCount++;
        });

        // AI buzzwords
        const aiBuzzwords = ['delve', 'testament', 'realm', 'tapestry', 'pivotal', 'demystify', 'revolutionize', 'unwavering', 'beacon', 'resonate', 'elevate', 'foster', 'synergy', 'meticulously', 'utilize', 'leverage', 'landscape', 'comprehensive', 'robust', 'innovative', 'cutting-edge', 'streamline', 'facilitate', 'paradigm', 'holistic', 'cornerstone', 'undeniably', 'multifaceted', 'encompasses', 'navigating', 'intricacies', 'nuanced'];
        let buzzwordCount = 0;
        words.forEach(w => {
            if (aiBuzzwords.includes(w.toLowerCase().replace(/[^a-z]/g, ''))) buzzwordCount++;
        });

        // AI signature phrases
        const signaturePhrases = [
            /in today'?s (digital|fast|ever|modern)/i, /in the digital age/i, /ever-evolving/i,
            /it is important to/i, /it'?s important to/i, /important to note/i,
            /it is worth noting/i, /first and foremost/i, /delve into/i,
            /tapestry of/i, /testament to/i, /pivotal role/i, /look no further/i,
            /let'?s explore/i, /in other words/i, /when it comes to/i,
            /not only[\s\S]*?but also/i, /plays a (crucial|vital|key|pivotal)/i,
            /in conclusion/i, /to summarize/i, /it is essential/i,
            /stands as a/i, /serves as a/i, /has become (increasingly|a)/i
        ];
        let phraseCount = 0;
        signaturePhrases.forEach(regex => { if (regex.test(cleanText)) phraseCount++; });

        // Sentence starter repetition
        const starters = sentences.map(s => (s.trim().split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, ''));
        const starterCounts = {};
        starters.forEach(s => { if (s) starterCounts[s] = (starterCounts[s] || 0) + 1; });
        let repetitiveStarters = 0;
        Object.values(starterCounts).forEach(count => { if (count > 1) repetitiveStarters += count; });

        // Questions count
        const questionCount = (cleanText.match(/\?/g) || []).length;

        // First person pronouns
        const firstPersonCount = (cleanText.match(/\b(I|my|me|myself|I'm|I've|I'd|I'll)\b/g) || []).length;

        // Exclamation marks
        const exclamationCount = (cleanText.match(/!/g) || []).length;

        return {
            wordCount, sentenceCount, avgSentenceLength, stdDev,
            contractionCount, passiveCount, typeTokenRatio,
            transitionCount, buzzwordCount, phraseCount,
            repetitiveStarters, questionCount, firstPersonCount, exclamationCount
        };
    }
}

module.exports = new OpenRouterService();
