import './About.css';

export default function About() {
  return (
    <div className="aboutPage">
      <div className="aboutHeader">
        <h1>About Roshan</h1>
        <p className="subtitle">
          Empowering readers with transparency and critical thinking tools
        </p>
      </div>

      <section className="aboutSection">
        <div className="sectionIcon">🎯</div>
        <h2>The Problem</h2>
        <p>
          Modern news often contains emotional framing and persuasive rhetoric 
          that is difficult to detect while reading quickly. Readers are exposed 
          to subtle manipulation techniques that can influence their perception 
          without their awareness.
        </p>
      </section>

      <section className="aboutSection">
        <div className="sectionIcon">💡</div>
        <h2>Our Solution</h2>
        <p>
          Roshan is a Chrome extension that analyzes news articles and highlights
          language that may signal bias, persuasion, or unsupported claims.
          It helps readers recognize rhetorical patterns and better evaluate
          the information they are reading.
        </p>
      </section>

      <section className="aboutSection">
        <div className="sectionIcon">🚀</div>
        <h2>Our Mission</h2>
        <p>
          The goal is to help readers better understand persuasion techniques 
          in online media, fostering a more informed and critical approach to 
          news consumption. We believe transparency leads to better decision-making.
        </p>
      </section>
    </div>
  );
}