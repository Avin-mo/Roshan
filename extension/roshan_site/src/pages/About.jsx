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
        <h2>The Challenge</h2>
        <p>
          News articles often contain rhetorical patterns and framing techniques 
          that can be difficult to notice while reading. Readers may benefit from 
          additional reference information to better understand the language being used.
        </p>
      </section>

      <section className="aboutSection">
        <div className="sectionIcon">💡</div>
        <h2>Our Approach</h2>
        <p>
          Roshan is a Chrome extension that analyzes news articles using the 
          Roshan processor to identify rhetorical patterns. It provides supplementary 
          information and context as reference points, helping readers access 
          additional perspectives on the content they're reading.
        </p>
      </section>

      <section className="aboutSection">
        <div className="sectionIcon">🚀</div>
        <h2>Our Mission</h2>
        <p>
          Our goal is to provide readers with additional reference information 
          about rhetorical patterns in news media. We believe that access to 
          supplementary context supports more informed reading and critical thinking.
        </p>
      </section>
    </div>
  );
}