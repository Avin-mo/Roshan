import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './About.css';

export default function About() {
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
    <div className="aboutPage">
      <div className="aboutHeader">
        <h1>About Roshan</h1>
        <p className="subtitle">
          AI-powered transparency tools for critical news reading
        </p>
      </div>

      <section className="aboutSection">
        <h2><span className="sectionIcon">🎯</span> The Challenge</h2>
        <p>
          News articles often employ rhetorical techniques—emotional framing,
          absolutist language, vague claims, and propaganda-style phrasing—that
          can subtly influence readers. Recognizing these patterns while reading
          can be difficult without extra context.
        </p>
      </section>

      <section className="aboutSection">
        <h2><span className="sectionIcon">💡</span> Our Approach</h2>
        <p>
          Roshan combines a fine-tuned DistilBERT classifier with the OpenAI
          API to analyze news text in real time. The ML model specifically
          looks for patterns such as <strong>emotional framing</strong>,
          <strong>absolutist language</strong> (e.g. "always", "never"),
          <strong>vague or unsupported claims</strong> (claims without clear
          evidence or attribution), and broader <strong>propaganda-style
          language</strong>. ChatGPT then supplies conversational, on-demand
          explanations so you understand <em>why</em> a sentence was highlighted.
        </p>
      </section>

      <section className="aboutSection">
        <h2><span className="sectionIcon">🔧</span> How It Works</h2>
        <p>
          When you click "Analyze," Roshan extracts article text and sends it
          to a local backend running the DistilBERT model. Flagged sentences
          are highlighted in the page. Right-click any highlight to query
          ChatGPT (OpenAI API) for a detailed, neutral explanation of the
          detected patterns.
        </p>
      </section>

      <section className="aboutSection">
        <h2><span className="sectionIcon">🚀</span> Our Mission</h2>
        <p>
          We aim to empower readers with supplementary context and critical
          thinking tools. Roshan doesn't label content as "biased" or
          "unbiased"—it simply surfaces rhetorical patterns, helping you be aware of them
         while still letting you decide how to interpret the content.
        </p>
      </section>

      <div className="aboutCta">
        <Link to="/#howToUse" className="heroButton">Get Started</Link>
      </div>

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
  );
}