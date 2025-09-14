// Legal Review AI Pro - Main JavaScript File

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyDQGDAz-BJKZBzl-bFT0FQ5eLrvodNy7fA';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

let uploadedDocuments = [];
let currentAnalysis = null;
let currentMode = null; // 'analyzer' or 'summarizer'

// Performance optimization - debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Lazy loading for performance
function lazyLoad() {
    const lazyElements = document.querySelectorAll('.lazy-load');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('loaded');
                imageObserver.unobserve(entry.target);
            }
        });
    });
    
    lazyElements.forEach(el => imageObserver.observe(el));
}

// Initialize performance optimizations
document.addEventListener('DOMContentLoaded', () => {
    lazyLoad();
    
    // Preload critical API connections
    fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'HEAD'
    }).catch(() => {}); // Silent preconnect
});

// File upload handling with performance optimization
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

// Debounced drag events for better performance
const debouncedDragOver = debounce((e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}, 50);

const debouncedDragLeave = debounce(() => {
    uploadArea.classList.remove('dragover');
}, 50);

uploadArea.addEventListener('dragover', debouncedDragOver);
uploadArea.addEventListener('dragleave', debouncedDragLeave);

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
});

// Keyboard accessibility
uploadArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
    }
});

async function handleFiles(files) {
    const validFiles = files.filter(file => {
        const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        return validTypes.includes(fileExtension) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });
    
    if (validFiles.length === 0) {
        alert('Please upload valid legal document files (PDF, DOC, DOCX, TXT) under 10MB.');
        return;
    }
    
    // Clear previous uploads
    uploadedDocuments = [];
    
    // Process files with progress indication
    for (const file of validFiles) {
        try {
            const text = await extractTextFromFile(file);
            if (text && text.trim().length > 0) {
                uploadedDocuments.push({
                    name: file.name,
                    content: text,
                    type: file.type,
                    size: file.size
                });
            }
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
        }
    }
    
    if (uploadedDocuments.length > 0) {
        document.getElementById('actionSelection').style.display = 'block';
        // Hide previous results
        document.getElementById('analysisSection').style.display = 'none';
        document.getElementById('summarizerSection').style.display = 'none';
        document.getElementById('chatSection').style.display = 'none';
        
        // Track event for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'document_upload', {
                event_category: 'engagement',
                event_label: 'files_uploaded',
                value: uploadedDocuments.length
            });
        }
    }
}

async function extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (file.type === 'text/plain') {
                resolve(e.target.result);
            } else {
                // For other file types, attempt text extraction
                // In production, you'd use proper libraries like pdf.js
                resolve(e.target.result);
            }
        };
        reader.onerror = (error) => {
            console.error('File reading error:', error);
            reject(error);
        };
        
        // Use appropriate read method based on file type
        if (file.type === 'text/plain') {
            reader.readAsText(file);
        } else {
            reader.readAsText(file); // Fallback for other types
        }
    });
}

function showLoading(message = 'Analyzing documents with AI...') {
    const loadingHtml = `<div class="loading"><div class="spinner"></div><p style="margin-left: 20px;">${message}</p></div>`;
    
    if (currentMode === 'summarizer') {
        const summarizerSection = document.getElementById('summarizerSection');
        summarizerSection.innerHTML = `
            <h2 style="margin-bottom: 30px; color: #2d3748;">📝 Smart Legal Document Summarizer</h2>
            <p style="margin-bottom: 30px; color: #4a5568; font-size: 1.1rem;">
                Understanding legal documents made simple! We translate complex legal jargon into plain English so you can understand exactly what your contracts and agreements mean.
            </p>
            ${loadingHtml}
        `;
        summarizerSection.style.display = 'block';
    } else {
        const analysisSection = document.getElementById('analysisSection');
        analysisSection.innerHTML = loadingHtml;
        analysisSection.style.display = 'block';
    }
}

