import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DemoModal from '../components/DemoModal';
import './Home.css';

export default function Home() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [showArrow, setShowArrow] = useState(true);

  useEffect(() => {
    function checkScroll() {
      const scrollPos = window.scrollY || window.pageYOffset;
      const viewH = window.innerHeight || document.documentElement.clientHeight;
      const docH = document.documentElement.scrollHeight;

      // Consider "at bottom" when within 24px of the bottom
      const atBottom = scrollPos + viewH >= docH - 24;
      setShowArrow(!atBottom);
    }

    // Run once to initialize
    checkScroll();

    window.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  return (
    <>
      <DemoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    
    <div className="page">

      <section className="hero">
        <h1>Roshan</h1>
        <h2>AI-Powered News Transparency</h2>

        <p>
          Roshan is a Chrome extension that uses a tuned ML model
          and the OpenAI API to help readers identify and understand 
          influential rhetorical patterns in
          news articles—such as emotional framing, absolutist language, vague
          claims, and propaganda-style rhetoric. Flagged sentences are
          highlighted directly in the page with an informative tool-tip, and you can ask ChatGPT for
          detailed, contextual explanations with a single click.
        </p>

        <div className="heroButtons">
          <Link to="/about" className="heroButton">Learn More</Link>
          <button className="heroButton heroButtonSecondary" onClick={() => setIsDemoOpen(true)}>View Step-by-Step Demo</button>
        </div>
      </section>

     <section className="features">

  <div className="featureCard">
    <h3>Real-Time Highlighting</h3>
    <p>
      Sentences flagged by our ML model are highlighted as you read, making
      rhetorical patterns easy to spot without leaving the article.
    </p>
  </div>

  <div className="featureCard">
    <h3>Custom ML Model</h3>
    <p>
      A DistilBERT classifier trained on propaganda-style text detects
      emotional framing, absolutist language, vague claims, and more.
    </p>
  </div>

  <div className="featureCard">
    <h3>ChatGPT Explanations</h3>
    <p>
      Right-click any highlight to ask ChatGPT (via the OpenAI API) for a
      clear, conversational explanation of why the sentence was flagged.
    </p>
  </div>

</section>

      <section className="howToUse" id="howToUse">
        <h2>How to Use</h2>
        <ol>
          <li>
            <strong>Install the Extension</strong> – Load Roshan as an unpacked
            extension in Chrome (or install from the Chrome Web Store when available).
          </li>
          <li>
            <strong>Navigate to a News Article</strong> – Open any news page you
            want to analyze.
          </li>
          <li>
            <strong>Click "Analyze this page"</strong> – Open the Roshan popup
            and click the button. The extension extracts the article text and
            sends it to the local ML backend.
          </li>
          <li>
            <strong>Review Highlights</strong> – Sentences flagged for rhetorical
            patterns appear highlighted in yellow. Hover to see detected labels.
          </li>
          <li>
            <strong>Ask ChatGPT</strong> – Right-click any highlighted sentence
            and choose "Ask ChatGPT" for a detailed, conversational explanation
            powered by the OpenAI API.
          </li>
        </ol>
        <button className="heroButton" onClick={() => setIsDemoOpen(true)}>More Details + See Step-by-Step Demo</button>
      </section>

      {/* Floating down arrow shown until user reaches bottom of page */}
      {showArrow && (
        <div id="scroll-arrow" className="scrollArrow" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M18 12l-6 6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
      )}

    </div>
    </>
  );
}