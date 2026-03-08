import './Home.css';

export default function Home() {
  return (
    <div className="page">

      <section className="hero">
        <h1>Roshan</h1>
        <h2>Transparent News Analysis</h2>

        <p>
          Roshan is a Chrome extension that helps readers better understand the
          language used in news articles. It highlights persuasive or potentially
          biased wording and provides context to support more informed reading.
        </p>

        <button className="heroButton">Try the Extension</button>
      </section>

     <section className="features">

  <div className="featureCard">
    <h3>Automated Article Analysis</h3>
    <p>
      Roshan extracts the text from a news article and analyzes it using a
      backend system that evaluates rhetorical signals, topics, and
      source-level indicators.
    </p>
  </div>

  <div className="featureCard">
    <h3>Sentence-Level Highlighting</h3>
    <p>
      Sentences that may contain rhetorical signals are highlighted directly
      in the article. Highlight transparency represents the confidence level
      of the detection.
    </p>
  </div>

  <div className="featureCard">
    <h3>Interactive Explanations</h3>
    <p>
      Hovering over highlighted sentences reveals detected categories such as
      absolutist language, vague claims, persuasion framing, or
      propaganda-style similarity.
    </p>
  </div>

  <div className="featureCard">
    <h3>Article-Level Insights</h3>
    <p>
      A side panel provides an overview of the article, including topic
      summaries, entity detection, and overall risk indicators.
    </p>
  </div>

</section>

    </div>
  );
}