async function startAnalyzer() {
    currentMode = 'analyzer';
    showLoading('Performing comprehensive legal analysis...');
    await analyzeDocuments();
    document.getElementById('chatSection').style.display = 'block';
    
    // Track analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'analyzer_start', {
            event_category: 'feature_usage',
            event_label: 'full_analyzer'
        });
    }
}

async function startSummarizer() {
    currentMode = 'summarizer';
    showLoading('Translating legal terms to plain English...');
    await summarizeDocuments();
    document.getElementById('chatSection').style.display = 'block';
    
    // Track analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'summarizer_start', {
            event_category: 'feature_usage',
            event_label: 'smart_summarizer'
        });
    }
}

async function summarizeDocuments() {
    try {
        const documentTexts = uploadedDocuments.map(doc => `Document: ${doc.name}\n\n${doc.content}`).join('\n\n---\n\n');
        
        // Restore the summarizer section HTML
        document.getElementById('summarizerSection').innerHTML = `
            <h2 style="margin-bottom: 30px; color: #2d3748;">📝 Smart Legal Document Summarizer</h2>
            <p style="margin-bottom: 30px; color: #4a5568; font-size: 1.1rem;">
                Understanding legal documents made simple! We translate complex legal jargon into plain English so you can understand exactly what your contracts and agreements mean.
            </p>
            <div id="summarizerResults"></div>
        `;
        
        // Generate plain English summary with optimized prompt
        const summarizerPrompt = `You are a legal translator who helps people understand complex legal documents. Analyze the following legal document(s) and provide a comprehensive summary in plain English that anyone can understand.

For each important section, provide:
1. **What it means in simple terms** - Explain complex legal concepts using everyday language
2. **Key legal terms translated** - Take difficult legal jargon and explain what it actually means
3. **Why it matters to you** - Explain the practical implications for the reader
4. **Important numbers and dates** - Highlight any money amounts, deadlines, or time periods
5. **Your rights and obligations** - What you can do, what you must do, and what others must do

Make sure to:
- Use simple, conversational language
- Avoid legal jargon unless you immediately explain it
- Use analogies and examples when helpful
- Highlight anything that could cost money or create obligations
- Point out any deadlines or time-sensitive items
- Explain the consequences of different actions

Format your response with clear sections and use bullet points where helpful.

Documents:
${documentTexts}`;
        
        const plainEnglishSummary = await callGeminiAPI(summarizerPrompt);
        displaySummarizerResults(plainEnglishSummary);
        
        // Generate legal terms glossary
        const glossaryPrompt = `Extract all complex legal terms from the following documents and provide simple, clear definitions that a regular person can understand. Format as a glossary with each term followed by its plain English explanation.

Focus on terms like: liability, indemnification, jurisdiction, breach, remedies, warranties, representations, covenants, etc.

Documents:
${documentTexts}`;
        
        const glossary = await callGeminiAPI(glossaryPrompt);
        displayLegalTermsGlossary(glossary);
        
        currentAnalysis = {
            plainEnglishSummary,
            glossary,
            documents: uploadedDocuments
        };
        
    } catch (error) {
        console.error('Summarizer error:', error);
        displaySummarizerResults('An error occurred during document summarization. Please try again.');
    }
}

function displaySummarizerResults(summary) {
    const container = document.getElementById('summarizerResults');
    
    const summaryCard = document.createElement('div');
    summaryCard.className = 'plain-english-card';
    summaryCard.innerHTML = `
        <h4>📖 Your Legal Document in Plain English</h4>
        <div class="simple-explanation">${summary.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
    `;
    container.appendChild(summaryCard);
}

function displayLegalTermsGlossary(glossary) {
    const container = document.getElementById('summarizerResults');
    
    const glossaryCard = document.createElement('div');
    glossaryCard.className = 'plain-english-card';
    glossaryCard.innerHTML = `
        <h4>📚 Legal Terms Dictionary</h4>
        <div class="simple-explanation">${glossary.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<span class="legal-term">$1</span>')}</div>
    `;
    container.appendChild(glossaryCard);
}

