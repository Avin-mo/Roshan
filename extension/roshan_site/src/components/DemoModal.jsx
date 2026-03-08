import { useState } from 'react';
import './DemoModal.css';

export default function DemoModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Step 1: Open a News Article",
      instruction: "Navigate to any news article you want to analyze. Roshan works on most news websites.",
      visual: "article"
    },
    {
      title: "Step 2: Click the Extension",
      instruction: "Click the Roshan extension icon in your browser toolbar, then click 'Analyze this page'.",
      visual: "extension"
    },
    {
      title: "Step 3: Content Extraction",
      instruction: "Roshan automatically extracts the article text and sends it for processing.",
      visual: "extraction"
    },
    {
      title: "Step 4: Text Analysis",
      instruction: "The Roshan processor analyzes the text to identify:\n• Rhetorical patterns\n• Article topics\n• Named entities\n• Contextual information",
      visual: "analysis"
    },
    {
      title: "Step 5: View Highlights",
      instruction: "Sentences with notable patterns are highlighted in the article. Intensity indicates processor confidence level.",
      visual: "highlights"
    },
    {
      title: "Step 6: Hover for Details",
      instruction: "Hover over any highlighted sentence to see:\n• Detected patterns (absolutist language, vague claims, etc.)\n• Additional reference information",
      visual: "hover"
    },
    {
      title: "Step 7: Check Side Panel",
      instruction: "View the side panel for:\n• Pattern analysis summary\n• Topic information\n• Entity detection\n• Contextual details",
      visual: "panel"
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
            {step.visual === 'article' && <ArticleVisual />}
            {step.visual === 'extension' && <ExtensionVisual />}
            {step.visual === 'extraction' && <ExtractionVisual />}
            {step.visual === 'analysis' && <AnalysisVisual />}
            {step.visual === 'highlights' && <HighlightsVisual />}
            {step.visual === 'hover' && <HoverVisual />}
            {step.visual === 'panel' && <PanelVisual />}
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
      <div className="extractionFlow">
        <div className="flowItem">
          <div className="flowIcon">📄</div>
          <div className="flowLabel">Article Text</div>
        </div>
        <div className="flowArrow">→</div>
        <div className="flowItem">
          <div className="flowIcon spinning">⚙️</div>
          <div className="flowLabel">Processing</div>
        </div>
        <div className="flowArrow">→</div>
        <div className="flowItem">
          <div className="flowIcon">🔍</div>
          <div className="flowLabel">Backend</div>
        </div>
      </div>
    </div>
  );
}

function AnalysisVisual() {
  return (
    <div className="visualBox analysisBox">
      <div className="analysisItem">
        <div className="analysisIcon">🎯</div>
        <div className="analysisText">Pattern Detection</div>
        <div className="analysisProgress"><div style={{width: '75%'}}></div></div>
      </div>
      <div className="analysisItem">
        <div className="analysisIcon">📊</div>
        <div className="analysisText">Topic Analysis</div>
        <div className="analysisProgress"><div style={{width: '90%'}}></div></div>
      </div>
      <div className="analysisItem">
        <div className="analysisIcon">🏷️</div>
        <div className="analysisText">Entity Detection</div>
        <div className="analysisProgress"><div style={{width: '85%'}}></div></div>
      </div>
      <div className="analysisItem">
        <div className="analysisIcon">✅</div>
        <div className="analysisText">Context Gathering</div>
        <div className="analysisProgress"><div style={{width: '70%'}}></div></div>
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
