// OpenAI Query Fan-Out Detection for Screaming Frog
const openaiApiKey = 'sk-proj-xxxx';

function extractSemanticChunks() {
  const chunks = [];

  const title = document.title || '';
  const h1 = document.querySelector('h1')?.textContent || '';
  if (title || h1) {
    chunks.push({
      type: 'primary_topic',
      content: `${title} ${h1}`.trim()
    });
  }

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

  document.querySelectorAll('ul, ol').forEach((list, idx) => {
    if (idx < 5 && list.children.length > 2) {
      chunks.push({
        type: 'list',
        content: Array.from(list.children).map(li => li.textContent).join(' | ').substring(0, 300)
      });
    }
  });

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

  return chunks;
}

try {
  const url = window.location.href;
  const chunks = extractSemanticChunks();

  const prompt = `You are analyzing a webpage for Google's AI Mode query fan-out potential.

URL: ${url}

SEMANTIC CHUNKS FROM PAGE:
${JSON.stringify(chunks, null, 2)}

Perform this analysis:

1. PRIMARY TOPIC: What's the main topic or entity?
2. FAN-OUT QUERIES: Predict 8–10 follow-up or decomposed queries Google AI might generate.
3. COVERAGE: For each, say if content on this page answers it (Yes/Partial/No).
4. FOLLOW-UP QUESTIONS users might ask after reading this page.
5. RECOMMENDATIONS to improve semantic coverage.

OUTPUT FORMAT:
PRIMARY TOPIC: [entity name]
FAN-OUT QUERIES:
• [Query] - Coverage: Yes/Partial/No
FOLLOW-UP QUESTIONS:
• [Q1]
RECOMMENDATIONS:
• [Gap or Improvement Idea]
COVERAGE SCORE: [X/10]`;

  const requestData = {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an SEO analyst AI focused on AI Mode fan-out predictions for Google Search.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 2048,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0
  };

  const xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.openai.com/v1/chat/completions', false);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${openaiApiKey}`);
  xhr.send(JSON.stringify(requestData));

  if (xhr.status === 200) {
    const response = JSON.parse(xhr.responseText);
    const content = response.choices?.[0]?.message?.content;

    if (content) {
      let output = '=== OPENAI AI MODE QUERY FAN-OUT ANALYSIS ===\n\n';
      output += content;
      output += '\n\n=== CONTENT CHUNKING SUMMARY ===\n';
      output += `• Primary Topic Chunks: ${chunks.filter(c => c.type === 'primary_topic').length}\n`;
      output += `• Section Chunks: ${chunks.filter(c => c.type === 'section').length}\n`;
      output += `• List/FAQ Chunks: ${chunks.filter(c => c.type === 'list').length}\n`;
      output += `• Structured Data: ${chunks.some(c => c.type === 'structured_data') ? 'Yes' : 'No'}\n`;
      output += `• Total Semantic Chunks: ${chunks.length}`;

      return seoSpider.data(output);
    } else {
      return seoSpider.error('Invalid OpenAI response.');
    }
  } else {
    return seoSpider.error(`OpenAI API Error: ${xhr.status}`);
  }
} catch (error) {
  return seoSpider.error(`Script Error: ${error.toString()}`);
}