async function analyzeDocuments() {
    try {
        const documentTexts = uploadedDocuments.map(doc => `Document: ${doc.name}\n\n${doc.content}`).join('\n\n---\n\n');
        
        // Restore the analysis section HTML with proper accessibility
        document.getElementById('analysisSection').innerHTML = `
            <h2 style="margin-bottom: 30px; color: #2d3748;">Legal Document Analysis Results</h2>
            <div class="analysis-tabs" role="tablist">
                <button class="tab active" onclick="showTab('summary')" role="tab" aria-selected="true" aria-controls="summaryTab" type="button">Summary</button>
                <button class="tab" onclick="showTab('redflags')" role="tab" aria-selected="false" aria-controls="redflagsTab" type="button">Red Flags</button>
                <button class="tab" onclick="showTab('keyterms')" role="tab" aria-selected="false" aria-controls="keytermsTab" type="button">Key Terms</button>
                <button class="tab" onclick="showTab('recommendations')" role="tab" aria-selected="false" aria-controls="recommendationsTab" type="button">Recommendations</button>
                <button class="tab" onclick="showTab('comparison')" role="tab" aria-selected="false" aria-controls="comparisonTab" type="button">Comparison</button>
            </div>
            <div id="summaryTab" class="tab-content active" role="tabpanel" aria-labelledby="summary-tab"><div id="summaryResults"></div></div>
            <div id="redflagsTab" class="tab-content" role="tabpanel" aria-labelledby="redflags-tab"><div id="redflagResults"></div></div>
            <div id="keytermsTab" class="tab-content" role="tabpanel" aria-labelledby="keyterms-tab"><div id="keytermResults"></div></div>
            <div id="recommendationsTab" class="tab-content" role="tabpanel" aria-labelledby="recommendations-tab"><div id="recommendationResults"></div></div>
            <div id="comparisonTab" class="tab-content" role="tabpanel" aria-labelledby="comparison-tab">
                <div class="comparison-section">
                    <div class="document-panel" id="doc1Panel">
                        <h4>Document 1</h4>
                        <div id="doc1Content">Upload multiple documents to enable comparison</div>
                    </div>
                    <div class="document-panel" id="doc2Panel">
                        <h4>Document 2</h4>
                        <div id="doc2Content">Upload multiple documents to enable comparison</div>
                    </div>
                </div>
            </div>
        `;
        
        // Generate analysis in parallel for better performance
        const analysisPromises = [
            // Summary analysis
            callGeminiAPI(`Analyze the following legal document(s) and provide a comprehensive summary including:
1. Document type and purpose
2. Key parties involved
3. Main terms and conditions
4. Important dates and deadlines
5. Financial terms
6. Obligations of each party

Documents:
${documentTexts}`),
            
            // Red flags analysis
            callGeminiAPI(`Identify potential legal risks, problematic clauses, and red flags in the following documents. Focus on:
1. Unusual or unfair terms
2. Potential compliance issues
3. Missing important clauses
4. Ambiguous language
5. Terms that heavily favor one party
6. Potential legal risks

Documents:
${documentTexts}`),
            
            // Key terms analysis
            callGeminiAPI(`Extract and explain the most important terms, clauses, and provisions from the following documents:
1. Payment terms and amounts
2. Deadlines and dates
3. Termination conditions
4. Liability and indemnification
5. Intellectual property rights
6. Confidentiality provisions
7. Dispute resolution mechanisms

Documents:
${documentTexts}`),
            
            // Recommendations
            callGeminiAPI(`Provide specific recommendations and advice for the following legal documents:
1. Suggested modifications or additions
2. Negotiation points
3. Legal review priorities
4. Compliance requirements
5. Best practices
6. Next steps

Documents:
${documentTexts}`)
        ];
        
        const [summary, redflags, keyterms, recommendations] = await Promise.all(analysisPromises);
        
        // Display results
        displayResults('summaryResults', [{ title: 'Legal Document Summary', content: summary }]);
        displayResults('redflagResults', [{ title: 'Identified Legal Red Flags', content: redflags }], 'red-flag');
        displayResults('keytermResults', [{ title: 'Key Terms Analysis', content: keyterms }]);
        displayResults('recommendationResults', [{ title: 'Legal Recommendations', content: recommendations }]);
        
        // Handle comparison if multiple documents
        if (uploadedDocuments.length > 1) {
            document.getElementById('doc1Content').innerHTML = `<h5>${uploadedDocuments[0].name}</h5><p>${uploadedDocuments[0].content.substring(0, 500)}...</p>`;
            document.getElementById('doc2Content').innerHTML = `<h5>${uploadedDocuments[1].name}</h5><p>${uploadedDocuments[1].content.substring(0, 500)}...</p>`;
        }
        
        currentAnalysis = {
            summary,
            redflags,
            keyterms,
            recommendations,
            documents: uploadedDocuments
        };
        
    } catch (error) {
        console.error('Analysis error:', error);
        displayResults('summaryResults', [{ title: 'Analysis Error', content: 'An error occurred during legal document analysis. Please try again or check your internet connection.' }], 'red-flag');
    }
}

