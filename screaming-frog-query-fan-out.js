// Gemini AI Query Fan-Out Detection for Screaming Frog
// Replace with your actual Gemini API key
const apiKey = 'xxx-xxx';

// Extract semantic chunks from page (layout-aware chunking)
function extractSemanticChunks() {
  const chunks = [];

  // Extract title and main heading
  const title = document.title || '';
  const h1 = document.querySelector('h1')?.textContent || '';
  if (title || h1) {
    chunks.push({
      type: 'primary_topic',
      content: `${title} ${h1}`.trim()
    });
  }

  // Extract headings and their content (layout-aware chunking)
  const headings = document.querySelectorAll('h2, h3');
  headings.forEach(heading => {
    let content = heading.textContent;
    let sibling = heading.nextElementSibling;
    let sectionContent = '';

    while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
      if (sibling.textContent) {
        sectionContent += ' ' + sibling.textContent;
      }
      sibling = sibling.nextElementSibling;
    }

    if (sectionContent.trim()) {
      chunks.push({
        type: 'section',
        heading: content,
        content: sectionContent.trim().substring(0, 500)
      });
    }
  });

  // Extract key lists and FAQs
  document.querySelectorAll('ul, ol').forEach((list, idx) => {
    if (idx < 5 && list.children.length > 2) {
      chunks.push({
        type: 'list',
        content: Array.from(list.children).map(li => li.textContent).join(' | ').substring(0, 300)
      });
    }
  });

  // Extract schema.org data if present
  const schemas = document.querySelectorAll('script[type="application/ld+json"]');
  schemas.forEach(schema => {
    try {
      const data = JSON.parse(schema.textContent);
      if (data['@type']) {
        chunks.push({
          type: 'structured_data',
          content: `Type: ${data['@type']}, ${JSON.stringify(data).substring(0, 200)}`
        });
      }
    } catch (e) {}
  });

  // === OPTIONAL FULL BODY FALLBACK ===
  // Uncomment this block if you want to include the raw main body content
  /*
  const mainBody = document.querySelector('main, article, .post-content, #content');
  if (mainBody && mainBody.textContent.trim().length > 300) {
    chunks.push({
      type: 'full_body_fallback',
      content: mainBody.textContent.trim().substring(0, 2000)
    });
  }
  */

  return chunks;
}

try {
  const url = window.location.href;
  const chunks = extractSemanticChunks();

  // Create comprehensive prompt for Gemini
  const prompt = `You are analyzing a webpage for Google's AI Mode query fan-out potential. Google's AI Mode decomposes user queries into multiple sub-queries to synthesize comprehensive answers.

URL: ${url}

SEMANTIC CHUNKS FROM PAGE:
${JSON.stringify(chunks, null, 2)}

Based on this content, perform the following analysis:

1. IDENTIFY PRIMARY TOPIC: What is the main ontological entity or topic of this page?

2. PREDICT FAN-OUT QUERIES: Generate 8–10 likely sub-queries that Google's AI might create when a user asks about this topic. Consider:
   - Related queries (broader context)
   - Implicit queries (unstated user needs)
   - Comparative queries (alternatives, comparisons)
   - Procedural queries (how-to aspects)
   - Contextual refinements (budget, size, location specifics)
   - Potential Google classifications (Google’s best-in-class information systems, and it’s built right into Search. Fresh, real-time sources like the Knowledge Graph, info about the real world, and shopping data for billions of products)

3. SEMANTIC COVERAGE SCORE: For each predicted query, assess if the page content provides information to answer it (Yes/Partial/No).

4. FOLLOW-UP QUESTION POTENTIAL: What follow-up questions would users likely ask after reading this content?

OUTPUT FORMAT:
PRIMARY TOPIC: [entity name]

FAN-OUT QUERIES:
• [Query 1] - Coverage: [Yes/Partial/No]
• [Query 2] - Coverage: [Yes/Partial/No]
...

FOLLOW-UP POTENTIAL:
• [Follow-up question 1]
• [Follow-up question 2]
...

COVERAGE SCORE: [X/10 queries covered]
RECOMMENDATIONS: [Specific content gaps to fill]`;

  // Call Gemini API
  const requestData = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.3,
      topK: 20,
      topP: 0.9,
      maxOutputTokens: 2048
    }
  };

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, false);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.send(JSON.stringify(requestData));

  if (xhr.status === 200) {
    const response = JSON.parse(xhr.responseText);

    if (response.candidates && response.candidates[0] && response.candidates[0].content) {
      let analysis = response.candidates[0].content.parts[0].text;

      // Add chunking summary
      let output = '=== GOOGLE AI MODE QUERY FAN-OUT ANALYSIS ===\n\n';
      output += analysis;
      output += '\n\n=== CONTENT CHUNKING SUMMARY ===\n';
      output += `• Primary Topic Chunks: ${chunks.filter(c => c.type === 'primary_topic').length}\n`;
      output += `• Section Chunks: ${chunks.filter(c => c.type === 'section').length}\n`;
      output += `• List/FAQ Chunks: ${chunks.filter(c => c.type === 'list').length}\n`;
      output += `• Structured Data: ${chunks.filter(c => c.type === 'structured_data').length > 0 ? 'Yes' : 'No'}\n`;
      output += `• Fallback Body Chunk: ${chunks.some(c => c.type === 'full_body_fallback') ? 'Yes' : 'No'}\n`;
      output += `• Total Semantic Chunks: ${chunks.length}`;

      return seoSpider.data(output);
    } else {
      return seoSpider.error('Invalid Gemini response');
    }
  } else {
    return seoSpider.error(`API Error: ${xhr.status}`);
  }
} catch (error) {
  return seoSpider.error(`Error: ${error.toString()}`);
}
