import { useState } from 'react';
import './DemoModal.css';

export default function DemoModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Step 1: Open a News Article",
      instruction: "With Roshan enabled, navigate to any news article you want to analyze. Roshan works on most news websites.",
      visual: "video",
      videoSrc: "./demo-videos/step1.mp4"
    },
    {
      title: "Step 2: Click the Extension",
      instruction: "Click the Roshan extension icon in your browser toolbar, then click 'Analyze this page'.",
      visual: "video",
      videoSrc: "./demo-videos/step2.mp4"
    },
    {
      title: "Step 3: Content Extraction & Analysis",
      instruction: "Roshan extracts the article text and our DistilBERT model analyzes each sentence to detect:\n• Emotional framing\n• Absolutist language\n• Vague or unsupported claims\n• Propaganda-style language",
      visual: "video",
      videoSrc: "./demo-videos/step3.mp4"
    },
    {
      title: "Step 4: View Highlights & Hover for Details",
      instruction: "Sentences with notable patterns are highlighted in the article. Hover over any highlight to see the detected patterns.",
      visual: "video",
      videoSrc: "./demo-videos/step4.mp4"
    },
    {
      title: "Step 5: Right-Click Menu",
      instruction: "Right-click on any highlighted text to access:\n• Ask OpenAI for explanation\n• View pattern details",
      visual: "video",
      videoSrc: "./demo-videos/step5.mp4"
    },
    {
      title: "Step 6: Ask OpenAI",
      instruction: "If you selected 'Ask OpenAI', a chat widget will appear in the bottom-right corner of your page with a detailed breakdown of the rhetorical pattern. You can also send follow-up messages to ask further questions!",
      visual: "video",
      videoSrc: "./demo-videos/step6.mp4"
    }
  ];

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  const step = steps[currentStep];

  return (
    <div className="demoModalOverlay" onClick={handleClose}>
      <div className="demoModalContent" onClick={(e) => e.stopPropagation()}>
        <button className="demoCloseBtn" onClick={handleClose}>×</button>
        
        <div className="demoProgress">
          {steps.map((_, index) => (
            <div 
              key={index} 
              className={`demoProgressDot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>

        <div className="demoStepContent">
          <h2>{step.title}</h2>
          <p className="demoInstruction">{step.instruction}</p>
          
          <div className="demoVisual">
            {step.visual === 'video' && (
              <video 
                key={step.videoSrc}
                src={step.videoSrc} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="demoVideo"
              />
            )}
            {step.visual === 'image' && <img src={step.imageSrc} alt={step.title} />}
            {step.visual === 'article' && <ArticleVisual />}
            {step.visual === 'extension' && <ExtensionVisual />}
            {step.visual === 'extraction' && <ExtractionVisual />}
            {step.visual === 'analysis' && <AnalysisVisual />}
            {step.visual === 'highlights' && <HighlightsVisual />}
            {step.visual === 'hover' && <HoverVisual />}
            {step.visual === 'panel' && <PanelVisual />}
            {step.visual === 'contextMenu' && <ContextMenuVisual />}
          </div>
        </div>

        <div className="demoControls">
          <button 
            className="demoPrevBtn" 
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            Previous
          </button>
          <span className="demoStepCounter">{currentStep + 1} / {steps.length}</span>
          {currentStep < steps.length - 1 ? (
            <button className="demoNextBtn" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button className="demoFinishBtn" onClick={handleClose}>
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Visual Components
function ArticleVisual() {
  return (
    <div className="visualBox articleBox">
      <div className="browserBar">
        <div className="browserDots">
          <span></span><span></span><span></span>
        </div>
        <div className="browserUrl">news-site.com/article</div>
      </div>
      <div className="articleContent">
        <h3>Breaking News: Major Event Unfolds</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>
        <p>Sed do eiusmod tempor incididunt ut labore et dolore...</p>
      </div>
    </div>
  );
}

function ExtensionVisual() {
  return (
    <div className="visualBox extensionBox">
      <div className="extensionIcon">
        <div className="iconCircle">R</div>
        <div className="clickAnimation"></div>
      </div>
      <div className="extensionPopup">
        <div className="popupHeader">Roshan Analyzer</div>
        <button className="popupButton">Analyze this page</button>
      </div>
    </div>
  );
}

function ExtractionVisual() {
  return (
    <div className="visualBox extractionBox">
      <div className="analysisBox">
        <div className="analysisItem">
          <div className="analysisIcon">💭</div>
          <div className="analysisText">Emotional Framing</div>
          <div className="analysisProgress"><div style={{width: '85%'}}></div></div>
        </div>
        <div className="analysisItem">
          <div className="analysisIcon">⚡</div>
          <div className="analysisText">Absolutist Language</div>
          <div className="analysisProgress"><div style={{width: '78%'}}></div></div>
        </div>
        <div className="analysisItem">
          <div className="analysisIcon">❓</div>
          <div className="analysisText">Vague Claims</div>
          <div className="analysisProgress"><div style={{width: '82%'}}></div></div>
        </div>
        <div className="analysisItem">
          <div className="analysisIcon">📢</div>
          <div className="analysisText">Propaganda-Style</div>
          <div className="analysisProgress"><div style={{width: '75%'}}></div></div>
        </div>
      </div>
    </div>
  );
}

function AnalysisVisual() {
  return (
    <div className="visualBox analysisBox">
      <div className="analysisItem">
        <div className="analysisIcon">💭</div>
        <div className="analysisText">Emotional Framing</div>
        <div className="analysisProgress"><div style={{width: '85%'}}></div></div>
      </div>
      <div className="analysisItem">
        <div className="analysisIcon">⚡</div>
        <div className="analysisText">Absolutist Language</div>
        <div className="analysisProgress"><div style={{width: '78%'}}></div></div>
      </div>
      <div className="analysisItem">
        <div className="analysisIcon">❓</div>
        <div className="analysisText">Vague/Unsupported Claims</div>
        <div className="analysisProgress"><div style={{width: '82%'}}></div></div>
      </div>
      <div className="analysisItem">
        <div className="analysisIcon">📢</div>
        <div className="analysisText">Propaganda-Style Language</div>
        <div className="analysisProgress"><div style={{width: '75%'}}></div></div>
      </div>
    </div>
  );
}

function HighlightsVisual() {
  return (
    <div className="visualBox highlightsBox">
      <div className="highlightedArticle">
        <p>This is a normal sentence without any flags.</p>
        <p className="highlighted high">This sentence contains absolutist language.</p>
        <p>Another regular sentence here.</p>
        <p className="highlighted medium">Some experts claim this could be significant.</p>
        <p>More neutral content follows.</p>
      </div>
    </div>
  );
}

function HoverVisual() {
  return (
    <div className="visualBox hoverBox">
      <div className="hoverDemo">
        <p className="highlighted high hovered">
          This sentence contains absolutist language.
        </p>
        <div className="hoverTooltip">
          <div className="tooltipHeader">Pattern Information</div>
          <div className="tooltipTag">Absolutist Language</div>
          <div className="tooltipTag">High Confidence</div>
          <button className="tooltipChatBtn">📖 View More Context</button>
        </div>
      </div>
    </div>
  );
}

function PanelVisual() {
  return (
    <div className="visualBox panelBox">
      <div className="sidePanel">
        <div className="panelHeader">Article Information</div>
        <div className="panelSection">
          <div className="panelTitle">Pattern Analysis</div>
          <div className="riskMeter">
            <div className="riskBar" style={{width: '60%', background: '#f59e0b'}}></div>
          </div>
          <div className="riskLabel">Moderate Patterns</div>
        </div>
        <div className="panelSection">
          <div className="panelTitle">Topics</div>
          <div className="topicTags">
            <span>Politics</span>
            <span>Economy</span>
            <span>Policy</span>
          </div>
        </div>
        <div className="panelSection">
          <div className="panelTitle">Entities</div>
          <div className="entityList">
            <div>• Government Officials</div>
            <div>• Organizations</div>
            <div>• Locations</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContextMenuVisual() {
  return (
    <div className="visualBox contextMenuBox">
      <div className="contextMenuDemo">
        <p className="highlighted high contextTarget">
          This sentence contains absolutist language that should be examined.
        </p>
        <div className="contextMenu">
          <div className="contextMenuItem">
            <span className="contextMenuIcon">🤖</span>
            <span>Ask OpenAI</span>
          </div>
          <div className="contextMenuItem">
            <span className="contextMenuIcon">🔍</span>
            <span>View Pattern Details</span>
          </div>
          <div className="contextMenuItem">
            <span className="contextMenuIcon">📚</span>
            <span>Get More Context</span>
          </div>
          <div className="contextMenuDivider"></div>
          <div className="contextMenuItem">
            <span className="contextMenuIcon">📋</span>
            <span>Copy Text</span>
          </div>
        </div>
      </div>
    </div>
  );
}