async function callGeminiAPI(prompt, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Invalid API response structure');
            }
        } catch (error) {
            console.error(`Gemini API error (attempt ${attempt + 1}):`, error);
            if (attempt === retries) {
                return 'Error: Could not analyze legal document. Please check your internet connection and try again.';
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
}

function displayResults(containerId, results, cardClass = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    results.forEach(result => {
        const card = document.createElement('div');
        card.className = `result-card ${cardClass}`;
        card.innerHTML = `
            <h4>${result.title}</h4>
            <p>${result.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
        `;
        container.appendChild(card);
    });
}

function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked tab
    if (event && event.target) {
        event.target.classList.add('active');
        event.target.setAttribute('aria-selected', 'true');
    }
    
    // Track tab usage
    if (typeof gtag !== 'undefined') {
        gtag('event', 'tab_switch', {
            event_category: 'user_interaction',
            event_label: tabName
        });
    }
}

const debouncedSendMessage = debounce(sendMessage, 300);

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || uploadedDocuments.length === 0) return;
    
    // Add user message
    addMessageToChat(message, 'user');
    input.value = '';
    
    // Show typing indicator
    const typingIndicator = addMessageToChat('AI is analyzing your question...', 'ai', 'typing-indicator');
    
    // Generate AI response
    const documentContext = uploadedDocuments.map(doc => `${doc.name}: ${doc.content.substring(0, 2000)}`).join('\n\n');
    const chatPrompt = `Based on the following legal documents, answer the user's question: "${message}"
    
    Documents:
    ${documentContext}
    
    Please provide a helpful, accurate response based on the document content. If the question cannot be answered from the document content, politely explain what information is available.`;
    
    try {
        const response = await callGeminiAPI(chatPrompt);
        // Remove typing indicator
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }
        addMessageToChat(response, 'ai');
        
        // Track chat usage
        if (typeof gtag !== 'undefined') {
            gtag('event', 'chat_message', {
                event_category: 'engagement',
                event_label: 'user_question'
            });
        }
    } catch (error) {
        // Remove typing indicator
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
        }
        addMessageToChat('Sorry, I encountered an error while processing your legal document question. Please try again.', 'ai');
    }
}

function addMessageToChat(message, sender, className = '') {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message ${className}`;
    messageDiv.innerHTML = message.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

// Allow Enter key to send messages
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        debouncedSendMessage();
    }
});

// Service Worker for caching (if supported)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Performance monitoring
window.addEventListener('load', () => {
    if ('performance' in window) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_load_time', {
                event_category: 'performance',
                value: Math.round(loadTime)
            });
        }
    }
});

// Error tracking
window.addEventListener('error', (e) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'javascript_error', {
            event_category: 'error',
            event_label: e.message,
            value: 1
        });
    }
});