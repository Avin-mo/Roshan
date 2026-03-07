import './RoshanIntro.css';
export default function RoshanIntro() {
  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "40px" }}>
      <h1>Roshan</h1>
      <h2>Transparent News Analysis</h2>

      <p>
        Roshan is a Chrome extension that helps readers identify persuasive
        language and rhetorical signals in online news articles.
      </p>

      <h3>The Problem</h3>
      <p>
        Modern news articles often contain emotional framing, vague claims,
        or persuasive language that can influence readers subtly.
        These signals are difficult to detect while quickly reading online.
      </p>

      <h3>Our Solution</h3>
      <p>
        Roshan highlights rhetorical signals directly inside news articles
        and provides explanations and AI-powered analysis to help readers
        understand how language is being used.
      </p>

      <h3>Key Features</h3>
      <ul>
        <li>Sentence-level rhetoric highlighting</li>
        <li>Hover explanations for flagged language</li>
        <li>Article-level summaries and topic analysis</li>
        <li>AI chatbot for discussing article bias</li>
      </ul>

      
      
    </div>
  );
}