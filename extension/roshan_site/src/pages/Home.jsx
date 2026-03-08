import { useState } from 'react';
import './Home.css';
import DemoModal from '../components/DemoModal';

export default function Home() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <>
      <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    
    <div className="page">

      <section className="hero">
        <h1>Roshan</h1>
        <h2>Transparent News Analysis</h2>

        <p>
          Roshan is a Chrome extension that provides additional context and 
          reference information about news articles. It highlights rhetorical 
          patterns and provides supplementary details to support informed reading.
        </p>

        <button className="heroButton" onClick={() => setIsDemoOpen(true)}>Try the Extension</button>
      </section>

     <section className="features">

  <div className="featureCard">
    <h3>Real-Time Highlighting</h3>
    <p>
      Sentences with notable rhetorical patterns are highlighted directly
      in the article as you read, making it easy to spot potential bias.
    </p>
  </div>

  <div className="featureCard">
    <h3>Pattern Detection</h3>
    <p>
      Our AI identifies emotional framing, absolutist language, and vague 
      claims to help you recognize persuasive techniques.
    </p>
  </div>

  <div className="featureCard">
    <h3>Interactive Explanations</h3>
    <p>
      Hover over highlights to see detected patterns, or right-click to ask 
      Gemini AI for detailed explanations and context.
    </p>
  </div>

</section>

    </div>
    </>
  );
}