# Query Fan-Out Analysis for Screaming Frog

A custom JavaScript extraction that uses Google's Gemini AI to analyze how your content performs in Google's AI Mode search by predicting query fan-out patterns. You should use Gemini Flash models, as some users have reported that Pro API models don't work. Flash models are working very fast.

## 🚀 What is Query Fan-Out?

Google's AI Mode doesn't just process your query—it explodes it into multiple sub-queries, searching across Knowledge Graphs and web indexes to synthesize comprehensive answers. This tool helps you understand and optimize for this new search paradigm.

### The Problem
- Most websites only answer 30% of queries Google's AI generates from their content
- Traditional keyword optimization misses 70% of AI search opportunities
- No existing tools measure query fan-out coverage

### The Solution
This script analyzes your pages to:
- 🎯 Identify your primary entity
- 🔍 Predict 8-10 sub-queries Google would generate
- 📊 Score your content coverage (Yes/Partial/No)
- 💡 Suggest content gaps to fill
- 🔮 Predict follow-up questions

## 📋 Prerequisites

- [Screaming Frog SEO Spider](https://www.screamingfrog.co.uk/seo-spider/) (any version with custom javascript)
- [Google Gemini API Key](https://aistudio.google.com/app/apikey) (free tier available)
- Basic understanding of JavaScript (optional)

## 🛠️ Installation

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API key"
3. Copy your API key

### 2. Set Up in Screaming Frog

1. Open Screaming Frog
2. Navigate to: `Configuration > Custom > Custom Javascript`
3. Click "Add"
4. Configure:
   - **Name**: Query Fan-Out Analysis
   - **Extraction**: Function Value
   - **Extract Text**: *Paste the script below*

### 3. Add Your API Key

Replace `YOUR_GEMINI_API_KEY` in the script with your actual API key:

```javascript
const apiKey = 'YOUR_GEMINI_API_KEY'; // Replace this
```

## 📝 The Script

```javascript
// Gemini AI Query Fan-Out Detection for Screaming Frog
// Version 1.0
const apiKey = 'YOUR_GEMINI_API_KEY';

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

1. IDENTIFY PRIMARY ENTITY: What is the main ontological entity or topic of this page?

2. PREDICT FAN-OUT QUERIES: Generate 8-10 likely sub-queries that Google's AI might create when a user asks about this topic. Consider:
   - Related queries (broader context)
   - Implicit queries (unstated user needs)
   - Comparative queries (alternatives, comparisons)
   - Procedural queries (how-to aspects)
   - Contextual refinements (budget, size, location specifics)

3. SEMANTIC COVERAGE SCORE: For each predicted query, assess if the page content provides information to answer it (Yes/Partial/No).

4. FOLLOW-UP QUESTION POTENTIAL: What follow-up questions would users likely ask after reading this content?

OUTPUT FORMAT:
PRIMARY ENTITY: [entity name]

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
  xhr.open('POST', `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, false);
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
```

## 🎯 Usage

1. **Start a crawl** in Screaming Frog
2. **Navigate** to the tab after crawling (saved Custom JS name)
3. **Review** the Query Fan-Out Analysis column
4. **Export** results to CSV for bulk analysis

### Understanding the Output

```
=== GOOGLE AI MODE QUERY FAN-OUT ANALYSIS ===

PRIMARY ENTITY: Sustainable E-commerce Marketing

FAN-OUT QUERIES:
• What makes marketing sustainable for online stores? - Coverage: Partial
• How much budget do small e-commerce businesses need? - Coverage: No
• Which eco-friendly marketing channels have best ROI? - Coverage: Yes
...

COVERAGE SCORE: 3/10 queries covered
RECOMMENDATIONS: Add budget guidelines, case studies, measurement frameworks
```

### Interpreting Coverage Scores

- **0-3/10**: Critical gaps - Major content opportunities
- **4-6/10**: Average - Room for improvement  
- **7-8/10**: Good - Minor optimizations needed
- **9-10/10**: Excellent - Comprehensive coverage

## 📊 Advanced Usage

### Bulk Analysis
1. Crawl your entire site or sitemap
2. Export Custom Javascript data
3. Sort by Coverage Score to prioritize optimization

### Competitor Analysis
1. Crawl competitor pages
2. Compare coverage scores
3. Identify gaps you can exploit

### Content Strategy
Use fan-out queries to:
- Plan new content sections
- Optimize existing pages
- Create FAQ schemas
- Build topic clusters

## 🔧 Customization Options

### Use Gemini Pro for Deeper Analysis
Replace the API endpoint for more detailed results:
```javascript
// Change from:
xhr.open('POST', `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, false);

// To:
xhr.open('POST', `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, false);
```

### Adjust Temperature for Different Results
- **Lower (0.1-0.3)**: More consistent, predictable queries
- **Higher (0.5-0.7)**: More creative, diverse queries

### Modify Chunk Extraction
Add custom selectors for your site structure:
```javascript
// Example: Extract FAQ sections
const faqs = document.querySelectorAll('.faq-item, [itemtype*="FAQPage"]');
```

## 🐛 Troubleshooting

### Common Issues

**API Error 403**
- Check your API key is correct
- Ensure API is enabled in Google Cloud Console
- Verify you haven't exceeded quotas

**Empty Results**
- Check if JavaScript rendering is enabled in Screaming Frog
- Verify the page has actual content
- Test API key in Google AI Studio first

**Timeout Errors**
- Reduce maxOutputTokens
- Use gemini-1.5-flash instead of pro
- Check your internet connection

### API Limits

Free tier includes:
- 60 requests per minute
- 1,500 requests per day
- Input: 128k tokens
- Output: 8k tokens

## 📈 Performance Tips

1. **Start Small**: Test on 10-20 key pages first
2. **Use Filters**: Exclude non-content pages (tags, archives)
3. **Schedule Crawls**: Stay within API limits
4. **Cache Results**: Export and track changes over time

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Google's query fan-out patents (US 2024/0289407 A1, WO2024064249A1)
- Built on insights from the SEO community's AI Mode research
- Special thanks to early testers and contributors

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/metehan777/screaming-frog-query-fan-out/issues)
- **Discussions**: [GitHub Discussions](https://github.com/metehan777/screaming-frog-query-fan-out//discussions)
- **Twitter/X**: [@yourhandle](https://twitter.com/metehan777)

---

**Remember**: The future of SEO is query networks, not keywords. Start analyzing your fan-out coverage today!

*If this tool helped you, please ⭐ star the repository and share your results!*
