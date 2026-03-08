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
    <h3>Automated Article Analysis</h3>
    <p>
      Roshan extracts text from news articles and processes it using 
      the Roshan processor to identify rhetorical patterns, topics, 
      and contextual information.
    </p>
  </div>

  <div className="featureCard">
    <h3>Sentence-Level Highlighting</h3>
    <p>
      Sentences with notable rhetorical patterns are highlighted directly
      in the article. Highlight intensity represents the processor's confidence 
      level in the detection.
    </p>
  </div>

  <div className="featureCard">
    <h3>Contextual Information</h3>
    <p>
      Hovering over highlighted sentences reveals detected patterns such as
      absolutist language, vague claims, or emotional framing, providing 
      additional reference points for readers.
    </p>
  </div>

  <div className="featureCard">
    <h3>Article-Level Insights</h3>
    <p>
      A side panel provides supplementary information about the article, 
      including topic summaries, entity detection, and pattern analysis 
      for additional reference.
    </p>
  </div>

</section>

    </div>
    </>
  );
}